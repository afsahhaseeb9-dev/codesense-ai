import React from 'react';
import { Code2, CheckCircle2 } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-700">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl">
            <Code2 size={40} />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">
          CodeSense AI
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          AI-Powered Code Reviewer & Mentorship System
        </p>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-sm border border-emerald-500/20">
          <CheckCircle2 size={16} />
          <span>Frontend & Tailwind Working</span>
        </div>
      </div>
    </div>
  );
}

export default App;