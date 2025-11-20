import React from 'react';
import { X, Cpu, Thermometer, Zap, Activity, Server, AlertTriangle, Network, Power } from 'lucide-react';
import { ClusterNode, MetricPoint, NodeType, NodeStatus } from '../types';
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, Tooltip, YAxis, CartesianGrid, ReferenceLine } from 'recharts';

interface Props {
  node: ClusterNode;
  onClose: () => void;
  metricsHistory: MetricPoint[];
  onToggleStatus: () => void;
}

const NodeDetailsModal: React.FC<Props> = ({ node, onClose, metricsHistory, onToggleStatus }) => {
  // Use last 100 points for the modal charts to show a decent trend
  const nodeHistory = metricsHistory.slice(-100).map(m => ({
    timestamp: m.timestamp,
    gpu: m.nodeGpuUtil?.[node.id] ?? 0,
    vram: m.nodeVramUtil?.[node.id] ?? 0,
    temp: m.nodeTemp?.[node.id] ?? 0,
    net: m.nodeNetUtil?.[node.id] ?? 0,
  }));

  // Calculate average temperature over the last 20 ticks to determine trend
  const recentHistory = nodeHistory.slice(-20);
  const avgTemp = recentHistory.reduce((acc, curr) => acc + curr.temp, 0) / (recentHistory.length || 1);
  const isOverheating = avgTemp > 80 && node.status !== NodeStatus.OFFLINE;
  const isOffline = node.status === NodeStatus.OFFLINE;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-lg text-xs font-mono z-50">
          <p className="text-slate-400 mb-1">Tick: {label}</p>
          <div className="flex items-center gap-2">
            <span style={{ color: payload[0].stroke || payload[0].fill }}>
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

  const StatCard = ({ title, value, unit, icon: Icon, color, alert }: any) => (
    <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all duration-300 ${
        isOffline ? 'bg-slate-950/20 border-slate-800 grayscale opacity-50' :
        alert 
        ? 'bg-red-950/30 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
        : 'bg-slate-950/40 border-slate-800'
    }`}>
        <div className={`p-2 rounded-lg border shrink-0 transition-colors duration-300 ${
            alert ? 'bg-red-500/20 border-red-500/30 text-red-500 animate-pulse' : 'bg-slate-900 border-slate-800'
        }`} style={!alert ? { color } : {}}>
            <Icon size={18} />
        </div>
        <div>
            <p className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${alert ? 'text-red-400' : 'text-slate-500'}`}>{title}</p>
            <div className="flex items-baseline gap-1">
                <span className={`text-lg font-mono font-bold transition-colors duration-300 ${alert ? 'text-red-200' : 'text-slate-200'}`}>{value}</span>
                <span className={`text-xs transition-colors duration-300 ${alert ? 'text-red-400' : 'text-slate-500'}`}>{unit}</span>
            </div>
        </div>
    </div>
  );

  // Calculate absolute VRAM usage
  const vramUsed = ((node.vramUtil / 100) * node.totalVram).toFixed(1);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`relative bg-slate-900 border rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 scale-100 flex flex-col max-h-[90vh] transition-colors ${isOverheating ? 'border-red-500/30' : 'border-slate-700'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-lg ${isOffline ? 'bg-slate-800 text-slate-500' : node.type === NodeType.HEAD ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-400'}`}>
                <Server size={20} />
             </div>
             <div>
                <h3 className={`font-bold ${isOffline ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{node.name}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">{node.id}</span>
                    <span className={`inline-block w-2 h-2 rounded-full ${isOffline ? 'bg-red-500' : node.status === 'COMPUTING' ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></span>
                    <span className={`text-[10px] font-bold uppercase ${isOffline ? 'text-red-500' : 'text-slate-500'}`}>{node.status}</span>
                    {node.type === NodeType.WORKER && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700">
                            2x A100 • {node.totalVram}GB
                        </span>
                    )}
                </div>
             </div>
          </div>
          <div className="flex items-center gap-2">
             {node.type === NodeType.WORKER && (
                 <button 
                    onClick={onToggleStatus}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs border transition-all ${
                        isOffline 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                    }`}
                 >
                    <Power size={14} />
                    {isOffline ? 'RECOVER NODE' : 'FAIL NODE'}
                 </button>
             )}
             <div className="w-px h-6 bg-slate-800 mx-1"></div>
             <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                <X size={20} />
             </button>
          </div>
        </div>

        {/* Warning Banner */}
        {isOverheating && (
            <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top-2">
                <div className="p-1.5 bg-red-500/20 rounded-full animate-pulse shrink-0">
                    <AlertTriangle size={16} className="text-red-500" />
                </div>
                <div>
                    <p className="text-sm font-bold text-red-400">Overheating Warning</p>
                    <p className="text-xs text-red-400/80">Average temperature ({avgTemp.toFixed(1)}°C) has exceeded the safe operating threshold of 80°C for an extended period.</p>
                </div>
            </div>
        )}

        {isOffline && (
            <div className="bg-slate-800/50 border-b border-slate-700 px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top-2">
                <div className="p-1.5 bg-slate-700 rounded-full shrink-0">
                    <Power size={16} className="text-slate-400" />
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-400">Node Offline</p>
                    <p className="text-xs text-slate-500">This node has been disconnected from the cluster. It will not process any requests.</p>
                </div>
            </div>
        )}

        <div className="overflow-y-auto p-6 space-y-6 relative">
            {isOffline && <div className="absolute inset-0 bg-slate-950/60 z-10 backdrop-blur-[1px]" />}
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard title="GPU Util" value={node.gpuUtil.toFixed(1)} unit="%" icon={Cpu} color="#0ea5e9" />
                <StatCard 
                    title="VRAM Usage" 
                    value={`${vramUsed} / ${node.totalVram}`} 
                    unit="GB" 
                    icon={Activity} 
                    color="#e11d48" 
                />
                <StatCard 
                    title="Temp" 
                    value={node.temp.toFixed(1)} 
                    unit="°C" 
                    icon={Thermometer} 
                    color="#f97316"
                    alert={isOverheating}
                />
                <StatCard 
                    title="Network Load" 
                    value={node.netUtil.toFixed(1)} 
                    unit="%" 
                    icon={Network} 
                    color="#818cf8" 
                />
            </div>

            {/* Trends Section */}
            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Activity size={14} /> Performance Trends (Last 1h)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                     <div className={`rounded-xl border p-4 transition-colors duration-300 ${isOverheating ? 'bg-red-950/10 border-red-900/50' : 'bg-slate-950/40 border-slate-800'}`}>
                        <div className={`text-[10px] font-bold mb-2 uppercase transition-colors ${isOverheating ? 'text-red-400' : 'text-orange-500'}`}>Temperature</div>
                         <div className="h-32">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={nodeHistory}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isOverheating ? '#450a0a' : '#1e293b'} vertical={false} />
                                    <YAxis domain={['auto', 'auto']} hide />
                                    <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideBottomRight', value: 'MAX 80°C', fill: '#ef4444', fontSize: 10 }} />
                                    <Tooltip content={<CustomTooltip />} cursor={{stroke: '#334155'}} />
                                    <Line type="monotone" dataKey="temp" name="Temp" stroke={isOverheating ? '#ef4444' : '#f97316'} strokeWidth={2} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    {/* Network Load Chart */}
                    <div className="bg-slate-950/40 rounded-xl border border-slate-800 p-4">
                        <div className="text-[10px] font-bold text-indigo-500 mb-2 uppercase">Network Load (%)</div>
                        <div className="h-32">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={nodeHistory}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <YAxis domain={[0, 100]} hide />
                                    <Tooltip content={<CustomTooltip />} cursor={{stroke: '#334155'}} />
                                    <Area type="monotone" dataKey="net" name="Net Util" stroke="#818cf8" fill="#818cf820" strokeWidth={2} isAnimationActive={false} />
                                </AreaChart>
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