
import React, { useState } from 'react';
import { Zap, MessageCircle } from 'lucide-react';
import { askTutor } from '../services/geminiService';
import { MODELS } from '../constants';
import { SimulationState } from '../types';

interface Props {
  simulationState: SimulationState;
}

const ChatWidget: React.FC<Props> = ({ simulationState }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<{role: 'user'|'ai', text: string}[]>([{ role: 'ai', text: 'Welcome! Ask me about the cluster.' }]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const msg = input; setInput(""); setHistory(p => [...p, { role: 'user', text: msg }]); setLoading(true);
    
    // Mock context for tutor with multi-model support
    const activeModels = simulationState.activeModelIds.map(id => MODELS[id]?.name).join(', ');
    const context = `Active Models: ${activeModels}. Throughput: ${simulationState.metricsHistory.slice(-1)[0]?.totalThroughput || 0}.`;
    
    const answer = await askTutor(msg, context);
    setHistory(p => [...p, { role: 'ai', text: answer }]); setLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      {open && (
        <div className="pointer-events-auto w-80 md:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl mb-4 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-gradient-to-r from-sky-900 to-slate-900 p-4 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2"><Zap size={16} className="text-yellow-400 fill-yellow-400" /><span className="font-bold text-white text-sm">AI Tutor</span></div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">&times;</button>
          </div>
          <div className="h-80 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
            {history.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-sky-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>{m.text}</div>
              </div>
            ))}
            {loading && <div className="text-xs text-slate-500 animate-pulse">Thinking...</div>}
          </div>
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
            <input type="text" className="flex-grow bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" placeholder="Ask..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
            <button onClick={handleSend} disabled={loading} className="bg-sky-600 text-white p-2 rounded-lg"><Zap size={18} fill="currentColor" /></button>
          </div>
        </div>
      )}
      <button id="chat-widget-btn" onClick={() => setOpen(!open)} className="pointer-events-auto bg-sky-600 hover:bg-sky-500 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-105 flex items-center justify-center">
        {open ? <Zap size={24} className="fill-current" /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
};
export default ChatWidget;
