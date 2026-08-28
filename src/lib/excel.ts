import * as XLSX from "xlsx";
import type { SheetEmployee, SheetPerformance } from "./sheetsApi";

function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[._\-/\\]+/g, " ")
    .replace(/\s+/g, " ");
}

function parseExcelDate(val: unknown): string {
  if (val === undefined || val === null || val === "") return "";

  // If already Date object
  if (Object.prototype.toString.call(val) === "[object Date]") {
    const d = val as Date;
    if (isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  // If numeric Excel serial date (e.g., 45474 -> July 2026)
  if (typeof val === "number" && val > 30000 && val < 60000) {
    const utcDays = Math.floor(val - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    return `${dateInfo.getUTCFullYear()}-${String(dateInfo.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  const s = String(val).trim();
  if (!s) return "";

  // 1. YYYY-MM or YYYY/MM
  let m = s.match(/^(\d{4})[-\/](\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, "0")}`;

  // 2. MM-YYYY or MM/YYYY
  m = s.match(/^(\d{1,2})[-\/](\d{4})/);
  if (m) return `${m[2]}-${String(m[1]).padStart(2, "0")}`;

  // 3. DD/MM/YYYY or DD-MM-YYYY
  m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2, "0")}`;

  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];
  const shortNames = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec"
  ];

  // 4. YY-Mon (e.g. 26-Jul, 26-Sep)
  m = s.match(/^(\d{2})[-\/\s]+([a-zA-Z]+)$/);
  if (m) {
    const y = `20${m[1]}`;
    let idx = monthNames.indexOf(m[2].toLowerCase());
    if (idx === -1) idx = shortNames.indexOf(m[2].toLowerCase());
    if (idx !== -1) return `${y}-${String(idx + 1).padStart(2, "0")}`;
  }

  // 5. Mon-YY (e.g. Jul-26, Sep-26)
  m = s.match(/^([a-zA-Z]+)[-\/\s]+(\d{2})$/);
  if (m) {
    const y = `20${m[2]}`;
    let idx = monthNames.indexOf(m[1].toLowerCase());
    if (idx === -1) idx = shortNames.indexOf(m[1].toLowerCase());
    if (idx !== -1) return `${y}-${String(idx + 1).padStart(2, "0")}`;
  }

  // 6. Mon-YYYY (e.g. Jul-2026, July 2026)
  m = s.match(/^([a-zA-Z]+)[-\/\s]+(\d{4})$/);
  if (m) {
    const y = m[2];
    let idx = monthNames.indexOf(m[1].toLowerCase());
    if (idx === -1) idx = shortNames.indexOf(m[1].toLowerCase());
    if (idx !== -1) return `${y}-${String(idx + 1).padStart(2, "0")}`;
  }

  // 7. YYYY-Mon (e.g. 2026-Jul)
  m = s.match(/^(\d{4})[-\/\s]+([a-zA-Z]+)$/);
  if (m) {
    const y = m[1];
    let idx = monthNames.indexOf(m[2].toLowerCase());
    if (idx === -1) idx = shortNames.indexOf(m[2].toLowerCase());
    if (idx !== -1) return `${y}-${String(idx + 1).padStart(2, "0")}`;
  }

  return s;
}

function safeNum(val: unknown): number {
  if (val === undefined || val === null || val === "") return 0;
  const n = Number(String(val).replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function parsePerformanceExcel(fileData: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(fileData, { type: "array", cellDates: true });
  
  // Find the best sheet with data
  let bestSheetName = wb.SheetNames[0];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
    if (rawRows.length > 1) {
      bestSheetName = name;
      break;
    }
  }

  const ws = wb.Sheets[bestSheetName];
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });

  if (rawRows.length === 0) {
    throw new Error("The Excel file appears to be empty.");
  }

  // Find header row (search first 10 rows for "employee" or "production" or "target")
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const rowStr = rawRows[r].map(normalizeHeader).join(" ");
    if (
      rowStr.includes("employee") ||
      rowStr.includes("emp id") ||
      rowStr.includes("production") ||
      rowStr.includes("ticket") ||
      rowStr.includes("target")
    ) {
      headerRowIndex = r;
      break;
    }
  }

  const headers = rawRows[headerRowIndex].map(normalizeHeader);
  const dataRows = rawRows.slice(headerRowIndex + 1);

  // Column matching logic
  const colIndex = {
    month: headers.findIndex((h) => h.includes("month") || h.includes("period") || h.includes("date")),
    empId: headers.findIndex((h) => h.includes("emp id") || h.includes("employee id") || h.includes("empid") || h.includes("code")),
    name: headers.findIndex((h) => (h.includes("name") || h.includes("employee")) && !h.includes("id")),
    location: headers.findIndex((h) => h.includes("location") || h.includes("branch") || h.includes("city")),
    
    prodTarget: headers.findIndex((h) => (h.includes("prod") || h.includes("output")) && h.includes("target")),
    prodActual: headers.findIndex((h) => (h.includes("prod") || h.includes("output")) && (h.includes("actual") || h.includes("achieved"))),
    
    ticketTarget: headers.findIndex((h) => h.includes("ticket") && h.includes("target")),
    ticketActual: headers.findIndex((h) => h.includes("ticket") && (h.includes("actual") || h.includes("achieved") || h.includes("resolved"))),
    
    errorTarget: headers.findIndex((h) => (h.includes("error") || h.includes("reject")) && h.includes("target")),
    errorActual: headers.findIndex((h) => (h.includes("error") || h.includes("reject")) && (h.includes("actual") || h.includes("count"))),
    
    attendance: headers.findIndex((h) => h.includes("attend")),
    behavior: headers.findIndex((h) => h.includes("behav")),
    remarks: headers.findIndex((h) => h.includes("remark") || h.includes("feedback") || h.includes("comment")),
  };

  const results: Record<string, unknown>[] = [];

  for (const row of dataRows) {
    const empId = colIndex.empId !== -1 ? String(row[colIndex.empId] ?? "").trim() : "";
    const name = colIndex.name !== -1 ? String(row[colIndex.name] ?? "").trim() : "";

    // Skip empty row
    if (!empId && !name) continue;

    const rawMonth = colIndex.month !== -1 ? row[colIndex.month] : "";
    const month = parseExcelDate(rawMonth);

    results.push({
      "Month": month,
      "Employee ID": empId,
      "Name": name,
      "Location": colIndex.location !== -1 ? String(row[colIndex.location] ?? "").trim() : "",
      "Production Target": colIndex.prodTarget !== -1 ? safeNum(row[colIndex.prodTarget]) : 0,
      "Production Actual": colIndex.prodActual !== -1 ? safeNum(row[colIndex.prodActual]) : 0,
      "Ticket Target": colIndex.ticketTarget !== -1 ? safeNum(row[colIndex.ticketTarget]) : 0,
      "Ticket Actual": colIndex.ticketActual !== -1 ? safeNum(row[colIndex.ticketActual]) : 0,
      "Internal Errors/Rejection Target": colIndex.errorTarget !== -1 ? safeNum(row[colIndex.errorTarget]) : 0,
      "Internal Errors/Rejection Actual": colIndex.errorActual !== -1 ? safeNum(row[colIndex.errorActual]) : 0,
      "Attendance (0-10)": colIndex.attendance !== -1 ? safeNum(row[colIndex.attendance]) : 0,
      "Behavior (0-5)": colIndex.behavior !== -1 ? safeNum(row[colIndex.behavior]) : 0,
      "Manager Remarks": colIndex.remarks !== -1 ? String(row[colIndex.remarks] ?? "").trim() : "",
    });
  }

  if (results.length === 0) {
    throw new Error("No valid employee performance rows could be extracted. Please check column headers.");
  }

  return results;
}

export function exportPerformance(rows: SheetPerformance[]) {
  const exportData = rows.map((p) => ({
    "Month": p.month,
    "Employee ID": p.employeeId,
    "Name": p.name,
    "Location": p.location || "",
    "Production Target": p.productionTarget,
    "Production Actual": p.productionActual,
    "Ticket Target": p.ticketTarget,
    "Ticket Actual": p.ticketActual,
    "Internal Errors/Rejection Target": p.errorTarget,
    "Internal Errors/Rejection Actual": p.errorActual,
    "Attendance (0-10)": p.attendance,
    "Behavior (0-5)": p.behavior,
    "Performance Rating": p.performanceRating || "",
    "Manager Remarks": p.managerRemarks || "",
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Performance");
  XLSX.writeFile(wb, `performance_export_${Date.now()}.xlsx`);
}
