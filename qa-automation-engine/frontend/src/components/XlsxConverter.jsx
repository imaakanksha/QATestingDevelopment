import { useState } from "react";
import toast from "react-hot-toast";
import {
  Loader2,
  Download,
  Printer,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileJson,
  BarChart3,
  Filter,
  Layers,
  Activity,
  Eye,
  EyeOff,
} from "lucide-react";
import { API_BASE, cn, printHtmlReport } from "../lib/utils";
import FileUploadZone from "./FileUploadZone";

/* ═══════════════════════════════════════════════════════
   STATUS BADGE
   ═══════════════════════════════════════════════════════ */
function StatusBadge({ status }) {
  const config = {
    match: { icon: CheckCircle2, label: "Match", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    mismatch: { icon: XCircle, label: "Mismatch", cls: "bg-red-50 text-red-700 border-red-200" },
    only_in_wireframe: { icon: AlertTriangle, label: "Only in Wireframe", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    only_in_report: { icon: AlertTriangle, label: "Only in Report", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  };
  const c = config[status] || config.mismatch;
  const Icon = c.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border", c.cls)}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════
   METRIC CARD
   ═══════════════════════════════════════════════════════ */
function MetricCard({ label, value, icon: Icon, color = "text-slate-800" }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
      {Icon && <Icon className={cn("w-5 h-5 mx-auto mb-1.5", color)} />}
      <div className={cn("text-2xl font-bold", color)}>{value}</div>
      <div className="text-[11px] text-slate-500 font-medium mt-0.5">{label}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION TABLE (collapsible)
   ═══════════════════════════════════════════════════════ */
function SectionTable({ title, icon: Icon, rows, showMatches }) {
  const [expanded, setExpanded] = useState(true);

  const filtered = showMatches ? rows : rows.filter((r) => r.status !== "match");
  const matchCount = rows.filter((r) => r.status === "match").length;
  const issueCount = rows.length - matchCount;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <Icon className="w-4.5 h-4.5 text-accent" />
          <span className="text-sm font-bold text-slate-800">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {issueCount > 0 && (
            <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-200 font-bold">
              {issueCount} issue{issueCount !== 1 ? "s" : ""}
            </span>
          )}
          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
            {matchCount} match{matchCount !== 1 ? "es" : ""}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-t border-slate-200">
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wider w-36">Item</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wider w-40">Field</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wider">Wireframe</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wider">O9 Report</th>
                <th className="text-center px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wider w-36">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-400 italic">
                    {showMatches ? "No items in this section" : "All items match ✓"}
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "transition-colors",
                      row.status === "mismatch" && "bg-red-50/40",
                      row.status === "only_in_wireframe" && "bg-amber-50/40",
                      row.status === "only_in_report" && "bg-blue-50/40",
                    )}
                  >
                    <td className="px-4 py-2.5 font-semibold text-slate-700">{row.item_key}</td>
                    <td className="px-4 py-2.5 text-slate-600 font-mono text-[11px]">{row.field}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("font-mono text-[11px]", row.status === "mismatch" ? "text-red-700 font-bold" : "text-slate-600")}>
                        {row.wireframe_value}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn("font-mono text-[11px]", row.status === "mismatch" ? "text-red-700 font-bold" : "text-slate-600")}>
                        {row.report_value}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   VALIDATION RESULTS VIEW
   ═══════════════════════════════════════════════════════ */
function ValidationResults({ data, nameA, nameB }) {
  const [showMatches, setShowMatches] = useState(true);

  const { summary, rows, counts } = data;
  const filterRows = rows.filter((r) => r.section === "Filters");
  const dimRows = rows.filter((r) => r.section === "Dimensions");
  const measureRows = rows.filter((r) => r.section === "Measures");

  const hasIssues = summary.mismatches > 0 || summary.only_in_wireframe > 0 || summary.only_in_report > 0;

  const handlePrint = async () => {
    // Build a simple HTML report for printing
    const buildTable = (title, sectionRows) => {
      if (sectionRows.length === 0) return "";
      const headerRow = `<tr><th>Item</th><th>Field</th><th>Wireframe</th><th>O9 Report</th><th>Verdict</th></tr>`;
      const dataRows = sectionRows
        .map(
          (r) =>
            `<tr class="${r.status}"><td>${r.item_key}</td><td>${r.field}</td><td>${r.wireframe_value}</td><td>${r.report_value}</td><td>${r.status.replace(/_/g, " ")}</td></tr>`
        )
        .join("");
      return `<h2>${title}</h2><table>${headerRow}${dataRows}</table>`;
    };

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Wireframe Validation — ${nameA} vs ${nameB}</title>
    <style>
      body { font-family: -apple-system, sans-serif; padding: 30px; color: #1e293b; }
      h1 { font-size: 22px; margin-bottom: 5px; }
      h2 { font-size: 16px; margin: 25px 0 8px; color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
      .subtitle { color: #64748b; margin-bottom: 20px; }
      .summary { display: flex; gap: 15px; margin-bottom: 25px; }
      .metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 20px; text-align: center; min-width: 100px; }
      .metric .val { font-size: 24px; font-weight: 700; }
      .metric .lbl { font-size: 11px; color: #64748b; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 15px; }
      th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-weight: 600; border: 1px solid #e2e8f0; }
      td { padding: 6px 10px; border: 1px solid #e2e8f0; }
      tr.mismatch { background: #fef2f2; }
      tr.only_in_wireframe { background: #fffbeb; }
      tr.only_in_report { background: #eff6ff; }
      @media print { body { padding: 15px; } }
    </style></head><body>
    <h1>Wireframe Validation Report</h1>
    <p class="subtitle">${nameA} vs ${nameB} — ${new Date().toLocaleDateString()}</p>
    <div class="summary">
      <div class="metric"><div class="val">${summary.match_percentage}%</div><div class="lbl">Match Score</div></div>
      <div class="metric"><div class="val">${summary.total_fields}</div><div class="lbl">Total Fields</div></div>
      <div class="metric"><div class="val" style="color:#059669">${summary.matches}</div><div class="lbl">Matches</div></div>
      <div class="metric"><div class="val" style="color:#dc2626">${summary.mismatches}</div><div class="lbl">Mismatches</div></div>
      <div class="metric"><div class="val" style="color:#d97706">${summary.only_in_wireframe}</div><div class="lbl">Only in WF</div></div>
      <div class="metric"><div class="val" style="color:#2563eb">${summary.only_in_report}</div><div class="lbl">Only in Report</div></div>
    </div>
    ${buildTable("Filters", filterRows)}
    ${buildTable("Dimensions", dimRows)}
    ${buildTable("Measures", measureRows)}
    </body></html>`;

    printHtmlReport(html, `Wireframe Validation — ${nameA} vs ${nameB}`);
  };

  return (
    <div className="animate-fade-in-up space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <Shield className={cn("w-6 h-6", hasIssues ? "text-red-500" : "text-emerald-500")} />
          <h2 className="text-lg font-bold text-slate-800">Validation Results</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMatches(!showMatches)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border",
              showMatches
                ? "bg-accent/10 text-accent border-accent/20"
                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
            )}
          >
            {showMatches ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showMatches ? "Showing All" : "Issues Only"}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs bg-slate-800 text-white px-4 py-1.5 rounded-lg hover:bg-slate-700 transition-colors font-medium shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Overall verdict */}
      <div className={cn(
        "rounded-xl border-2 p-4 flex items-center gap-3",
        hasIssues ? "border-red-200 bg-red-50/50" : "border-emerald-200 bg-emerald-50/50"
      )}>
        {hasIssues ? (
          <>
            <XCircle className="w-7 h-7 text-red-500 flex-shrink-0" />
            <div>
              <div className="font-bold text-red-800">Validation Failed</div>
              <div className="text-sm text-red-600">
                Found {summary.mismatches} mismatch{summary.mismatches !== 1 ? "es" : ""}, {summary.only_in_wireframe} wireframe-only, and {summary.only_in_report} report-only item{summary.only_in_report !== 1 ? "s" : ""}.
              </div>
            </div>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-7 h-7 text-emerald-500 flex-shrink-0" />
            <div>
              <div className="font-bold text-emerald-800">Validation Passed</div>
              <div className="text-sm text-emerald-600">All {summary.total_fields} fields match between wireframe and report.</div>
            </div>
          </>
        )}
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-6 gap-3">
        <MetricCard label="Match Score" value={`${summary.match_percentage}%`} icon={BarChart3} color={summary.match_percentage === 100 ? "text-emerald-600" : "text-red-500"} />
        <MetricCard label="Total Fields" value={summary.total_fields} color="text-slate-800" />
        <MetricCard label="Matches" value={summary.matches} icon={CheckCircle2} color="text-emerald-600" />
        <MetricCard label="Mismatches" value={summary.mismatches} icon={XCircle} color="text-red-500" />
        <MetricCard label="Only in Wireframe" value={summary.only_in_wireframe} icon={AlertTriangle} color="text-amber-500" />
        <MetricCard label="Only in Report" value={summary.only_in_report} icon={AlertTriangle} color="text-blue-500" />
      </div>

      {/* Item counts */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex justify-between items-center">
          <span className="text-slate-500 font-medium flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Filters</span>
          <span className="font-mono text-slate-700">WF: {counts.wireframe.filters} | RPT: {counts.report.filters}</span>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex justify-between items-center">
          <span className="text-slate-500 font-medium flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Dimensions</span>
          <span className="font-mono text-slate-700">WF: {counts.wireframe.dimensions} | RPT: {counts.report.dimensions}</span>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex justify-between items-center">
          <span className="text-slate-500 font-medium flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Measures</span>
          <span className="font-mono text-slate-700">WF: {counts.wireframe.measures} | RPT: {counts.report.measures}</span>
        </div>
      </div>

      {/* Section tables */}
      <SectionTable title="Filters" icon={Filter} rows={filterRows} showMatches={showMatches} />
      <SectionTable title="Dimensions" icon={Layers} rows={dimRows} showMatches={showMatches} />
      <SectionTable title="Measures" icon={Activity} rows={measureRows} showMatches={showMatches} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN WIREFRAME VALIDATOR COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function XlsxConverter() {
  const [wireframeFile, setWireframeFile] = useState(null);
  const [reportFile, setReportFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [nameA, setNameA] = useState("Wireframe");
  const [nameB, setNameB] = useState("O9 Report");

  const handleWireframeChange = (file) => {
    setWireframeFile(file);
    setValidationResult(null);
    if (file) setNameA(file.name.replace(/\.(xlsx|xls)$/i, ""));
  };

  const handleReportChange = (file) => {
    setReportFile(file);
    setValidationResult(null);
    if (file) setNameB(file.name.replace(/\.json$/i, ""));
  };

  const handleValidate = async () => {
    if (!wireframeFile) return toast.error("Please upload a wireframe XLSX");
    if (!reportFile) return toast.error("Please upload an O9 report JSON");

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("wireframe_file", wireframeFile);
      fd.append("report_file", reportFile);

      const res = await fetch(`${API_BASE}/wireframe-compare`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(err.detail);
      }

      const data = await res.json();
      setValidationResult(data);

      const pct = data.summary.match_percentage;
      if (pct === 100) {
        toast.success("Perfect match — 100% validation passed!");
      } else if (pct >= 90) {
        toast.success(`Validation complete — ${pct}% match`);
      } else {
        toast.error(`Validation found significant issues — ${pct}% match`);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Wireframe (XLSX)
          </label>
          <FileUploadZone
            accept=".xlsx,.xls"
            label="Drop wireframe XLSX here"
            file={wireframeFile}
            onFileChange={handleWireframeChange}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <FileJson className="w-3.5 h-3.5" />
            O9 Report (JSON)
          </label>
          <FileUploadZone
            accept=".json"
            label="Drop O9 report JSON here"
            file={reportFile}
            onFileChange={handleReportChange}
          />
        </div>
      </div>

      {/* Validate button */}
      <div className="flex justify-center">
        <button
          id="btn-validate"
          onClick={handleValidate}
          disabled={!wireframeFile || !reportFile || loading}
          className="flex items-center gap-2 bg-gradient-to-r from-accent to-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
          {loading ? "Validating..." : "Validate Report"}
        </button>
      </div>

      {/* Results */}
      {validationResult && (
        <ValidationResults data={validationResult} nameA={nameA} nameB={nameB} />
      )}
    </div>
  );
}
