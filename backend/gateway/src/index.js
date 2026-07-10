require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'somp_super_secret_jwt_key_2024';

const AUTH_SERVICE_URL    = process.env.AUTH_SERVICE_URL    || 'http://localhost:4001';
const PROJECT_SERVICE_URL = process.env.PROJECT_SERVICE_URL || 'http://localhost:4002';
const TASK_SERVICE_URL    = process.env.TASK_SERVICE_URL    || 'http://localhost:4003';

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch { next(new Error('Authentication error')); }
});

const connectedUsers = new Map();
io.on('connection', (socket) => {
  connectedUsers.set(socket.userId, socket.id);
  socket.join(`user:${socket.userId}`);
  io.emit('users:online', connectedUsers.size);
  socket.on('disconnect', () => { connectedUsers.delete(socket.userId); io.emit('users:online', connectedUsers.size); });
  socket.on('project:join', (id) => socket.join(`project:${id}`));
  socket.on('project:leave', (id) => socket.leave(`project:${id}`));
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(morgan('combined'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

const authenticate = (req, res, next) => {
  const url = req.originalUrl;
  if (url.includes('/auth/login') || url.includes('/auth/register')) return next();
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.headers['x-user-id']    = decoded.userId;
    req.headers['x-user-role']  = decoded.role;
    req.headers['x-user-email'] = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const makeProxy = (target) => createProxyMiddleware({
  target,
  changeOrigin: true,
  pathRewrite:  { '^/api': '' },
  on: {
    proxyReq: fixRequestBody,
    error: (err, req, res) => {
      console.error('[Proxy Error]', err.message);
      if (!res.headersSent) res.status(502).json({ error: 'Upstream service unavailable' });
    },
  },
});

const authProxy    = makeProxy(AUTH_SERVICE_URL);
const projectProxy = makeProxy(PROJECT_SERVICE_URL);
const taskProxy    = makeProxy(TASK_SERVICE_URL);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway', port: PORT }));
app.get('/', (req, res) => res.json({ message: 'SOMP API Gateway v1.0.0' }));

app.use('/api/stats',  express.json(), authenticate, async (req, res) => {
  try {
    const h = { Authorization: req.headers.authorization, 'x-user-id': req.headers['x-user-id'], 'x-user-role': req.headers['x-user-role'] };
    const [u, p, t] = await Promise.allSettled([
      axios.get(`${AUTH_SERVICE_URL}/auth/users`, { headers: h }),
      axios.get(`${PROJECT_SERVICE_URL}/projects/stats`, { headers: h }),
      axios.get(`${TASK_SERVICE_URL}/tasks/stats`, { headers: h }),
    ]);
    const users    = u.status === 'fulfilled' ? u.value.data : [];
    const projects = p.status === 'fulfilled' ? p.value.data : {};
    const tasks    = t.status === 'fulfilled' ? t.value.data : {};
    res.json({
      users: { total: users.length, admins: users.filter(x => x.role === 'administrator').length, managers: users.filter(x => x.role === 'manager').length, active: users.filter(x => x.is_active).length },
      projects, tasks, onlineUsers: connectedUsers.size,
    });
  } catch (err) { res.status(500).json({ error: 'Stats unavailable' }); }
});

app.get('/api/search', authenticate, async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.json([]);
  try {
    const h = { Authorization: req.headers.authorization, 'x-user-id': req.headers['x-user-id'], 'x-user-role': req.headers['x-user-role'] };
    const [u, p, t] = await Promise.allSettled([
      axios.get(`${AUTH_SERVICE_URL}/auth/search?q=${encodeURIComponent(q)}`, { headers: h }),
      axios.get(`${PROJECT_SERVICE_URL}/projects/search/q?q=${encodeURIComponent(q)}`, { headers: h }),
      axios.get(`${TASK_SERVICE_URL}/tasks/search/q?q=${encodeURIComponent(q)}`, { headers: h }),
    ]);
    res.json([
      ...(u.status === 'fulfilled' ? u.value.data : []),
      ...(p.status === 'fulfilled' ? p.value.data : []),
      ...(t.status === 'fulfilled' ? t.value.data : []),
    ]);
  } catch { res.status(500).json({ error: 'Search failed' }); }
});

app.post('/api/notify', express.json(), (req, res) => {
  const { userId, event, data } = req.body;
  if (userId) io.to(`user:${userId}`).emit(event, data);
  else io.emit(event, data);
  res.json({ sent: true });
});

app.use('/api', authenticate, (req, res, next) => {
  const url = req.originalUrl;
  if (url.startsWith('/api/auth'))     return authProxy(req, res, next);
  if (url.startsWith('/api/projects')) return projectProxy(req, res, next);
  if (url.startsWith('/api/tasks'))    return taskProxy(req, res, next);
  res.status(404).json({ error: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`API Gateway on port ${PORT}`);
  console.log(`  /api/auth     → ${AUTH_SERVICE_URL}`);
  console.log(`  /api/projects → ${PROJECT_SERVICE_URL}`);
  console.log(`  /api/tasks    → ${TASK_SERVICE_URL}`);
});

module.exports = { app, io };
