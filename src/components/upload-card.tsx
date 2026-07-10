import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { parseExcel, type ColumnDef, type ParseResult } from "@/lib/excel";

interface Props {
  title: string;
  description: string;
  columns: ColumnDef[];
  onImport: (rows: Array<Record<string, string | number | null>>) => Promise<{ inserted: number }>;
}

export function UploadCard({ title, description, columns, onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);

  const reset = () => {
    setFileName(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      toast.error("Only .xlsx, .xls, .csv files are supported");
      return;
    }
    setFileName(file.name);
    setParsing(true);
    setResult(null);
    try {
      const r = await parseExcel(file, columns);
      setResult(r);
      if (r.missing.length) {
        toast.error(`Missing required column${r.missing.length > 1 ? "s" : ""}`, {
          description: r.missing.join(", "),
        });
      } else if (r.errors.length) {
        toast.warning(`Parsed with ${r.errors.length} row issue${r.errors.length > 1 ? "s" : ""}`);
      } else {
        toast.success(`${r.rows.length} rows ready to import`);
      }
    } catch (e) {
      toast.error("Could not read file", { description: (e as Error).message });
    } finally {
      setParsing(false);
    }
  };

  const doImport = async () => {
    if (!result) return;
    setImporting(true);
    try {
      const r = await onImport(result.rows);
      toast.success(`Imported ${r.inserted} rows`);
      reset();
    } catch (e) {
      toast.error("Import failed", { description: (e as Error).message });
    } finally {
      setImporting(false);
    }
  };

  const canImport = result && result.missing.length === 0 && result.rows.length > 0;
  const previewRows = result?.rows.slice(0, 5) ?? [];

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
            void onFile(e.dataTransfer.files?.[0]);
          }}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-colors hover:border-primary hover:bg-primary/5"
        >
          {parsing ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
          <span className="text-sm font-medium">{fileName ?? "Drop Excel file here or click to browse"}</span>
          <span className="text-xs text-muted-foreground">.xlsx, .xls, .csv accepted</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0] ?? undefined)}
        />

        <div className="rounded-md border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Column mapping
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {columns.map((c) => {
              const matched = result?.mapping[c.key];
              const status = !result ? "idle" : matched ? "ok" : c.required ? "missing" : "optional";
              return (
                <div key={c.key} className="flex items-center gap-2 text-xs">
                  {status === "ok" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                  {status === "missing" && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                  {status === "optional" && <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />}
                  {status === "idle" && <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />}
                  <span className="font-medium">{c.label}</span>
                  {matched && matched !== c.label && (
                    <span className="text-muted-foreground">← "{matched}"</span>
                  )}
                  {!matched && !c.required && (
                    <span className="text-muted-foreground">(optional)</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {result && result.rows.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Preview — first {previewRows.length} of {result.rows.length} rows
            </p>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    {columns.map((c) => (
                      <th key={c.key} className="px-2 py-1.5 text-left font-medium">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i} className="border-t">
                      {columns.map((c) => (
                        <td key={c.key} className="px-2 py-1.5 text-muted-foreground">
                          {r[c.key] === null || r[c.key] === "" ? "—" : String(r[c.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result && result.errors.length > 0 && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <p className="text-xs font-medium text-destructive">
              {result.errors.length} row issue{result.errors.length > 1 ? "s" : ""}
            </p>
            <ul className="mt-1 space-y-0.5 text-xs text-destructive/80">
              {result.errors.slice(0, 5).map((e, i) => (
                <li key={i}>Row {e.row}: {e.message}</li>
              ))}
              {result.errors.length > 5 && <li>…and {result.errors.length - 5} more</li>}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={doImport} disabled={!canImport || importing}>
            {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import {result?.rows.length ?? 0} rows
          </Button>
          {fileName && (
            <Button variant="outline" onClick={reset} disabled={importing}>
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
