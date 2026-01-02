import express from 'express';
import db from '../db/index.js';

const router = express.Router();

// Get all test suites for a project
router.get('/project/:projectId', (req, res) => {
  try {
    const suites = db
      .prepare('SELECT * FROM test_suites WHERE projectId = ? ORDER BY createdAt DESC')
      .all(req.params.projectId);
    // Parse schedule JSON
    const parsedSuites = suites.map((s: any) => ({
      ...s,
      schedule: s.schedule ? JSON.parse(s.schedule) : undefined,
    }));
    res.json(parsedSuites);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test suites' });
  }
});

// Get test suite by ID
router.get('/:id', (req, res) => {
  try {
    const suite = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(req.params.id);
    if (!suite) {
      return res.status(404).json({ error: 'Test suite not found' });
    }
    // Parse schedule JSON
    const parsedSuite = {
      ...suite,
      schedule: (suite as any).schedule ? JSON.parse((suite as any).schedule) : undefined,
    };
    res.json(parsedSuite);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test suite' });
  }
});

// Create test suite
router.post('/', (req, res) => {
  try {
    const { projectId, name, description, testType, schedule } = req.body;
    if (!projectId || !name || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = `suite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    db.prepare(
      'INSERT INTO test_suites (id, projectId, name, description, testType, schedule, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(id, projectId, name, description, testType || null, schedule ? JSON.stringify(schedule) : null, now, now);

    const suite = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(id);
    const parsedSuite = {
      ...suite,
      schedule: (suite as any).schedule ? JSON.parse((suite as any).schedule) : undefined,
    };
    res.status(201).json(parsedSuite);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create test suite' });
  }
});

// Update test suite
router.put('/:id', (req, res) => {
  try {
    const { name, description, testType, schedule } = req.body;
    const existing = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Test suite not found' });
    }

    db.prepare(
      'UPDATE test_suites SET name = ?, description = ?, testType = ?, schedule = ?, updatedAt = ? WHERE id = ?',
    ).run(
      name || existing.name,
      description || existing.description,
      testType !== undefined ? testType : existing.testType,
      schedule !== undefined ? JSON.stringify(schedule) : existing.schedule,
      Date.now(),
      req.params.id,
    );

    const suite = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(req.params.id);
    const parsedSuite = {
      ...suite,
      schedule: (suite as any).schedule ? JSON.parse((suite as any).schedule) : undefined,
    };
    res.json(parsedSuite);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update test suite' });
  }
});

// Delete test suite
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM test_suites WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Test suite not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete test suite' });
  }
});

export default router;
