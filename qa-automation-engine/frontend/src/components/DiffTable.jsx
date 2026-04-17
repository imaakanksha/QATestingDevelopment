import { useState } from 'react';

export default function DiffTable({ differences }) {
  const [filter, setFilter] = useState('all');
  
  if (!differences || differences.length === 0) {
    return (
      <div className="bg-surface p-8 rounded-lg border border-slate-200 shadow-sm text-center">
        <p className="text-slate-500">No differences found.</p>
      </div>
    );
  }
  
  const filtered = differences.filter(d => filter === 'all' || d.change_type === filter);
  
  return (
    <div className="bg-surface rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-surface shrink-0">
        <h3 className="font-semibold text-slate-800">Difference Details</h3>
        <div className="flex space-x-2">
          {['all', 'added', 'removed', 'modified'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-full capitalize transition-colors ${
                filter === f 
                ? 'bg-slate-800 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-3 font-medium">Key Path</th>
              <th className="px-6 py-3 font-medium">Baseline Value</th>
              <th className="px-6 py-3 font-medium">Target Value</th>
              <th className="px-6 py-3 font-medium">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filtered.map((diff, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-slate-600 max-w-md truncate" title={diff.key_path}>
                  {diff.key_path}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-slate-500 max-w-sm overflow-hidden text-ellipsis">
                  {diff.change_type === 'added' ? '-' : JSON.stringify(diff.baseline_value)}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-slate-900 font-medium max-w-sm overflow-hidden text-ellipsis">
                  {diff.change_type === 'removed' ? '-' : JSON.stringify(diff.target_value)}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                    ${diff.change_type === 'added' ? 'bg-success/10 text-success border border-success/20' : ''}
                    ${diff.change_type === 'removed' ? 'bg-danger/10 text-danger border border-danger/20' : ''}
                    ${diff.change_type === 'modified' ? 'bg-warning/10 text-warning border border-warning/20' : ''}
                  `}>
                    {diff.change_type}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
