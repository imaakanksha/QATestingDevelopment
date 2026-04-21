import { useState, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import {
  Loader2,
  Download,
  Printer,
  Eye,
  EyeOff,
  Search,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  CircleDot,
} from "lucide-react";
import { API_BASE, cn, printHtmlReport } from "../lib/utils";

/* ─────────────────────────────────────────────
   Verdict Badge — the "Final Verdict" column
   ───────────────────────────────────────────── */
function VerdictBadge({ status }) {
  const config = {
    identical: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      label: "✅ Match",
      icon: CheckCircle2,
    },
    modified: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      label: "❌ Mismatch",
      icon: AlertTriangle,
    },
    only_in_a: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      label: "⚠️ Only in Report 1",
      icon: XCircle,
    },
    only_in_b: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      label: "⚠️ Only in Report 2",
      icon: PlusCircle,
    },
  };
  const c = config[status] || config.modified;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-bold tracking-wide border px-2.5 py-1 text-[10px] whitespace-nowrap",
        c.bg,
        c.text,
        c.border
      )}
    >
      {c.label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Metric Card
   ───────────────────────────────────────────── */
function MetricCard({ label, value, color = "text-slate-800", icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center hover:shadow-md transition-shadow">
      {Icon && <Icon className={cn("w-5 h-5 mx-auto mb-2", color)} />}
      <div className={cn("text-2xl font-extrabold mb-1 tracking-tight", color)}>
        {value}
      </div>
      <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section color mapping
   ───────────────────────────────────────────── */
const SECTION_COLORS = {
  metadata: "bg-indigo-100 text-indigo-700 border-indigo-200",
  "filter aop": "bg-cyan-100 text-cyan-700 border-cyan-200",
  filters: "bg-cyan-100 text-cyan-700 border-cyan-200",
  dimensions: "bg-violet-100 text-violet-700 border-violet-200",
  measures: "bg-emerald-100 text-emerald-700 border-emerald-200",
  settings: "bg-amber-100 text-amber-700 border-amber-200",
  "kpi panel": "bg-rose-100 text-rose-700 border-rose-200",
};

function getSectionColor(section) {
  const lower = section.toLowerCase();
  for (const [key, color] of Object.entries(SECTION_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "bg-slate-100 text-slate-600 border-slate-200";
}

/* ─────────────────────────────────────────────
   Build "JSON Difference" description from item + field
   ───────────────────────────────────────────── */
function formatDifference(row) {
  // Combine item and field into readable description
  if (row.item === "--" || row.item === "\u2014") {
    return row.field;
  }
  if (row.field === "(all fields)") {
    return row.item;
  }
  return `${row.item} \u2192 ${row.field}`;
}

/* ═════════════════════════════════════════════
   MAIN UNIFIED RESULTS VIEW — 5 Column Table
   ═════════════════════════════════════════════ */
export default function UnifiedResultsView({ results, nameA, nameB }) {
  const [showIdentical, setShowIdentical] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 30;

  const tableRef = useRef(null);

  // Unique sections for filter dropdown
  const allSections = useMemo(() => {
    if (!results?.rows) return [];
    return [...new Set(results.rows.map((r) => r.section))];
  }, [results]);

  // Filter & search
  const filteredRows = useMemo(() => {
    if (!results?.rows) return [];
    let rows = results.rows;

    // Filter identical
    if (!showIdentical) {
      rows = rows.filter((r) => r.status !== "identical");
    }

    // Section filter
    if (sectionFilter !== "all") {
      rows = rows.filter((r) => r.section === sectionFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      rows = rows.filter((r) => r.status === statusFilter);
    }

    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.section.toLowerCase().includes(q) ||
          r.item.toLowerCase().includes(q) ||
          r.field.toLowerCase().includes(q) ||
          r.report_a.toLowerCase().includes(q) ||
          r.report_b.toLowerCase().includes(q)
      );
    }

    return rows;
  }, [results, showIdentical, sectionFilter, statusFilter, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset page on filter change
  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  // Count by status
  const statusCounts = useMemo(() => {
    if (!results?.rows) return {};
    const counts = { identical: 0, modified: 0, only_in_a: 0, only_in_b: 0 };
    results.rows.forEach((r) => {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });
    return counts;
  }, [results]);

  /* ── Get report HTML from backend ── */
  const getUnifiedReportHtml = async () => {
    const res = await fetch(`${API_BASE}/export-unified-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report_a_name: nameA,
        report_b_name: nameB,
        rows: results.rows,
        summary: results.summary,
      }),
    });
    if (!res.ok) throw new Error("Report generation failed");
    return await res.text();
  };

  /* ── HTML Export ── */
  const handleExportHTML = async () => {
    try {
      const html = await getUnifiedReportHtml();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${nameA.replace(/\s+/g, "_")}_vs_${nameB.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("HTML report downloaded!");
    } catch (e) {
      toast.error(e.message);
    }
  };

  /* ── Print / Save as PDF ── */
  const handlePrintPDF = async () => {
    try {
      const html = await getUnifiedReportHtml();
      printHtmlReport(html, `${nameA} vs ${nameB} — Comparison Report`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (!results) return null;

  const summary = results.summary || {};
  const totalDiffs = (summary.modified || 0) + (summary.only_in_a || 0) + (summary.only_in_b || 0);

  return (
    <div className="animate-fade-in-up space-y-5">
      {/* ── Header toolbar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent" />
          Comparison Results
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportHTML}
            className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors font-medium border border-slate-200"
          >
            <Download className="w-3.5 h-3.5" />
            HTML Report
          </button>
          <button
            id="btn-print-pdf"
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 text-xs bg-slate-800 text-white px-4 py-1.5 rounded-lg hover:bg-slate-700 transition-colors font-medium shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* ── Summary dashboard ── */}
      <div className="grid grid-cols-5 gap-3">
        <MetricCard
          label="Match Score"
          value={`${summary.match_percentage}%`}
          color="text-accent"
          icon={BarChart3}
        />
        <MetricCard
          label="Total Fields"
          value={summary.total_fields}
          color="text-slate-800"
        />
        <MetricCard
          label="Identical"
          value={summary.identical}
          color="text-emerald-600"
          icon={CheckCircle2}
        />
        <MetricCard
          label="Modified"
          value={summary.modified}
          color="text-amber-600"
          icon={AlertTriangle}
        />
        <MetricCard
          label="Only in One"
          value={(summary.only_in_a || 0) + (summary.only_in_b || 0)}
          color="text-red-600"
          icon={XCircle}
        />
      </div>

      {/* ── Match Score Progress Bar ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-600">Overall Match</span>
          <span className={cn(
            "text-sm font-extrabold",
            summary.match_percentage >= 80 ? "text-emerald-600" :
            summary.match_percentage >= 50 ? "text-amber-600" : "text-red-600"
          )}>
            {summary.match_percentage}%
          </span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              summary.match_percentage >= 80 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
              summary.match_percentage >= 50 ? "bg-gradient-to-r from-amber-400 to-amber-500" :
              "bg-gradient-to-r from-red-400 to-red-500"
            )}
            style={{ width: `${summary.match_percentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium">
          <span>{summary.identical || 0} identical</span>
          <span>{totalDiffs} difference{totalDiffs !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* ── Filter & search bar ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search fields, values, sections…"
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Section filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sectionFilter}
            onChange={(e) => handleFilterChange(setSectionFilter)(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          >
            <option value="all">All Sections</option>
            {allSections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1">
          {[
            { key: "all", label: "All", count: results.rows?.length || 0 },
            { key: "modified", label: "Mismatch", count: statusCounts.modified || 0 },
            { key: "only_in_a", label: `Only in ${nameA}`, count: statusCounts.only_in_a || 0 },
            { key: "only_in_b", label: `Only in ${nameB}`, count: statusCounts.only_in_b || 0 },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(setStatusFilter)(f.key)}
              className={cn(
                "px-2.5 py-1 text-[10px] font-semibold rounded-full transition-colors border whitespace-nowrap",
                statusFilter === f.key
                  ? "bg-accent text-white border-accent"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
              )}
            >
              {f.label}
              <span className="ml-1 opacity-70">{f.count}</span>
            </button>
          ))}
        </div>

        {/* Show identical toggle */}
        <button
          onClick={() => handleFilterChange(setShowIdentical)(!showIdentical)}
          className={cn(
            "flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg font-semibold transition-colors border whitespace-nowrap",
            showIdentical
              ? "bg-accent/10 text-accent border-accent/20"
              : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
          )}
        >
          {showIdentical ? (
            <Eye className="w-3 h-3" />
          ) : (
            <EyeOff className="w-3 h-3" />
          )}
          {showIdentical ? "Showing All" : "Diffs Only"}
        </button>
      </div>

      {/* ── 5-Column Comparison Table ── */}
      <div
        ref={tableRef}
        className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col"
      >
        {/* Table header info */}
        <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <CircleDot className="w-4 h-4 text-accent" />
            Field-by-Field Comparison
            <span className="ml-1 text-xs text-slate-400 font-normal">
              ({filteredRows.length} row{filteredRows.length !== 1 ? "s" : ""})
            </span>
          </h3>
        </div>

        {/* Table — 5 Columns */}
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-semibold w-[15%]">Difference Features</th>
                <th className="px-4 py-3 font-semibold w-[20%]">JSON Difference</th>
                <th className="px-4 py-3 font-semibold w-[22%]">Element in {nameA}</th>
                <th className="px-4 py-3 font-semibold w-[22%]">Element in {nameB}</th>
                <th className="px-4 py-3 font-semibold w-[21%]">Final Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-slate-400 text-sm"
                  >
                    {filteredRows.length === 0 && !showIdentical
                      ? "✅ No differences found — reports are identical."
                      : "No rows match the current filters."}
                  </td>
                </tr>
              )}
              {paginatedRows.map((row, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    "transition-colors hover:bg-slate-50/80",
                    row.status === "modified" && "bg-amber-50/30",
                    row.status === "only_in_a" && "bg-red-50/20",
                    row.status === "only_in_b" && "bg-blue-50/20"
                  )}
                >
                  {/* Col 1: Difference Features (Section) */}
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "inline-block px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
                        getSectionColor(row.section)
                      )}
                    >
                      {row.section}
                    </span>
                  </td>
                  {/* Col 2: JSON Difference (Item → Field) */}
                  <td className="px-4 py-2.5">
                    <div className="text-xs font-semibold text-slate-700">
                      {formatDifference(row)}
                    </div>
                  </td>
                  {/* Col 3: Element in Report 1 */}
                  <td
                    className={cn(
                      "px-4 py-2.5 font-mono text-xs break-all",
                      row.status === "only_in_b"
                        ? "text-slate-300 italic"
                        : "text-slate-700"
                    )}
                  >
                    {row.report_a}
                  </td>
                  {/* Col 4: Element in Report 2 */}
                  <td
                    className={cn(
                      "px-4 py-2.5 font-mono text-xs break-all",
                      row.status === "only_in_a"
                        ? "text-slate-300 italic"
                        : "text-slate-700"
                    )}
                  >
                    {row.report_b}
                  </td>
                  {/* Col 5: Final Verdict */}
                  <td className="px-4 py-2.5">
                    <VerdictBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of{" "}
              {filteredRows.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-3 h-3" /> Prev
              </button>
              <span className="px-2 text-slate-600 font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                Next <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
