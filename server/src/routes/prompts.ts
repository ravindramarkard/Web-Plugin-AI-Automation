import express from 'express';
import db from '../db/index.js';

const router = express.Router();

// Get all prompts for a project
router.get('/project/:projectId', (req, res) => {
  try {
    const prompts = db
      .prepare('SELECT * FROM prompts WHERE projectId = ? ORDER BY createdAt DESC')
      .all(req.params.projectId);
    // Parse tags JSON
    const parsedPrompts = prompts.map((p: any) => ({
      ...p,
      tags: p.tags ? JSON.parse(p.tags) : [],
    }));
    res.json(parsedPrompts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

// Get prompt by ID
router.get('/:id', (req, res) => {
  try {
    const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(req.params.id);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    // Parse tags JSON
    const parsedPrompt = {
      ...prompt,
      tags: (prompt as any).tags ? JSON.parse((prompt as any).tags) : [],
    };
    res.json(parsedPrompt);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
});

// Create prompt
router.post('/', (req, res) => {
  try {
    const {
      projectId,
      title,
      description,
      promptContent,
      testType,
      tags,
      additionalContext,
      baseUrl,
      additionalInformation,
    } = req.body;
    if (!projectId || !title || !description || !promptContent || !testType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    db.prepare(
      'INSERT INTO prompts (id, projectId, title, description, promptContent, testType, tags, additionalContext, baseUrl, additionalInformation, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      id,
      projectId,
      title,
      description,
      promptContent,
      testType,
      JSON.stringify(tags || []),
      additionalContext || null,
      baseUrl || null,
      additionalInformation || null,
      now,
      now,
    );

    const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(id);
    const parsedPrompt = {
      ...prompt,
      tags: (prompt as any).tags ? JSON.parse((prompt as any).tags) : [],
    };
    res.status(201).json(parsedPrompt);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create prompt' });
  }
});

// Update prompt
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM prompts WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    const updates = {
      title: req.body.title ?? existing.title,
      description: req.body.description ?? existing.description,
      promptContent: req.body.promptContent ?? existing.promptContent,
      testType: req.body.testType ?? existing.testType,
      tags: req.body.tags !== undefined ? JSON.stringify(req.body.tags) : (existing as any).tags,
      additionalContext:
        req.body.additionalContext !== undefined ? req.body.additionalContext : existing.additionalContext,
      baseUrl: req.body.baseUrl !== undefined ? req.body.baseUrl : existing.baseUrl,
      additionalInformation:
        req.body.additionalInformation !== undefined ? req.body.additionalInformation : existing.additionalInformation,
      updatedAt: Date.now(),
    };

    db.prepare(
      'UPDATE prompts SET title = ?, description = ?, promptContent = ?, testType = ?, tags = ?, additionalContext = ?, baseUrl = ?, additionalInformation = ?, updatedAt = ? WHERE id = ?',
    ).run(
      updates.title,
      updates.description,
      updates.promptContent,
      updates.testType,
      updates.tags,
      updates.additionalContext,
      updates.baseUrl,
      updates.additionalInformation,
      updates.updatedAt,
      req.params.id,
    );

    const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(req.params.id);
    const parsedPrompt = {
      ...prompt,
      tags: (prompt as any).tags ? JSON.parse((prompt as any).tags) : [],
    };
    res.json(parsedPrompt);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

// Delete prompt
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM prompts WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

// Duplicate prompt
router.post('/:id/duplicate', (req, res) => {
  try {
    const original = db.prepare('SELECT * FROM prompts WHERE id = ?').get(req.params.id);
    if (!original) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    const id = `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const newProjectId = req.body.projectId || (original as any).projectId;

    db.prepare(
      'INSERT INTO prompts (id, projectId, title, description, promptContent, testType, tags, additionalContext, baseUrl, additionalInformation, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      id,
      newProjectId,
      `${(original as any).title} (Copy)`,
      (original as any).description,
      (original as any).promptContent,
      (original as any).testType,
      (original as any).tags,
      (original as any).additionalContext,
      (original as any).baseUrl,
      (original as any).additionalInformation,
      now,
      now,
    );

    const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(id);
    const parsedPrompt = {
      ...prompt,
      tags: (prompt as any).tags ? JSON.parse((prompt as any).tags) : [],
    };
    res.status(201).json(parsedPrompt);
  } catch (error) {
    res.status(500).json({ error: 'Failed to duplicate prompt' });
  }
});

export default router;
