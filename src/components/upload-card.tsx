import { useRef, useState } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  title: string;
  description: string;
  columns: string[];
}

export function UploadCard({ title, description, columns }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const onFile = (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    toast.success(`${file.name} queued`, {
      description: "Will sync to Google Sheets in the next phase.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files?.[0]);
          }}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-colors hover:border-primary hover:bg-primary/5"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium">
            {fileName ?? "Drop Excel file here or click to browse"}
          </span>
          <span className="text-xs text-muted-foreground">.xlsx, .xls accepted</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? undefined)}
        />
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Expected columns
          </p>
          <div className="flex flex-wrap gap-1.5">
            {columns.map((c) => (
              <span key={c} className="rounded bg-background px-2 py-0.5 text-xs border">
                {c}
              </span>
            ))}
          </div>
        </div>
        {fileName && (
          <Button variant="outline" size="sm" onClick={() => setFileName(null)}>
            Clear
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
