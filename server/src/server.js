import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { lintCode } from './services/linterService.js';
import { reviewCodeWithGemini } from './services/geminiService.js';
import { calculateQualityScore } from './utils/scoringAlgorithm.js';
import { fetchGitHubFile } from './services/githubService.js';
import { Submission } from './models/Submission.js';
import mongoose from 'mongoose'; // <--- Add this at line 8

dotenv.config();

// Connect to MongoDB Atlas (non-blocking)
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Local in-memory store so history works even if Atlas is offline
let localSubmissions = [];

// Global Middleware
app.use(cors());
app.use(express.json());

// 1. Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'CodeSense AI backend is running',
    timestamp: new Date().toISOString()
  });
});

// 2. GitHub Fetch Route (Public + Private Repos)
app.post('/api/github/fetch', async (req, res) => {
  try {
    const { url, token } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'Please provide a GitHub URL' });
    const fileData = await fetchGitHubFile(url, token);
    res.status(200).json({ success: true, data: fileData });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
// GitHub OAuth: Exchange temporary 'code' for an access token
app.post('/api/auth/github/token', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'OAuth code is required' });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'GitHub OAuth credentials not configured on server' });
    }

    // Request access token from GitHub
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description || tokenData.error });
    }

    // Return the access token to the frontend
    res.json({ accessToken: tokenData.access_token });
  } catch (err) {
    console.error('GitHub OAuth token exchange error:', err);
    res.status(500).json({ error: 'Failed to exchange GitHub OAuth code' });
  }
});
app.get('/api/auth/github/client-id', (req, res) => {
  res.json({ clientId: process.env.GITHUB_CLIENT_ID || '' });
});
// 3. Quick Linter Route
app.post('/api/lint', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Please provide code in request body' });
    const issues = await lintCode(code);
    res.status(200).json({ success: true, issueCount: issues.length, issues });
  } catch (error) {
    res.status(500).json({ error: 'Failed to lint code' });
  }
});

// 4. Hybrid Review Route
app.post('/api/review', async (req, res) => {
  try {
    const { code, studentName, projectName, sourceType, githubUrl } = req.body;
    if (!code) return res.status(400).json({ error: 'Please provide code in request body' });

    console.log(' Running ESLint static analysis...');
    const linterIssues = await lintCode(code);

    console.log(' Sending code and linter findings to Gemini AI...');
    const aiReview = await reviewCodeWithGemini(code, linterIssues);

    console.log(' Calculating Quality Score...');
    const scoreData = calculateQualityScore(aiReview.issues || []);

    const submissionData = {
      studentName: studentName || 'Alex Chen',
      projectName: projectName || 'Assignment 1 - Auth',
      sourceType: sourceType || 'paste',
      githubUrl: githubUrl || '',
      code,
      score: scoreData.score,
      grade: scoreData.grade,
      label: scoreData.label,
      totalIssues: scoreData.totalIssues,
      severityCounts: scoreData.severityCounts,
      summary: aiReview.summary,
      breakdown: scoreData.breakdown,
      issues: aiReview.issues || [],
      improvedCode: aiReview.improvedCode || code, // <--- Passes the corrected code for Split Diff!
      createdAt: new Date().toISOString()
    };

    // Save to local cache first
    localSubmissions.unshift({ ...submissionData, _id: Date.now().toString() });

    // Save to MongoDB (let MongoDB generate its own clean _id)
    try {
      const savedDoc = await Submission.create(submissionData);
      console.log(` Saved submission to MongoDB! ID: ${savedDoc._id}`);
      submissionData._id = savedDoc._id;
    } catch (dbErr) {
      console.warn(' MongoDB Atlas offline; saved to local cache:', dbErr.message);
    }

    // Return submissionData directly so frontend can read result.score, result.issues, etc.
    res.status(200).json(submissionData);
  } catch (error) {
    console.error('Review endpoint error:', error);
    res.status(500).json({
      error: error.message || 'Failed to complete review'
    });
  }
});

// 5. Get Submissions History Route (MongoDB + Local Fallback)
app.get('/api/submissions', async (req, res) => {
  try {
    // If MongoDB is connected, get latest from database
    if (mongoose.connection.readyState === 1) {
      const dbSubmissions = await Submission.find().sort({ createdAt: -1 }).limit(50);
      return res.status(200).json(dbSubmissions);
    }
    // If MongoDB Atlas is offline or not whitelisted, serve local cache immediately
    console.log('Serving submissions from local cache (in-memory)...');
    return res.status(200).json(localSubmissions);
  } catch (error) {
    console.warn('Database error; falling back to local cache:', error.message);
    return res.status(200).json(localSubmissions);
  }
});
app.post('/api/submissions/seed', (req, res) => {
  const demoData = [
    {
      _id: 'seed-1',
      studentName: 'Alex Chen',
      projectName: 'Auth Module',
      score: 65,
      grade: 'D',
      label: 'Needs Improvement',
      issues: [{ severity: 'high' }, { severity: 'high' }, { severity: 'medium' }],
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
    },
    {
      _id: 'seed-2',
      studentName: 'Sarah Jenkins',
      projectName: 'Shopping Cart API',
      score: 92,
      grade: 'A',
      label: 'Excellent',
      issues: [{ severity: 'low' }],
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      _id: 'seed-3',
      studentName: 'Marcus Vance',
      projectName: 'Payment Gateway',
      score: 84,
      grade: 'B',
      label: 'Good',
      issues: [{ severity: 'medium' }, { severity: 'low' }],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      _id: 'seed-4',
      studentName: 'Priya Sharma',
      projectName: 'User Profile Service',
      score: 78,
      grade: 'C',
      label: 'Fair',
      issues: [{ severity: 'high' }, { severity: 'medium' }],
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
    },
    {
      _id: 'seed-5',
      studentName: 'afsah haseeb',
      projectName: 'Auth Module',
      score: 65,
      grade: 'D',
      label: 'Needs Improvement',
      issues: [{ severity: 'high' }, { severity: 'high' }, { severity: 'medium' }],
      createdAt: new Date().toISOString()
    }
  ];

  localSubmissions = [...demoData, ...localSubmissions];
  res.json({ success: true, count: demoData.length });
});
// Serve static client build in production
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// For any non-API route, serve index.html (SPA routing)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  }
});
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`CodeSense AI Server running on http://localhost:${PORT}`);
  });
}

export default app;