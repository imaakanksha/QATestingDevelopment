import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Minimize2, Copy, Download, ArrowRight } from "lucide-react";
import { API_BASE } from "../lib/utils";
import JsonTreeViewer from "./JsonTreeViewer";

export default function JsonFlattener() {
  const [rawJson, setRawJson] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const [options, setOptions] = useState({
    separator: ".",
    max_depth: "",
    preserve_arrays: false,
  });

  const handleFlatten = async () => {
    if (!rawJson.trim()) return toast.error("Paste some JSON to flatten");

    try {
      JSON.parse(rawJson);
    } catch {
      return toast.error("Invalid JSON — please check your syntax");
    }

    setLoading(true);
    const fd = new FormData();
    fd.append("raw_json", rawJson);
    fd.append("separator", options.separator || ".");
    if (options.max_depth) fd.append("max_depth", parseInt(options.max_depth));
    fd.append("preserve_arrays", options.preserve_arrays);

    try {
      const res = await fetch(`${API_BASE}/flatten-json`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(err.detail);
      }
      const data = await res.json();
      setResults(data);
      toast.success(`Flattened to ${data.flattened_key_count} keys`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!results) return;
    navigator.clipboard.writeText(JSON.stringify(results.flattened, null, 2));
    toast.success("Copied to clipboard");
  };

  const downloadJson = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results.flattened, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flattened.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Input section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex gap-5">
          {/* Textarea */}
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Raw JSON Input
            </label>
            <textarea
              className="w-full h-44 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all resize-none"
              placeholder='{"paste": {"your": {"nested": "json"}}}'
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
            />
          </div>

          {/* Options panel */}
          <div className="w-64 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-200">
              Flatten Options
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">Separator</label>
                <input
                  type="text"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  value={options.separator}
                  onChange={(e) => setOptions({ ...options, separator: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">Max Depth</label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="Unlimited"
                  value={options.max_depth}
                  onChange={(e) => setOptions({ ...options, max_depth: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent/30"
                  checked={options.preserve_arrays}
                  onChange={(e) => setOptions({ ...options, preserve_arrays: e.target.checked })}
                />
                <span className="text-sm text-slate-600 select-none">Preserve arrays</span>
              </label>
            </div>

            <button
              id="btn-flatten"
              onClick={handleFlatten}
              disabled={loading || !rawJson}
              className="w-full mt-4 bg-accent hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg flex justify-center items-center gap-2 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Minimize2 className="w-4 h-4" />}
              Flatten JSON
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="animate-fade-in-up bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Results header */}
          <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-slate-800 text-sm">Flattened Output</h3>
              <div className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full flex items-center gap-1.5 font-medium">
                <span>{results.original_key_count} keys</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="text-accent font-semibold">{results.flattened_key_count} keys</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              <button
                onClick={downloadJson}
                className="flex items-center gap-1.5 text-xs bg-accent text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            </div>
          </div>

          {/* Side-by-side view */}
          <div className="grid grid-cols-2 divide-x divide-slate-200">
            <div className="p-4">
              <div className="text-[11px] text-slate-500 mb-2 uppercase font-semibold tracking-wider">
                Original JSON
              </div>
              <JsonTreeViewer data={JSON.parse(rawJson)} />
            </div>
            <div className="p-4">
              <div className="text-[11px] text-accent mb-2 uppercase font-semibold tracking-wider">
                Flattened JSON
              </div>
              <JsonTreeViewer data={results.flattened} />
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!results && !loading && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">Paste nested JSON and click "Flatten JSON" to see the flattened output.</p>
        </div>
      )}
    </div>
  );
}
