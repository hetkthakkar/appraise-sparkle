import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { UploadCard } from "@/components/upload-card";
import { useAuth } from "@/lib/mock-auth";
import { uploadEmployees, uploadPerformance, type SheetEmployee, type SheetPerformance } from "@/lib/sheetsApi";

export const Route = createFileRoute("/_app/upload")({
  component: UploadCenter,
});

// Normalize an Excel header to a lookup key: lowercase, strip non-alphanumerics.
function norm(s: string): string {
  return String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Build a normalized-key -> original-key map for a row.
function keyIndex(row: Record<string, unknown>): Record<string, string> {
  const idx: Record<string, string> = {};
  for (const k of Object.keys(row)) idx[norm(k)] = k;
  return idx;
}

// Read a value from a row using any of the accepted header aliases.
function pick(row: Record<string, unknown>, idx: Record<string, string>, aliases: string[]): unknown {
  for (const a of aliases) {
    const orig = idx[norm(a)];
    if (orig !== undefined) {
      const v = row[orig];
      if (v !== undefined && v !== null && v !== "") return v;
    }
  }
  return "";
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

// Excel serial date -> JS Date (accounts for the 1900 leap-year bug).
function excelSerialToDate(serial: number): Date {
  const utcMs = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(utcMs);
}

// Coerce month value into "YYYY-MM". Handles Date, Excel serial, "YYYY-MM",
// "YYYY-MM-DD", "MM/YYYY", "July 2026", etc.
function toMonth(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}`;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = excelSerialToDate(v);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    }
  }
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?/.exec(s);
  if (m) return `${m[1]}-${String(Number(m[2])).padStart(2, "0")}`;
  m = /^(\d{1,2})[\/\-](\d{4})$/.exec(s);
  if (m) return `${m[2]}-${String(Number(m[1])).padStart(2, "0")}`;
  m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/.exec(s);
  if (m) {
    const yr = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return `${yr}-${String(Number(m[1])).padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return s;
}

function mapEmployeeRow(row: Record<string, unknown>): SheetEmployee {
  const idx = keyIndex(row);
  return {
    employeeId: toStr(pick(row, idx, ["Employee ID", "employeeId", "EmpId", "Emp ID", "ID"])),
    name: toStr(pick(row, idx, ["Name", "Employee Name", "Full Name"])),
    email: toStr(pick(row, idx, ["Email", "Email ID", "Email Address"])),
    department: toStr(pick(row, idx, ["Department", "Dept"])),
    designation: toStr(pick(row, idx, ["Designation", "Role", "Title"])),
    teamLead: toStr(pick(row, idx, ["Team Lead", "TL", "Manager"])),
    location: toStr(pick(row, idx, ["Location", "Office", "Site"])),
    joiningDate: toStr(pick(row, idx, ["Joining Date", "DOJ", "Date of Joining"])),
  };
}

function mapPerformanceRow(row: Record<string, unknown>): SheetPerformance {
  const idx = keyIndex(row);
  return {
    month: toMonth(pick(row, idx, ["Month", "Period"])),
    employeeId: toStr(pick(row, idx, ["Employee ID", "employeeId", "EmpId", "Emp ID", "ID"])),
    name: toStr(pick(row, idx, ["Name", "Employee Name"])),
    productionTarget: toNum(pick(row, idx, ["Production Target", "Prod Target"])),
    productionActual: toNum(pick(row, idx, ["Production Actual", "Prod Actual"])),
    ticketTarget: toNum(pick(row, idx, ["Ticket Target", "Tickets Target"])),
    ticketActual: toNum(pick(row, idx, ["Ticket Actual", "Tickets Actual"])),
    errorTarget: toNum(
      pick(row, idx, [
        "Internal Errors Target",
        "Internal Error Target",
        "Errors Target",
        "Error Target",
        "Rejection Target",
      ]),
    ),
    errorActual: toNum(
      pick(row, idx, [
        "Internal Errors Actual",
        "Internal Error Actual",
        "Errors Actual",
        "Error Actual",
        "Rejection Actual",
      ]),
    ),
    attendance: toNum(pick(row, idx, ["Attendance (0-10)", "Attendance", "Attendance Score"])),
    behavior: toNum(pick(row, idx, ["Behavior (0-5)", "Behavior", "Behaviour", "Behavior Score"])),
    managerRemarks: toStr(pick(row, idx, ["Manager Remarks", "Remarks", "Comments"])),
  };
}

function UploadCenter() {
  const { user } = useAuth();
  const qc = useQueryClient();

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "super_admin" && user.role !== "admin") return <Navigate to="/" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Upload Center</h2>
        <p className="text-sm text-muted-foreground">
          Drop Excel files here. They'll sync to the Google Sheets backend.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {user.role === "super_admin" && (
          <UploadCard
            title="Employee Master Upload"
            description="Onboard or update the employee directory."
            columns={["Employee ID", "Name", "Email", "Department", "Designation", "Team Lead", "Location", "Joining Date"]}
            onUpload={async (rows) => {
              const mapped = rows.map(mapEmployeeRow).filter((r) => r.employeeId || r.email);
              if (mapped.length === 0) {
                throw new Error("No valid rows found. Check that headers match the expected columns.");
              }
              const result = await uploadEmployees(user.email, mapped);
              qc.invalidateQueries({ queryKey: ["employees"] });
              return result;
            }}
          />
        )}
        <UploadCard
          title="Monthly Performance Upload"
          description="Upload the current month's KPI sheet for your team."
          columns={[
            "Month",
            "Employee ID",
            "Name",
            "Production Target",
            "Production Actual",
            "Ticket Target",
            "Ticket Actual",
            "Internal Errors Target",
            "Internal Errors Actual",
            "Attendance (0-10)",
            "Behavior (0-5)",
            "Manager Remarks",
          ]}
          onUpload={async (rows) => {
            const mapped = rows.map(mapPerformanceRow).filter((r) => r.employeeId && r.month);
            if (mapped.length === 0) {
              throw new Error(
                "No valid rows found. Ensure the sheet has 'Month' and 'Employee ID' columns with values.",
              );
            }
            const result = await uploadPerformance(user.email, mapped);
            qc.invalidateQueries({ queryKey: ["performance"] });
            return result;
          }}
        />
      </div>
    </div>
  );
}
