import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { beginBusy } from "@/lib/busy";

interface Props {
  title: string;
  description: string;
  columns: string[];
  onUpload?: (
    rows: Record<string, unknown>[]
  ) => Promise<{
    inserted?: number;
    updated?: number;
    skipped?: number;
    total?: number;
  } | void>;
}

export function UploadCard({
  title,
  description,
  columns,
  onUpload,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file?: File) => {
    if (!file) return;

    const fileExtension =
      file.name.toLowerCase().split(".").pop() ?? "";

    const supportedExtensions = ["xlsx", "xls", "csv"];

    if (!supportedExtensions.includes(fileExtension)) {
      toast.error("Unsupported file type", {
        description:
          "Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.",
      });

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      return;
    }

    setFileName(file.name);

    if (!onUpload) {
      toast.success(`${file.name} queued`);
      return;
    }

    setBusy(true);
    const endBusy = beginBusy();

    try {
      const buf = await file.arrayBuffer();

      // XLSX.read supports both Excel files and CSV files.
      const wb = XLSX.read(buf, {
        type: "array",
        cellDates: true,
      });

      if (!wb.SheetNames.length) {
        throw new Error("The uploaded file does not contain any sheet/data.");
      }

      const ws = wb.Sheets[wb.SheetNames[0]];

      if (!ws) {
        throw new Error("Could not read the first sheet from the file.");
      }

      const rows =
        XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: "",
          raw: false,
          blankrows: false,
        });

      if (rows.length === 0) {
        throw new Error("The uploaded file is empty.");
      }

      const result = await onUpload(rows);

      toast.success(`${file.name} synced`, {
        description: result
          ? [
              `${result.inserted ?? 0} added`,
              `${result.updated ?? 0} updated`,
              ...(result.skipped
                ? [`${result.skipped} skipped`]
                : []),
              `${result.total ?? rows.length} rows read`,
            ].join(" · ")
          : `${rows.length} rows uploaded`,
      });
    } catch (e) {
      toast.error("Upload failed", {
        description:
          e instanceof Error ? e.message : String(e),
      });
    } finally {
      endBusy();
      setBusy(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>

        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();

            if (!busy) {
              onFile(
                e.dataTransfer.files?.[0]
              );
            }
          }}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}

          <span className="text-sm font-medium">
            {busy
              ? "Uploading…"
              : (fileName ??
                "Drop Excel or CSV file here or click to browse")}
          </span>

          <span className="text-xs text-muted-foreground">
            .xlsx, .xls, .csv accepted
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) =>
            onFile(
              e.target.files?.[0] ?? undefined
            )
          }
        />

        <div className="rounded-md border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Expected columns
          </p>

          <div className="flex flex-wrap gap-1.5">
            {columns.map((c) => (
              <span
                key={c}
                className="rounded border bg-background px-2 py-0.5 text-xs"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {fileName && !busy && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFileName(null);

              if (inputRef.current) {
                inputRef.current.value = "";
              }
            }}
          >
            Clear
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
