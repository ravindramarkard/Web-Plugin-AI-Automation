import express from 'express';
import db from '../db/index.js';

const router = express.Router();

// Get all test cases
router.get('/', (req, res) => {
  try {
    const cases = db.prepare('SELECT * FROM test_cases ORDER BY createdAt DESC').all();
    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test cases' });
  }
});

// Get test cases by suite
router.get('/suite/:suiteId', (req, res) => {
  try {
    const cases = db
      .prepare('SELECT * FROM test_cases WHERE testSuiteId = ? ORDER BY createdAt DESC')
      .all(req.params.suiteId);
    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test cases' });
  }
});

// Get test case by ID
router.get('/:id', (req, res) => {
  try {
    const testCase = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
    if (!testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    res.json(testCase);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test case' });
  }
});

// Create test case
router.post('/', (req, res) => {
  try {
    const { testSuiteId, name, description, prompt, plannerDescription, status, testType, playwrightCode, baseUrl } =
      req.body;
    // testSuiteId can be null (unassigned)
    if (!name || !description || !prompt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    db.prepare(
      'INSERT INTO test_cases (id, testSuiteId, name, description, prompt, plannerDescription, status, testType, playwrightCode, baseUrl, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      id,
      testSuiteId,
      name,
      description,
      prompt,
      plannerDescription || null,
      status || 'pending',
      testType || null,
      playwrightCode || null,
      baseUrl || null,
      now,
      now,
    );

    const testCase = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(id);
    res.status(201).json(testCase);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create test case' });
  }
});

// Update test case
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    const updates = {
      testSuiteId: req.body.testSuiteId !== undefined ? req.body.testSuiteId : existing.testSuiteId,
      name: req.body.name ?? existing.name,
      description: req.body.description ?? existing.description,
      prompt: req.body.prompt ?? existing.prompt,
      plannerDescription:
        req.body.plannerDescription !== undefined ? req.body.plannerDescription : existing.plannerDescription,
      status: req.body.status ?? existing.status,
      testType: req.body.testType !== undefined ? req.body.testType : existing.testType,
      playwrightCode: req.body.playwrightCode !== undefined ? req.body.playwrightCode : existing.playwrightCode,
      baseUrl: req.body.baseUrl !== undefined ? req.body.baseUrl : existing.baseUrl,
      lastRunAt: req.body.lastRunAt !== undefined ? req.body.lastRunAt : existing.lastRunAt,
      executionTime: req.body.executionTime !== undefined ? req.body.executionTime : existing.executionTime,
      errorMessage: req.body.errorMessage !== undefined ? req.body.errorMessage : existing.errorMessage,
      updatedAt: Date.now(),
    };

    db.prepare(
      'UPDATE test_cases SET testSuiteId = ?, name = ?, description = ?, prompt = ?, plannerDescription = ?, status = ?, testType = ?, playwrightCode = ?, baseUrl = ?, lastRunAt = ?, executionTime = ?, errorMessage = ?, updatedAt = ? WHERE id = ?',
    ).run(
      updates.testSuiteId,
      updates.name,
      updates.description,
      updates.prompt,
      updates.plannerDescription,
      updates.status,
      updates.testType,
      updates.playwrightCode,
      updates.baseUrl,
      updates.lastRunAt,
      updates.executionTime,
      updates.errorMessage,
      updates.updatedAt,
      req.params.id,
    );

    const testCase = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
    res.json(testCase);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update test case' });
  }
});

// Delete test case
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM test_cases WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete test case' });
  }
});

export default router;
