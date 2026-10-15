import React, { useState, useEffect } from 'react';
import { Code2, CheckCircle2, Server, AlertCircle } from 'lucide-react';

function App() {
  // State variables to store the backend status and message
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking' | 'connected' | 'error'
  const [backendMessage, setBackendMessage] = useState('');

  useEffect(() => {
    // Ask our Express backend if it is running
    fetch('http://localhost:5000/api/health')
      .then((res) => {
        if (!res.ok) throw new Error('Server returned an error');
        return res.json();
      })
      .then((data) => {
        setBackendStatus('connected');
        setBackendMessage(data.message);
      })
      .catch((err) => {
        console.log('Retrying with 127.0.0.1...');
        // Fallback for Windows network resolution
        return fetch('http://127.0.0.1:5000/api/health')
          .then((res) => res.json())
          .then((data) => {
            setBackendStatus('connected');
            setBackendMessage(data.message);
          })
          .catch((finalErr) => {
            console.error('Backend connection failed:', finalErr);
            setBackendStatus('error');
          });
      });
  }, []); // Empty array [] means: run this once when the page loads

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-700">
        
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl">
            <Code2 size={40} />
          </div>
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-2">
          CodeSense AI
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          AI-Powered Code Reviewer & Mentorship System
        </p>

        {/* Live Status Badges */}
        <div className="flex flex-col gap-3 items-center">
          
          {/* Badge 1: Frontend Status */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-sm border border-emerald-500/20 w-fit">
            <CheckCircle2 size={16} />
            <span>Frontend & Tailwind Working</span>
          </div>

          {/* Badge 2: Backend Status */}
          {backendStatus === 'checking' && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-sm border border-amber-500/20 w-fit">
              <Server size={16} className="animate-pulse" />
              <span>Checking Backend Connection...</span>
            </div>
          )}

          {backendStatus === 'connected' && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-sm border border-blue-500/20 w-fit">
              <Server size={16} />
              <span>{backendMessage}</span>
            </div>
          )}

          {backendStatus === 'error' && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-400 text-sm border border-rose-500/20 w-fit">
              <AlertCircle size={16} />
              <span>Backend Offline (Check if port 5000 is running)</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;