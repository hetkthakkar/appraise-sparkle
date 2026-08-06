import * as XLSX from "xlsx";
import type { SheetEmployee, SheetPerformance } from "@/lib/sheetsApi";

function downloadWorkbook(fileName: string, sheetName: string, rows: unknown[][]) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

export function downloadTemplate(fileName: string, headers: string[]) {
  downloadWorkbook(fileName, "Template", [headers]);
}

export function exportEmployees(rows: SheetEmployee[]) {
  downloadWorkbook("employee-master.xlsx", "Employee Master", [
    ["Employee ID", "Name", "Email", "Department", "Designation", "Team Lead", "Location", "Joining Date"],
    ...rows.map((row) => [
      row.employeeId,
      row.name,
      row.email,
      row.department,
      row.designation,
      row.teamLead,
      row.location ?? "",
      row.joiningDate ?? "",
    ]),
  ]);
}

export function exportPerformance(rows: SheetPerformance[]) {
  downloadWorkbook("monthly-performance.xlsx", "Monthly Performance", [
    [
      "Month",
      "Employee ID",
      "Name",
      "Location",
      "Production Target",
      "Production Actual",
      "Ticket Target",
      "Ticket Actual",
      "Internal Errors/Rejection Target",
      "Internal Errors/Rejection Actual",
      "Attendance (0-10)",
      "Behavior (0-5)",
      "Manager Remarks",
    ],
    ...rows.map((row) => [
      row.month,
      row.employeeId,
      row.name,
      row.location ?? "",
      row.productionTarget,
      row.productionActual,
      row.ticketTarget,
      row.ticketActual,
      row.errorTarget,
      row.errorActual,
      row.attendance,
      row.behavior,
      row.managerRemarks,
    ]),
  ]);
}