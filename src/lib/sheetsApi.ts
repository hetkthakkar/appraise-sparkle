import type { Role } from "./types";

const API_URL = import.meta.env.VITE_SHEETS_API_URL as string;

export async function callSheetsApi<T = unknown>(action: string, payload: object): Promise<T> {
  if (!API_URL) throw new Error("VITE_SHEETS_API_URL is not configured");
  const url = `${API_URL}?action=${encodeURIComponent(action)}&payload=${encodeURIComponent(JSON.stringify(payload))}`;
  const res = await fetch(url, { method: "GET" });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch (e) {
    console.error("Non-JSON response from Apps Script:", text);
    throw new Error("Backend returned an invalid response. Check Apps Script deployment.");
  }
  if (json && json.error) throw new Error(String(json.error));
  return json as T;
}

// --- Types returned by the Google Apps Script backend ---
export interface SheetUser {
  email: string;
  name: string;
  role: string; // "Super Admin" | "Admin" | "User" | "No Access"
  location?: string;
  status?: string;
}
export interface SheetEmployee {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  teamLead: string;
  location?: string;
  joiningDate?: string;
}
export interface UploadResult {
  success?: boolean;
  inserted?: number;
  updated?: number;
  skipped?: number;
  total?: number;
}
export interface MyDashboard {
  profile: SheetEmployee;
  currentMonth: SheetPerformance | null;
  previousMonths: SheetPerformance[];
}
export interface SheetPerformance {
  month: string;
  employeeId: string;
  name: string;
  productionTarget: number;
  productionActual: number;
  ticketTarget: number;
  ticketActual: number;
  errorTarget: number;
  errorActual: number;
  attendance: number;
  behavior: number;
  managerRemarks: string;
}

// --- Role normalization ---
export function normalizeRole(raw: string | undefined | null): Role {
  const r = String(raw ?? "").trim().toLowerCase();
  if (r === "super admin" || r === "super_admin" || r === "superadmin") return "super_admin";
  if (r === "admin") return "admin";
  if (r === "user" || r === "employee") return "user";
  return "no_access";
}
export function roleToDisplay(role: Role): string {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Admin";
  if (role === "user") return "User";
  return "No Access";
}

// --- Typed wrappers ---
export function getUserProfile(email: string, name: string) {
  return callSheetsApi<{ email: string; name: string; role: string; employeeId?: string }>(
    "getUserProfile",
    { email, name }
  );
}
export function listUsers(callerEmail: string) {
  return callSheetsApi<SheetUser[]>("listUsers", { callerEmail });
}
export function updateUserRole(callerEmail: string, email: string, newRole: Role) {
  return callSheetsApi<{ ok: true }>("updateUserRole", {
    callerEmail,
    email,
    newRole: roleToDisplay(newRole),
  });
}
export function listEmployees(callerEmail: string) {
  return callSheetsApi<SheetEmployee[]>("listEmployees", { callerEmail });
}
export function uploadEmployees(callerEmail: string, rows: Record<string, unknown>[]) {
  return callSheetsApi<UploadResult>("uploadEmployees", { callerEmail, rows });
}
export function listPerformance(callerEmail: string, month?: string) {
  return callSheetsApi<SheetPerformance[]>("listPerformance", { callerEmail, month });
}
export function uploadPerformance(callerEmail: string, rows: Record<string, unknown>[]) {
  return callSheetsApi<UploadResult>("uploadPerformance", { callerEmail, rows });
}
export function updateRemarks(
  callerEmail: string,
  employeeId: string,
  month: string,
  remarks: string
) {
  return callSheetsApi<{ ok: true }>("updateRemarks", {
    callerEmail,
    employeeId,
    month,
    remarks,
  });
}

// --- Lookup lists ---
export function listDepartments() {
  return callSheetsApi<string[]>("listDepartments", {});
}
export function addDepartment(callerEmail: string, name: string) {
  return callSheetsApi<{ ok: true }>("addDepartment", { callerEmail, name });
}
export function listDesignations() {
  return callSheetsApi<string[]>("listDesignations", {});
}
export function addDesignation(callerEmail: string, name: string) {
  return callSheetsApi<{ ok: true }>("addDesignation", { callerEmail, name });
}
export function listLocations() {
  return callSheetsApi<string[]>("listLocations", {});
}
export function addLocation(callerEmail: string, name: string) {
  return callSheetsApi<{ ok: true }>("addLocation", { callerEmail, name });
}
export function listTeamLeads() {
  return callSheetsApi<string[]>("listTeamLeads", {});
}
export function updateEmployeeDetails(
  callerEmail: string,
  department: string,
  designation: string,
  teamLead: string,
  location: string,
  joiningDate?: string
) {
  return callSheetsApi<{ ok: true }>("updateEmployeeDetails", {
    callerEmail,
    department,
    designation,
    teamLead,
    location,
    joiningDate: joiningDate ?? "",
  });
}

// --- Dashboard & detail views ---
export function getMyDashboard(callerEmail: string) {
  return callSheetsApi<MyDashboard>("getMyDashboard", { callerEmail });
}
export function getEmployeeDetail(callerEmail: string, employeeId: string) {
  return callSheetsApi<MyDashboard>("getEmployeeProfile", { callerEmail, employeeId });
}
export function adminUpdateEmployee(
  callerEmail: string,
  employeeId: string,
  updates: {
    department?: string;
    designation?: string;
    teamLead?: string;
    location?: string;
    joiningDate?: string;
  }
) {
  return callSheetsApi<{ ok: true }>("adminUpdateEmployee", {
    callerEmail,
    employeeId,
    ...updates,
  });
}

export function monthToLabel(month: string): string {
  const [y, m] = String(month ?? "").split("-");
  const idx = Number(m) - 1;
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  if (!y || Number.isNaN(idx) || !names[idx]) return String(month ?? "");
  return `${names[idx]} ${y}`;
}
