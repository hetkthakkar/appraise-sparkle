import type { AuthUser, Employee, MonthlyPerformance } from "./types";

export const DEMO_USERS: AuthUser[] = [
  {
    id: "u-super",
    name: "Priya Sharma",
    email: "priya.sharma@acme.co",
    role: "super_admin",
  },
  {
    id: "u-admin",
    name: "Rahul Verma",
    email: "rahul.verma@acme.co",
    role: "admin",
    employeeId: "EMP002",
  },
  {
    id: "u-user",
    name: "Anita Desai",
    email: "anita.desai@acme.co",
    role: "user",
    employeeId: "EMP004",
  },
  {
    id: "u-new",
    name: "Sam Newcomer",
    email: "sam.new@acme.co",
    role: "no_access",
  },
];

export const EMPLOYEES: Employee[] = [
  { employeeId: "EMP001", name: "Priya Sharma", email: "priya.sharma@acme.co", department: "Operations", designation: "Head of Operations", teamLead: "—" },
  { employeeId: "EMP002", name: "Rahul Verma", email: "rahul.verma@acme.co", department: "Claims", designation: "Team Lead", teamLead: "Priya Sharma" },
  { employeeId: "EMP003", name: "Meera Iyer", email: "meera.iyer@acme.co", department: "Claims", designation: "Senior Analyst", teamLead: "Rahul Verma" },
  { employeeId: "EMP004", name: "Anita Desai", email: "anita.desai@acme.co", department: "Claims", designation: "Analyst", teamLead: "Rahul Verma" },
  { employeeId: "EMP005", name: "Vikram Singh", email: "vikram.singh@acme.co", department: "Claims", designation: "Analyst", teamLead: "Rahul Verma" },
  { employeeId: "EMP006", name: "Neha Kapoor", email: "neha.kapoor@acme.co", department: "Underwriting", designation: "Team Lead", teamLead: "Priya Sharma" },
  { employeeId: "EMP007", name: "Arjun Mehta", email: "arjun.mehta@acme.co", department: "Underwriting", designation: "Analyst", teamLead: "Neha Kapoor" },
  { employeeId: "EMP008", name: "Sneha Rao", email: "sneha.rao@acme.co", department: "Underwriting", designation: "Analyst", teamLead: "Neha Kapoor" },
  { employeeId: "EMP009", name: "Karan Joshi", email: "karan.joshi@acme.co", department: "Support", designation: "Team Lead", teamLead: "Priya Sharma" },
  { employeeId: "EMP010", name: "Divya Nair", email: "divya.nair@acme.co", department: "Support", designation: "Specialist", teamLead: "Karan Joshi" },
];

const MONTHS = ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];

function seededRand(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export const PERFORMANCE: MonthlyPerformance[] = EMPLOYEES.flatMap((e, ei) =>
  MONTHS.map((m, mi) => {
    const s = ei * 31 + mi * 7 + 1;
    const prodT = 100;
    const tickT = 200;
    const errT = 5;
    return {
      month: m,
      employeeId: e.employeeId,
      name: e.name,
      productionTarget: prodT,
      productionActual: Math.round(80 + seededRand(s) * 35),
      ticketTarget: tickT,
      ticketActual: Math.round(150 + seededRand(s + 1) * 80),
      errorTarget: errT,
      errorActual: Math.round(seededRand(s + 2) * 8),
      attendance: Math.round((7 + seededRand(s + 3) * 3) * 10) / 10,
      behavior: Math.round((3 + seededRand(s + 4) * 2) * 10) / 10,
      managerRemarks:
        seededRand(s + 5) > 0.5
          ? "Consistent performer, meeting expectations."
          : "Needs to focus on reducing internal errors.",
    };
  })
);

export const CURRENT_MONTH = MONTHS[MONTHS.length - 1];
export const PREVIOUS_MONTHS = MONTHS.slice(0, -1).reverse();
