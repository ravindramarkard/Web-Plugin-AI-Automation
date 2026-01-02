import express from 'express';
import db from '../db/index.js';

const router = express.Router();

// Get all environments
router.get('/', (req, res) => {
  try {
    const environments = db.prepare('SELECT * FROM environments ORDER BY createdAt DESC').all();
    // Convert SQLite boolean integers to JavaScript booleans
    const parsed = environments.map((env: any) => ({
      ...env,
      headless: Boolean(env.headless),
      jiraEnabled: Boolean(env.jiraEnabled),
      llmEnabled: Boolean(env.llmEnabled),
      authorizationEnabled: Boolean(env.authorizationEnabled),
    }));
    res.json(parsed);
  } catch (error) {
    console.error('Error fetching environments:', error);
    res.status(500).json({ error: 'Failed to fetch environments' });
  }
});

// Get environment by ID
router.get('/:id', (req, res) => {
  try {
    const env = db.prepare('SELECT * FROM environments WHERE id = ?').get(req.params.id);
    if (!env) {
      return res.status(404).json({ error: 'Environment not found' });
    }
    // Convert SQLite boolean integers to JavaScript booleans
    const parsed = {
      ...(env as any),
      headless: Boolean((env as any).headless),
      jiraEnabled: Boolean((env as any).jiraEnabled),
      llmEnabled: Boolean((env as any).llmEnabled),
      authorizationEnabled: Boolean((env as any).authorizationEnabled),
    };
    res.json(parsed);
  } catch (error) {
    console.error('Error fetching environment:', error);
    res.status(500).json({ error: 'Failed to fetch environment' });
  }
});

// Get environment by key
router.get('/key/:key', (req, res) => {
  try {
    const env = db.prepare('SELECT * FROM environments WHERE key = ?').get(req.params.key);
    if (!env) {
      return res.status(404).json({ error: 'Environment not found' });
    }
    // Convert SQLite boolean integers to JavaScript booleans
    const parsed = {
      ...(env as any),
      headless: Boolean((env as any).headless),
      jiraEnabled: Boolean((env as any).jiraEnabled),
      llmEnabled: Boolean((env as any).llmEnabled),
      authorizationEnabled: Boolean((env as any).authorizationEnabled),
    };
    res.json(parsed);
  } catch (error) {
    console.error('Error fetching environment:', error);
    res.status(500).json({ error: 'Failed to fetch environment' });
  }
});

// Create environment
router.post('/', (req, res) => {
  try {
    const {
      name,
      key,
      description,
      baseUrl,
      apiUrl,
      username,
      password,
      timeout = 30000,
      browser = 'chromium',
      headless = false,
      jiraEnabled = false,
      jiraUrl,
      jiraUsername,
      jiraPassword,
      jiraProjectKey,
      llmEnabled = false,
      llmProvider,
      llmModel,
      llmApiKey,
      llmBaseUrl,
      authorizationEnabled = false,
      authType,
      authToken,
      status = 'active',
    } = req.body;

    // Validate required fields
    if (!name || !key || !description || !baseUrl) {
      return res.status(400).json({ error: 'Missing required fields: name, key, description, baseUrl' });
    }

    // Check if key already exists
    const existing = db.prepare('SELECT id FROM environments WHERE key = ?').get(key);
    if (existing) {
      return res.status(400).json({ error: 'Environment with this key already exists' });
    }

    const id = `env_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const now = Date.now();

    db.prepare(
      `INSERT INTO environments (
        id, name, key, description, baseUrl, apiUrl, username, password, timeout,
        browser, headless, jiraEnabled, jiraUrl, jiraUsername, jiraPassword, jiraProjectKey,
        llmEnabled, llmProvider, llmModel, llmApiKey, llmBaseUrl,
        authorizationEnabled, authType, authToken, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      name,
      key,
      description,
      baseUrl,
      apiUrl || null,
      username || null,
      password || null,
      timeout,
      browser,
      headless ? 1 : 0,
      jiraEnabled ? 1 : 0,
      jiraUrl || null,
      jiraUsername || null,
      jiraPassword || null,
      jiraProjectKey || null,
      llmEnabled ? 1 : 0,
      llmProvider || null,
      llmModel || null,
      llmApiKey || null,
      llmBaseUrl || null,
      authorizationEnabled ? 1 : 0,
      authType || null,
      authToken || null,
      status,
      now,
      now,
    );

    const created = db.prepare('SELECT * FROM environments WHERE id = ?').get(id);
    const parsed = {
      ...(created as any),
      headless: Boolean((created as any).headless),
      jiraEnabled: Boolean((created as any).jiraEnabled),
      llmEnabled: Boolean((created as any).llmEnabled),
      authorizationEnabled: Boolean((created as any).authorizationEnabled),
    };
    res.status(201).json(parsed);
  } catch (error: any) {
    console.error('Error creating environment:', error);
    if (error.message?.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Environment with this key already exists' });
    }
    res.status(500).json({ error: 'Failed to create environment' });
  }
});

