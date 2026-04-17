import { useState } from 'react';
import toast from 'react-hot-toast';
import { UploadCloud, Loader2, ArrowRight, Settings } from 'lucide-react';
import SummaryCard from './SummaryCard';
import DiffTable from './DiffTable';
import JsonTreeViewer from './JsonTreeViewer';

export default function XlsxConverter() {
  const [xlsxFile, setXlsxFile] = useState(null);
  const [referenceFile, setReferenceFile] = useState(null);
  const [loadingConvert, setLoadingConvert] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [results, setResults] = useState(null);
  const [jsonOutput, setJsonOutput] = useState(null);

  const [options, setOptions] = useState({
    sheet_name: '',
    header_row: 1,
    treat_first_column_as_key: true,
    normalize_keys: true
  });

  const handleConvert = async (compare = false) => {
    if (!xlsxFile) {
      toast.error("Please upload an XLSX file");
      return;
    }
    if (compare && !referenceFile) {
      toast.error("Please upload a reference JSON file for comparison");
      return;
    }

    if (compare) setLoadingCompare(true);
    else setLoadingConvert(true);
    
    const formData = new FormData();
    formData.append(compare ? "xlsx_file" : "file", xlsxFile);
    if (compare) {
      formData.append("reference_file", referenceFile);
    }
    if (options.sheet_name) formData.append("sheet_name", options.sheet_name);
    formData.append("header_row", options.header_row);
    formData.append("treat_first_column_as_key", options.treat_first_column_as_key);
    formData.append("normalize_keys", options.normalize_keys);

    try {
      const endpoint = compare ? "/api/xlsx-compare" : "/api/xlsx-to-json";
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Request failed");
      }
      const data = await res.json();
      if (compare) {
        setResults(data);
        setJsonOutput(null);
        toast.success("Conversion & Comparison complete!");
      } else {
        setJsonOutput(data);
        setResults(null);
        toast.success("Conversion complete!");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      if (compare) setLoadingCompare(false);
      else setLoadingConvert(false);
    }
  };

  const renderUploadZone = (file, setFile, label, ext) => (
    <div className="flex-1 bg-surface border border-slate-800 hover:border-accent/50 rounded-xl p-6 transition-colors flex flex-col items-center justify-center text-center group">
      <input 
        type="file" 
        accept={ext} 
        className="hidden" 
        id={`upload-${label.replace(/\s+/g, '-')}`}
        onChange={(e) => setFile(e.target.files[0])}
      />
      <label htmlFor={`upload-${label.replace(/\s+/g, '-')}`} className="cursor-pointer flex flex-col items-center w-full h-full justify-center">
        <UploadCloud className="w-8 h-8 text-slate-500 mb-2 group-hover:text-accent transition-colors" />
        <h3 className="text-base font-medium text-slate-200 mb-1">{label}</h3>
        {file ? (
          <div className="bg-slate-800 px-2 py-1 rounded mt-1">
            <p className="text-xs text-accent font-mono truncate max-w-[150px]">{file.name}</p>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Upload {ext}</p>
        )}
      </label>
      {file && (
        <button 
          onClick={(e) => { e.preventDefault(); setFile(null); }}
          className="mt-3 text-xs text-danger hover:underline font-medium"
        >
          Remove
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="grid grid-cols-3 gap-6 shrink-0">
        {/* Left Col: Uploads */}
        <div className="flex flex-col gap-4">
          {renderUploadZone(xlsxFile, setXlsxFile, "Wireframe XLSX", ".xlsx,.xls")}
          {renderUploadZone(referenceFile, setReferenceFile, "Reference JSON", ".json")}
        </div>

        {/* Middle Col: Options */}
        <div className="bg-surface rounded-xl p-5 border border-slate-800 flex flex-col">
          <div className="flex items-center text-slate-200 font-medium mb-4 pb-2 border-b border-slate-800">
            <Settings className="w-4 h-4 mr-2 text-accent" />
            Conversion Options
          </div>
          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Sheet Name (optional)</label>
              <input 
                type="text" 
                className="w-full bg-background border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-accent transition-colors"
                placeholder="Leave blank for first sheet"
                value={options.sheet_name}
                onChange={e => setOptions({...options, sheet_name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Header Row</label>
              <input 
                type="number" min="1"
                className="w-full bg-background border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-accent transition-colors"
                value={options.header_row}
                onChange={e => setOptions({...options, header_row: parseInt(e.target.value)})}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="treatKey"
                className="rounded border-slate-700 text-accent focus:ring-accent bg-background"
                checked={options.treat_first_column_as_key}
                onChange={e => setOptions({...options, treat_first_column_as_key: e.target.checked})}
              />
              <label htmlFor="treatKey" className="text-sm text-slate-300 select-none">Use Col 1 as Object Keys</label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="normKeys"
                className="rounded border-slate-700 text-accent focus:ring-accent bg-background"
                checked={options.normalize_keys}
                onChange={e => setOptions({...options, normalize_keys: e.target.checked})}
              />
              <label htmlFor="normKeys" className="text-sm text-slate-300 select-none">Normalize Column Names</label>
            </div>
          </div>
        </div>

        {/* Right Col: Actions */}
        <div className="bg-surface rounded-xl p-6 border border-slate-800 flex flex-col justify-center items-center gap-4">
          <button
            onClick={() => handleConvert(false)}
            disabled={loadingConvert || !xlsxFile}
            className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded border border-slate-700 flex justify-center items-center transition-all"
          >
            {loadingConvert ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Convert to JSON Only"}
          </button>
          
          <div className="flex items-center w-full my-2">
            <div className="flex-1 border-b border-slate-700"></div>
            <span className="px-3 text-xs text-slate-500 uppercase font-medium">Or</span>
            <div className="flex-1 border-b border-slate-700"></div>
          </div>

          <button
            onClick={() => handleConvert(true)}
            disabled={loadingCompare || !xlsxFile || !referenceFile}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded shadow-lg shadow-accent/20 flex justify-center items-center transition-all"
          >
            {loadingCompare ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Convert & Compare"}
          </button>
        </div>
      </div>

      {/* Results View */}
      {results && (
        <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SummaryCard summary={results.summary} />
          <div className="flex-1 min-h-0">
             <DiffTable differences={results.differences} />
          </div>
        </div>
      )}

      {/* JSON Output View */}
      {jsonOutput && (
        <div className="flex-1 min-h-0 flex flex-col bg-surface rounded-xl border border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-surface shrink-0">
            <h3 className="font-semibold text-slate-200 flex items-center">
              <FileSpreadsheet className="w-4 h-4 mr-2 text-accent" />
              Converted JSON Output
            </h3>
            <button 
              onClick={() => {
                const blob = new Blob([JSON.stringify(jsonOutput, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'converted.json';
                a.click();
              }}
              className="text-xs bg-accent/20 text-accent px-3 py-1.5 rounded hover:bg-accent hover:text-white transition-colors font-medium"
            >
              Download JSON
            </button>
          </div>
          <div className="flex-1 p-4 overflow-auto bg-[#0B1120]">
            <JsonTreeViewer data={jsonOutput} />
          </div>
        </div>
      )}
    </div>
  );
}
