import React, { useState, useEffect } from 'react';
import { X, Save, Globe, Key } from 'lucide-react';
import { LiveConfig } from '../services/geminiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: LiveConfig;
  onSave: (config: LiveConfig) => void;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, config, onSave }) => {
  const [url, setUrl] = useState(config.endpointUrl || '');
  const [apiKey, setApiKey] = useState(config.apiKey || '');

  useEffect(() => {
    if (isOpen) {
        setUrl(config.endpointUrl || '');
        setApiKey(config.apiKey || '');
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleSave = () => {
      onSave({
          endpointUrl: url.trim() || undefined,
          apiKey: apiKey.trim() || undefined
      });
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 scale-100">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
            <h3 className="font-bold text-slate-200">Live Connection Settings</h3>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>
        
        <div className="p-6 space-y-6">
            <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                    <Globe size={14} /> Custom Endpoint URL
                </label>
                <input 
                    type="text" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-proxy.com/api/generate"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 transition-all"
                />
                <p className="text-[10px] text-slate-600">
                    Optional. If set, requests will be POSTed to this URL. Useful for proxies.
                </p>
            </div>

            <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                    <Key size={14} /> API Key Override
                </label>
                <input 
                    type="password" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 transition-all"
                />
                <p className="text-[10px] text-slate-600">
                    Optional. Overrides the default <code>process.env.API_KEY</code> if you are running a build without env vars.
                </p>
            </div>

            <div className="bg-sky-900/20 border border-sky-500/20 rounded-lg p-3">
                <p className="text-xs text-sky-400">
                    <strong>Note:</strong> These settings are stored in your browser's local storage and only affect <strong>LIVE</strong> mode.
                </p>
            </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-bold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-2 transition-all">
                <Save size={16} /> Save Settings
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;