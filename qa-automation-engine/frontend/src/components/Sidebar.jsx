import { Bot, Search, FileSpreadsheet, Minimize2 } from "lucide-react";
import { cn } from "../lib/utils";

const NAV_ITEMS = [
  { id: "comparator", label: "JSON Comparator", icon: Search },
  { id: "converter", label: "XLSX Converter", icon: FileSpreadsheet },
  { id: "flattener", label: "JSON Flattener", icon: Minimize2 },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col">
      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-200">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <Bot className="w-5 h-5 text-accent" />
        </div>
        <div>
          <span className="font-bold text-slate-900 text-sm leading-tight block">
            QA Automation
          </span>
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            Engine
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-accent text-white shadow-sm shadow-accent/25"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <Icon className={cn("w-[18px] h-[18px]", isActive ? "text-white" : "text-slate-400")} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 font-medium">
          Built for QA Engineers
        </p>
      </div>
    </aside>
  );
}
