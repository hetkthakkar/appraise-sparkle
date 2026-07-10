import * as XLSX from "xlsx";

export type ColumnDef = { key: string; label: string; required?: boolean; numeric?: boolean };

export const EMPLOYEE_COLUMNS: ColumnDef[] = [
  { key: "employee_id", label: "Employee ID", required: true },
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email", required: true },
  { key: "department", label: "Department", required: true },
  { key: "designation", label: "Designation", required: true },
  { key: "team_lead", label: "Team Lead", required: true },
  { key: "location", label: "Location", required: true },
];

export const PERFORMANCE_COLUMNS: ColumnDef[] = [
  { key: "month", label: "Month", required: true },
  { key: "employee_id", label: "Employee ID", required: true },
  { key: "name", label: "Name", required: true },
  { key: "location", label: "Location", required: true },
  { key: "production_target", label: "Production Target", required: true, numeric: true },
  { key: "production_actual", label: "Production Actual", required: true, numeric: true },
  { key: "ticket_target", label: "Ticket Target", required: true, numeric: true },
  { key: "ticket_actual", label: "Ticket Actual", required: true, numeric: true },
  { key: "error_target", label: "Internal Errors/Rejection Target", required: true, numeric: true },
  { key: "error_actual", label: "Internal Errors/Rejection Actual", required: true, numeric: true },
  { key: "attendance", label: "Attendance (0-10)", required: true, numeric: true },
  { key: "behavior", label: "Behavior (0-5)", required: true, numeric: true },
  { key: "manager_remarks", label: "Manager Remarks" },
];

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export interface ParseResult {
  headers: string[];
  mapping: Record<string, string | null>; // key -> matched header
  missing: string[];
  rows: Array<Record<string, string | number | null>>;
  errors: Array<{ row: number; message: string }>;
}

export async function parseExcel(file: File, columns: ColumnDef[]): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: true });
  const headers = raw.length ? Object.keys(raw[0]) : [];

  // Fuzzy header matching by normalized label
  const mapping: Record<string, string | null> = {};
  for (const col of columns) {
    const nLabel = norm(col.label);
    const nKey = norm(col.key);
    const alt = norm(col.label.replace(/\(.*?\)/g, "")); // strip parens
    const match = headers.find((h) => {
      const n = norm(h);
      return n === nLabel || n === nKey || n === alt;
    });
    mapping[col.key] = match ?? null;
  }

  const missing = columns.filter((c) => c.required && !mapping[c.key]).map((c) => c.label);

  const errors: ParseResult["errors"] = [];
  const rows = raw.map((r, idx) => {
    const out: Record<string, string | number | null> = {};
    for (const col of columns) {
      const src = mapping[col.key];
      const v = src ? r[src] : null;
      if (col.numeric) {
        if (v === null || v === "" || v === undefined) {
          out[col.key] = 0;
        } else {
          const n = Number(v);
          if (Number.isNaN(n)) {
            errors.push({ row: idx + 2, message: `${col.label} must be a number (got "${String(v)}")` });
            out[col.key] = 0;
          } else out[col.key] = n;
        }
      } else {
        out[col.key] = v === null || v === undefined ? null : String(v).trim();
      }
    }
    // required text check
    for (const col of columns) {
      if (col.required && !col.numeric && !out[col.key]) {
        errors.push({ row: idx + 2, message: `${col.label} is required` });
      }
    }
    return out;
  });

  return { headers, mapping, missing, rows, errors };
}
