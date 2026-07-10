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
    const { project_id, status, priority, assigned_user_id, limit = 100, offset = 0, search } = req.query;

    let query = `
      SELECT t.*,
        u.name as assigned_user_name, u.email as assigned_user_email,
        c.name as creator_name,
        p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_user_id = u.id
      LEFT JOIN users c ON t.creator_id = c.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (project_id) {
      params.push(project_id);
      query += ` AND t.project_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND t.status = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      query += ` AND t.priority = $${params.length}`;
    }
    if (assigned_user_id) {
      params.push(assigned_user_id);
      query += ` AND t.assigned_user_id = $${params.length}`;
    }
    if (search) {
      params.push(search, `%${search}%`);
      query += ` AND (to_tsvector('english', t.title || ' ' || COALESCE(t.description,'')) @@ plainto_tsquery('english', $${params.length - 1}) OR t.title ILIKE $${params.length})`;
    }

    query += ` ORDER BY
      CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      t.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    const { project_id } = req.query;
    let where = '';
    const params = [];
    if (project_id) {
      params.push(project_id);
      where = `WHERE project_id = $1`;
    }

    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'todo') as todo,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'blocked') as blocked,
        COUNT(*) FILTER (WHERE priority = 'critical') as critical,
        COUNT(*) FILTER (WHERE priority = 'high') as high,
        COUNT(*) FILTER (WHERE deadline < NOW() AND status != 'completed') as overdue
      FROM tasks ${where}
    `, params);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*,
        u.name as assigned_user_name, u.email as assigned_user_email,
        c.name as creator_name,
        p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_user_id = u.id
      LEFT JOIN users c ON t.creator_id = c.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, [
  body('title').trim().isLength({ min: 2, max: 255 }),
  body('project_id').isUUID(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('status').optional().isIn(['todo', 'in_progress', 'completed', 'blocked']),
  body('deadline').optional().isISO8601(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, priority = 'medium', status = 'todo', project_id, assigned_user_id, deadline } = req.body;

  try {
    
    const projectCheck = await pool.query('SELECT id FROM projects WHERE id = $1', [project_id]);
    if (projectCheck.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

    const result = await pool.query(
      'INSERT INTO tasks (title, description, priority, status, project_id, assigned_user_id, creator_id, deadline) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [title, description, priority, status, project_id, assigned_user_id || null, req.user.id, deadline || null]
    );

    const task = result.rows[0];
    await logAudit(req.user.id, req.user.email, 'TASK_CREATED', 'task', task.id, { title, priority, status });

    if (assigned_user_id && assigned_user_id !== req.user.id) {
      await createNotification(
        assigned_user_id,
        'New Task Assigned',
        `You have been assigned a new task: "${title}"`,
        'task_assigned', 'task', task.id
      );
    }

    res.status(201).json(task);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticate, [
  body('title').optional().trim().isLength({ min: 2, max: 255 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('status').optional().isIn(['todo', 'in_progress', 'completed', 'blocked']),
  body('deadline').optional().isISO8601(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, priority, status, assigned_user_id, deadline } = req.body;

  try {
    const oldTask = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (oldTask.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const result = await pool.query(`
      UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        priority = COALESCE($3, priority),
        status = COALESCE($4, status),
        assigned_user_id = CASE WHEN $5::text IS NOT NULL THEN $5::uuid ELSE assigned_user_id END,
        deadline = COALESCE($6, deadline)
      WHERE id = $7
      RETURNING *
    `, [title, description, priority, status, assigned_user_id || null, deadline || null, req.params.id]);

    const task = result.rows[0];
    await logAudit(req.user.id, req.user.email, 'TASK_UPDATED', 'task', task.id, { title, priority, status });

    if (assigned_user_id && assigned_user_id !== oldTask.rows[0].assigned_user_id && assigned_user_id !== req.user.id) {
      await createNotification(
        assigned_user_id,
        'Task Assigned to You',
        `You have been assigned to task: "${task.title}"`,
        'task_assigned', 'task', task.id
      );
    }

    if (status && status !== oldTask.rows[0].status && task.assigned_user_id && task.assigned_user_id !== req.user.id) {
      await createNotification(
        task.assigned_user_id,
        'Task Status Updated',
        `Task "${task.title}" status changed to ${status.replace('_', ' ')}`,
        'status_change', 'task', task.id
      );
    }

    res.json(task);
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/status', authenticate, [
  body('status').isIn(['todo', 'in_progress', 'completed', 'blocked']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { status } = req.body;

  try {
    const result = await pool.query(
      'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const task = result.rows[0];
    await logAudit(req.user.id, req.user.email, 'TASK_STATUS_CHANGED', 'task', task.id, { status, title: task.title });

    if (task.assigned_user_id && task.assigned_user_id !== req.user.id) {
      await createNotification(
        task.assigned_user_id,
        'Task Status Updated',
        `Task "${task.title}" moved to ${status.replace('_', ' ')}`,
        'status_change', 'task', task.id
      );
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const check = await pool.query('SELECT id, title FROM tasks WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    await logAudit(req.user.id, req.user.email, 'TASK_DELETED', 'task', req.params.id, { title: check.rows[0].title });

    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/search/q', authenticate, async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.json([]);
  try {
    const result = await pool.query(`
      SELECT t.id, t.title, t.status, t.priority, p.name as project_name, 'task' as type
      FROM tasks t LEFT JOIN projects p ON t.project_id = p.id
      WHERE to_tsvector('english', t.title || ' ' || COALESCE(t.description,'')) @@ plainto_tsquery('english', $1)
      OR t.title ILIKE $2
      LIMIT 10
    `, [q, `%${q}%`]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
