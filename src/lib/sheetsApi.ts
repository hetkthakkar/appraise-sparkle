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
      const url =
        `${API_URL}?action=${encodeURIComponent(action)}`;

      const body =
        `payload=${encodeURIComponent(
          JSON.stringify(payload)
        )}`;

      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body,
        signal: controller.signal,
      });
    } else {
      const url =
        `${API_URL}?action=${encodeURIComponent(action)}` +
        `&payload=${encodeURIComponent(
          JSON.stringify(payload)
        )}`;

      res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
      });
    }

    const text = await res.text();

    if (!text) {
      throw new Error(
        "Backend returned an empty response."
      );
    }

    let json: any;

    try {
      json = JSON.parse(text);
    } catch {
      console.error(
        "Non-JSON response from Apps Script:",
        text
      );

      throw new Error(
        "Backend returned an invalid response. Check Apps Script deployment."
      );
    }

    if (json?.error) {
      throw new Error(String(json.error));
    }

    return json as T;
  } catch (e) {
    if (
      e instanceof DOMException &&
      e.name === "AbortError"
    ) {
      throw new Error(
        "Request timed out after 60 seconds. Please try again."
      );
    }

    throw e;
  } finally {
    window.clearTimeout(timer);
  }
}


// =====================================================
// TYPES RETURNED BY GOOGLE APPS SCRIPT
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


// =====================================================
// PERFORMANCE
// =====================================================

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

  managerRemarks: string;
}


// =====================================================
// TEAM / HIERARCHY
// =====================================================

/*
 * A single employee's performance together with
 * their employee-master information.
 */
export interface TeamMemberPerformance {
  employee: SheetEmployee;

  performance: SheetPerformance | null;
}


/*
 * Represents one level of the reporting hierarchy.
 *
 * Example:
 *
 * Head TL
 *   ├── TL A
 *   │     ├── Operator 1
 *   │     └── Operator 2
 *   │
 *   └── TL B
 *         ├── Operator 3
 *         └── Operator 4
 */
export interface TeamHierarchyNode {
  employee: SheetEmployee;

  children: TeamHierarchyNode[];
}


/*
 * Aggregated team performance.
 *
 * This is what the popup will use for:
 *
 * Team Lead
 * Head Team Lead
 *
 * Operators will continue to use their own
 * individual performance.
 */
export interface TeamPerformanceSummary {
  employeeCount: number;

  production: number;

  tickets: number;

  quality: number;

  attendance: number;

  behavior: number;

  overall: number;
}


/*
 * Complete team information returned by
 * getEmployeeDetail().
 */
export interface EmployeeTeamData {
  /*
   * Whether the selected employee has
   * subordinate employees.
   */
  hasTeam: boolean;

  /*
   * Number of all employees underneath
   * this employee, including indirect reports.
   */
  teamSize: number;

  /*
   * Complete reporting hierarchy.
   */
  hierarchy: TeamHierarchyNode | null;

  /*
   * Current-month aggregated team performance.
   */
  currentMonthSummary:
    | TeamPerformanceSummary
    | null;

  /*
   * Historical aggregated team performance.
   */
  previousMonthSummaries:
    | TeamPerformanceSummary[]
    | null;
}


// =====================================================
// DASHBOARD
// =====================================================

export interface MyDashboard {
  profile: SheetEmployee;

  currentMonth: SheetPerformance | null;

  previousMonths: SheetPerformance[];

  /*
   * Team information is optional so the normal
   * employee dashboard continues to work.
   */
  team?: EmployeeTeamData | null;
}


export interface UploadResult {
  success?: boolean;

  inserted?: number;

  updated?: number;

  skipped?: number;

  total?: number;

  count?: number;
}


// =====================================================
// ROLE NORMALIZATION
// =====================================================

export function normalizeRole(
  raw: string | undefined | null
): Role {
  const r = String(raw ?? "")
    .trim()
    .toLowerCase();

  if (
    r === "super admin" ||
    r === "super_admin" ||
    r === "superadmin"
  ) {
    return "super_admin";
  }

  if (r === "admin") {
    return "admin";
  }

  if (
    r === "user" ||
    r === "employee"
  ) {
    return "user";
  }

  return "no_access";
}


export function roleToDisplay(
  role: Role
): string {
  if (role === "super_admin") {
    return "Super Admin";
  }

  if (role === "admin") {
    return "Admin";
  }

  if (role === "user") {
    return "User";
  }

  return "No Access";
}


// =====================================================
// USER
// =====================================================

export function getUserProfile(
  email: string,
  name: string
) {
  return callSheetsApi<{
    email: string;
    name: string;
    role: string;
    employeeId?: string;
  }>(
    "getUserProfile",
    {
      email,
      name,
    }
  );
}


