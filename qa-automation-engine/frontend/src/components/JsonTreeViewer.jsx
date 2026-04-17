import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

function JsonNode({ keyName, value, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2);

  const isObject = value !== null && typeof value === "object" && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isExpandable = isObject || isArray;

  const indent = depth * 16;

  if (!isExpandable) {
    // Leaf node
    let displayValue;
    let valueClass = "text-slate-600";
    if (value === null) {
      displayValue = "null";
      valueClass = "text-slate-400 italic";
    } else if (typeof value === "string") {
      displayValue = `"${value}"`;
      valueClass = "text-green-700";
    } else if (typeof value === "boolean") {
      displayValue = String(value);
      valueClass = "text-purple-600";
    } else if (typeof value === "number") {
      displayValue = String(value);
      valueClass = "text-blue-600";
    } else {
      displayValue = String(value);
    }

    return (
      <div className="flex items-baseline py-0.5 hover:bg-slate-100/50 rounded px-1" style={{ paddingLeft: indent }}>
        {keyName !== null && (
          <span className="text-slate-500 mr-1 shrink-0">"{keyName}":</span>
        )}
        <span className={`${valueClass} break-all`}>{displayValue}</span>
      </div>
    );
  }

  const entries = isArray
    ? value.map((v, i) => [i, v])
    : Object.entries(value);

  const bracket = isArray ? ["[", "]"] : ["{", "}"];

  return (
    <div>
      <div
        className="flex items-center py-0.5 cursor-pointer hover:bg-slate-100/50 rounded px-1 select-none"
        style={{ paddingLeft: indent }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
        )}
        {keyName !== null && (
          <span className="text-slate-500 mr-1">"{keyName}":</span>
        )}
        <span className="text-slate-400">
          {bracket[0]}
          {!expanded && (
            <span className="text-slate-300 text-xs mx-1">
              {entries.length} {isArray ? "items" : "keys"}
            </span>
          )}
          {!expanded && bracket[1]}
        </span>
      </div>
      {expanded && (
        <>
          {entries.map(([key, val]) => (
            <JsonNode key={key} keyName={isArray ? null : String(key)} value={val} depth={depth + 1} />
          ))}
          <div className="text-slate-400 py-0.5 px-1" style={{ paddingLeft: indent }}>
            {bracket[1]}
          </div>
        </>
      )}
    </div>
  );
}

export default function JsonTreeViewer({ data }) {
  if (!data) return null;
  return (
    <div className="bg-slate-50 rounded-lg p-3 overflow-auto text-xs font-mono border border-slate-200 text-slate-700 max-h-[500px]">
      <JsonNode keyName={null} value={data} depth={0} />
    </div>
  );
}
