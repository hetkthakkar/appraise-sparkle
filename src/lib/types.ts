export type Role = "super_admin" | "admin" | "user" | "no_access";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: Role;
  /** Linked employee id (for `user` role) */
  employeeId?: string;
}

export interface Employee {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  teamLead: string; // team lead's name
}

export interface MonthlyPerformance {
  month: string; // e.g. "2026-05"
  employeeId: string;
  name: string;
  productionTarget: number;
  productionActual: number;
  ticketTarget: number;
  ticketActual: number;
  errorTarget: number;
  errorActual: number;
  attendance: number; // 0-10
  behavior: number; // 0-5
  managerRemarks: string;
}
