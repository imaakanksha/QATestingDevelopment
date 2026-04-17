import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Settings, Download } from "lucide-react";
import { API_BASE } from "../lib/utils";
import FileUploadZone from "./FileUploadZone";
import SummaryCard from "./SummaryCard";
import DiffTable from "./DiffTable";
import JsonTreeViewer from "./JsonTreeViewer";

export default function XlsxConverter() {
  const [xlsxFile, setXlsxFile] = useState(null);
  const [referenceFile, setReferenceFile] = useState(null);
  const [loadingConvert, setLoadingConvert] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [results, setResults] = useState(null);
  const [jsonOutput, setJsonOutput] = useState(null);

  const [options, setOptions] = useState({
    sheet_name: "",
    header_row: 1,
    treat_first_column_as_key: true,
    normalize_keys: true,
  });

  const buildFormData = (compare) => {
    const fd = new FormData();
    fd.append(compare ? "xlsx_file" : "file", xlsxFile);
    if (compare) fd.append("reference_file", referenceFile);
    if (options.sheet_name) fd.append("sheet_name", options.sheet_name);
    fd.append("header_row", options.header_row);
    fd.append("treat_first_column_as_key", options.treat_first_column_as_key);
    fd.append("normalize_keys", options.normalize_keys);
    return fd;
  };

  const handleConvert = async (compare = false) => {
    if (!xlsxFile) return toast.error("Please upload an XLSX file");
    if (compare && !referenceFile) return toast.error("Please upload a reference JSON");

    compare ? setLoadingCompare(true) : setLoadingConvert(true);

    try {
      const endpoint = compare ? "/xlsx-compare" : "/xlsx-to-json";
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        body: buildFormData(compare),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(err.detail);
      }
      const data = await res.json();

      if (compare) {
        setResults(data);
        setJsonOutput(null);
        toast.success("Conversion & comparison complete!");
      } else {
        setJsonOutput(data);
        setResults(null);
        toast.success("Converted to JSON!");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      compare ? setLoadingCompare(false) : setLoadingConvert(false);
    }
  };

  const downloadConvertedJson = () => {
    if (!jsonOutput) return;
    const blob = new Blob([JSON.stringify(jsonOutput, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top row: Uploads + Options + Actions */}
      <div className="grid grid-cols-3 gap-5">
        {/* Uploads column */}
        <div className="flex flex-col gap-4">
          <FileUploadZone
            file={xlsxFile}
            onFileChange={setXlsxFile}
            label="Wireframe XLSX"
            accept=".xlsx,.xls"
            id="upload-xlsx"
          />
          <FileUploadZone
            file={referenceFile}
            onFileChange={setReferenceFile}
            label="Reference JSON"
            accept=".json"
            id="upload-ref-json"
          />
        </div>

        {/* Options column */}
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm mb-4 pb-3 border-b border-slate-100">
            <Settings className="w-4 h-4 text-accent" />
            Conversion Options
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Sheet Name</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                placeholder="Leave blank for first sheet"
                value={options.sheet_name}
                onChange={(e) => setOptions({ ...options, sheet_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Header Row</label>
              <input
                type="number"
                min="1"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                value={options.header_row}
                onChange={(e) => setOptions({ ...options, header_row: parseInt(e.target.value) || 1 })}
              />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent/30"
                checked={options.treat_first_column_as_key}
                onChange={(e) => setOptions({ ...options, treat_first_column_as_key: e.target.checked })}
              />
              <span className="text-sm text-slate-600 select-none">Use Column 1 as keys</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent/30"
                checked={options.normalize_keys}
                onChange={(e) => setOptions({ ...options, normalize_keys: e.target.checked })}
              />
              <span className="text-sm text-slate-600 select-none">Normalize column names</span>
            </label>
          </div>
        </div>

        {/* Actions column */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 flex flex-col justify-center gap-4">
          <button
            id="btn-convert"
            onClick={() => handleConvert(false)}
            disabled={loadingConvert || !xlsxFile}
            className="w-full bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-medium py-3 px-4 rounded-lg border border-slate-200 flex justify-center items-center gap-2 transition-all text-sm"
          >
            {loadingConvert && <Loader2 className="w-4 h-4 animate-spin" />}
            Convert to JSON Only
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-b border-slate-200" />
            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">or</span>
            <div className="flex-1 border-b border-slate-200" />
          </div>

          <button
            id="btn-convert-compare"
            onClick={() => handleConvert(true)}
            disabled={loadingCompare || !xlsxFile || !referenceFile}
            className="w-full bg-accent hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg shadow-sm flex justify-center items-center gap-2 transition-all text-sm"
          >
            {loadingCompare && <Loader2 className="w-4 h-4 animate-spin" />}
            Convert & Compare
          </button>
        </div>
      </div>

      {/* Comparison results */}
      {results && (
        <div className="animate-fade-in-up space-y-4">
          <SummaryCard summary={results.summary} />
          <DiffTable differences={results.differences} />
        </div>
      )}

      {/* JSON preview */}
      {jsonOutput && (
        <div className="animate-fade-in-up bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 text-sm">Converted JSON Output</h3>
            <button
              onClick={downloadConvertedJson}
              className="flex items-center gap-1.5 text-xs bg-accent text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Download className="w-3.5 h-3.5" /> Download JSON
            </button>
          </div>
          <div className="p-4">
            <JsonTreeViewer data={jsonOutput} />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!results && !jsonOutput && !loadingConvert && !loadingCompare && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">Upload an XLSX file and optionally a reference JSON to get started.</p>
        </div>
      )}
    </div>
  );
}
