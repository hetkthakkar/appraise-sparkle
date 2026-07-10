export type Role = "super_admin" | "admin" | "user" | "no_access";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: Role;
  employeeId?: string;
  location?: string;
}

export interface Employee {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  teamLead: string;
  location: string;
}

export interface MonthlyPerformance {
  month: string;
  employeeId: string;
  name: string;
  location: string;
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

export interface UserRow {
  id: string;
  name: string;
  email: string;
  location: string | null;
  role: Role;
}
