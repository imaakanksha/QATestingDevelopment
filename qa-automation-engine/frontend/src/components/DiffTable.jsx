import { useState, useMemo } from "react";

export default function DiffTable({ differences }) {
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const filtered = useMemo(
    () =>
      differences
        ? differences.filter((d) => filter === "all" || d.change_type === filter)
        : [],
    [differences, filter]
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset to page 1 when filter changes
  const handleFilterChange = (f) => {
    setFilter(f);
    setCurrentPage(1);
  };

  if (!differences || differences.length === 0) {
    return (
      <div className="bg-white p-10 rounded-xl border border-slate-200 text-center">
        <p className="text-slate-400 text-sm">No differences found — files are identical.</p>
      </div>
    );
  }

  const FILTERS = [
    { key: "all", label: "All", count: differences.length },
    { key: "added", label: "Added", count: differences.filter((d) => d.change_type === "added").length },
    { key: "removed", label: "Removed", count: differences.filter((d) => d.change_type === "removed").length },
    { key: "modified", label: "Modified", count: differences.filter((d) => d.change_type === "modified").length },
  ];

  const badgeClass = (type) => {
    switch (type) {
      case "added":
        return "bg-green-50 text-success border-green-200";
      case "removed":
        return "bg-red-50 text-danger border-red-200";
      case "modified":
        return "bg-amber-50 text-warning border-amber-200";
      default:
        return "";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800 text-sm">
          Difference Details
          <span className="ml-2 text-xs text-slate-400 font-normal">
            ({filtered.length} item{filtered.length !== 1 ? "s" : ""})
          </span>
        </h3>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                filter === f.key
                  ? "bg-accent text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              }`}
            >
              {f.label}
              <span className="ml-1 opacity-70">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[500px]">
        <table className="w-full text-sm text-left">
          <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="px-5 py-3 font-semibold w-[35%]">Key Path</th>
              <th className="px-5 py-3 font-semibold w-[25%]">Baseline Value</th>
              <th className="px-5 py-3 font-semibold w-[25%]">Target Value</th>
              <th className="px-5 py-3 font-semibold w-[15%]">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.map((diff, idx) => (
              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3 font-mono text-xs text-slate-700 break-all">
                  {diff.key_path}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-slate-500 break-all">
                  {diff.change_type === "added" ? (
                    <span className="text-slate-300 italic">—</span>
                  ) : (
                    <span className="text-red-600/80 line-through decoration-red-300">
                      {JSON.stringify(diff.baseline_value)}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 font-mono text-xs break-all">
                  {diff.change_type === "removed" ? (
                    <span className="text-slate-300 italic">—</span>
                  ) : (
                    <span className="text-green-700 font-medium">
                      {JSON.stringify(diff.target_value)}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${badgeClass(diff.change_type)}`}
                  >
                    {diff.change_type}
                  </span>
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
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
