import express from 'express';
import db from '../db/index.js';

const router = express.Router();

// Get all projects
router.get('/', (req, res) => {
  try {
    const projects = db.prepare('SELECT * FROM projects ORDER BY createdAt DESC').all();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get project by ID
router.get('/:id', (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
router.post('/', (req, res) => {
  try {
    const { name, team, icon } = req.body;
    if (!name || !team || !icon) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    db.prepare('INSERT INTO projects (id, name, team, icon, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run(
      id,
      name,
      team,
      icon,
      now,
      now,
    );

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', (req, res) => {
  try {
    const { name, team, icon } = req.body;
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    db.prepare('UPDATE projects SET name = ?, team = ?, icon = ?, updatedAt = ? WHERE id = ?').run(
      name || existing.name,
      team || existing.team,
      icon || existing.icon,
      Date.now(),
      req.params.id,
    );

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
