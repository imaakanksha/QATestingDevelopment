import { useState } from "react";
import toast from "react-hot-toast";
import {
  Loader2,
  Download,
  Eye,
  EyeOff,
  Filter,
  Printer,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PlusCircle,
  Layers,
  FileText,
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { API_BASE, cn } from "../lib/utils";
import FileUploadZone from "./FileUploadZone";
import SummaryCard from "./SummaryCard";
import DiffTable from "./DiffTable";
import UnifiedResultsView from "./UnifiedResultsView";

/* ─── Status Badge ─── */
function StatusBadge({ status, size = "sm" }) {
  const config = {
    identical: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", label: "Identical", icon: CheckCircle2 },
    modified: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", label: "Modified", icon: AlertTriangle },
    only_in_a: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200", label: "Only in A", icon: XCircle },
    only_in_b: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", label: "Only in B", icon: PlusCircle },
  };
  const c = config[status] || config.modified;
  const Icon = c.icon;
  const isSmall = size === "sm";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider border",
      c.bg, c.text, c.border,
      isSmall ? "px-2 py-0.5 text-[9px]" : "px-3 py-1 text-[10px]"
    )}>
      <Icon className={isSmall ? "w-2.5 h-2.5" : "w-3 h-3"} />
      {c.label}
    </span>
  );
}

/* ─── Metric Card ─── */
function MetricCard({ label, value, color = "text-slate-800", icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center hover:shadow-md transition-shadow">
      {Icon && <Icon className={cn("w-5 h-5 mx-auto mb-2", color)} />}
      <div className={cn("text-2xl font-extrabold mb-1 tracking-tight", color)}>{value}</div>
      <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{label}</div>
    </div>
  );
}

