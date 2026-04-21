import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { Loader2, Minimize2, Copy, Download, ArrowRight, Upload, FileText, Table2 } from "lucide-react";
import { API_BASE, formatFileSize } from "../lib/utils";
import JsonTreeViewer from "./JsonTreeViewer";

export default function JsonFlattener() {
  const [rawJson, setRawJson] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // "table" or "tree"
  const fileInputRef = useRef(null);

  const [options, setOptions] = useState({
    separator: ".",
    max_depth: "",
    preserve_arrays: false,
  });

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawJson(ev.target.result);
      toast.success(`Loaded ${file.name} (${formatFileSize(file.size)})`);
    };
    reader.readAsText(file);
  };

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

  const downloadCSV = () => {
    if (!results?.flattened) return;
    const lines = ["Key,Value"];
    Object.entries(results.flattened).forEach(([k, v]) => {
      const escapedVal = String(v).replace(/"/g, '""');
      lines.push(`"${k}","${escapedVal}"`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flattened.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded!");
  };

  return (
    <div className="space-y-6">
      {/* Input section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex gap-5">
          {/* Textarea */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-700">
                Raw JSON Input
              </label>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors font-medium border border-slate-200"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload JSON File
                </button>
                {rawJson && (
                  <button
                    onClick={() => { setRawJson(""); setResults(null); }}
                    className="text-xs text-slate-400 hover:text-slate-600 font-medium px-2"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <textarea
              className="w-full h-44 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all resize-none"
              placeholder='{"paste": {"your": {"nested": "json"}}}'
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
            />
            {rawJson && (
              <div className="mt-1.5 text-[10px] text-slate-400 font-medium">
                {rawJson.length.toLocaleString()} characters
                {(() => { try { return ` · ${typeof JSON.parse(rawJson) === "object" ? "Valid JSON ✓" : "Valid JSON ✓"}`; } catch { return " · ❌ Invalid JSON"; } })()}
              </div>
            )}
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
              {/* View mode toggle */}
              <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                    viewMode === "table" ? "bg-white text-accent shadow-sm" : "text-slate-500"
                  }`}
                >
                  <Table2 className="w-3 h-3 inline mr-1" />Table
                </button>
                <button
                  onClick={() => setViewMode("tree")}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                    viewMode === "tree" ? "bg-white text-accent shadow-sm" : "text-slate-500"
                  }`}
                >
                  <FileText className="w-3 h-3 inline mr-1" />Tree
                </button>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              <button
                onClick={downloadCSV}
                className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button
                onClick={downloadJson}
                className="flex items-center gap-1.5 text-xs bg-accent text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Download className="w-3.5 h-3.5" /> JSON
              </button>
            </div>
          </div>

          {/* Table view — clean key-value table */}
          {viewMode === "table" && (
            <div className="overflow-auto max-h-[600px]">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold w-[5%]">#</th>
                    <th className="px-5 py-2.5 font-semibold w-[55%]">Key Path</th>
                    <th className="px-5 py-2.5 font-semibold w-[30%]">Value</th>
                    <th className="px-5 py-2.5 font-semibold w-[10%]">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(results.flattened).map(([key, value], i) => {
                    const valType = value === null ? "null" : typeof value;
                    const typeColor = {
                      string: "text-green-600 bg-green-50 border-green-200",
                      number: "text-blue-600 bg-blue-50 border-blue-200",
                      boolean: "text-purple-600 bg-purple-50 border-purple-200",
                      null: "text-slate-400 bg-slate-50 border-slate-200",
                      object: "text-amber-600 bg-amber-50 border-amber-200",
                    }[valType] || "text-slate-500 bg-slate-50 border-slate-200";

                    return (
                      <tr key={key} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-2 text-[10px] text-slate-400 font-mono">{i + 1}</td>
                        <td className="px-5 py-2 font-mono text-xs text-slate-700 break-all">
                          {key.split(options.separator).map((part, pi, arr) => (
                            <span key={pi}>
                              {pi > 0 && <span className="text-slate-300 mx-0.5">{options.separator}</span>}
                              <span className={pi === arr.length - 1 ? "text-accent font-semibold" : "text-slate-500"}>
                                {part}
                              </span>
                            </span>
                          ))}
                        </td>
                        <td className="px-5 py-2 font-mono text-xs text-slate-700 break-all">
                          {value === null ? (
                            <span className="text-slate-400 italic">null</span>
                          ) : typeof value === "boolean" ? (
                            <span className="text-purple-600 font-semibold">{String(value)}</span>
                          ) : typeof value === "number" ? (
                            <span className="text-blue-600 font-semibold">{value}</span>
                          ) : typeof value === "string" ? (
                            <span className="text-green-700">"{value}"</span>
                          ) : (
                            JSON.stringify(value)
                          )}
                        </td>
                        <td className="px-5 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${typeColor}`}>
                            {valType}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Tree view — side-by-side */}
          {viewMode === "tree" && (
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
          )}
        </div>
      )}

      {/* Empty state */}
      {!results && !loading && (
        <div className="text-center py-12 text-slate-400">
          <Minimize2 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-500 mb-1">Paste or upload nested JSON</p>
          <p className="text-xs text-slate-400">
            Click "Flatten JSON" to transform deeply nested structures into flat key-value pairs.
          </p>
        </div>
      )}
    </div>
  );
}
