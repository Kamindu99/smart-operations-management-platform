const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('./db');
const { authenticate, authorize } = require('./middleware');

const router = express.Router();

async function logAudit(userId, userEmail, action, entityType, entityId, details) {
  try {
    await pool.query(
      'INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
      [userId, userEmail, action, entityType, entityId, JSON.stringify(details)]
    );
  } catch (e) { }
}

async function createNotification(userId, title, message, type, entityType, entityId) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id) VALUES ($1,$2,$3,$4,$5,$6)',
      [userId, title, message, type, entityType, entityId]
    );
  } catch (e) { }
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0, search } = req.query;
    let query = `
      SELECT p.*, u.name as creator_name, u.email as creator_email,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed') as completed_task_count
      FROM projects p
      LEFT JOIN users u ON p.creator_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }

    if (search) {
      params.push(search, `%${search}%`);
      query += ` AND (to_tsvector('english', p.name || ' ' || COALESCE(p.description,'')) @@ plainto_tsquery('english', $${params.length - 1}) OR p.name ILIKE $${params.length})`;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get projects error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
      FROM projects
    `);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.name as creator_name, u.email as creator_email
      FROM projects p
      LEFT JOIN users u ON p.creator_id = u.id
      WHERE p.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, authorize('administrator', 'manager'), [
  body('name').trim().isLength({ min: 2, max: 255 }),
  body('description').optional().trim(),
  body('status').optional().isIn(['active', 'on_hold', 'completed', 'cancelled']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description, status = 'active' } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO projects (name, description, status, creator_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, status, req.user.id]
    );
    const project = result.rows[0];

    await logAudit(req.user.id, req.user.email, 'PROJECT_CREATED', 'project', project.id, { name, status });
    res.status(201).json(project);
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticate, authorize('administrator', 'manager'), [
  body('name').optional().trim().isLength({ min: 2, max: 255 }),
  body('status').optional().isIn(['active', 'on_hold', 'completed', 'cancelled']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description, status } = req.body;

  try {
    const result = await pool.query(`
      UPDATE projects
      SET name = COALESCE($1, name), description = COALESCE($2, description), status = COALESCE($3, status)
      WHERE id = $4
      RETURNING *
    `, [name, description, status, req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

    const project = result.rows[0];
    await logAudit(req.user.id, req.user.email, 'PROJECT_UPDATED', 'project', project.id, { name, status });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, authorize('administrator'), async (req, res) => {
  try {
    const check = await pool.query('SELECT id, name FROM projects WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    await logAudit(req.user.id, req.user.email, 'PROJECT_DELETED', 'project', req.params.id, { name: check.rows[0].name });

    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/search/q', authenticate, async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.json([]);
  try {
    const result = await pool.query(`
      SELECT id, name, description, status, 'project' as type FROM projects
      WHERE to_tsvector('english', name || ' ' || COALESCE(description,'')) @@ plainto_tsquery('english', $1)
      OR name ILIKE $2
      LIMIT 10
    `, [q, `%${q}%`]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
