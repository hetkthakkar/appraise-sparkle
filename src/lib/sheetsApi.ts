import type { Employee, MonthlyPerformance, Role } from "./types";

const API_URL = import.meta.env.VITE_SHEETS_API_URL as string;

export async function callSheetsApi<T = any>(action: string, payload: object = {}): Promise<T> {
  if (!API_URL) throw new Error("VITE_SHEETS_API_URL is not configured");
  const res = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, {
    method: "POST",
    body: new URLSearchParams({ payload: JSON.stringify(payload) }),
  });
  const json = await res.json();
  if (json && json.error) throw new Error(json.error);
  return json as T;
}

export interface UserProfile {
  email: string;
  name: string;
  role: Role | string;
}

export function normalizeRole(input: string | Role | undefined | null): Role {
  if (!input) return "no_access";
  const v = String(input).toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (v === "super_admin" || v === "superadmin") return "super_admin";
  if (v === "admin") return "admin";
  if (v === "user" || v === "employee") return "user";
  return "no_access";
}

export const ROLE_DISPLAY: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  user: "User",
  no_access: "No Access",
};

export async function getUserProfile(email: string, name: string) {
  return callSheetsApi<UserProfile>("getUserProfile", { email, name });
}

export async function listUsers(callerEmail: string) {
  return callSheetsApi<UserProfile[]>("listUsers", { callerEmail });
}

export async function updateUserRole(callerEmail: string, email: string, newRole: string) {
  return callSheetsApi("updateUserRole", { callerEmail, email, newRole });
}

export async function listEmployees(callerEmail: string) {
  return callSheetsApi<Employee[]>("listEmployees", { callerEmail });
}

export async function uploadEmployees(callerEmail: string, rows: Employee[]) {
  return callSheetsApi("uploadEmployees", { callerEmail, rows });
}

export async function listPerformance(callerEmail: string, month?: string) {
  return callSheetsApi<MonthlyPerformance[]>("listPerformance", { callerEmail, ...(month ? { month } : {}) });
}

export async function uploadPerformance(callerEmail: string, rows: MonthlyPerformance[]) {
  return callSheetsApi("uploadPerformance", { callerEmail, rows });
}

export async function updateRemarks(
  callerEmail: string,
  employeeId: string,
  month: string,
  remarks: string,
) {
  return callSheetsApi("updateRemarks", { callerEmail, employeeId, month, remarks });
}
