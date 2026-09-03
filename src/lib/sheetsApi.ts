import type { Role } from "./types";

const API_URL = import.meta.env.VITE_SHEETS_API_URL as string;
const REQUEST_TIMEOUT_MS = 60_000;

export async function callSheetsApi<T = unknown>(
  action: string,
  payload: object
): Promise<T> {
  if (!API_URL) {
    throw new Error("VITE_SHEETS_API_URL is not configured");
  }

  const controller = new AbortController();

  const timer = window.setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const isUpload =
      action === "uploadEmployees" ||
      action === "uploadPerformance";

    let res: Response;

    if (isUpload) {
      const url = `${API_URL}?action=${encodeURIComponent(action)}`;
      const body = `payload=${encodeURIComponent(JSON.stringify(payload))}`;

      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body,
        signal: controller.signal,
      });
    } else {
      const url =
        `${API_URL}?action=${encodeURIComponent(action)}` +
        `&payload=${encodeURIComponent(JSON.stringify(payload))}`;

      res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
      });
    }

    const text = await res.text();

    if (!text) {
      throw new Error("Backend returned an empty response.");
    }

    let json: any;

    try {
      json = JSON.parse(text);
    } catch {
      console.error("Non-JSON response from Apps Script:", text);
      throw new Error("Backend returned an invalid response. Check Apps Script deployment.");
    }

    if (json?.error) {
      throw new Error(String(json.error));
    }

    return json as T;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("Request timed out after 60 seconds. Please try again.");
    }
    throw e;
  } finally {
    window.clearTimeout(timer);
  }
}

// =====================================================
// TYPES
// =====================================================

export interface SheetUser {
  email: string;
  name: string;
  role: string;
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

export interface SheetPerformance {
  month: string;
  employeeId: string;
  name: string;
  location?: string;
  productionTarget: number;
  productionActual: number;
  ticketTarget: number;
  ticketActual: number;
  errorTarget: number;
  errorActual: number;
  attendance: number;
  behavior: number;
  performanceRating?: string;
  ratingScore?: number;
  managerRemarks: string;
}

export interface KPIWeightage {
  month: string;
  production: number;
  tickets: number;
  errors: number;
  attendance: number;
  behavior: number;
  total: number;
}

export interface TeamMemberPerformance {
  employee: SheetEmployee;
  performance: SheetPerformance | null;
}

export interface TeamHierarchyNode {
  employee: SheetEmployee;
  children: TeamHierarchyNode[];
}

export interface TeamPerformanceSummary {
  employeeCount: number;
  production: number;
  tickets: number;
  quality: number;
  attendance: number;
  behavior: number;
  overall: number;
}

export interface EmployeeTeamData {
  hasTeam: boolean;
  teamSize: number;
  hierarchy: TeamHierarchyNode | null;
  currentMonthSummary?: TeamPerformanceSummary | null;
}

export interface EmployeeDetailResponse {
  profile: SheetEmployee;
  isHeadTeamLead: boolean;
  isTeamLead: boolean;
  isManager: boolean;
  currentMonth: SheetPerformance | null;
  previousMonths: SheetPerformance[];
  directReports?: SheetEmployee[];
  downline?: SheetEmployee[];
  team?: EmployeeTeamData;
}

export interface MyDashboard {
  profile: SheetEmployee;
  currentMonth: SheetPerformance | null;
  previousMonths: SheetPerformance[];
}

// =====================================================
// HELPERS
// =====================================================

export function normalizeRole(role: string | null | undefined): Role {
  const normalized = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "");

  if (normalized === "superadmin") return "super_admin";
  if (normalized === "admin") return "admin";
  if (normalized === "user") return "user";
  return "no_access";
}

// =====================================================
// API CALL WRAPPERS
// =====================================================

export function getUserProfile(email: string, name: string) {
  return callSheetsApi<SheetUser>("getUserProfile", { email, name });
}

export function listUsers(callerEmail: string) {
  return callSheetsApi<SheetUser[]>("listUsers", { callerEmail });
}

export function updateUserRole(callerEmail: string, email: string, newRole: Role) {
  const backendRoleMap: Record<Role, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    user: "User",
    no_access: "No Access",
  };

  return callSheetsApi<{ ok: true }>("updateUserRole", {
    callerEmail,
    email,
    newRole: backendRoleMap[newRole] || "No Access",
  });
}

