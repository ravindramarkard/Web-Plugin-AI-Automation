import express from 'express';
import db from '../db/index.js';

const router: express.Router = express.Router();

// Get all settings
router.get('/', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings').all();
    const result = settings.reduce((acc: any, curr: any) => {
      try {
        acc[curr.key] = JSON.parse(curr.value);
      } catch (e) {
        acc[curr.key] = curr.value;
      }
      return acc;
    }, {});
    res.json(result);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get setting by key
router.get('/:key', (req, res) => {
  try {
    const setting = db.prepare('SELECT * FROM settings WHERE key = ?').get(req.params.key);
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    try {
      res.json(JSON.parse((setting as any).value));
    } catch (e) {
      res.json((setting as any).value);
    }
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Update setting
router.post('/', (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updatedAt)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updatedAt = excluded.updatedAt
    `);

    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    stmt.run(key, valueStr, Date.now());
    res.json({ success: true, key, value });
  } catch (error) {
    console.error('Error saving setting:', error);
    res.status(500).json({ error: 'Failed to save setting' });
  }
});

export default router;
