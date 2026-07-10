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

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway', port: PORT }));
app.get('/', (req, res) => res.json({ message: 'SOMP API Gateway v1.0.0' }));

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
});

module.exports = { app, io };
