import express from 'express';
import db from '../db/index.js';
import { TestExecutor } from '../services/TestExecutor.js';

const router: express.Router = express.Router();
const testExecutor = new TestExecutor();

/**
 * Execute a test case
 */
router.post('/run/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { debug } = req.body;

    // Set status to running
    db.prepare('UPDATE test_cases SET status = ?, lastRunAt = ? WHERE id = ?').run('running', Date.now(), id);

    // Run execution (async, but we await for now to return result - in prod might want to use jobs)
    // For this pair programming task, waiting is fine
    const result = await testExecutor.runTestCase(id, undefined, debug);

    // Update status based on result
    const status = result.success ? 'pass' : 'fail';
    const errorMessage = result.error || null;

    db.prepare('UPDATE test_cases SET status = ?, errorMessage = ?, updatedAt = ? WHERE id = ?').run(
      status,
      errorMessage,
      Date.now(),
      id,
    );

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Error executing test case:', error);

    // Mark as failed
    try {
      db.prepare('UPDATE test_cases SET status = ?, errorMessage = ?, updatedAt = ? WHERE id = ?').run(
        'fail',
        error.message,
        Date.now(),
        req.params.id,
      );
    } catch (e) {
      // ignore
    }

    res.status(500).json({ error: 'Failed to execute test case' });
  }
});

/**
 * Get test cases for execution
 * Supports filtering by suite, project, or status
 */
router.get('/test-cases', (req, res) => {
  try {
    const { suiteId, projectId, status, withCode } = req.query;

    let query = 'SELECT * FROM test_cases WHERE 1=1';
    const params: any[] = [];

    if (suiteId) {
      query += ' AND testSuiteId = ?';
      params.push(suiteId);
    }

    if (projectId) {
      // Get suite IDs for the project first
      const suites = db.prepare('SELECT id FROM test_suites WHERE projectId = ?').all(projectId);
      const suiteIds = suites.map((s: any) => s.id);
      if (suiteIds.length > 0) {
        query += ` AND testSuiteId IN (${suiteIds.map(() => '?').join(',')})`;
        params.push(...suiteIds);
      } else {
        // No suites for this project, return empty
        return res.json([]);
      }
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (withCode === 'true') {
      query += ' AND playwrightCode IS NOT NULL AND playwrightCode != ""';
    }

    query += ' ORDER BY createdAt DESC';

    const cases = db.prepare(query).all(...params);
    res.json(cases);
  } catch (error) {
    console.error('Error fetching test cases for execution:', error);
    res.status(500).json({ error: 'Failed to fetch test cases' });
  }
});

/**
 * Update test case execution result
 */
router.post('/test-cases/:id/result', (req, res) => {
  try {
    const { id } = req.params;
    const { status, executionTime, errorMessage, lastRunAt } = req.body;

    if (!status || !['pass', 'fail', 'pending', 'running'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: pass, fail, pending, or running' });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    if (executionTime !== undefined) {
      updates.push('executionTime = ?');
      values.push(executionTime);
    }

    if (errorMessage !== undefined) {
      updates.push('errorMessage = ?');
      values.push(errorMessage || null);
    }

    if (lastRunAt !== undefined) {
      updates.push('lastRunAt = ?');
      values.push(lastRunAt);
    }

    updates.push('updatedAt = ?');
    values.push(Date.now());
    values.push(id);

    db.prepare(`UPDATE test_cases SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating test case result:', error);
    res.status(500).json({ error: 'Failed to update test case result' });
  }
});

/**
 * Get test suite with all test cases for execution
 */
router.get('/test-suites/:id/export', (req, res) => {
  try {
    const { id } = req.params;
    const suite = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(id);

    if (!suite) {
      return res.status(404).json({ error: 'Test suite not found' });
    }

    const cases = db
      .prepare('SELECT * FROM test_cases WHERE testSuiteId = ? AND playwrightCode IS NOT NULL AND playwrightCode != ""')
      .all(id);

    const parsed = {
      ...(suite as any),
      schedule: (suite as any).schedule ? JSON.parse((suite as any).schedule) : undefined,
      testCases: cases,
    };

    res.json(parsed);
  } catch (error) {
    console.error('Error exporting test suite:', error);
    res.status(500).json({ error: 'Failed to export test suite' });
  }
});

/**
 * Run test suite
 */
router.post('/run-suite/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { environmentId, browser, headless, parallel, tags, jiraLogging, singleSession } = req.body;
    const result = await testExecutor.runTestSuite(id, {
      environmentId,
      browser,
      headless,
      parallel,
      tags,
      jiraLogging,
      singleSession,
    });

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Error executing test suite:', error);
    res.status(500).json({ error: 'Failed to execute test suite' });
  }
});

export default router;
