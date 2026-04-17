import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Loader2,
  Settings,
  Download,
  Layers,
  Table2,
  Zap,
  ChevronDown,
  ChevronRight,
  Copy,
  FileSpreadsheet,
} from "lucide-react";
import { API_BASE } from "../lib/utils";
import FileUploadZone from "./FileUploadZone";
import SummaryCard from "./SummaryCard";
import DiffTable from "./DiffTable";
import JsonTreeViewer from "./JsonTreeViewer";

/**
 * Section badge shown in wireframe preview results.
 */
function SectionBadge({ name, row }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs bg-accent/10 text-accent px-2.5 py-1 rounded-full font-medium">
      <Layers className="w-3 h-3" />
      {name}
      <span className="text-accent/50 text-[10px]">row {row}</span>
    </span>
  );
}

/**
 * Collapsible section viewer for wireframe JSON output.
 */
function SectionViewer({ sectionKey, section, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const recordCount = section.data?.length ?? 0;
  const colCount = section.columns?.length ?? 0;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-sm font-semibold text-slate-800 capitalize">
            {sectionKey.replace(/_/g, " ")}
          </span>
          <span className="text-[11px] bg-white text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 font-medium">
            {colCount} cols · {recordCount} rows
          </span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 border-t border-slate-200 bg-white">
          {/* Column list */}
          <div className="mb-3">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">
              Columns
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(section.columns || []).map((col, i) => (
                <span
                  key={i}
                  className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>

          {/* Data tree */}
          <JsonTreeViewer data={section.data} />
        </div>
      )}
    </div>
  );
}