export function listEmployees(callerEmail: string) {
  return callSheetsApi<SheetEmployee[]>("listEmployees", { callerEmail });
}

export function uploadEmployees(callerEmail: string, rows: Record<string, unknown>[]) {
  return callSheetsApi<{ total: number }>("uploadEmployees", {
    callerEmail,
    rows,
  });
}

export function listPerformance(callerEmail: string, month?: string) {
  return callSheetsApi<SheetPerformance[]>("listPerformance", {
    callerEmail,
    month: month || "",
  });
}

export function uploadPerformance(callerEmail: string, rows: Record<string, unknown>[]) {
  return callSheetsApi<{ total: number }>("uploadPerformance", {
    callerEmail,
    rows,
  });
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

export function listKPIWeightages(callerEmail: string) {
  return callSheetsApi<KPIWeightage[]>("listKPIWeightages", { callerEmail });
}

export function updateKPIWeightages(
  callerEmail: string,
  weightages: {
    month: string;
    production: number;
    tickets: number;
    errors: number;
    attendance: number;
    behavior: number;
  }
) {
  return callSheetsApi<{ success: true; total: number }>(
    "updateKPIWeightages",
    {
      callerEmail,
      ...weightages,
    }
  );
}

export async function listDepartments() {
  const list = await callSheetsApi<string[]>("listDepartments", {});
  return (list ?? []).slice().sort((a, b) => {
    const isCeoA = a.trim().toLowerCase() === "ceo" || a.trim().toLowerCase().startsWith("ceo ");
    const isCeoB = b.trim().toLowerCase() === "ceo" || b.trim().toLowerCase().startsWith("ceo ");
    if (isCeoA && !isCeoB) return -1;
    if (!isCeoA && isCeoB) return 1;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
}

export function addDepartment(callerEmail: string, name: string) {
  return callSheetsApi<{ ok: true }>("addDepartment", {
    callerEmail,
    name,
  });
}

export function listDesignations() {
  return callSheetsApi<string[]>("listDesignations", {});
}

export function addDesignation(callerEmail: string, name: string) {
  return callSheetsApi<{ ok: true }>("addDesignation", {
    callerEmail,
    name,
  });
}

export function listLocations() {
  return callSheetsApi<string[]>("listLocations", {});
}

export function addLocation(callerEmail: string, name: string) {
  return callSheetsApi<{ ok: true }>("addLocation", {
    callerEmail,
    name,
  });
}

export function deleteDepartment(callerEmail: string, name: string) {
  return callSheetsApi<{ ok: true }>("deleteDepartment", { callerEmail, name });
}

export function deleteDesignation(callerEmail: string, name: string) {
  return callSheetsApi<{ ok: true }>("deleteDesignation", { callerEmail, name });
}

export function deleteLocation(callerEmail: string, name: string) {
  return callSheetsApi<{ ok: true }>("deleteLocation", { callerEmail, name });
}

export function deleteKPIWeightage(callerEmail: string, month: string) {
  return callSheetsApi<{ success: true; month: string; updatedRatings?: number }>(
    "deleteKPIWeightage",
    { callerEmail, month }
  );
}

export function listTeamLeads() {
  return callSheetsApi<string[]>("listTeamLeads", {});
}

export function getMyDashboard(callerEmail: string) {
  return callSheetsApi<MyDashboard>("getMyDashboard", { callerEmail });
}

export function getEmployeeDetail(callerEmail: string, employeeId: string) {
  return callSheetsApi<EmployeeDetailResponse>("getEmployeeDetail", {
    callerEmail,
    employeeId,
  });
}

export function updateEmployeeDetails(
  callerEmail: string,
  details: {
    department: string;
    designation: string;
    teamLead: string;
    location: string;
    joiningDate: string;
  }
) {
  return callSheetsApi<{ ok: true }>("updateEmployeeDetails", {
    callerEmail,
    ...details,
  });
}

export function adminUpdateEmployee(
  callerEmail: string,
  employeeId: string,
  updates: {
    employeeId?: string;
    email?: string;
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

// =====================================================
// MONTH LABEL
// =====================================================

export function monthToLabel(month: string): string {
  const [y, m] = String(month ?? "").split("-");
  const idx = Number(m) - 1;

  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  if (!y || Number.isNaN(idx) || !names[idx]) {
    return String(month ?? "");
  }

  return `${names[idx]} ${y}`;
}
