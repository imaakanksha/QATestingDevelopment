export default function JsonTreeViewer({ data }) {
  if (!data) return null;
  return (
    <div className="bg-slate-50 rounded-lg p-4 overflow-auto text-sm font-mono border border-slate-200 text-slate-700 h-full max-h-[600px] shadow-inner">
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
