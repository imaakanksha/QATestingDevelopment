import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Download } from "lucide-react";
import { API_BASE } from "../lib/utils";
import FileUploadZone from "./FileUploadZone";
import SummaryCard from "./SummaryCard";
import DiffTable from "./DiffTable";

export default function JsonComparator() {
  const [baselineFile, setBaselineFile] = useState(null);
  const [targetFile, setTargetFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [results, setResults] = useState(null);

  const handleCompare = async () => {
    if (!baselineFile || !targetFile) {
      toast.error("Please upload both baseline and target JSON files");
      return;
    }
    setLoading(true);
    setResults(null);

    const formData = new FormData();
    formData.append("baseline", baselineFile);
    formData.append("target", targetFile);

    try {
      const res = await fetch(`${API_BASE}/compare-json`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(err.detail || "Comparison failed");
      }
      const data = await res.json();
      setResults(data);
      toast.success(`Comparison complete — ${data.summary.match_score}% match`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!results) return;
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/export-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(results),
      });
      if (!res.ok) throw new Error("Export failed");
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `diff_report_${new Date().toISOString().slice(0, 10)}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded!");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload zones */}
      <div className="grid grid-cols-2 gap-5">
        <FileUploadZone
          file={baselineFile}
          onFileChange={setBaselineFile}
          label="Baseline JSON"
          accept=".json"
          id="upload-baseline"
        />
        <FileUploadZone
          file={targetFile}
          onFileChange={setTargetFile}
          label="Target JSON"
          accept=".json"
          id="upload-target"
        />
      </div>

      {/* CTA */}
      <div className="flex justify-center">
        <button
          id="btn-compare"
          onClick={handleCompare}
          disabled={loading || !baselineFile || !targetFile}
          className="bg-accent hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-10 rounded-lg shadow-sm flex items-center gap-2 transition-all"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Comparing…" : "Compare Now"}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="animate-fade-in-up space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800">Results</h2>
            <button
              id="btn-export"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 text-sm bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium shadow-sm disabled:opacity-60"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Export HTML Report
            </button>
          </div>
          <SummaryCard summary={results.summary} />
          <DiffTable differences={results.differences} />
        </div>
      )}

      {/* Empty state */}
      {!results && !loading && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">Upload two JSON files and click "Compare Now" to see the diff report.</p>
        </div>
      )}
    </div>
  );
}
