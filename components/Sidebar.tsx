
import React, { useState } from 'react';
import { Terminal, Cpu, Server, CreditCard } from 'lucide-react';
import { SimulationState, NodeType, NodeStatus, UserState } from '../types';

interface Props {
    state: SimulationState;
    selectedNodeId: string | null;
    setSelectedNodeId: (id: string | null) => void;
}

const Sidebar: React.FC<Props> = ({ state, selectedNodeId, setSelectedNodeId }) => {
    const [tab, setTab] = useState<'nodes' | 'users'>('nodes');
    
    return (
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col shadow-xl h-[400px]">
                 <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 rounded-t-xl backdrop-blur">
                     <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Terminal size={14} /> Live Traffic</h3>
                     <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span><span className="text-xs text-green-500 font-mono">{state.virtualUsers.length} Active Users</span></div>
                 </div>
                 <div className="flex-grow p-4 space-y-3 bg-slate-950/30 overflow-y-auto">
                     {state.activityLog.map((log) => (
                         <div key={log.id} className="text-sm animate-in slide-in-from-left-2 duration-300 flex items-start gap-3">
                                 <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">{log.type === 'PROMPT' ? <span className="text-base">{log.userAvatar}</span> : <Cpu size={14} className="text-sky-500" />}</div>
                                 <div className="min-w-0">
                                     <div className="flex justify-between items-baseline mb-1"><span className="font-bold text-xs text-slate-300">{log.type === 'PROMPT' ? log.userName : 'vLLM Cluster'}</span>{log.latency && <span className="text-[10px] font-mono text-slate-500 ml-2">{log.latency.toFixed(0)}ms</span>}</div>
                                     <p className={`text-xs leading-relaxed ${log.type === 'PROMPT' ? 'text-slate-400' : 'text-emerald-400/80'}`}>{log.type === 'PROMPT' ? `"${log.text}"` : "Generated completion tokens..."}</p>
                                 </div>
                         </div>
                     ))}
                 </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl flex flex-col overflow-hidden">
                <div className="flex border-b border-slate-800">
                    {['nodes', 'users'].map(t => (
                        <button key={t} onClick={() => setTab(t as any)} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${tab === t ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-800/50'}`}>
                            {t === 'nodes' ? <Server size={14} /> : <CreditCard size={14} />} {t === 'nodes' ? 'Node Status' : 'User Billing'}
                        </button>
                    ))}
                </div>
                <div className="p-4 bg-slate-950/30 max-h-[400px] overflow-y-auto">
                    {tab === 'nodes' ? (
                        <div className="space-y-2">
                            {state.nodes.map(node => (
                                <div key={node.id} onClick={() => setSelectedNodeId(node.id)} className={`p-2 rounded-lg border cursor-pointer transition-all ${selectedNodeId === node.id ? 'bg-slate-800 border-sky-500/50 ring-1 ring-sky-500/20' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${node.status === NodeStatus.COMPUTING ? 'bg-green-400' : 'bg-slate-600'}`}></div><span className="font-medium text-xs text-slate-300">{node.name}</span></div>
                                        <span className="text-[10px] font-mono text-slate-500">{node.type === NodeType.HEAD ? 'HEAD' : 'WORKER'}</span>
                                    </div>
                                    {node.type === NodeType.WORKER && (
                                        <div className="mt-2">
                                            <div className="text-[9px] font-mono text-slate-500 mb-2">Capacity: 2x A100 • {node.totalVram}GB VRAM</div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[{ l: 'GPU', v: node.gpuUtil }, { l: 'VRAM', v: node.vramUtil }].map((m, i) => (
                                                    <div key={m.l}>
                                                        <div className="flex justify-between text-[10px] mb-1">
                                                            <span className="font-bold text-slate-500">{m.l}</span>
                                                            <div className="flex gap-1">
                                                                {m.l === 'VRAM' && <span className="text-slate-600 font-mono mr-1">{((m.v / 100) * node.totalVram).toFixed(0)}/{node.totalVram}G</span>}
                                                                <span className={`font-mono ${m.v > 90 ? 'text-red-400' : 'text-sky-400'}`}>{m.v.toFixed(0)}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden"><div className={`h-full transition-all duration-300 ${m.v > 90 ? 'bg-red-500' : 'bg-sky-500'}`} style={{ width: `${m.v}%` }}></div></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs">
                            <thead><tr className="text-slate-500 border-b border-slate-800"><th className="pb-2">User</th><th className="pb-2">Status</th><th className="pb-2 text-right">Cost</th></tr></thead>
                            <tbody>
                                {state.virtualUsers.sort((a,b) => b.totalCost - a.totalCost).map(u => (
                                    <tr key={u.id} className="border-b border-slate-800/50 group hover:bg-slate-800/30"><td className="py-2.5 flex items-center gap-2"><span className="text-base">{u.avatar}</span><span className="font-medium text-slate-300">{u.name}</span></td><td className="py-2.5"><span className="px-1.5 py-0.5 rounded text-[9px] border border-slate-700 text-slate-400">{u.state}</span></td><td className="py-2.5 text-right font-mono text-emerald-400">${u.totalCost.toFixed(5)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};
export default Sidebar;