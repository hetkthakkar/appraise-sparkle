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

  const parseFile = async (
    file: File
  ): Promise<Record<string, unknown>[]> => {
    const extension =
      file.name.toLowerCase().split(".").pop() ?? "";

    // ---------------------------------------------
    // CSV FILE
    // ---------------------------------------------
    if (extension === "csv") {
      const csvText = await file.text();

      if (!csvText.trim()) {
        throw new Error("The CSV file is empty.");
      }

      const workbook = XLSX.read(csvText, {
        type: "string",
        raw: false,
        cellDates: true,
      });

      if (!workbook.SheetNames.length) {
        throw new Error("No data found in the CSV file.");
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        throw new Error("Unable to read the CSV file.");
      }

      return XLSX.utils.sheet_to_json<Record<string, unknown>>(
        worksheet,
        {
          defval: "",
          raw: false,
          blankrows: false,
        }
      );
    }

    // ---------------------------------------------
    // EXCEL FILE
    // ---------------------------------------------
    if (extension === "xlsx" || extension === "xls") {
      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
        raw: false,
        cellDates: true,
      });

      if (!workbook.SheetNames.length) {
        throw new Error("No worksheet found in the Excel file.");
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        throw new Error("Unable to read the Excel file.");
      }

      return XLSX.utils.sheet_to_json<Record<string, unknown>>(
        worksheet,
        {
          defval: "",
          raw: false,
          blankrows: false,
        }
      );
    }

    throw new Error(
      "Unsupported file type. Please upload .xlsx, .xls, or .csv."
    );
  };

  const onFile = async (file?: File) => {
    if (!file) return;

    const extension =
      file.name.toLowerCase().split(".").pop() ?? "";

    // ---------------------------------------------
    // Validate file type
    // ---------------------------------------------
    if (!["xlsx", "xls", "csv"].includes(extension)) {
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
    setBusy(true);

    const endBusy = beginBusy();

    try {
      // Parse CSV / Excel
      const rows = await parseFile(file);

      if (!rows.length) {
        throw new Error(
          "The uploaded file contains no data rows."
        );
      }

      console.log(
        `Parsed ${extension.toUpperCase()} file:`,
        rows
      );

      // ---------------------------------------------
      // Send parsed rows to existing backend
      // ---------------------------------------------
      if (onUpload) {
        const result = await onUpload(rows);

        toast.success(
          `${file.name} uploaded successfully`,
          {
            description: result
              ? [
                  `${result.inserted ?? 0} added`,
                  `${result.updated ?? 0} updated`,
                  ...(result.skipped
                    ? [`${result.skipped} skipped`]
                    : []),
                  `${result.total ?? rows.length} rows processed`,
                ].join(" · ")
              : `${rows.length} rows uploaded`,
          }
        );
      } else {
        toast.success(`${file.name} loaded`, {
          description: `${rows.length} rows found.`,
        });
      }
    } catch (error) {
      console.error("Upload failed:", error);

      toast.error("Upload failed", {
        description:
          error instanceof Error
            ? error.message
            : String(error),
      });
    } finally {
      endBusy();
      setBusy(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const clearFile = () => {
    setFileName(null);

    if (inputRef.current) {
      inputRef.current.value = "";
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
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();

            if (!busy) {
              const file = e.dataTransfer.files?.[0];

              if (file) {
                onFile(file);
              }
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
              : fileName ??
                "Drop Excel or CSV file here or click to browse"}
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
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (file) {
              onFile(file);
            }
          }}
        />

        <div className="rounded-md border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Expected columns
          </p>

          <div className="flex flex-wrap gap-1.5">
            {columns.map((column) => (
              <span
                key={column}
                className="rounded border bg-background px-2 py-0.5 text-xs"
              >
                {column}
              </span>
            ))}
          </div>
        </div>

        {fileName && !busy && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFile}
          >
            Clear
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
