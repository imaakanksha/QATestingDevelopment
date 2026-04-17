import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Minimize2, Copy, Download, ArrowRight } from 'lucide-react';
import JsonTreeViewer from './JsonTreeViewer';

export default function JsonFlattener() {
  const [rawJson, setRawJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const [options, setOptions] = useState({
    separator: '.',
    max_depth: '',
    preserve_arrays: false
  });

  const handleFlatten = async () => {
    if (!rawJson.trim()) {
      toast.error("Please paste some JSON to flatten");
      return;
    }

    try {
      // Validate local JSON parse first
      JSON.parse(rawJson);
    } catch (e) {
      toast.error("Invalid JSON format");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("raw_json", rawJson);
    formData.append("separator", options.separator || '.');
    if (options.max_depth) formData.append("max_depth", parseInt(options.max_depth));
    formData.append("preserve_arrays", options.preserve_arrays);

    try {
      const res = await fetch("http://localhost:8000/api/flatten-json", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Flattening failed");
      }
      const data = await res.json();
      setResults(data);
      toast.success("JSON Flattened successfully!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!results) return;
    navigator.clipboard.writeText(JSON.stringify(results.flattened, null, 2));
    toast.success("Copied to clipboard!");
  };

  const downloadJson = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results.flattened, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flattened.json';
    a.click();
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Input Section */}
      <div className="bg-surface rounded-xl border border-slate-800 p-6 flex flex-col shrink-0">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 mr-6">
            <label className="block text-sm font-medium text-slate-200 mb-2">Raw JSON Input</label>
            <textarea 
              className="w-full h-40 bg-[#0B1120] border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-300 focus:outline-none focus:border-accent transition-colors resize-none"
              placeholder='{"paste": {"your": "nested json here"}}'
              value={rawJson}
              onChange={e => setRawJson(e.target.value)}
            />
          </div>

          <div className="w-72 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="text-sm font-medium text-slate-200 mb-3 border-b border-slate-700 pb-2">Flatten Options</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Separator</label>
                <input 
                  type="text" 
                  className="w-full bg-[#0B1120] border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-accent transition-colors"
                  value={options.separator}
                  onChange={e => setOptions({...options, separator: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Max Depth (Optional)</label>
                <input 
                  type="number" min="0"
                  className="w-full bg-[#0B1120] border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-accent transition-colors"
                  placeholder="Unlimited"
                  value={options.max_depth}
                  onChange={e => setOptions({...options, max_depth: e.target.value})}
                />
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <input 
                  type="checkbox" 
                  id="preserveArrays"
                  className="rounded border-slate-700 text-accent focus:ring-accent bg-[#0B1120]"
                  checked={options.preserve_arrays}
                  onChange={e => setOptions({...options, preserve_arrays: e.target.checked})}
                />
                <label htmlFor="preserveArrays" className="text-sm text-slate-300 select-none">Preserve Arrays</label>
              </div>
            </div>
            
            <button
              onClick={handleFlatten}
              disabled={loading || !rawJson}
              className="w-full mt-4 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded flex justify-center items-center transition-all shadow-lg shadow-accent/20"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Minimize2 className="w-4 h-4 mr-2" />}
              Flatten JSON
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {results && (
        <div className="flex-1 flex flex-col min-h-0 bg-surface rounded-xl border border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-surface shrink-0">
            <div className="flex items-center">
              <h3 className="font-semibold text-slate-200 mr-4">Flattened Output</h3>
              <div className="bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full flex items-center border border-slate-700">
                <span>Original: {results.original_key_count} keys</span>
                <ArrowRight className="w-3 h-3 mx-2 text-slate-500" />
                <span className="text-accent font-medium">Flattened: {results.flattened_key_count} keys</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={copyToClipboard}
                className="flex items-center text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded hover:bg-slate-700 transition-colors font-medium border border-slate-700"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
              </button>
              <button 
                onClick={downloadJson}
                className="flex items-center text-xs bg-accent/20 text-accent px-3 py-1.5 rounded hover:bg-accent hover:text-white transition-colors font-medium border border-accent/20"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download
              </button>
            </div>
          </div>
          
          <div className="flex-1 grid grid-cols-2 min-h-0 divide-x divide-slate-800">
             <div className="p-4 overflow-auto bg-[#0B1120]">
                <div className="text-xs text-slate-500 mb-2 uppercase font-semibold tracking-wider">Original JSON</div>
                <JsonTreeViewer data={JSON.parse(rawJson)} />
             </div>
             <div className="p-4 overflow-auto bg-[#0B1120]">
                <div className="text-xs text-accent mb-2 uppercase font-semibold tracking-wider">Flattened JSON</div>
                <JsonTreeViewer data={results.flattened} />
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
