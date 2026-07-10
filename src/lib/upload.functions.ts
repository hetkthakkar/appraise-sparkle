import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const employeeSchema = z.object({
  employee_id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  department: z.string().min(1),
  designation: z.string().min(1),
  team_lead: z.string().min(1),
  location: z.string().min(1),
});

const performanceSchema = z.object({
  month: z.string().min(1),
  employee_id: z.string().min(1),
  name: z.string().min(1),
  location: z.string().min(1),
  production_target: z.number(),
  production_actual: z.number(),
  ticket_target: z.number(),
  ticket_actual: z.number(),
  error_target: z.number(),
  error_actual: z.number(),
  attendance: z.number().min(0).max(10),
  behavior: z.number().min(0).max(5),
  manager_remarks: z.string().nullish(),
});

async function assertRole(ctx: { supabase: any; userId: string }, roles: string[]) {
  for (const r of roles) {
    const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: r });
    if (data === true) return;
  }
  throw new Error("Forbidden: insufficient role");
}

export const upsertEmployees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ rows: z.array(employeeSchema).min(1).max(5000) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertRole(context, ["super_admin"]);
    const { error, count } = await context.supabase
      .from("employees")
      .upsert(data.rows, { onConflict: "employee_id", count: "exact" });
    if (error) throw new Error(error.message);
    return { inserted: count ?? data.rows.length };
  });

export const upsertPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ rows: z.array(performanceSchema).min(1).max(10000) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertRole(context, ["super_admin", "admin"]);
    const { error, count } = await context.supabase
      .from("monthly_performance")
      .upsert(data.rows, { onConflict: "month,employee_id", count: "exact" });
    if (error) throw new Error(error.message);
    return { inserted: count ?? data.rows.length };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["super_admin", "admin", "user", "no_access"]),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertRole(context, ["super_admin"]);
    if (data.userId === context.userId && data.role !== "super_admin") {
      throw new Error("You cannot demote yourself");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const del = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    if (del.error) throw new Error(del.error.message);
    const ins = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    if (ins.error) throw new Error(ins.error.message);
    return { ok: true };
  });