export function listUsers(
  callerEmail: string
) {
  return callSheetsApi<SheetUser[]>(
    "listUsers",
    {
      callerEmail,
    }
  );
}


export function updateUserRole(
  callerEmail: string,
  email: string,
  newRole: Role
) {
  return callSheetsApi<{ ok: true }>(
    "updateUserRole",
    {
      callerEmail,
      email,
      newRole: roleToDisplay(newRole),
    }
  );
}


// =====================================================
// EMPLOYEES
// =====================================================

export function listEmployees(
  callerEmail: string
) {
  return callSheetsApi<SheetEmployee[]>(
    "listEmployees",
    {
      callerEmail,
    }
  );
}


// =====================================================
// MASTER DATA UPLOAD
// =====================================================

export function uploadEmployees(
  callerEmail: string,
  rows: Record<string, unknown>[]
) {
  return callSheetsApi<UploadResult>(
    "uploadEmployees",
    {
      callerEmail,
      rows,
    }
  );
}


// =====================================================
// MONTHLY PERFORMANCE
// =====================================================

export function listPerformance(
  callerEmail: string,
  month?: string
) {
  return callSheetsApi<SheetPerformance[]>(
    "listPerformance",
    {
      callerEmail,
      month,
    }
  );
}


export function uploadPerformance(
  callerEmail: string,
  rows: Record<string, unknown>[]
) {
  return callSheetsApi<UploadResult>(
    "uploadPerformance",
    {
      callerEmail,
      rows,
    }
  );
}


// =====================================================
// REMARKS
// =====================================================

export function updateRemarks(
  callerEmail: string,
  employeeId: string,
  month: string,
  remarks: string
) {
  return callSheetsApi<{ ok: true }>(
    "updateRemarks",
    {
      callerEmail,
      employeeId,
      month,
      remarks,
    }
  );
}


// =====================================================
// LOOKUPS
// =====================================================

export function listDepartments() {
  return callSheetsApi<string[]>(
    "listDepartments",
    {}
  );
}


export function addDepartment(
  callerEmail: string,
  name: string
) {
  return callSheetsApi<{ ok: true }>(
    "addDepartment",
    {
      callerEmail,
      name,
    }
  );
}


export function listDesignations() {
  return callSheetsApi<string[]>(
    "listDesignations",
    {}
  );
}


export function addDesignation(
  callerEmail: string,
  name: string
) {
  return callSheetsApi<{ ok: true }>(
    "addDesignation",
    {
      callerEmail,
      name,
    }
  );
}


export function listLocations() {
  return callSheetsApi<string[]>(
    "listLocations",
    {}
  );
}


export function addLocation(
  callerEmail: string,
  name: string
) {
  return callSheetsApi<{ ok: true }>(
    "addLocation",
    {
      callerEmail,
      name,
    }
  );
}


export function listTeamLeads() {
  return callSheetsApi<string[]>(
    "listTeamLeads",
    {}
  );
}


// =====================================================
// EMPLOYEE DETAILS
// =====================================================

export function updateEmployeeDetails(
  callerEmail: string,
  department: string,
  designation: string,
  teamLead: string,
  location: string,
  joiningDate?: string
) {
  return callSheetsApi<{ ok: true }>(
    "updateEmployeeDetails",
    {
      callerEmail,
      department,
      designation,
      teamLead,
      location,
      joiningDate:
        joiningDate ?? "",
    },
  );
}


// =====================================================
// DASHBOARD / DETAIL VIEWS
// =====================================================

export function getMyDashboard(
  callerEmail: string
) {
  return callSheetsApi<MyDashboard>(
    "getMyDashboard",
    {
      callerEmail,
    }
  );
}


/*
 * Employee detail now supports both:
 *
 * 1. Individual employee performance
 * 2. Team / umbrella performance
 *
 * The response remains MyDashboard-compatible,
 * so existing dashboard code does not break.
 */
export function getEmployeeDetail(
  callerEmail: string,
  employeeId: string
) {
  return callSheetsApi<MyDashboard>(
    "getEmployeeDetail",
    {
      callerEmail,
      employeeId,
    }
  );
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
  return callSheetsApi<{ ok: true }>(
    "adminUpdateEmployee",
    {
      callerEmail,
      employeeId,
      ...updates,
    }
  );
}


// =====================================================
// MONTH LABEL
// =====================================================

export function monthToLabel(
  month: string
): string {
  const [y, m] =
    String(month ?? "").split("-");

  const idx =
    Number(m) - 1;

  const names = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  if (
    !y ||
    Number.isNaN(idx) ||
    !names[idx]
  ) {
    return String(month ?? "");
  }

  return `${names[idx]} ${y}`;
}
