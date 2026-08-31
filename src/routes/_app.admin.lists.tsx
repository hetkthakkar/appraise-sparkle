import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/mock-auth";
import {
  listDepartments,
  addDepartment,
  listDesignations,
  addDesignation,
  listLocations,
  addLocation,
  deleteDepartment,
  deleteDesignation,
  deleteLocation,
  deleteKPIWeightage,
  listKPIWeightages,
  updateKPIWeightages,
  monthToLabel,
  type KPIWeightage,
} from "@/lib/sheetsApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, AlertCircle, Save, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/admin/lists")({
  component: ManageLists,
});

function formatMonthDisplay(val: string): string {
  if (!val) return "";
  const s = String(val).trim();
  if (s.toUpperCase() === "DEFAULT") return "DEFAULT (Global Fallback)";

  // If date string like "Wed Jul 01 2026..."
  const parsedDate = new Date(s);
  if (!Number.isNaN(parsedDate.getTime()) && s.length > 7) {
    const y = parsedDate.getFullYear();
    const m = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const ym = `${y}-${m}`;
    return `${monthToLabel(ym)} (${ym})`;
  }

  // If already "YYYY-MM"
  if (/^\d{4}-\d{2}$/.test(s)) {
    return `${monthToLabel(s)} (${s})`;
  }

  return s;
}

function normalizeToMonthKey(val: string): string {
  if (!val) return "";
  const s = String(val).trim();
  if (s.toUpperCase() === "DEFAULT") return "DEFAULT";

  const parsedDate = new Date(s);
  if (!Number.isNaN(parsedDate.getTime()) && s.length > 7) {
    const y = parsedDate.getFullYear();
    const m = String(parsedDate.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  return s;
}

function ManageLists() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "super_admin") return <Navigate to="/" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Manage Lists</h2>
        <p className="text-sm text-muted-foreground">
          Maintain lookup values and KPI weightage configurations.
        </p>
      </div>

      <KPIWeightageSection userEmail={user.email} />

      <ListSection
        title="Departments"
        description="Options shown when assigning an employee's department."
        queryKey="departments"
        list={listDepartments}
        add={(name) => addDepartment(user.email, name)}
        del={(name) => deleteDepartment(user.email, name)}
        placeholder="e.g. Operations"
      />
      <ListSection
        title="Designations"
        description="Options shown when assigning an employee's designation."
        queryKey="designations"
        list={listDesignations}
        add={(name) => addDesignation(user.email, name)}
        del={(name) => deleteDesignation(user.email, name)}
        placeholder="e.g. Senior Analyst"
      />
      <ListSection
        title="Locations"
        description="Options shown when assigning an employee's location."
        queryKey="locations"
        list={listLocations}
        add={(name) => addLocation(user.email, name)}
        del={(name) => deleteLocation(user.email, name)}
        placeholder="e.g. Mumbai"
      />
    </div>
  );
}

