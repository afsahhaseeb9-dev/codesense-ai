import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Code2, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Bug, 
  Palette, 
  Zap, 
  RefreshCw,
  Copy,
  Check,
  FileCode,
  Download,
  GitBranch
} from 'lucide-react';

// Built-in GitHub Icon (immune to library version changes)
const GithubIcon = ({ size = 14, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const SAMPLE_CODE = `let apiKey = "12345-SECRET";

function login(user, pass) {
  if (user == "admin") {
    console.log("Logged in!");
    return true;
  }
}`;

function App() {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);

  // GitHub Import State
  const [inputMode, setInputMode] = useState('paste'); // 'paste' | 'github'
  const [githubUrl, setGithubUrl] = useState('');
  const [isFetchingGithub, setIsFetchingGithub] = useState(false);
  const [importedFileInfo, setImportedFileInfo] = useState(null);

  // Check if backend is alive
  useEffect(() => {
    fetch('http://localhost:5000/api/health')
      .then((res) => res.json())
      .then(() => setBackendOnline(true))
      .catch(() => {
        fetch('http://127.0.0.1:5000/api/health')
          .then((res) => res.json())
          .then(() => setBackendOnline(true))
          .catch(() => setBackendOnline(false));
      });
  }, []);

  // Fetch code from GitHub
  const handleFetchGithub = async () => {
    if (!githubUrl.trim()) return;
    setIsFetchingGithub(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/github/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: githubUrl }),
      });

      const result = await response.json();
      if (result.success) {
        setCode(result.data.content);
        setImportedFileInfo(result.data);
        setReviewResult(null); // Clear previous review
      } else {
        alert(result.error || 'Failed to fetch GitHub file');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while connecting to backend');
    } finally {
      setIsFetchingGithub(false);
    }
  };

  // Submit code to review engine
  const handleAnalyze = async () => {
    if (!code.trim()) return;
    setIsAnalyzing(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      if (data.success) {
        setReviewResult(data.data);
      } else {
        alert('Review failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Could not reach backend server on port 5000.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyFix = (fixText, index) => {
    navigator.clipboard.writeText(fixText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 70) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* 1. Header / Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/20">
            <Code2 size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              CodeSense AI
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Hybrid Reviewer
              </span>
            </h1>
            <p className="text-xs text-slate-400">ESLint Grounding + Gemini 3.8 Flash</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            backendOnline 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`} />
            {backendOnline ? 'Backend Online (5000)' : 'Backend Offline'}
          </span>
        </div>
      </header>

      {/* 2. Main Content Layout */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input Tabs & Monaco Editor (7 cols) */}
        <section className="lg:col-span-7 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          
          {/* Ingestion Mode Tabs */}
          <div className="bg-slate-800/80 px-4 pt-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setInputMode('paste')}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition flex items-center gap-1.5 ${
                  inputMode === 'paste'
                    ? 'bg-slate-900 text-blue-400 border-t border-x border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileCode size={14} />
                Paste Code
              </button>

              <button
                onClick={() => setInputMode('github')}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition flex items-center gap-1.5 ${
                  inputMode === 'github'
                    ? 'bg-slate-900 text-blue-400 border-t border-x border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GithubIcon size={14} />
                GitHub Import
              </button>
            </div>

            {inputMode === 'paste' && (
              <button
                onClick={() => {
                  setCode(SAMPLE_CODE);
                  setImportedFileInfo(null);
                }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 transition"
                title="Reset with sample code"
              >
                <RefreshCw size={12} />
                Load Sample Code
              </button>
            )}
          </div>

          {/* GitHub URL Input Bar (Visible only when GitHub tab is selected) */}
          {inputMode === 'github' && (
            <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste GitHub URL (e.g., https://github.com/owner/repo/blob/main/file.js)"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
                <button
                  onClick={handleFetchGithub}
                  disabled={isFetchingGithub || !githubUrl.trim()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                >
                  {isFetchingGithub ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  Fetch Code
                </button>
              </div>

              {/* Quick sample button */}
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Public files only</span>
                <button
                  onClick={() => setGithubUrl('https://github.com/facebook/react/blob/main/packages/react/index.js')}
                  className="text-blue-400 hover:underline"
                >
                  Try Example URL (React index.js)
                </button>
              </div>
            </div>
          )}

          {/* File Metadata Pill if imported from GitHub */}
          {importedFileInfo && (
            <div className="bg-slate-950/60 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <GithubIcon size={12} className="text-blue-400" />
                <strong className="text-white">{importedFileInfo.repo}</strong> ➔ {importedFileInfo.path}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {importedFileInfo.branch}
              </span>
            </div>
          )}

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-[380px]">
            <Editor
              height="380px"
              language="javascript"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: true,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>

          {/* Action Bar */}
          <div className="p-4 bg-slate-800/40 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Lines: {code.split('\n').length} | Characters: {code.length}
            </span>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !code.trim() || !backendOnline}
              className={`px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg transition ${
                isAnalyzing || !code.trim() || !backendOnline
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 active:scale-95'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Reviewing with ESLint & Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Analyze Code</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Right Column: Review Report & Scores (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Placeholder when no review yet */}
          {!reviewResult && !isAnalyzing && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <div className="p-4 bg-slate-800 text-slate-400 rounded-2xl mb-4">
                <Sparkles size={36} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Ready for Analysis</h3>
              <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-6">
                Paste code or import from a GitHub repository on the left, then click <strong className="text-blue-400">"Analyze Code"</strong>.
              </p>
              <div className="text-xs text-slate-500 flex flex-col gap-2 text-left bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 w-full">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-blue-400" />
                  <span>Paste snippets or import public GitHub files</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-blue-400" />
                  <span>ESLint runs in-memory syntax checks</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-blue-400" />
                  <span>Gemini 3.8 Flash detects logic & security bugs</span>
                </div>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {isAnalyzing && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 flex flex-col items-center justify-center text-center h-full min-h-[400px] animate-pulse">
              <RefreshCw size={36} className="text-blue-400 animate-spin mb-4" />
              <h3 className="text-base font-semibold text-white mb-1">Analyzing Code</h3>
              <p className="text-xs text-slate-400">
                Running static linting and grounding Gemini reasoning...
              </p>
            </div>
          )}

          {/* Review Results Available */}
          {reviewResult && !isAnalyzing && (
            <div className="flex flex-col gap-4">
              
              {/* Score & Summary Card */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Quality Assessment</h2>
                    <p className="text-xs text-slate-400">Score & Grade</p>
                  </div>
                  
                  {/* Score Pill */}
                  <div className={`px-4 py-2 rounded-xl border font-bold text-xl flex items-center gap-2 ${getScoreColor(reviewResult.score)}`}>
                    <span>{reviewResult.score}</span>
                    <span className="text-xs font-normal opacity-70">/ 100</span>
                    <span className="text-sm ml-1 px-2 py-0.5 rounded bg-black/20">Grade {reviewResult.grade}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-4">
                  {reviewResult.summary}
                </p>

                {/* Category Breakdown Counters */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-800">
                    <span className="text-xs text-slate-400 block">Security</span>
                    <span className="text-sm font-bold text-rose-400">{reviewResult.breakdown?.security || 0}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-800">
                    <span className="text-xs text-slate-400 block">Bugs</span>
                    <span className="text-sm font-bold text-amber-400">{reviewResult.breakdown?.bug || 0}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-800">
                    <span className="text-xs text-slate-400 block">Style</span>
                    <span className="text-sm font-bold text-blue-400">{reviewResult.breakdown?.style || 0}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-800">
                    <span className="text-xs text-slate-400 block">Perf</span>
                    <span className="text-sm font-bold text-emerald-400">{reviewResult.breakdown?.performance || 0}</span>
                  </div>
                </div>
              </div>

              {/* Issues List Header */}
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Detected Issues ({reviewResult.issues?.length || 0})
                </h3>
              </div>

              {/* Scrollable Issue Cards */}
              <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
                {reviewResult.issues?.map((issue, idx) => (
                  <div 
                    key={idx}
                    className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col gap-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          issue.severity === 'high' 
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : issue.severity === 'medium'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {issue.severity}
                        </span>

                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          {issue.type}
                        </span>
                      </div>

                      <span className="text-xs font-mono px-2 py-0.5 bg-slate-800 rounded text-slate-300">
                        Line {issue.line}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-white">
                      {issue.message}
                    </h4>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {issue.explanation}
                    </p>

                    {issue.suggestedFix && (
                      <div className="mt-2 bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-mono text-xs">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span>Suggested Fix:</span>
                          <button
                            onClick={() => handleCopyFix(issue.suggestedFix, idx)}
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition"
                          >
                            {copiedIndex === idx ? <Check size={12} /> : <Copy size={12} />}
                            {copiedIndex === idx ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <pre className="text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                          {issue.suggestedFix}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>
          )}

        </section>

      </main>

    </div>
  );
}

export default App;