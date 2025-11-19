
import React from 'react';
import { X, Cpu, Thermometer, Zap, Activity, Server } from 'lucide-react';
import { ClusterNode, MetricPoint, NodeType } from '../types';
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis, CartesianGrid } from 'recharts';

interface Props {
  node: ClusterNode;
  onClose: () => void;
  metricsHistory: MetricPoint[];
}

const NodeDetailsModal: React.FC<Props> = ({ node, onClose, metricsHistory }) => {
  // Use last 100 points for the modal charts to show a decent trend
  const nodeHistory = metricsHistory.slice(-100).map(m => ({
    timestamp: m.timestamp,
    gpu: m.nodeGpuUtil?.[node.id] ?? 0,
    vram: m.nodeVramUtil?.[node.id] ?? 0,
    temp: m.nodeTemp?.[node.id] ?? 0,
    tokens: m.nodeActiveTokens?.[node.id] ?? 0
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-lg text-xs font-mono z-50">
          <p className="text-slate-400 mb-1">Tick: {label}</p>
          <div className="flex items-center gap-2">
            <span style={{ color: payload[0].stroke }}>
              {payload[0].name}:
            </span>
            <span className="font-bold text-slate-200">
              {Number(payload[0].value).toFixed(1)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const StatCard = ({ title, value, unit, icon: Icon, color, subText }: any) => (
    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0`} style={{ color }}>
            <Icon size={18} />
        </div>
        <div>
            <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">{title}</p>
            <div className="flex items-baseline gap-1">
                <span className="text-lg font-mono font-bold text-slate-200">{value}</span>
                <span className="text-xs text-slate-500">{unit}</span>
            </div>
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 scale-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-lg ${node.type === NodeType.HEAD ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-400'}`}>
                <Server size={20} />
             </div>
             <div>
                <h3 className="font-bold text-slate-100">{node.name}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">{node.id}</span>
                    <span className={`inline-block w-2 h-2 rounded-full ${node.status === 'COMPUTING' ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{node.status}</span>
                </div>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard title="GPU Util" value={node.gpuUtil.toFixed(1)} unit="%" icon={Cpu} color="#0ea5e9" />
                <StatCard title="VRAM" value={node.vramUtil.toFixed(1)} unit="%" icon={Activity} color="#e11d48" />
                <StatCard title="Temp" value={node.temp.toFixed(1)} unit="°C" icon={Thermometer} color="#f97316" />
                <StatCard title="Active Tokens" value={node.activeTokens} unit="" icon={Zap} color="#10b981" />
            </div>

            {/* Trends Section */}
            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Activity size={14} /> Performance Trends (Last 1h)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* GPU Chart */}
                    <div className="bg-slate-950/40 rounded-xl border border-slate-800 p-4">
                        <div className="text-[10px] font-bold text-sky-500 mb-2 uppercase">GPU Utilization</div>
                        <div className="h-32">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={nodeHistory}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <YAxis domain={[0, 100]} hide />
                                    <Tooltip content={<CustomTooltip />} cursor={{stroke: '#334155'}} />
                                    <Line type="monotone" dataKey="gpu" name="GPU" stroke="#0ea5e9" strokeWidth={2} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* VRAM Chart */}
                    <div className="bg-slate-950/40 rounded-xl border border-slate-800 p-4">
                        <div className="text-[10px] font-bold text-rose-500 mb-2 uppercase">VRAM Utilization</div>
                         <div className="h-32">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={nodeHistory}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <YAxis domain={[0, 100]} hide />
                                    <Tooltip content={<CustomTooltip />} cursor={{stroke: '#334155'}} />
                                    <Line type="monotone" dataKey="vram" name="VRAM" stroke="#e11d48" strokeWidth={2} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                     {/* Temp Chart */}
                     <div className="bg-slate-950/40 rounded-xl border border-slate-800 p-4">
                        <div className="text-[10px] font-bold text-orange-500 mb-2 uppercase">Temperature</div>
                         <div className="h-32">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={nodeHistory}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <YAxis domain={['auto', 'auto']} hide />
                                    <Tooltip content={<CustomTooltip />} cursor={{stroke: '#334155'}} />
                                    <Line type="monotone" dataKey="temp" name="Temp" stroke="#f97316" strokeWidth={2} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default NodeDetailsModal;