function KPIWeightageSection({ userEmail }: { userEmail: string }) {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["kpiWeightages", userEmail],
    queryFn: () => listKPIWeightages(userEmail),
  });

  const [selectedMonth, setSelectedMonth] = useState("DEFAULT");
  const [customMonth, setCustomMonth] = useState("");
  const [production, setProduction] = useState("50");
  const [tickets, setTickets] = useState("15");
  const [errors, setErrors] = useState("15");
  const [attendance, setAttendance] = useState("10");
  const [behavior, setBehavior] = useState("10");

  const effectiveMonth = selectedMonth === "custom" ? customMonth.trim() : selectedMonth;
  const cleanEffectiveMonth = normalizeToMonthKey(effectiveMonth);

  const numProd = Number(production) || 0;
  const numTickets = Number(tickets) || 0;
  const numErrors = Number(errors) || 0;
  const numAtt = Number(attendance) || 0;
  const numBeh = Number(behavior) || 0;
  const total = numProd + numTickets + numErrors + numAtt + numBeh;
  const isValidTotal = total === 100;

  const handleSelectMonth = (m: string) => {
    setSelectedMonth(m);
    const clean = normalizeToMonthKey(m);
    const existing = (q.data ?? []).find(
      (item) => normalizeToMonthKey(item.month).toUpperCase() === clean.toUpperCase()
    );
    if (existing) {
      setProduction(String(existing.production));
      setTickets(String(existing.tickets));
      setErrors(String(existing.errors));
      setAttendance(String(existing.attendance));
      setBehavior(String(existing.behavior));
    }
  };

  const handleEditRow = (item: KPIWeightage) => {
    setSelectedMonth(item.month);
    setProduction(String(item.production));
    setTickets(String(item.tickets));
    setErrors(String(item.errors));
    setAttendance(String(item.attendance));
    setBehavior(String(item.behavior));
  };

  const m = useMutation({
    mutationFn: () => {
      if (!cleanEffectiveMonth) {
        throw new Error("Month is required.");
      }
      if (!isValidTotal) {
        throw new Error(`Total weightage must be exactly 100%. Current total is ${total}%.`);
      }
      return updateKPIWeightages(userEmail, {
        month: cleanEffectiveMonth,
        production: numProd,
        tickets: numTickets,
        errors: numErrors,
        attendance: numAtt,
        behavior: numBeh,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        qc.refetchQueries({ queryKey: ["kpiWeightages"] }),
        qc.refetchQueries({ queryKey: ["performance"] }),
        qc.refetchQueries({ queryKey: ["myDashboard"] }),
        qc.refetchQueries({ queryKey: ["employeeDetail"] }),
      ]);
      toast.success(`KPI Weightage for ${cleanEffectiveMonth} saved and ratings recalculated.`);
      if (selectedMonth === "custom") {
        setSelectedMonth(cleanEffectiveMonth);
        setCustomMonth("");
      }
    },
    onError: (e) =>
      toast.error("Failed to save KPI weightages", {
        description: e instanceof Error ? e.message : String(e),
      }),
  });

  const delM = useMutation({
    mutationFn: (month: string) => deleteKPIWeightage(userEmail, month),
    onSuccess: async (_, month) => {
      await qc.refetchQueries({ queryKey: ["kpiWeightages"] });
      await qc.refetchQueries({ queryKey: ["performance"] });
      toast.success(`KPI Weightage for ${formatMonthDisplay(month)} deleted.`);
      if (normalizeToMonthKey(selectedMonth).toUpperCase() === normalizeToMonthKey(month).toUpperCase()) {
        handleSelectMonth("DEFAULT");
      }
    },
    onError: (e) =>
      toast.error("Failed to delete KPI weightage", {
        description: e instanceof Error ? e.message : String(e),
      }),
  });

  const handleDeleteRow = (item: KPIWeightage) => {
    if (normalizeToMonthKey(item.month).toUpperCase() === "DEFAULT") return;
    const label = formatMonthDisplay(item.month);
    if (!window.confirm(`Delete KPI weightage configuration for ${label}? This cannot be undone.`)) return;
    delM.mutate(item.month);
  };

  return (
    <Card className="border border-primary/20 bg-card">
      <CardHeader>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-bold">KPI Weightage</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Configure weightages for monthly performance scoring. Total must equal 100%.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isValidTotal ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                <CheckCircle2 className="mr-1 size-3.5" /> Total: 100%
              </Badge>
            ) : (
              <Badge variant="destructive" className="font-semibold">
                <AlertCircle className="mr-1 size-3.5" /> Total: {total}% (Must be 100%)
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {/* Month Selection */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-semibold text-muted-foreground">Month / Config</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={selectedMonth}
                onChange={(e) => handleSelectMonth(e.target.value)}
              >
                <option value="DEFAULT">DEFAULT (Fallback)</option>
                {(q.data ?? [])
                  .filter((item) => normalizeToMonthKey(item.month).toUpperCase() !== "DEFAULT")
                  .map((item) => (
                    <option key={item.month} value={item.month}>
                      {formatMonthDisplay(item.month)}
                    </option>
                  ))}
                <option value="custom">+ New Month (YYYY-MM)...</option>
              </select>
            </div>

            {selectedMonth === "custom" && (
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-muted-foreground">Month</label>
                <Input
                  type="month"
                  value={customMonth}
                  onChange={(e) => setCustomMonth(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Prod (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={production}
                onChange={(e) => setProduction(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Tickets (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={tickets}
                onChange={(e) => setTickets(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Errors (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={errors}
                onChange={(e) => setErrors(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Atten (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={attendance}
                onChange={(e) => setAttendance(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Behav (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={behavior}
                onChange={(e) => setBehavior(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-muted-foreground">
              Target: <span className="font-medium text-foreground">{formatMonthDisplay(cleanEffectiveMonth) || "—"}</span> &nbsp;|&nbsp; Total: <span className={isValidTotal ? "font-bold text-emerald-600" : "font-bold text-destructive"}>{total}%</span>
            </div>
            <Button
              size="sm"
              disabled={m.isPending || !isValidTotal || !cleanEffectiveMonth}
              onClick={() => m.mutate()}
              className="gap-1.5 w-full sm:w-auto"
            >
              <Save className="size-3.5" />
              {m.isPending ? "Saving..." : `Save for ${cleanEffectiveMonth}`}
            </Button>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Configured Monthly Weightages
          </h4>
          {q.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold">Month</TableHead>
                    <TableHead className="text-xs font-semibold">Production</TableHead>
                    <TableHead className="text-xs font-semibold">Customer Tickets</TableHead>
                    <TableHead className="text-xs font-semibold">Errors / Rejection</TableHead>
                    <TableHead className="text-xs font-semibold">Attendance</TableHead>
                    <TableHead className="text-xs font-semibold">Behavior</TableHead>
                    <TableHead className="text-xs font-semibold">Total</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(q.data ?? []).map((item) => {
                    const isDefault = normalizeToMonthKey(item.month).toUpperCase() === "DEFAULT";
                    return (
                    <TableRow key={item.month} className="hover:bg-muted/40">
                      <TableCell className="font-bold text-xs">
                        {normalizeToMonthKey(item.month).toUpperCase() === "DEFAULT" ? (
                          <Badge variant="outline" className="font-bold">DEFAULT (Fallback)</Badge>
                        ) : (
                          formatMonthDisplay(item.month)
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{item.production}%</TableCell>
                      <TableCell className="text-xs">{item.tickets}%</TableCell>
                      <TableCell className="text-xs">{item.errors}%</TableCell>
                      <TableCell className="text-xs">{item.attendance}%</TableCell>
                      <TableCell className="text-xs">{item.behavior}%</TableCell>
                      <TableCell className="text-xs font-semibold text-emerald-600">{item.total}%</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs font-medium text-primary"
                            onClick={() => handleEditRow(item)}
                          >
                            Edit
                          </Button>
                          {!isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs font-medium text-destructive hover:text-destructive"
                              onClick={() => handleDeleteRow(item)}
                              disabled={delM.isPending}
                            >
                              <Trash2 className="mr-1 size-3.5" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  {(q.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-4">
                        No weightages found. Default 50/15/15/10/10 will be used.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ListSection({
  title,
  description,
  queryKey,
  list,
  add,
  del,
  placeholder,
}: {
  title: string;
  description: string;
  queryKey: string;
  list: () => Promise<string[]>;
  add: (name: string) => Promise<{ ok: true }>;
  del: (name: string) => Promise<{ ok: true }>;
  placeholder: string;
}) {
  const qc = useQueryClient();
  const [value, setValue] = useState("");

  const q = useQuery({ queryKey: [queryKey], queryFn: list });

  const m = useMutation({
    mutationFn: (name: string) => add(name),
    onSuccess: async () => {
      setValue("");
      await qc.refetchQueries({ queryKey: [queryKey] });
      toast.success(`${title.slice(0, -1)} added`);
    },
    onError: (e) =>
      toast.error("Could not add", {
        description: e instanceof Error ? e.message : String(e),
      }),
  });

  const delMutation = useMutation({
    mutationFn: (name: string) => del(name),
    onSuccess: async (_, name) => {
      await qc.refetchQueries({ queryKey: [queryKey] });
      toast.success(`${name} deleted`);
    },
    onError: (e) =>
      toast.error("Could not delete", {
        description: e instanceof Error ? e.message : String(e),
      }),
  });

  const handleDelete = (name: string) => {
    if (!window.confirm(`Delete "${name}" from ${title}? This cannot be undone.`)) return;
    delMutation.mutate(name);
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    m.mutate(trimmed);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 min-h-8">
          {q.isLoading ? (
            <>
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16" />
            </>
          ) : (q.data ?? []).length === 0 ? (
            <span className="text-sm text-muted-foreground">No entries yet.</span>
          ) : (
            (q.data ?? []).map((item) => (
              <Badge key={item} variant="secondary" className="text-sm pr-1">
                <span>{item}</span>
                <button
                  type="button"
                  aria-label={`Delete ${item}`}
                  title={`Delete ${item}`}
                  onClick={() => handleDelete(item)}
                  disabled={delMutation.isPending}
                  className="ml-1 inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="size-3" />
                </button>
              </Badge>
            ))
          )}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={m.isPending}
          />
          <Button type="submit" disabled={m.isPending || !value.trim()}>
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
