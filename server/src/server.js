import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { lintCode } from './services/linterService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Global Middleware
app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'CodeSense AI backend is running',
    timestamp: new Date().toISOString()
  });
});

// Test Linter Endpoint
app.post('/api/lint', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Please provide code in request body' });
    }

    const issues = await lintCode(code);
    res.status(200).json({
      success: true,
      issueCount: issues.length,
      issues
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to lint code' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 CodeSense AI Server running on http://localhost:${PORT}`);
});