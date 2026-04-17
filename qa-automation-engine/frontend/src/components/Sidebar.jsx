import { Bot, Search, FileSpreadsheet, Minimize2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Sidebar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'comparator', label: 'JSON Comparator', icon: Search },
    { id: 'converter', label: 'XLSX Converter', icon: FileSpreadsheet },
    { id: 'flattener', label: 'JSON Flattener', icon: Minimize2 },
  ];

  return (
    <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 shadow-sm z-20">
      <div className="h-16 flex items-center px-6 border-b border-slate-200 shrink-0">
        <Bot className="w-6 h-6 text-accent mr-3" />
        <span className="font-bold text-slate-900 whitespace-nowrap tracking-tight">QA Auto Engine</span>
      </div>
      
      <nav className="flex-1 py-4 px-3 space-y-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-accent/10 text-accent" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <Icon className={cn("w-5 h-5 mr-3", isActive ? "text-accent" : "text-slate-400")} />
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  );
}