// Update environment
router.put('/:id', (req, res) => {
  try {
    const {
      name,
      key,
      description,
      baseUrl,
      apiUrl,
      username,
      password,
      timeout,
      browser,
      headless,
      jiraEnabled,
      jiraUrl,
      jiraUsername,
      jiraPassword,
      jiraProjectKey,
      llmEnabled,
      llmProvider,
      llmModel,
      llmApiKey,
      llmBaseUrl,
      authorizationEnabled,
      authType,
      authToken,
      status,
    } = req.body;

    // Check if environment exists
    const existing = db.prepare('SELECT * FROM environments WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    // If key is being updated, check for conflicts
    if (key && key !== (existing as any).key) {
      const keyConflict = db.prepare('SELECT id FROM environments WHERE key = ? AND id != ?').get(key, req.params.id);
      if (keyConflict) {
        return res.status(400).json({ error: 'Environment with this key already exists' });
      }
    }

    const now = Date.now();
    const updates: string[] = [];
    const values: any[] = [];

    // Build dynamic update query
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (key !== undefined) {
      updates.push('key = ?');
      values.push(key);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (baseUrl !== undefined) {
      updates.push('baseUrl = ?');
      values.push(baseUrl);
    }
    if (apiUrl !== undefined) {
      updates.push('apiUrl = ?');
      values.push(apiUrl || null);
    }
    if (username !== undefined) {
      updates.push('username = ?');
      values.push(username || null);
    }
    if (password !== undefined) {
      updates.push('password = ?');
      values.push(password || null);
    }
    if (timeout !== undefined) {
      updates.push('timeout = ?');
      values.push(timeout);
    }
    if (browser !== undefined) {
      updates.push('browser = ?');
      values.push(browser);
    }
    if (headless !== undefined) {
      updates.push('headless = ?');
      values.push(headless ? 1 : 0);
    }
    if (jiraEnabled !== undefined) {
      updates.push('jiraEnabled = ?');
      values.push(jiraEnabled ? 1 : 0);
    }
    if (jiraUrl !== undefined) {
      updates.push('jiraUrl = ?');
      values.push(jiraUrl || null);
    }
    if (jiraUsername !== undefined) {
      updates.push('jiraUsername = ?');
      values.push(jiraUsername || null);
    }
    if (jiraPassword !== undefined) {
      updates.push('jiraPassword = ?');
      values.push(jiraPassword || null);
    }
    if (jiraProjectKey !== undefined) {
      updates.push('jiraProjectKey = ?');
      values.push(jiraProjectKey || null);
    }
    if (llmEnabled !== undefined) {
      updates.push('llmEnabled = ?');
      values.push(llmEnabled ? 1 : 0);
    }
    if (llmProvider !== undefined) {
      updates.push('llmProvider = ?');
      values.push(llmProvider || null);
    }
    if (llmModel !== undefined) {
      updates.push('llmModel = ?');
      values.push(llmModel || null);
    }
    if (llmApiKey !== undefined) {
      updates.push('llmApiKey = ?');
      values.push(llmApiKey || null);
    }
    if (llmBaseUrl !== undefined) {
      updates.push('llmBaseUrl = ?');
      values.push(llmBaseUrl || null);
    }
    if (authorizationEnabled !== undefined) {
      updates.push('authorizationEnabled = ?');
      values.push(authorizationEnabled ? 1 : 0);
    }
    if (authType !== undefined) {
      updates.push('authType = ?');
      values.push(authType || null);
    }
    if (authToken !== undefined) {
      updates.push('authToken = ?');
      values.push(authToken || null);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    updates.push('updatedAt = ?');
    values.push(now);
    values.push(req.params.id);

    if (updates.length === 1) {
      // Only updatedAt was updated
      db.prepare('UPDATE environments SET updatedAt = ? WHERE id = ?').run(now, req.params.id);
    } else {
      db.prepare(`UPDATE environments SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM environments WHERE id = ?').get(req.params.id);
    const parsed = {
      ...(updated as any),
      headless: Boolean((updated as any).headless),
      jiraEnabled: Boolean((updated as any).jiraEnabled),
      llmEnabled: Boolean((updated as any).llmEnabled),
      authorizationEnabled: Boolean((updated as any).authorizationEnabled),
    };
    res.json(parsed);
  } catch (error: any) {
    console.error('Error updating environment:', error);
    if (error.message?.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Environment with this key already exists' });
    }
    res.status(500).json({ error: 'Failed to update environment' });
  }
});

// Delete environment
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM environments WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Environment not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting environment:', error);
    res.status(500).json({ error: 'Failed to delete environment' });
  }
});

export default router;
