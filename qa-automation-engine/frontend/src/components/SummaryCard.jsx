import { FilePlus, FileMinus, AlertTriangle, BarChart3 } from "lucide-react";

export default function SummaryCard({ summary }) {
  if (!summary) return null;

  const stats = [
    {
      label: "Match Score",
      value: `${summary.match_score}%`,
      color: "text-accent",
      icon: BarChart3,
      bg: "bg-accent/5",
    },
    {
      label: "Total Keys",
      value: summary.total_keys,
      color: "text-slate-800",
      icon: null,
      bg: "bg-slate-50",
    },
    {
      label: "Added",
      value: summary.added,
      color: "text-success",
      icon: FilePlus,
      bg: "bg-green-50",
    },
    {
      label: "Removed",
      value: summary.removed,
      color: "text-danger",
      icon: FileMinus,
      bg: "bg-red-50",
    },
    {
      label: "Modified",
      value: summary.modified,
      color: "text-warning",
      icon: AlertTriangle,
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-3 mb-5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={`${stat.bg} rounded-xl p-4 text-center border border-slate-100`}
          >
            {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />}
            <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
            <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              {stat.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
