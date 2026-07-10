import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Employee, MonthlyPerformance, UserRow } from "./types";

function mapEmployee(r: any): Employee {
  return {
    employeeId: r.employee_id,
    name: r.name,
    email: r.email,
    department: r.department,
    designation: r.designation,
    teamLead: r.team_lead,
    location: r.location,
  };
}

function mapPerf(r: any): MonthlyPerformance {
  return {
    month: r.month,
    employeeId: r.employee_id,
    name: r.name,
    location: r.location,
    productionTarget: Number(r.production_target),
    productionActual: Number(r.production_actual),
    ticketTarget: Number(r.ticket_target),
    ticketActual: Number(r.ticket_actual),
    errorTarget: Number(r.error_target),
    errorActual: Number(r.error_actual),
    attendance: Number(r.attendance),
    behavior: Number(r.behavior),
    managerRemarks: r.manager_remarks ?? "",
  };
}

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await supabase.from("employees").select("*").order("employee_id");
      if (error) throw error;
      return (data ?? []).map(mapEmployee);
    },
  });
}

export function usePerformance() {
  return useQuery({
    queryKey: ["performance"],
    queryFn: async (): Promise<MonthlyPerformance[]> => {
      const { data, error } = await supabase
        .from("monthly_performance")
        .select("*")
        .order("month", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapPerf);
    },
  });
}

export function useAllUsers() {
  return useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async (): Promise<UserRow[]> => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("id,name,email,location"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      const roleMap = new Map((roles ?? []).map((r: any) => [r.user_id, r.role]));
      return (profiles ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        location: p.location,
        role: roleMap.get(p.id) ?? "no_access",
      }));
    },
  });
}
