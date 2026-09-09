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

function parseMonthString(val: unknown): string {
  if (val === undefined || val === null || val === "") return "";

  if (Object.prototype.toString.call(val) === "[object Date]") {
    const d = val as Date;
    if (isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

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

  // 6. Mon-YYYY or Mon YYYY (e.g. July-2026, Jul 2026)
  m = s.match(/^([a-zA-Z]+)[-\/\s]+(\d{4})$/);
  if (m) {
    const y = m[2];
    let idx = monthNames.indexOf(m[1].toLowerCase());
    if (idx === -1) idx = shortNames.indexOf(m[1].toLowerCase());
    if (idx !== -1) return `${y}-${String(idx + 1).padStart(2, "0")}`;
  }

  // 7. YYYY-Mon or YYYY Mon (e.g. 2026-Jul, 2026 July)
  m = s.match(/^(\d{4})[-\/\s]+([a-zA-Z]+)$/);
  if (m) {
    const y = m[1];
    let idx = monthNames.indexOf(m[2].toLowerCase());
    if (idx === -1) idx = shortNames.indexOf(m[2].toLowerCase());
    if (idx !== -1) return `${y}-${String(idx + 1).padStart(2, "0")}`;
  }

  return "";
}

function safeNum(val: unknown): number {
  if (val === undefined || val === null || val === "") return 0;
  const n = Number(String(val).replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function parsePerformanceExcel(fileData: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(fileData, { type: "array", cellDates: true });
  const allResults: Record<string, unknown>[] = [];

  for (const sheetName of wb.SheetNames) {
    // Check if sheet name indicates a month e.g. "July 2026", "2026-07", "Aug"
    const sheetMonth = parseMonthString(sheetName);

    const ws = wb.Sheets[sheetName];
    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
    if (rawRows.length < 2) continue;

    // Find header row in first 10 rows
    let headerRowIndex = -1;
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

    if (headerRowIndex === -1) continue;

    // Detect 2-row merged headers (e.g. Row 1: Production, Row 2: Target / Actual)
    let combinedHeaders: string[] = [];
    const row1 = rawRows[headerRowIndex].map(normalizeHeader);
    const row2 = rawRows[headerRowIndex + 1] ? rawRows[headerRowIndex + 1].map(normalizeHeader) : [];

    const isTwoRowHeader = row2.some((h) => h === "target" || h === "actual" || h === "achieved");

    if (isTwoRowHeader) {
      let currentSection = "";
      combinedHeaders = row1.map((h1, colIdx) => {
        if (h1 && !h1.includes("target") && !h1.includes("actual")) {
          currentSection = h1;
        }
        const h2 = row2[colIdx] || "";
        return `${currentSection} ${h2}`.trim();
      });
      headerRowIndex++; // skip second header row
    } else {
      combinedHeaders = row1;
    }

    const dataRows = rawRows.slice(headerRowIndex + 1);

    const colIndex = {
      month: combinedHeaders.findIndex((h) => h.includes("month") || h.includes("period") || h.includes("date")),
      empId: combinedHeaders.findIndex((h) => h.includes("emp id") || h.includes("employee id") || h.includes("empid") || h.includes("emp code") || h.includes("code")),
      name: combinedHeaders.findIndex((h) => (h.includes("name") || h.includes("employee")) && !h.includes("id") && !h.includes("code")),
      location: combinedHeaders.findIndex((h) => h.includes("location") || h.includes("branch") || h.includes("city")),
      
      prodTarget: combinedHeaders.findIndex((h) => (h.includes("prod") || h.includes("output")) && h.includes("target")),
      prodActual: combinedHeaders.findIndex((h) => (h.includes("prod") || h.includes("output")) && (h.includes("actual") || h.includes("achieved"))),
      
      ticketTarget: combinedHeaders.findIndex((h) => h.includes("ticket") && h.includes("target")),
      ticketActual: combinedHeaders.findIndex((h) => h.includes("ticket") && (h.includes("actual") || h.includes("achieved") || h.includes("resolved"))),
      
      errorTarget: combinedHeaders.findIndex((h) => (h.includes("error") || h.includes("reject")) && h.includes("target")),
      errorActual: combinedHeaders.findIndex((h) => (h.includes("error") || h.includes("reject")) && (h.includes("actual") || h.includes("count"))),
      
      attendance: combinedHeaders.findIndex((h) => h.includes("attend")),
      behavior: combinedHeaders.findIndex((h) => h.includes("behav")),
      remarks: combinedHeaders.findIndex((h) => h.includes("remark") || h.includes("feedback") || h.includes("comment")),
    };

    for (const row of dataRows) {
      const empId = colIndex.empId !== -1 ? String(row[colIndex.empId] ?? "").trim() : "";
      const name = colIndex.name !== -1 ? String(row[colIndex.name] ?? "").trim() : "";

      if (!empId && !name) continue;

      const rawMonth = colIndex.month !== -1 ? row[colIndex.month] : "";
      const month = parseMonthString(rawMonth) || sheetMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

      allResults.push({
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
  }

  if (allResults.length === 0) {
    throw new Error("No valid employee performance rows could be extracted from any sheet. Please check your Excel headers.");
  }

  return allResults;
}

export function parseEmployeeExcel(fileData: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(fileData, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });

  if (rawRows.length === 0) {
    throw new Error("The Excel file appears to be empty.");
  }

  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const rowStr = rawRows[r].map(normalizeHeader).join(" ");
    if (rowStr.includes("employee") || rowStr.includes("emp id") || rowStr.includes("name") || rowStr.includes("designation")) {
      headerRowIndex = r;
      break;
    }
  }

  const headers = rawRows[headerRowIndex].map(normalizeHeader);
  const dataRows = rawRows.slice(headerRowIndex + 1);

  const colIndex = {
    empId: headers.findIndex((h) => h.includes("emp id") || h.includes("employee id") || h.includes("empid") || h.includes("code")),
    name: headers.findIndex((h) => (h.includes("name") || h.includes("employee")) && !h.includes("id")),
    email: headers.findIndex((h) => h.includes("email") || h.includes("mail")),
    department: headers.findIndex((h) => h.includes("dept") || h.includes("department")),
    designation: headers.findIndex((h) => h.includes("desig") || h.includes("role") || h.includes("position")),
    teamLead: headers.findIndex((h) => h.includes("lead") || h.includes("manager") || h.includes("tl") || h.includes("report")),
    location: headers.findIndex((h) => h.includes("location") || h.includes("branch") || h.includes("city")),
    joiningDate: headers.findIndex((h) => h.includes("join") || h.includes("doj")),
  };

  const results: Record<string, unknown>[] = [];

  for (const row of dataRows) {
    const empId = colIndex.empId !== -1 ? String(row[colIndex.empId] ?? "").trim() : "";
    const name = colIndex.name !== -1 ? String(row[colIndex.name] ?? "").trim() : "";
    if (!empId && !name) continue;

    results.push({
      "Employee ID": empId,
      "Name": name,
      "Email": colIndex.email !== -1 ? String(row[colIndex.email] ?? "").trim() : "",
      "Department": colIndex.department !== -1 ? String(row[colIndex.department] ?? "").trim() : "",
      "Designation": colIndex.designation !== -1 ? String(row[colIndex.designation] ?? "").trim() : "",
      "Team Lead": colIndex.teamLead !== -1 ? String(row[colIndex.teamLead] ?? "").trim() : "",
      "Location": colIndex.location !== -1 ? String(row[colIndex.location] ?? "").trim() : "",
      "Joining Date": colIndex.joiningDate !== -1 ? String(row[colIndex.joiningDate] ?? "").trim() : "",
    });
  }

  return results;
}

export function downloadTemplate(type: "employees" | "performance") {
  const wb = XLSX.utils.book_new();

  if (type === "employees") {
    const data = [
      {
        "Employee ID": "EMP001",
        "Name": "John Doe",
        "Email": "john.doe@example.com",
        "Department": "Operations",
        "Designation": "Team Member",
        "Team Lead": "Jane Lead",
        "Location": "Vadodara",
        "Joining Date": "2024-01-15",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "employees_template.xlsx");
  } else {
    const data = [
      {
        "Month": "2026-08",
        "Employee ID": "EMP001",
        "Name": "John Doe",
        "Location": "Vadodara",
        "Production Target": 3000,
        "Production Actual": 3100,
        "Ticket Target": 100,
        "Ticket Actual": 98,
        "Internal Errors/Rejection Target": 20,
        "Internal Errors/Rejection Actual": 15,
        "Attendance (0-10)": 9.5,
        "Behavior (0-5)": 4.5,
        "Manager Remarks": "Consistent high performer",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Performance");
    XLSX.writeFile(wb, "performance_template.xlsx");
  }
}

export function exportEmployees(rows: SheetEmployee[]) {
  const exportData = rows.map((e) => ({
    "Employee ID": e.employeeId,
    "Name": e.name,
    "Email": e.email,
    "Department": e.department,
    "Designation": e.designation,
    "Team Lead": e.teamLead,
    "Location": e.location || "",
    "Joining Date": e.joiningDate || "",
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employees");
  XLSX.writeFile(wb, `employees_export_${Date.now()}.xlsx`);
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