export default function XlsxConverter() {
  const [xlsxFile, setXlsxFile] = useState(null);
  const [referenceFile, setReferenceFile] = useState(null);
  const [loadingConvert, setLoadingConvert] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [results, setResults] = useState(null);
  const [jsonOutput, setJsonOutput] = useState(null);

  // Mode: "wireframe" (section-aware) or "flat" (legacy flat-table)
  const [mode, setMode] = useState("wireframe");

  // Preview state (shown after upload for wireframe mode)
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [options, setOptions] = useState({
    sheet_name: "",
    header_row: 1,
    treat_first_column_as_key: true,
    normalize_keys: true,
  });

  // Auto-detect wireframe sections when file is uploaded
  const handleFileChange = useCallback(
    async (file) => {
      setXlsxFile(file);
      setResults(null);
      setJsonOutput(null);
      setPreview(null);

      if (!file) return;

      // Auto-preview in wireframe mode
      if (mode === "wireframe") {
        setLoadingPreview(true);
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch(`${API_BASE}/wireframe-preview`, {
            method: "POST",
            body: fd,
          });
          if (res.ok) {
            const data = await res.json();
            setPreview(data);
            if (data.is_wireframe) {
              toast.success(
                `Detected ${data.detected_sections.length} section(s) in wireframe`
              );
            } else {
              toast(
                "No wireframe sections detected — will parse as flat table",
                { icon: "ℹ️" }
              );
            }
          }
        } catch {
          // Preview is optional — don't block
        } finally {
          setLoadingPreview(false);
        }
      }
    },
    [mode]
  );

  const buildFormData = (compare) => {
    const fd = new FormData();

    if (mode === "wireframe" && !compare) {
      // Wireframe mode
      fd.append("file", xlsxFile);
      if (options.sheet_name) fd.append("sheet_name", options.sheet_name);
      fd.append("normalize_keys", options.normalize_keys);
    } else {
      // Flat mode / compare mode
      fd.append(compare ? "xlsx_file" : "file", xlsxFile);
      if (compare) fd.append("reference_file", referenceFile);
      if (options.sheet_name) fd.append("sheet_name", options.sheet_name);
      fd.append("header_row", options.header_row);
      fd.append("treat_first_column_as_key", options.treat_first_column_as_key);
      fd.append("normalize_keys", options.normalize_keys);
    }
    return fd;
  };

  const handleConvert = async (compare = false) => {
    if (!xlsxFile) return toast.error("Please upload an XLSX file");
    if (compare && !referenceFile)
      return toast.error("Please upload a reference JSON");

    compare ? setLoadingCompare(true) : setLoadingConvert(true);

    try {
      let endpoint;
      if (compare) {
        endpoint = "/xlsx-compare";
      } else if (mode === "wireframe") {
        endpoint = "/wireframe-to-json";
      } else {
        endpoint = "/xlsx-to-json";
      }

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
        const sectionCount = data.section_order?.length;
        if (sectionCount) {
          toast.success(
            `Parsed ${sectionCount} section(s) with ${Object.values(data.sections || {}).reduce((a, s) => a + (s.data?.length || 0), 0)} total records`
          );
        } else {
          toast.success("Converted to JSON!");
        }
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      compare ? setLoadingCompare(false) : setLoadingConvert(false);
    }
  };

  const downloadConvertedJson = () => {
    if (!jsonOutput) return;
    const blob = new Blob([JSON.stringify(jsonOutput, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    if (!jsonOutput) return;
    navigator.clipboard.writeText(JSON.stringify(jsonOutput, null, 2));
    toast.success("Copied to clipboard");
  };

  const isWireframeOutput =
    jsonOutput && jsonOutput.sections && jsonOutput.section_order;

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          onClick={() => {
            setMode("wireframe");
            setJsonOutput(null);
            setResults(null);
            setPreview(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            mode === "wireframe"
              ? "bg-white text-accent shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Layers className="w-4 h-4" />
          Wireframe Mode
        </button>
        <button
          onClick={() => {
            setMode("flat");
            setJsonOutput(null);
            setResults(null);
            setPreview(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            mode === "flat"
              ? "bg-white text-accent shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Table2 className="w-4 h-4" />
          Flat Table Mode
        </button>
      </div>

      {/* Top row: Uploads + Options + Actions */}
      <div className="grid grid-cols-3 gap-5">
        {/* Uploads column */}
        <div className="flex flex-col gap-4">
          <FileUploadZone
            file={xlsxFile}
            onFileChange={handleFileChange}
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
              <label className="block text-xs text-slate-500 mb-1 font-medium">
                Sheet Name
              </label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                placeholder="Leave blank for first sheet"
                value={options.sheet_name}
                onChange={(e) =>
                  setOptions({ ...options, sheet_name: e.target.value })
                }
              />
            </div>

            {/* Flat-mode-only options */}
            {mode === "flat" && (
              <>
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">
                    Header Row
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                    value={options.header_row}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        header_row: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent/30"
                    checked={options.treat_first_column_as_key}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        treat_first_column_as_key: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-slate-600 select-none">
                    Use Column 1 as keys
                  </span>
                </label>
              </>
            )}

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent/30"
                checked={options.normalize_keys}
                onChange={(e) =>
                  setOptions({ ...options, normalize_keys: e.target.checked })
                }
              />
              <span className="text-sm text-slate-600 select-none">
                Normalize column names
              </span>
            </label>

            {/* Wireframe mode hint */}
            {mode === "wireframe" && (
              <div className="bg-accent/5 rounded-lg p-3 border border-accent/10">
                <p className="text-[11px] text-accent/80 leading-relaxed">
                  <strong>Wireframe mode</strong> auto-detects section banners
                  (colored rows like <em>Filter AOP</em>, <em>Dimensions</em>,{" "}
                  <em>Measure</em>) and parses each section with its own headers.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions column */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 flex flex-col justify-center gap-4">
          <button
            id="btn-convert"
            onClick={() => handleConvert(false)}
            disabled={loadingConvert || !xlsxFile}
            className="w-full bg-accent hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg shadow-sm flex justify-center items-center gap-2 transition-all text-sm"
          >
            {loadingConvert ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {mode === "wireframe"
              ? "Parse Wireframe"
              : "Convert to JSON Only"}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-b border-slate-200" />
            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
              or
            </span>
            <div className="flex-1 border-b border-slate-200" />
          </div>

          <button
            id="btn-convert-compare"
            onClick={() => handleConvert(true)}
            disabled={loadingCompare || !xlsxFile || !referenceFile}
            className="w-full bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-medium py-3 px-4 rounded-lg border border-slate-200 flex justify-center items-center gap-2 transition-all text-sm"
          >
            {loadingCompare && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            Convert & Compare
          </button>
        </div>
      </div>

      {/* Wireframe preview (shown after upload) */}
      {preview && mode === "wireframe" && (
        <div className="animate-fade-in-up bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-slate-800">
              Wireframe Preview
            </h3>
            <span className="text-[11px] bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-medium">
              {preview.total_rows} rows · {preview.total_cols} cols ·{" "}
              {preview.sheet}
            </span>
          </div>

          {preview.is_wireframe ? (
            <div className="flex flex-wrap gap-2">
              {preview.detected_sections.map((sec, i) => (
                <SectionBadge key={i} name={sec.name} row={sec.row} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              No section banners detected — will parse as a standard flat table.
            </p>
          )}
        </div>
      )}

      {loadingPreview && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Detecting wireframe sections…
        </div>
      )}

      {/* Comparison results */}
      {results && (
        <div className="animate-fade-in-up space-y-4">
          <SummaryCard summary={results.summary} />
          <DiffTable differences={results.differences} />
        </div>
      )}

      {/* Wireframe JSON output */}
      {isWireframeOutput && (
        <div className="animate-fade-in-up space-y-4">
          {/* Header bar */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-slate-800 text-sm">
                  Wireframe JSON Output
                </h3>
                <span className="text-[11px] bg-accent/10 text-accent px-2.5 py-0.5 rounded-full font-medium">
                  {jsonOutput.section_order.length} sections ·{" "}
                  {Object.values(jsonOutput.sections).reduce(
                    (a, s) => a + (s.data?.length || 0),
                    0
                  )}{" "}
                  total records
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
                <button
                  onClick={downloadConvertedJson}
                  className="flex items-center gap-1.5 text-xs bg-accent text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Download className="w-3.5 h-3.5" /> Download JSON
                </button>
              </div>
            </div>

            {/* Metadata */}
            {jsonOutput.metadata &&
              Object.keys(jsonOutput.metadata).length > 0 && (
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">
                    Metadata
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    {Object.entries(jsonOutput.metadata).map(([k, v]) => (
                      <div key={k} className="text-xs">
                        <span className="text-slate-500 font-medium">{k}:</span>{" "}
                        <span className="text-slate-700">
                          {v !== null ? String(v) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Section viewers */}
          {jsonOutput.section_order.map((secKey, i) => (
            <SectionViewer
              key={secKey}
              sectionKey={secKey}
              section={jsonOutput.sections[secKey]}
              defaultExpanded={i === 0}
            />
          ))}
        </div>
      )}

      {/* Flat JSON output (legacy mode) */}
      {jsonOutput && !isWireframeOutput && (
        <div className="animate-fade-in-up bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 text-sm">
              Converted JSON Output
            </h3>
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              <button
                onClick={downloadConvertedJson}
                className="flex items-center gap-1.5 text-xs bg-accent text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Download className="w-3.5 h-3.5" /> Download JSON
              </button>
            </div>
          </div>
          <div className="p-4">
            <JsonTreeViewer data={jsonOutput} />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!results && !jsonOutput && !loadingConvert && !loadingCompare && (
        <div className="text-center py-12 text-slate-400">
          <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">
            Upload an XLSX wireframe and click{" "}
            <strong className="text-slate-500">Parse Wireframe</strong> to get
            started.
          </p>
          <p className="text-xs mt-1 text-slate-300">
            Supports O9 multi-section wireframes with colored section banners.
          </p>
        </div>
      )}
    </div>
  );
}
