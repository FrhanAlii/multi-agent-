import { useState, useRef } from "react";
import { useFiles, type UserFile } from "@/hooks/useFiles";
import { Upload, FileText, FileSpreadsheet, File, Trash2, Download, Search, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const fileIcons: Record<string, typeof FileText> = {
  pdf: FileText, csv: FileSpreadsheet, txt: FileText, json: FileText,
  docx: FileText, xlsx: FileSpreadsheet, doc: FileText, xls: FileSpreadsheet,
};

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

export function FileManager() {
  const { files, uploading, uploadFile, deleteFile } = useFiles();
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = files.filter(f => f.file_name.toLowerCase().includes(search.toLowerCase()));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const FileIcon = (type: string) => {
    const Icon = fileIcons[type] || File;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border dark:border-white/[0.12]">
        <h3 className="text-sm font-semibold text-foreground mb-2">📁 My Files</h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full bg-secondary dark:bg-white/[0.08] pl-7 pr-3 py-1.5 rounded-lg text-xs text-foreground outline-none"
          />
        </div>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`mx-3 mt-3 p-3 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
          dragOver ? "border-primary bg-primary/5 dark:bg-primary/10" : "border-border dark:border-white/[0.20] dark:bg-white/[0.05] hover:border-primary/50 dark:hover:border-primary/60"
        }`}
      >
        <input ref={inputRef} type="file" className="hidden" multiple onChange={e => {
          Array.from(e.target.files || []).forEach(f => uploadFile(f));
        }} />
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
        ) : (
          <>
            <Upload className="w-5 h-5 text-muted mx-auto mb-1" />
            <p className="text-[10px] text-muted">Drop files or click to upload</p>
          </>
        )}
      </div>

      <ScrollArea className="flex-1 mt-2">
        <div className="px-3 pb-3 space-y-1">
          {filtered.map(f => (
            <div key={f.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary dark:hover:bg-white/[0.10] transition-colors">
              <span className="text-primary flex-shrink-0">{FileIcon(f.file_type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{f.file_name}</p>
                <p className="text-[10px] text-muted">{formatSize(f.file_size)}</p>
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={f.file_url} target="_blank" className="p-1 hover:text-primary transition-colors text-muted">
                  <Download className="w-3 h-3" />
                </a>
                <button onClick={() => deleteFile(f.id, f.file_path)} className="p-1 hover:text-destructive transition-colors text-muted">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-[10px] text-muted text-center py-4">No files uploaded</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
