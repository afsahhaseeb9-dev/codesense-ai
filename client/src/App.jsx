import React, { useState, useEffect } from 'react';
import './App.css';
import Editor, { DiffEditor } from '@monaco-editor/react';
import {
  Code,
  FileCode,
  Sparkles,
  GitCompare,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Printer,
  History,
  Users,
  Search,
  Filter,
  BarChart2,
  ExternalLink,
  RefreshCw,
  Lock,
  Unlock,
  Key
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// Automatically use local backend in development, and live Vercel domain in production
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:5000'
  : '';

// Custom inline SVG GitHub Icon
function GithubIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

// Circular Score Gauge Component
function ScoreRing({ score = 0, grade = 'N/A', size = 116, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(Math.max(score, 0), 100);
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const getColor = (s) => {
    if (s >= 90) return { stroke: '#10B981', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (s >= 80) return { stroke: '#3B82F6', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (s >= 70) return { stroke: '#F59E0B', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (s >= 60) return { stroke: '#F97316', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
    return { stroke: '#EF4444', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  const scheme = getColor(clampedScore);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={scheme.stroke}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-extrabold text-slate-800 leading-none">{clampedScore}</span>
        <span className={`text-[10px] font-bold uppercase mt-1 px-2 py-0.5 rounded-full border ${scheme.bg}`}>
          Grade {grade}
        </span>
      </div>
    </div>
  );
}

const DEFAULT_CODE = `// Sample buggy JavaScript code to test
const apiKey = "AIzaSyD-secret-demo-key-12345";

function login(user, pass) {
  if (user == "admin") {
    console.log("Welcome Admin! Access granted.");
    return true;
  }
}

login("admin", "wrong_password");`;

export default function App() {
  const [activeTab, setActiveTab] = useState('reviewer'); // 'reviewer' | 'history' | 'teacher'
  const [inputMode, setInputMode] = useState('paste');    // 'paste' | 'github'
  const [editorMode, setEditorMode] = useState('code');   // 'code' | 'diff'
  const [code, setCode] = useState(DEFAULT_CODE);
  const [githubUrl, setGithubUrl] = useState('');
  const [studentName, setStudentName] = useState('Alex Chen');
  const [projectName, setProjectName] = useState('Auth Module');

  // GitHub OAuth Token State
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('codesense_github_token') || '');
  const [oauthLoading, setOauthLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all' | 'high' | 'medium' | 'low'

  // History & Teacher data
  const [submissions, setSubmissions] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState('');

  // Handle OAuth code exchange upon redirect from GitHub
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      setOauthLoading(true);
      fetch(`${API_BASE}/api/auth/github/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
        .then(res => res.json())
        .then(data => {
          if (data.accessToken) {
            setGithubToken(data.accessToken);
            localStorage.setItem('codesense_github_token', data.accessToken);
            setSuccessMsg('GitHub OAuth connected! Private repositories are now unlocked.');
          } else {
            setError(data.error || 'Failed to authorize with GitHub');
          }
        })
        .catch(err => {
          console.error('OAuth token exchange failed:', err);
          setError('Could not complete GitHub authorization.');
        })
        .finally(() => {
          setOauthLoading(false);
          // Remove '?code=...' from browser URL bar cleanly
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
  }, []);

  // Initiate GitHub OAuth Login
  const handleConnectGithub = async () => {
    try {
      setError('');
      const res = await fetch(`${API_BASE}/api/auth/github/client-id`);
      const { clientId } = await res.json();
      if (!clientId) {
        setError('GitHub Client ID is not configured');
        return;
      }
      // Redirect user to GitHub OAuth authorize screen
      window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo`;
    } catch (err) {
      setError('Could not start GitHub OAuth.');
    }
  };

  const handleDisconnectGithub = () => {
    setGithubToken('');
    localStorage.removeItem('codesense_github_token');
    setSuccessMsg('Disconnected from GitHub OAuth.');
  };

  // Fetch submissions safely from backend
  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/submissions`);
      if (res.ok) {
        const result = await res.json();
        const list = Array.isArray(result) ? result : (result?.data || []);
        setSubmissions(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.warn('Could not fetch submissions from server:', err);
      setSubmissions([]);
    }
  };

  const handleSeedDemoData = async () => {
    try {
      await fetch(`${API_BASE}/api/submissions/seed`, { method: 'POST' });
      await fetchSubmissions();
    } catch (e) {
      console.error('Failed to seed demo data:', e);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [reviewResult]);

  // Handle GitHub URL fetch (Supports Public + Private repos via OAuth token)
  const handleFetchGithub = async () => {
    if (!githubUrl.trim()) {
      setError('Please enter a valid GitHub file URL');
      return;
    }
    setError('');
    setFetchLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/github/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: githubUrl,
          token: githubToken || null
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch GitHub code');
      setCode(data.data?.code || data.code || '');
      setInputMode('paste');
      setSuccessMsg(`Successfully fetched ${data.data?.fileName || 'code'} from GitHub!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetchLoading(false);
    }
  };

  // Run Code Review
  const handleRunAnalysis = async () => {
    if (!code.trim()) {
      setError('Please provide code to analyze');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          studentName,
          projectName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Review failed');
      setReviewResult(data);
      setSeverityFilter('all');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Copy Fix Snippet
  const handleCopyFix = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Export to Markdown (.md)
  const handleExportMarkdown = () => {
    if (!reviewResult) return;
    const timestamp = new Date().toLocaleString();
    const mdContent = `# 🚀 CodeSense AI - Quality Review Report

**Project Name:** ${projectName || 'Untitled Project'}  
**Student:** ${studentName || 'Anonymous'}  
**Date:** ${timestamp}  
**Overall Score:** ${reviewResult.score}/100 (Grade ${reviewResult.grade} - ${reviewResult.label})  

---

## 📊 Summary
- **Total Issues Detected:** ${reviewResult.totalIssues || 0}
- **🚨 High Severity:** ${reviewResult.severityCounts?.high || 0}
- **⚠️ Medium Severity:** ${reviewResult.severityCounts?.medium || 0}
- **ℹ️ Low Severity:** ${reviewResult.severityCounts?.low || 0}

---

## 🔍 Detailed Issues & Suggested Fixes

${(reviewResult.issues || []).map((issue, idx) => `
### ${idx + 1}. [${issue.severity?.toUpperCase() || 'INFO'}] ${issue.type?.toUpperCase() || 'GENERAL'} (Line ${issue.line || 'N/A'})
- **Issue:** ${issue.message}
- **Explanation:** ${issue.explanation || 'No detailed explanation provided.'}
${issue.suggestedFix ? `
\`\`\`javascript
// Suggested Fix:
${issue.suggestedFix}
\`\`\`
` : ''}
`).join('\n')}

---
*Report generated automatically by CodeSense AI*
`;

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(projectName || 'code-review').toLowerCase().replace(/\s+/g, '-')}-report.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export / Print PDF
  const handleExportPDF = () => {
    window.print();
  };

  // Filter issues by severity
  const filteredIssues = (reviewResult?.issues || []).filter(issue => {
    if (severityFilter === 'all') return true;
    return (issue.severity || '').toLowerCase() === severityFilter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/60 via-slate-50 to-pink-50/40 text-slate-800 flex flex-col font-sans">
      {/* Header / Navigation Bar */}
      <header className="no-print bg-white/80 backdrop-blur-md border-b border-indigo-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                CodeSense AI
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                v1.3 OAuth Enabled
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('reviewer')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'reviewer'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code className="w-4 h-4 text-indigo-500" />
              <span>Reviewer</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4 text-purple-500" />
              <span>Score History</span>
            </button>

            <button
              onClick={() => setActiveTab('teacher')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'teacher'
                  ? 'bg-white text-pink-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-pink-500" />
              <span>Teacher View</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">
        {error && (
          <div className="no-print mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between shadow-sm">
            <span>🚨 {error}</span>
            <button onClick={() => setError('')} className="font-bold ml-4 text-rose-500 hover:text-rose-800">
              ✕
            </button>
          </div>
        )}

        {successMsg && (
          <div className="no-print mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center justify-between shadow-sm">
            <span>✅ {successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="font-bold ml-4 text-emerald-500 hover:text-emerald-800">
              ✕
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 1: CODE REVIEWER                                         */}
        {/* ============================================================== */}
        {activeTab === 'reviewer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Inputs & Monaco Editor (7 Cols) */}
            <div className="no-print lg:col-span-7 flex flex-col space-y-4">
              {/* Metadata Inputs Card */}
              <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Student Name
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. Alex Chen"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Project / Module
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Authentication API"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Input Mode Selector & Monaco Editor */}
              <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50/70">
                  {/* Left Side: Paste vs GitHub Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setInputMode('paste')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        inputMode === 'paste'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 bg-slate-200/60'
                      }`}
                    >
                      Paste Code
                    </button>

                    <button
                      onClick={() => setInputMode('github')}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        inputMode === 'github'
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 bg-slate-200/60'
                      }`}
                    >
                      <GithubIcon className="w-3.5 h-3.5" />
                      <span>Fetch from GitHub</span>
                    </button>
                  </div>

                  {/* Right Side: Code Editor vs Split Diff Toggle */}
                  <div className="flex items-center space-x-1 bg-slate-200/70 p-1 rounded-xl">
                    <button
                      onClick={() => setEditorMode('code')}
                      className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        editorMode === 'code'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>Code Editor</span>
                    </button>
                    <button
                      onClick={() => setEditorMode('diff')}
                      disabled={!reviewResult}
                      className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        editorMode === 'diff'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                      title={!reviewResult ? "Analyze code first to see diff" : "View side-by-side comparison"}
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                      <span>Split Diff</span>
                    </button>
                  </div>
                </div>

                {/* GitHub URL Input Bar & OAuth Authorization Status */}
                {inputMode === 'github' && (
                  <div className="p-3 bg-indigo-50/60 border-b border-indigo-100 flex flex-col gap-2">
                    {/* OAuth Connection Status Strip */}
                    <div className="flex items-center justify-between text-xs pb-1">
                      {githubToken ? (
                        <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>GitHub OAuth Active: <b>Private Repositories Unlocked</b></span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-slate-500">
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                          <span>Reviewing public repositories. Need private access?</span>
                        </div>
                      )}

                      {githubToken ? (
                        <button
                          onClick={handleDisconnectGithub}
                          className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={handleConnectGithub}
                          disabled={oauthLoading}
                          className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold transition-all shadow-sm"
                        >
                          <Key className="w-3 h-3 text-indigo-600" />
                          <span>Authorize GitHub (OAuth)</span>
                        </button>
                      )}
                    </div>

                    {/* URL Input Bar */}
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <div className="relative flex-1 w-full">
                        <input
                          type="text"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                          placeholder="e.g. https://github.com/owner/repo/blob/main/index.js (Public or Private)"
                          className="w-full px-3 py-2 text-xs bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-mono"
                        />
                      </div>
                      <button
                        onClick={handleFetchGithub}
                        disabled={fetchLoading}
                        className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 shadow-sm"
                      >
                        {fetchLoading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Fetching...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Fetch Code</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Monaco Editor Container */}
                <div className="h-[460px] border-t border-slate-100">
                  {editorMode === 'diff' && reviewResult ? (
                    <DiffEditor
                      height="100%"
                      language="javascript"
                      theme="vs"
                      original={code}
                      modified={reviewResult.improvedCode || code}
                      options={{
                        readOnly: true,
                        renderSideBySide: true,
                        minimap: { enabled: false },
                        fontSize: 13,
                        scrollBeyondLastLine: false,
                        fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                      }}
                    />
                  ) : (
                    <Editor
                      height="100%"
                      defaultLanguage="javascript"
                      theme="vs"
                      value={code}
                      onChange={(val) => setCode(val || '')}
                      options={{
                        fontSize: 13,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: 'on',
                        roundedSelection: true,
                        fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                      }}
                    />
                  )}
                </div>

                {/* Analyze Trigger Footer */}
                <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Ready to audit code with ESLint + Gemini AI</span>
                  <button
                    onClick={handleRunAnalysis}
                    disabled={loading}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center space-x-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Analyzing Code...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Analyze Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Review Results & Export Tools (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col space-y-4 printable-area">
              {reviewResult ? (
                <>
                  {/* Score & Quality Hero Card */}
                  <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm flex items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

                    <div className="flex items-center space-x-4">
                      <ScoreRing score={reviewResult.score} grade={reviewResult.grade} />
                      <div>
                        <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Quality Score</div>
                        <h3 className="text-lg font-bold text-slate-800">{reviewResult.label}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {reviewResult.totalIssues} issue{reviewResult.totalIssues === 1 ? '' : 's'} identified
                        </p>
                      </div>
                    </div>

                    {/* Breakdown Badges */}
                    <div className="flex flex-col items-end space-y-1 text-xs">
                      <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                        🚨 {reviewResult.severityCounts?.high || 0} High
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                        ⚠️ {reviewResult.severityCounts?.medium || 0} Med
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 font-semibold border border-sky-200">
                        ℹ️ {reviewResult.severityCounts?.low || 0} Low
                      </span>
                    </div>
                  </div>

                  {/* Export & Action Toolbar */}
                  <div className="no-print bg-white p-3 rounded-2xl border border-indigo-100 shadow-sm flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-400 pl-2">Export Report:</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleExportMarkdown}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                        title="Download Markdown summary"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export .MD</span>
                      </button>

                      <button
                        onClick={handleExportPDF}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                        title="Print or Save as PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Save PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter Tabs by Severity */}
                  <div className="no-print flex items-center space-x-2 overflow-x-auto pb-1">
                    {['all', 'high', 'medium', 'low'].map((sev) => (
                      <button
                        key={sev}
                        onClick={() => setSeverityFilter(sev)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all ${
                          severityFilter === sev
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {sev === 'all' ? `All (${reviewResult.issues?.length || 0})` : sev}
                      </button>
                    ))}
                  </div>

                  {/* Detailed Issues List */}
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {filteredIssues.length === 0 ? (
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        No issues found in this category!
                      </div>
                    ) : (
                      filteredIssues.map((issue, idx) => {
                        const isHigh = issue.severity === 'high';
                        const isMed = issue.severity === 'medium';

                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-2xl bg-white border shadow-sm transition-all ${
                              isHigh
                                ? 'border-rose-200 hover:border-rose-300'
                                : isMed
                                ? 'border-amber-200 hover:border-amber-300'
                                : 'border-sky-200 hover:border-sky-300'
                            }`}
                          >
                            {/* Issue Header */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                    isHigh
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : isMed
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-sky-50 text-sky-700 border-sky-200'
                                  }`}
                                >
                                  {issue.severity || 'low'}
                                </span>

                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                  {issue.type || 'lint'}
                                </span>

                                {issue.line && (
                                  <span className="text-[10px] font-mono text-slate-400">
                                    Line {issue.line}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Issue Message */}
                            <h4 className="text-sm font-bold text-slate-800 mb-1">{issue.message}</h4>
                            <p className="text-xs text-slate-600 leading-relaxed mb-3">
                              {issue.explanation}
                            </p>

                            {/* Suggested Fix Code Block */}
                            {issue.suggestedFix && (
                              <div className="mt-2 bg-slate-900 rounded-xl p-3 text-white text-xs font-mono relative overflow-hidden group">
                                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[10px] text-slate-400">
                                  <span>Suggested Fix</span>
                                  <button
                                    onClick={() => handleCopyFix(issue.suggestedFix, idx)}
                                    className="no-print flex items-center space-x-1 text-slate-300 hover:text-white transition-colors"
                                  >
                                    {copiedIndex === idx ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-400" />
                                        <span className="text-emerald-400">Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <pre className="overflow-x-auto text-emerald-300 font-mono text-xs whitespace-pre-wrap">
                                  {issue.suggestedFix}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                /* Empty Placeholder State */
                <div className="bg-white rounded-2xl border border-indigo-100 p-8 shadow-sm flex flex-col items-center justify-center text-center h-[560px]">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-4 shadow-sm">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">No Review Performed Yet</h3>
                  <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                    Enter or fetch code on the left, then click <b>Analyze Code</b> to get quality scores, automated fixes, and downloadable reports.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: SCORE HISTORY                                         */}
        {/* ============================================================== */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Performance Over Time</h2>
                  <p className="text-xs text-slate-500">Quality score trends across recent submissions</p>
                </div>
                <button
                  onClick={fetchSubmissions}
                  className="flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {(submissions || []).length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={(submissions || []).map((sub, i) => ({
                        run: `#${i + 1}`,
                        score: Number(sub?.score) || 0,
                        student: sub?.studentName || 'Student',
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="run" stroke="#94A3B8" fontSize={11} />
                      <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E2E8F0',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#6366F1"
                        strokeWidth={3}
                        dot={{ fill: '#6366F1', r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center py-12 text-slate-400 text-sm">No recorded submissions yet.</p>
              )}
            </div>

            {/* Table of Past Submissions */}
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Submission Log</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Grade</th>
                      <th className="px-4 py-3">Issues</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(submissions || []).map((sub, idx) => (
                      <tr key={sub?._id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">{sub?.studentName || 'Anonymous'}</td>
                        <td className="px-4 py-3 text-slate-500">{sub?.projectName || 'Project'}</td>
                        <td className="px-4 py-3 font-bold text-indigo-600">{sub?.score ?? 0} / 100</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {sub?.grade || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono">{(sub?.issues || []).length}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {sub?.createdAt ? new Date(sub.createdAt).toLocaleDateString() : 'Today'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: TEACHER VIEW                                          */}
        {/* ============================================================== */}
        {activeTab === 'teacher' && (
          <div className="space-y-6">
            {/* Demo Data Seeder Banner */}
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-4 rounded-2xl text-white shadow-md flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Classroom Insights & Analytics</h3>
                <p className="text-xs text-indigo-100">Monitor student grades, average scores, and common code vulnerabilities.</p>
              </div>
              <button
                onClick={handleSeedDemoData}
                className="px-3 py-1.5 bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
              >
                <span>✨ Populate Demo Class</span>
              </button>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase">Total Submissions</div>
                  <div className="text-2xl font-black text-slate-800 mt-1">{(submissions || []).length}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  📝
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase">Class Average Score</div>
                  <div className="text-2xl font-black text-indigo-600 mt-1">
                    {(submissions || []).length > 0
                      ? Math.round(
                          submissions.reduce((acc, s) => acc + (Number(s?.score) || 0), 0) / submissions.length
                        )
                      : 0}
                    <span className="text-sm font-normal text-slate-400"> / 100</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  🎯
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase">Most Common Issue</div>
                  <div className="text-lg font-bold text-amber-600 mt-1">Security / Secrets</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  ⚠️
                </div>
              </div>
            </div>

            {/* Student Search & Directory */}
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-800">Student Performance Directory</h3>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    placeholder="Search by student name..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Score & Grade</th>
                      <th className="px-4 py-3">Issues Found</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(submissions || [])
                      .filter((s) =>
                        String(s?.studentName || '')
                          .toLowerCase()
                          .includes(String(teacherSearch || '').toLowerCase())
                      )
                      .map((sub, idx) => (
                        <tr key={sub?._id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900">{sub?.studentName || 'Anonymous'}</td>
                          <td className="px-4 py-3 text-slate-500">{sub?.projectName || 'Project'}</td>
                          <td className="px-4 py-3 font-semibold">
                            <span className="text-indigo-600 font-bold">{sub?.score ?? 0}</span> / 100
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 font-bold">
                              Grade {sub?.grade || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3">{(sub?.issues || []).length} issues</td>
                          <td className="px-4 py-3">
                            {(sub?.score ?? 0) >= 80 ? (
                              <span className="text-emerald-600 font-bold flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Passed</span>
                              </span>
                            ) : (
                              <span className="text-amber-600 font-bold flex items-center space-x-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Needs Review</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="no-print bg-white border-t border-indigo-100 py-4 text-center text-xs text-slate-400">
        CodeSense AI • Smart Automated Code Quality & Classroom Insights
      </footer>
    </div>
  );
}