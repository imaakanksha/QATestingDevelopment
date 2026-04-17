import { useState } from 'react';
import toast from 'react-hot-toast';
import { UploadCloud, Loader2, Download } from 'lucide-react';
import SummaryCard from './SummaryCard';
import DiffTable from './DiffTable';

export default function JsonComparator() {
  const [baselineFile, setBaselineFile] = useState(null);
  const [targetFile, setTargetFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleCompare = async () => {
    if (!baselineFile || !targetFile) {
      toast.error("Please upload both baseline and target JSON files");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("baseline", baselineFile);
    formData.append("target", targetFile);

    try {
      const res = await fetch("http://localhost:8000/api/compare-json", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to compare files");
      }
      const data = await res.json();
      setResults(data);
      toast.success("Comparison complete!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!results) return;
    try {
      const res = await fetch("http://localhost:8000/api/export-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(results)
      });
      if (!res.ok) throw new Error("Export failed");
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'diff_report.html';
      a.click();
      toast.success("Report exported!");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const renderUploadZone = (file, setFile, label) => (
    <div className="flex-1 bg-white border-2 border-dashed border-slate-300 hover:border-accent/50 rounded-xl p-8 transition-colors flex flex-col items-center justify-center text-center group shadow-sm">
      <input 
        type="file" 
        accept=".json" 
        className="hidden" 
        id={`upload-${label.replace(' ', '-')}`}
        onChange={(e) => setFile(e.target.files[0])}
      />
      <label htmlFor={`upload-${label.replace(' ', '-')}`} className="cursor-pointer flex flex-col items-center w-full h-full justify-center">
        <UploadCloud className="w-10 h-10 text-slate-400 mb-3 group-hover:text-accent transition-colors" />
        <h3 className="text-lg font-medium text-slate-800 mb-1">{label}</h3>
        {file ? (
          <div className="bg-slate-100 px-3 py-1 rounded mt-2 border border-slate-200">
            <p className="text-sm text-accent font-mono truncate max-w-[200px]">{file.name}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Drag & drop or click to upload .json</p>
        )}
      </label>
      {file && (
        <button 
          onClick={(e) => { e.preventDefault(); setFile(null); }}
          className="mt-4 text-xs text-danger hover:text-danger/80 hover:underline font-medium"
        >
          Remove File
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex gap-6 shrink-0">
        {renderUploadZone(baselineFile, setBaselineFile, "Baseline JSON")}
        {renderUploadZone(targetFile, setTargetFile, "Target JSON")}
      </div>
      
      <div className="flex justify-center shrink-0">
        <button
          onClick={handleCompare}
          disabled={loading || !baselineFile || !targetFile}
          className="bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg shadow-lg shadow-accent/20 flex items-center transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing Comparison...
            </>
          ) : (
            "Compare Now"
          )}
        </button>
      </div>

      {results && (
        <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Results</h2>
            <button 
              onClick={handleExport}
              className="flex items-center text-sm bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-700 transition-colors font-medium shadow-sm"
            >
              <Download className="w-4 h-4 mr-2" /> Export HTML Report
            </button>
          </div>
          <SummaryCard summary={results.summary} />
          <div className="flex-1 min-h-0">
             <DiffTable differences={results.differences} />
          </div>
        </div>
      )}
    </div>
  );
}
