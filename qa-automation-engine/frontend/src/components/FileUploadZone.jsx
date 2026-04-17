import { useCallback, useState, useRef } from "react";
import { UploadCloud, X, FileText } from "lucide-react";
import { formatFileSize } from "../lib/utils";

/**
 * Reusable drag-and-drop file upload zone.
 */
export default function FileUploadZone({ file, onFileChange, label, accept, id }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) onFileChange(droppedFile);
    },
    [onFileChange]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative flex flex-col items-center justify-center text-center
        rounded-xl border-2 border-dashed p-6 transition-all duration-200 cursor-pointer
        ${isDragOver
          ? "border-accent bg-accent/5 scale-[1.01]"
          : file
            ? "border-green-300 bg-green-50/50"
            : "border-slate-300 bg-white hover:border-accent/40 hover:bg-slate-50"
        }
      `}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        id={id}
        onChange={(e) => {
          if (e.target.files?.[0]) onFileChange(e.target.files[0]);
        }}
      />

      {file ? (
        <>
          <FileText className="w-8 h-8 text-success mb-2" />
          <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]">
            {file.name}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {formatFileSize(file.size)}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFileChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="mt-2 flex items-center gap-1 text-xs text-danger hover:text-red-700 font-medium transition-colors"
          >
            <X className="w-3 h-3" /> Remove
          </button>
        </>
      ) : (
        <>
          <UploadCloud className={`w-8 h-8 mb-2 ${isDragOver ? "text-accent" : "text-slate-400"}`} />
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="text-xs text-slate-400 mt-1">
            Drag & drop or click to browse
          </p>
        </>
      )}
    </div>
  );
}
