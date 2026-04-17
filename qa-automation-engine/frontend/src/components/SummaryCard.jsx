import { CheckCircle2, AlertCircle, FilePlus, FileMinus } from 'lucide-react';

export default function SummaryCard({ summary }) {
  if (!summary) return null;
  
  return (
    <div className="bg-surface p-5 rounded-lg border border-slate-200 shadow-sm grid grid-cols-5 gap-4 mb-6">
      <div className="flex flex-col items-center justify-center border-r border-slate-200">
        <div className="text-3xl font-bold text-accent mb-1">{summary.match_score}%</div>
        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Match Score</div>
      </div>
      
      <div className="flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-slate-800 mb-1">{summary.total_keys}</div>
        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Keys</div>
      </div>
      
      <div className="flex flex-col items-center justify-center text-success">
        <FilePlus className="w-6 h-6 mb-1" />
        <div className="text-xl font-bold">{summary.added}</div>
        <div className="text-xs uppercase tracking-wider font-semibold">Added</div>
      </div>
      
      <div className="flex flex-col items-center justify-center text-danger">
        <FileMinus className="w-6 h-6 mb-1" />
        <div className="text-xl font-bold">{summary.removed}</div>
        <div className="text-xs uppercase tracking-wider font-semibold">Removed</div>
      </div>
      
      <div className="flex flex-col items-center justify-center text-warning">
        <AlertCircle className="w-6 h-6 mb-1" />
        <div className="text-xl font-bold">{summary.modified}</div>
        <div className="text-xs uppercase tracking-wider font-semibold">Modified</div>
      </div>
    </div>
  )
}