/* ─── Metadata Diff Card ─── */
function MetadataDiffCard({ metadata, nameA, nameB }) {
  const [expanded, setExpanded] = useState(false);
  if (!metadata?.fields?.length) return null;
  const hasDiffs = metadata.fields.some((f) => f.status !== "identical");

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition-colors text-left">
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <FileText className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-slate-800">Metadata</span>
          <span className="text-[11px] bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-medium">{metadata.summary.total} fields</span>
        </div>
        <StatusBadge status={hasDiffs ? "modified" : "identical"} />
      </button>
      {expanded && (
        <div className="border-t border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-slate-500 uppercase bg-slate-50">
                <th className="px-5 py-2.5 text-left font-semibold w-[30%]">Field</th>
                <th className="px-5 py-2.5 text-left font-semibold w-[30%]">{nameA}</th>
                <th className="px-5 py-2.5 text-left font-semibold w-[30%]">{nameB}</th>
                <th className="px-5 py-2.5 text-left font-semibold w-[10%]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metadata.fields.map((f, i) => (
                <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-2.5 font-medium text-slate-700 text-xs">{f.field}</td>
                  <td className="px-5 py-2.5 font-mono text-xs text-slate-600">{f.report_a}</td>
                  <td className="px-5 py-2.5 font-mono text-xs text-slate-600">{f.report_b}</td>
                  <td className="px-5 py-2.5"><StatusBadge status={f.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Section Diff View ─── */
function SectionDiffView({ sectionKey, section, nameA, nameB, showIdentical }) {
  const [expanded, setExpanded] = useState(section.status !== "identical");
  const summary = section.summary || {};
  const isOnlyInOne = section.status === "only_in_a" || section.status === "only_in_b";

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition-colors text-left">
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <Layers className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-slate-800 capitalize">{sectionKey.replace(/_/g, " ")}</span>
          {!isOnlyInOne && (
            <span className="text-[11px] bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-medium">
              {summary.total_rows_a || 0} vs {summary.total_rows_b || 0} rows
            </span>
          )}
        </div>
        <StatusBadge status={section.status} size="md" />
      </button>

      {expanded && (
        <div className="border-t border-slate-200">
          {!isOnlyInOne && summary.total_fields_compared > 0 && (
            <div className="px-5 py-2.5 flex flex-wrap gap-x-5 gap-y-1 border-b border-slate-100 bg-slate-50/50 text-[11px] text-slate-500">
              <span>Fields compared: <strong className="text-slate-700">{summary.total_fields_compared}</strong></span>
              <span>Identical: <strong className="text-emerald-600">{summary.fields_identical}</strong></span>
              <span>Modified: <strong className="text-amber-600">{summary.fields_modified}</strong></span>
              <span>Only in A: <strong className="text-red-600">{summary.fields_only_in_a}</strong></span>
              <span>Only in B: <strong className="text-blue-600">{summary.fields_only_in_b}</strong></span>
            </div>
          )}

          {isOnlyInOne && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-slate-500">
                This section exists only in{" "}
                <strong className="text-slate-700">{section.status === "only_in_a" ? nameA : nameB}</strong>
                {" "}({section.status === "only_in_a" ? summary.total_rows_a : summary.total_rows_b} rows)
              </p>
            </div>
          )}

          {section.comparisons?.length > 0 && (
            <div className="overflow-auto max-h-[600px]">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold w-[25%]">Field</th>
                    <th className="px-5 py-2.5 font-semibold w-[30%]">{nameA}</th>
                    <th className="px-5 py-2.5 font-semibold w-[30%]">{nameB}</th>
                    <th className="px-5 py-2.5 font-semibold w-[15%]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {section.comparisons.map((comp, ci) => {
                    const visibleFields = showIdentical
                      ? comp.fields
                      : comp.fields.filter((f) => f.status !== "identical");
                    if (!showIdentical && visibleFields.length === 0 && comp.status === "identical") return null;

                    return (
                      <tbody key={ci}>
                        <tr className="bg-slate-50/80">
                          <td colSpan={4} className="px-5 py-2 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                              {section.row_key && <span className="text-[10px] text-slate-400 font-medium uppercase">{section.row_key}:</span>}
                              <span className="text-xs font-semibold text-slate-700">{comp.row_key_value}</span>
                              <StatusBadge status={comp.status} />
                            </div>
                          </td>
                        </tr>
                        {visibleFields.map((field, fi) => (
                          <tr key={fi} className="hover:bg-slate-50/70 transition-colors border-b border-slate-100">
                            <td className="px-5 py-2 pl-8 text-xs font-medium text-slate-600">{field.field}</td>
                            <td className={cn("px-5 py-2 font-mono text-xs break-all", field.status === "only_in_b" ? "text-slate-300 italic" : "text-slate-700")}>{field.report_a}</td>
                            <td className={cn("px-5 py-2 font-mono text-xs break-all", field.status === "only_in_a" ? "text-slate-300 italic" : "text-slate-700")}>{field.report_b}</td>
                            <td className="px-5 py-2"><StatusBadge status={field.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION-AWARE RESULTS VIEW (o9 reports — collapsible)
   ═══════════════════════════════════════════════════════ */
function SectionResults({ results, nameA, nameB }) {
  const [showIdentical, setShowIdentical] = useState(false);
  const [activeSection, setActiveSection] = useState("all");
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const res = await fetch(`${API_BASE}/export-section-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(results),
      });
      if (!res.ok) throw new Error("Report generation failed");
      const html = await res.text();

      const container = document.createElement("div");
      container.innerHTML = html;
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      document.body.appendChild(container);

      const filename = `report_comparison_${nameA.replace(/\s+/g, "_")}_vs_${nameB.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a3", orientation: "landscape" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        })
        .from(container)
        .save();

      document.body.removeChild(container);
      toast.success("PDF downloaded!");
    } catch (e) {
      console.error("PDF export error:", e);
      toast.error(e.message || "PDF export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleExportHTML = async () => {
    try {
      const res = await fetch(`${API_BASE}/export-section-report`, {
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
      a.download = `report_comparison_${new Date().toISOString().slice(0, 10)}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("HTML report downloaded!");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const visibleSections = activeSection === "all" ? results.section_order : [activeSection];

  return (
    <div className="animate-fade-in-up space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent" />
          O9 Report Comparison (Section View)
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowIdentical(!showIdentical)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border",
              showIdentical ? "bg-accent/10 text-accent border-accent/20" : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
            )}>
            {showIdentical ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showIdentical ? "Showing All" : "Diffs Only"}
          </button>
          <button onClick={handleExportHTML}
            className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors font-medium border border-slate-200">
            <Printer className="w-3.5 h-3.5" /> HTML Report
          </button>
          <button id="btn-export-pdf-section" onClick={handleExportPDF} disabled={exporting}
            className="flex items-center gap-1.5 text-xs bg-slate-800 text-white px-4 py-1.5 rounded-lg hover:bg-slate-700 transition-colors font-medium shadow-sm disabled:opacity-60">
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download PDF
          </button>
        </div>
      </div>

      {/* Summary dashboard */}
      <div className="grid grid-cols-5 gap-3">
        <MetricCard label="Match Score" value={`${results.overall_summary.match_percentage}%`} color="text-accent" icon={BarChart3} />
        <MetricCard label="Sections" value={results.overall_summary.total_sections} color="text-slate-800" />
        <MetricCard label="Fields Compared" value={results.overall_summary.total_fields_compared} color="text-slate-800" />
        <MetricCard label="Differences" value={results.overall_summary.total_differences} color="text-amber-600" icon={AlertTriangle} />
        <MetricCard label="Identical Sections" value={results.overall_summary.sections_identical} color="text-emerald-600" icon={CheckCircle2} />
      </div>

      {/* Section tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg overflow-x-auto">
        <button onClick={() => setActiveSection("all")}
          className={cn("px-4 py-2 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
            activeSection === "all" ? "bg-white text-accent shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/50")}>
          <Filter className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" /> All Sections
        </button>
        {results.section_order.map((sec) => {
          const diff = results.section_diffs[sec];
          return (
            <button key={sec} onClick={() => setActiveSection(sec)}
              className={cn("px-3 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                activeSection === sec ? "bg-white text-accent shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/50")}>
              <span className="capitalize">{sec.replace(/_/g, " ")}</span>
              {diff && <span className={cn("w-2 h-2 rounded-full inline-block",
                diff.status === "identical" ? "bg-emerald-400" :
                diff.status === "modified" ? "bg-amber-400" :
                diff.status === "only_in_a" ? "bg-red-400" : "bg-blue-400")} />}
            </button>
          );
        })}
      </div>

      {/* Metadata diff */}
      {activeSection === "all" && (
        <MetadataDiffCard metadata={results.metadata_diff} nameA={results.report_a_name} nameB={results.report_b_name} />
      )}

      {/* Section diffs */}
      {visibleSections.map((sec) => (
        <SectionDiffView key={sec} sectionKey={sec} section={results.section_diffs[sec]}
          nameA={results.report_a_name} nameB={results.report_b_name} showIdentical={showIdentical} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   FLAT RESULTS VIEW (generic JSON diff)
   ═══════════════════════════════════════════════════════ */
function FlatResults({ results }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
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
    <div className="animate-fade-in-up space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-800">Results</h2>
        <button id="btn-export" onClick={handleExport} disabled={exporting}
          className="flex items-center gap-2 text-sm bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium shadow-sm disabled:opacity-60">
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Export HTML Report
        </button>
      </div>
      <SummaryCard summary={results.summary} />
      <DiffTable differences={results.differences} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN JSON COMPARATOR COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function JsonComparator() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [nameA, setNameA] = useState("Report 1");
  const [nameB, setNameB] = useState("Report 2");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleCompare = async () => {
    if (!fileA || !fileB) {
      toast.error("Please upload both JSON files");
      return;
    }
    setLoading(true);
    setResults(null);

    const formData = new FormData();
    formData.append("baseline", fileA);
    formData.append("target", fileB);

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

      // Apply custom names for unified and section modes
      if (data.mode === "unified" || data.mode === "section") {
        data.report_a_name = nameA || fileA.name;
        data.report_b_name = nameB || fileB.name;
      }

      setResults(data);

      // Show appropriate success message based on mode
      if (data.mode === "unified") {
        toast.success(`Comparison complete — ${data.summary.match_percentage}% match`);
      } else if (data.mode === "section") {
        toast.success(`Comparison complete — ${data.overall_summary.match_percentage}% match`);
      } else {
        toast.success(`Comparison complete (flat diff) — ${data.summary.match_score}% match`);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload zones with neutral naming */}
      <div className="grid grid-cols-2 gap-5">
        <div className="space-y-3">
          <FileUploadZone
            file={fileA}
            onFileChange={(f) => {
              setFileA(f);
              if (f && nameA === "Report 1") setNameA(f.name.replace(/\.(json|xlsx|xls)$/i, ""));
            }}
            label="Report 1 (JSON)"
            accept=".json"
            id="upload-report-1"
          />
          <input type="text" value={nameA} onChange={(e) => setNameA(e.target.value)}
            placeholder="Report 1 Name"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all" />
        </div>
        <div className="space-y-3">
          <FileUploadZone
            file={fileB}
            onFileChange={(f) => {
              setFileB(f);
              if (f && nameB === "Report 2") setNameB(f.name.replace(/\.(json|xlsx|xls)$/i, ""));
            }}
            label="Report 2 (JSON)"
            accept=".json"
            id="upload-report-2"
          />
          <input type="text" value={nameB} onChange={(e) => setNameB(e.target.value)}
            placeholder="Report 2 Name"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all" />
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-accent/5 border border-accent/20 rounded-lg px-4 py-3 flex items-start gap-3">
        <ArrowLeftRight className="w-4 h-4 text-accent mt-0.5 shrink-0" />
        <p className="text-xs text-slate-600">
          <strong className="text-slate-700">Auto-detect:</strong> If both files are O9 structured reports (with <code className="bg-slate-100 px-1 rounded text-[11px]">sections</code>), the engine produces a <strong>single flat comparison table</strong> across all sections — dimensions, measures, filters, settings, and metadata — in one view. Otherwise, a generic deep-diff is used. PDF export is available for both modes.
        </p>
      </div>

      {/* Compare button */}
      <div className="flex justify-center">
        <button id="btn-compare" onClick={handleCompare}
          disabled={loading || !fileA || !fileB}
          className="bg-accent hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-10 rounded-lg shadow-sm flex items-center gap-2 transition-all">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Comparing…" : "Compare Now"}
        </button>
      </div>

      {/* Results — render based on mode */}
      {results && results.mode === "unified" && (
        <UnifiedResultsView results={results} nameA={nameA} nameB={nameB} />
      )}
      {results && results.mode === "section" && (
        <SectionResults results={results} nameA={nameA} nameB={nameB} />
      )}
      {results && results.mode === "flat" && (
        <FlatResults results={results} />
      )}

      {/* Empty state */}
      {!results && !loading && (
        <div className="text-center py-16 text-slate-400">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Layers className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">
            Upload two JSON files to compare
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Supports O9 structured report JSONs (unified flat-table comparison) and generic JSON files (deep-diff). All differences appear in a single table and can be exported as PDF.
          </p>
        </div>
      )}
    </div>
  );
}
