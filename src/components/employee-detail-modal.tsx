import { 
  useEffect, 
  useMemo, 
  useState, 
  type FormEvent, 
} from "react"; 
 
import { 
  useMutation, 
  useQuery, 
  useQueryClient, 
} from "@tanstack/react-query"; 
 
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
} from "@/components/ui/dialog"; 
 
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input"; 
import { Skeleton } from "@/components/ui/skeleton"; 
import { Badge } from "@/components/ui/badge"; 
import { Progress } from "@/components/ui/progress"; 
 
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue, 
} from "@/components/ui/select"; 
 
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
} from "@/components/ui/card"; 
 
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow, 
} from "@/components/ui/table"; 
 
import { 
  Users, 
  TrendingUp, 
  Ticket, 
  ShieldCheck, 
  CalendarCheck, 
  Brain, 
  Pencil, 
} from "lucide-react"; 
 
import { toast } from "sonner"; 
 
import { useAuth } from "@/lib/mock-auth"; 
 
import { 
  adminUpdateEmployee, 
  getEmployeeDetail, 
  listDepartments, 
  listDesignations, 
  listEmployees, 
  listLocations, 
  listPerformance, 
  listTeamLeads, 
  monthToLabel, 
  type SheetEmployee, 
  type SheetPerformance, 
} from "@/lib/sheetsApi"; 
 
 
interface Props { 
  employeeId: string | null; 
  onOpenChange: (open: boolean) => void; 
} 
 
 
interface EmployeeProfile { 
  employeeId?: string; 
  name?: string; 
  email?: string; 
  department?: string; 
  designation?: string; 
  teamLead?: string; 
  location?: string; 
  joiningDate?: string; 
} 
 
 
/* ============================================================ 
   HELPERS 
   ============================================================ */ 
 
function normalizeText(value: unknown): string { 
  return String(value ?? "") 
    .trim() 
    .toLowerCase() 
    .replace(/\s+/g, " "); 
} 
 
 
function isHeadTeamLeader( 
  designation: unknown 
): boolean { 
  const value = normalizeText(designation); 
 
  return ( 
    value.includes("head team leader") || 
    value.includes("head team lead") || 
    value === "head tl" || 
    value.startsWith("head team") 
  ); 
} 
 
 
function isTeamLeader( 
  designation: unknown 
): boolean { 
  const value = normalizeText(designation); 
 
  if (isHeadTeamLeader(value)) { 
    return false; 
  } 
 
  return ( 
    value.includes("team leader") || 
    value.includes("team lead") || 
    value === "tl" || 
    value.startsWith("tl ") 
  ); 
} 
 
 
function samePerson( 
  a: unknown, 
  b: unknown 
): boolean { 
  return normalizeText(a) === normalizeText(b); 
} 
 
 
function safeNumber(value: unknown): number { 
  const n = Number(value); 
 
  return Number.isFinite(n) 
    ? n 
    : 0; 
} 
 
 
/* ============================================================ 
   INTERNAL PERCENTAGE CALCULATIONS 
 
   These are retained only for calculating Overall. 
   They are NOT displayed as KPI values. 
   ============================================================ */ 
 
function productionPercent( 
  performance: SheetPerformance | null | undefined 
): number { 
  if (!performance) return 0; 
 
  const target = safeNumber( 
    performance.productionTarget 
  ); 
 
  const actual = safeNumber( 
    performance.productionActual 
  ); 
 
  if (target <= 0) return 0; 
 
  return Math.max( 
    0, 
    Math.min( 
      150, 
      (actual / target) * 100 
    ) 
  ); 
} 
 
 
function ticketPercent( 
  performance: SheetPerformance | null | undefined 
): number { 
  if (!performance) return 0; 
 
  const target = safeNumber( 
    performance.ticketTarget 
  ); 
 
  const actual = safeNumber( 
    performance.ticketActual 
  ); 
 
  if (target <= 0) return 0; 
 
  return Math.max( 
    0, 
    Math.min( 
      150, 
      (actual / target) * 100 
    ) 
  ); 
} 
 
 
function qualityPercent( 
  performance: SheetPerformance | null | undefined 
): number { 
  if (!performance) return 0; 
 
  const target = safeNumber( 
    performance.errorTarget 
  ); 
 
  const actual = safeNumber( 
    performance.errorActual 
  ); 
 
  if (target <= 0) { 
    return actual <= 0 ? 100 : 0; 
  } 
 
  if (actual <= 0) { 
    return 100; 
  } 
 
  return Math.max( 
    0, 
    Math.min( 
      150, 
      (target / actual) * 100 
    ) 
  ); 
} 
 
 
function attendancePercent( 
  performance: SheetPerformance | null | undefined 
): number { 
  if (!performance) return 0; 
 
  return Math.max( 
    0, 
    Math.min( 
      100, 
      (safeNumber(performance.attendance) / 10) * 
        100 
    ) 
  ); 
} 
 
 
function behaviorPercent( 
  performance: SheetPerformance | null | undefined 
): number { 
  if (!performance) return 0; 
 
  return Math.max( 
    0, 
    Math.min( 
      100, 
      (safeNumber(performance.behavior) / 5) * 
        100 
    ) 
  ); 
} 
 
 
function overallPercent( 
  performance: SheetPerformance | null | undefined 
): number { 
  if (!performance) return 0; 
 
  const values = [ 
    productionPercent(performance), 
    ticketPercent(performance), 
    qualityPercent(performance), 
    attendancePercent(performance), 
    behaviorPercent(performance), 
  ]; 
 
  return ( 
    values.reduce( 
      (sum, value) => sum + value, 
      0 
    ) / values.length 
  ); 
} 
 
 
function getCurrentMonthKey(): string { 
  const now = new Date(); 
 
  return `${now.getFullYear()}-${String( 
    now.getMonth() + 1 
  ).padStart(2, "0")}`; 
} 
 
 
function getLatestMonth( 
  rows: SheetPerformance[] 
): string | null { 
  if (!rows.length) { 
    return null; 
  } 
 
  const months = Array.from( 
    new Set( 
      rows 
        .map((row) => 
          String(row.month ?? "").slice(0, 7) 
        ) 
        .filter(Boolean) 
    ) 
  ); 
 
  months.sort((a, b) => 
    b.localeCompare(a) 
  ); 
 
  return months[0] ?? null; 
} 
 
 
function getPerformanceForMonth( 
  rows: SheetPerformance[], 
  employeeId: string, 
  month: string 
): SheetPerformance | null { 
  return ( 
    rows.find( 
      (row) => 
        String(row.employeeId) === 
          String(employeeId) && 
        String(row.month).slice(0, 7) === 
          month 
    ) ?? null 
  ); 
} 
 
 
/* ============================================================ 
   TEAM RELATIONSHIP 
   ============================================================ */ 
 
function getDescendants( 
  manager: SheetEmployee, 
  employees: SheetEmployee[] 
): SheetEmployee[] { 
  const result: SheetEmployee[] = []; 
  const visited = new Set<string>(); 
 
  const managerId = 
    String(manager.employeeId ?? "").trim(); 
 
  if (managerId) { 
    visited.add(managerId); 
  } 
 
  function walk( 
    parent: SheetEmployee 
  ) { 
    employees.forEach((employee) => { 
      const id = 
        String( 
          employee.employeeId ?? "" 
        ).trim(); 
 
      if (!id) return; 
 
      if (visited.has(id)) { 
        return; 
      } 
 
      if ( 
        !samePerson( 
          employee.teamLead, 
          parent.name 
        ) 
      ) { 
        return; 
      } 
 
      visited.add(id); 
 
      result.push(employee); 
 
      walk(employee); 
    }); 
  } 
 
  walk(manager); 
 
  return result; 
} 
 
 
function getDirectReports( 
  manager: SheetEmployee, 
  employees: SheetEmployee[] 
): SheetEmployee[] { 
  return employees.filter( 
    (employee) => 
      samePerson( 
        employee.teamLead, 
        manager.name 
      ) && 
      !samePerson( 
        employee.employeeId, 
        manager.employeeId 
      ) 
  ); 
} 
 
 
/* ============================================================ 
   MAIN MODAL 
   ============================================================ */ 
 
export function EmployeeDetailModal({ 
  employeeId, 
  onOpenChange, 
}: Props) { 
  const { user } = useAuth(); 
 
  const [editing, setEditing] = 
    useState(false); 
 
  const detailQ = useQuery({ 
    queryKey: [ 
      "employeeDetail", 
      employeeId, 
      user?.email, 
    ], 
 
    queryFn: () => 
      getEmployeeDetail( 
        user!.email, 
        employeeId! 
      ), 
 
    enabled: 
      !!user && 
      !!employeeId, 
  }); 
 
 
  const employeesQ = useQuery({ 
    queryKey: [ 
      "employees", 
      user?.email, 
    ], 
 
    queryFn: () => 
      listEmployees( 
        user!.email 
      ), 
 
    enabled: 
      !!user && 
      !!employeeId && 
      ( 
        user.role === "super_admin" || 
        user.role === "admin" 
      ), 
  }); 
 
 
  const performanceQ = useQuery({ 
    queryKey: [ 
      "performance", 
      "employee-detail", 
      user?.email, 
    ], 
 
    queryFn: () => 
      listPerformance( 
        user!.email 
      ), 
 
    enabled: 
      !!user && 
      !!employeeId && 
      ( 
        user.role === "super_admin" || 
        user.role === "admin" 
      ), 
  }); 
 
 
  useEffect(() => { 
    setEditing(false); 
  }, [employeeId]); 
 
 
  const profile = 
    detailQ.data?.profile; 
 
 
  const designation = 
    profile?.designation ?? ""; 
 
 
  const headTL = 
    isHeadTeamLeader( 
      designation 
    ); 
 
 
  const teamLeader = 
    isTeamLeader( 
      designation 
    ); 
 
 
  const allEmployees = 
    employeesQ.data ?? []; 
 
 
  const directReports = 
    useMemo(() => { 
      if (!profile) return []; 
 
      return getDirectReports( 
        profile, 
        allEmployees 
      ); 
    }, [ 
      profile, 
      allEmployees, 
    ]); 
 
 
  const teamEmployees = 
    useMemo(() => { 
      if (!profile) return []; 
 
      if (headTL) { 
        return getDescendants( 
          profile, 
          allEmployees 
        ); 
      } 
 
      if (teamLeader) { 
        return directReports; 
      } 
 
      return []; 
    }, [ 
      profile, 
      allEmployees, 
      directReports, 
      headTL, 
      teamLeader, 
    ]); 
 
 
  const performanceRows = 
    performanceQ.data ?? []; 
 
 
  const teamMonth = 
    useMemo(() => { 
      if (!teamEmployees.length) { 
        return getCurrentMonthKey(); 
      } 
 
      const teamIds = 
        new Set( 
          teamEmployees.map( 
            (employee) => 
              String( 
                employee.employeeId 
              ) 
          ) 
        ); 
 
      const teamRows = 
        performanceRows.filter( 
          (row) => 
            teamIds.has( 
              String( 
                row.employeeId 
              ) 
            ) 
        ); 
 
      const current = 
        getCurrentMonthKey(); 
 
      const hasCurrent = 
        teamRows.some( 
          (row) => 
            String( 
              row.month 
            ).slice(0, 7) === 
            current 
        ); 
 
      if (hasCurrent) { 
        return current; 
      } 
 
      return ( 
        getLatestMonth( 
          teamRows 
        ) ?? current 
      ); 
    }, [ 
      teamEmployees, 
      performanceRows, 
    ]); 
 
 
  /* ============================================================ 
     TEAM SUMMARY 
 
     Raw values are retained: 
       Production = Actual / Target 
       Tickets = Actual / Target 
       Quality = Actual / Target 
       Attendance = Average / 10 
       Behavior = Average / 5 
 
     Percentage calculations are used ONLY for Overall. 
     ============================================================ */ 
 
  const teamSummary = 
    useMemo(() => { 
      if (!teamEmployees.length) { 
        return null; 
      } 
 
      const rows = 
        teamEmployees 
          .map((employee) => 
            getPerformanceForMonth( 
              performanceRows, 
              employee.employeeId, 
              teamMonth 
            ) 
          ) 
          .filter( 
            ( 
              row 
            ): row is SheetPerformance => 
              !!row 
          ); 
 
      if (!rows.length) { 
        return null; 
      } 
 
 
      const productionTarget = 
        rows.reduce( 
          (sum, row) => 
            sum + 
            safeNumber( 
              row.productionTarget 
            ), 
          0 
        ); 
 
 
      const productionActual = 
        rows.reduce( 
          (sum, row) => 
            sum + 
            safeNumber( 
              row.productionActual 
            ), 
          0 
        ); 
 
 
      const ticketTarget = 
        rows.reduce( 
          (sum, row) => 
            sum + 
            safeNumber( 
              row.ticketTarget 
            ), 
          0 
        ); 
 
 
      const ticketActual = 
        rows.reduce( 
          (sum, row) => 
            sum + 
            safeNumber( 
              row.ticketActual 
            ), 
          0 
        ); 
 
 
      const errorTarget = 
        rows.reduce( 
          (sum, row) => 
            sum + 
            safeNumber( 
              row.errorTarget 
            ), 
          0 
        ); 
 
 
      const errorActual = 
        rows.reduce( 
          (sum, row) => 
            sum + 
            safeNumber( 
              row.errorActual 
            ), 
          0 
        ); 
 
 
      const attendance = 
        rows.reduce( 
          (sum, row) => 
            sum + 
            safeNumber( 
              row.attendance 
            ), 
          0 
        ) / rows.length; 
 
 
      const behavior = 
        rows.reduce( 
          (sum, row) => 
            sum + 
            safeNumber( 
              row.behavior 
            ), 
          0 
        ) / rows.length; 
 
 
      /* ======================================================== 
         INTERNAL OVERALL CALCULATION 
         ======================================================== */ 
 
      const production = 
        productionTarget > 0 
          ? Math.min( 
              150, 
              ( 
                productionActual / 
                productionTarget 
              ) * 100 
            ) 
          : 0; 
 
 
      const tickets = 
        ticketTarget > 0 
          ? Math.min( 
              150, 
              ( 
                ticketActual / 
                ticketTarget 
              ) * 100 
            ) 
          : 0; 
 
 
      const quality = 
        errorTarget <= 0 
          ? errorActual <= 0 
            ? 100 
            : 0 
          : errorActual <= 0 
            ? 100 
            : Math.min( 
                150, 
                ( 
                  errorTarget / 
                  errorActual 
                ) * 100 
              ); 
 
 
      const attendancePct = 
        Math.min( 
          100, 
          ( 
            attendance / 
            10 
          ) * 100 
        ); 
 
 
      const behaviorPct = 
        Math.min( 
          100, 
          ( 
            behavior / 
            5 
          ) * 100 
        ); 
 
 
      const overall = 
        ( 
          production + 
          tickets + 
          quality + 
          attendancePct + 
          behaviorPct 
        ) / 5; 
 
 
      return { 
        people: 
          teamEmployees.length, 
 
        employeesWithPerformance: 
          rows.length, 
 
        productionActual, 
        productionTarget, 
 
        ticketActual, 
        ticketTarget, 
 
        errorActual, 
        errorTarget, 
 
        attendance, 
        behavior, 
 
        overall, 
      }; 
    }, [ 
      teamEmployees, 
      performanceRows, 
      teamMonth, 
    ]); 
 
 
  const currentPerformance = 
    detailQ.data?.currentMonth ?? 
    null; 
 
 
  const previousPerformance = 
    detailQ.data?.previousMonths?.[0] ?? 
    null; 
 
 
  const directTeamPerformance = 
    useMemo(() => { 
      const month = 
        teamMonth; 
 
      return directReports.map( 
        (employee) => { 
          const performance = 
            getPerformanceForMonth( 
              performanceRows, 
              employee.employeeId, 
              month 
            ); 
 
          return { 
            employee, 
            performance, 
          }; 
        } 
      ); 
    }, [ 
      directReports, 
      performanceRows, 
      teamMonth, 
    ]); 
 
 
  return ( 
    <Dialog 
      open={!!employeeId} 
      onOpenChange={onOpenChange} 
    > 
      <DialogContent 
        className=" 
          max-h-[92vh] 
          max-w-5xl 
          overflow-y-auto 
          p-0 
        " 
      > 
 
        {/* ================================================== 
            HEADER 
            ================================================== */} 
 
        <DialogHeader 
          className=" 
            sticky 
            top-0 
            z-20 
            border-b 
            bg-background 
            px-6 
            py-5 
          " 
        > 
          <div 
            className=" 
              flex 
              items-start 
              justify-between 
              gap-4 
            " 
          > 
 
            <div> 
              <DialogTitle 
                className=" 
                  text-xl 
                  font-semibold 
                  uppercase 
                " 
              > 
                {profile?.name ?? 
                  "Employee detail"} 
              </DialogTitle> 
 
              <DialogDescription> 
                {headTL 
                  ? "Head Team Leader · Team performance" 
                  : teamLeader 
                    ? "Team Leader · Employee and team performance" 
                    : "Employee information and performance history"} 
              </DialogDescription> 
            </div> 
 
            <Badge 
              variant="secondary" 
              className="shrink-0" 
            > 
              {profile?.designation ?? 
                "Employee"} 
            </Badge> 
 
          </div> 
        </DialogHeader> 
 
 
        {/* ================================================== 
            LOADING 
            ================================================== */} 
 
        {detailQ.isLoading && ( 
          <div className="space-y-4 px-6 py-6"> 
            <Skeleton className="h-28 w-full" /> 
            <Skeleton className="h-40 w-full" /> 
            <Skeleton className="h-52 w-full" /> 
          </div> 
        )} 
 
 
        {/* ================================================== 
            ERROR 
            ================================================== */} 
 
        {detailQ.isError && ( 
          <div className="px-6 py-6"> 
            <p className="text-sm text-destructive"> 
              Failed to load employee details:{" "} 
              {detailQ.error instanceof Error 
                ? detailQ.error.message 
                : String( 
                    detailQ.error 
                  )} 
            </p> 
          </div> 
        )} 
 
 
        {/* ================================================== 
            MAIN CONTENT 
            ================================================== */} 
 
        {detailQ.data && 
          profile && ( 
            <div className="space-y-7 px-6 py-6"> 
 
              {headTL ? ( 
                <HeadTeamLeaderView 
                  profile={profile} 
                  directReports={ 
                    directReports 
                  } 
                  teamEmployees={ 
                    teamEmployees 
                  } 
                  teamSummary={ 
                    teamSummary 
                  } 
                  directTeamPerformance={ 
                    directTeamPerformance 
                  } 
                  teamMonth={ 
                    teamMonth 
                  } 
                  performanceLoading={ 
                    performanceQ.isLoading 
                  } 
                /> 
              ) : ( 
                <> 
 
                  <EmployeeDetailsSection 
                    profile={profile} 
                    onEdit={() => 
                      setEditing( 
                        (value) => 
                          !value 
                      ) 
                    } 
                    canEdit={ 
                      !!user && 
                      ( 
                        user.role === 
                          "super_admin" || 
                        user.role === 
                          "admin" 
                      ) 
                    } 
                  /> 
 
 
                  {editing && ( 
                    <EditForm 
                      employeeId={ 
                        employeeId! 
                      } 
                      initial={ 
                        profile 
                      } 
                      onDone={() => { 
                        setEditing( 
                          false 
                        ); 
                      }} 
                    /> 
                  )} 
 
 
                  {teamLeader && ( 
                    <TeamSection 
                      profile={ 
                        profile 
                      } 
                      directReports={ 
                        directReports 
                      } 
                      teamEmployees={ 
                        teamEmployees 
                      } 
                      teamSummary={ 
                        teamSummary 
                      } 
                      directTeamPerformance={ 
                        directTeamPerformance 
                      } 
                      teamMonth={ 
                        teamMonth 
                      } 
                      performanceLoading={ 
                        performanceQ.isLoading 
                      } 
                    /> 
                  )} 
 
 
                  <EmployeeCurrentMonth 
                    performance={ 
                      currentPerformance 
                    } 
                  /> 
 
 
                  <EmployeePreviousMonth 
                    performance={ 
                      previousPerformance 
                    } 
                  /> 
 
                </> 
              )} 
 
            </div> 
          )} 
      </DialogContent> 
    </Dialog> 
  ); 
} 
 
 
/* ============================================================ 
   EMPLOYEE DETAILS 
   ============================================================ */ 
 
function EmployeeDetailsSection({ 
  profile, 
  onEdit, 
  canEdit, 
}: { 
  profile: SheetEmployee; 
  onEdit: () => void; 
  canEdit: boolean; 
}) { 
  return ( 
    <Card> 
      <CardHeader> 
        <div 
          className=" 
            flex 
            items-start 
            justify-between 
            gap-4 
          " 
        > 
          <div> 
            <CardTitle> 
              Employee Details 
            </CardTitle> 
 
            <CardDescription> 
              Basic information from the employee master. 
            </CardDescription> 
          </div> 
 
          {canEdit && ( 
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onEdit} 
            > 
              <Pencil className="mr-2 size-4" /> 
              Edit details 
            </Button> 
          )} 
        </div> 
      </CardHeader> 
 
      <CardContent> 
        <div 
          className=" 
            grid 
            overflow-hidden 
            rounded-xl 
            border 
            sm:grid-cols-2 
            lg:grid-cols-4 
          " 
        > 
          <InfoCell 
            label="Employee ID" 
            value={ 
              profile.employeeId 
            } 
          /> 
 
          <InfoCell 
            label="Name" 
            value={ 
              profile.name 
            } 
          /> 
 
          <InfoCell 
            label="Email" 
            value={ 
              profile.email 
            } 
          /> 
 
          <InfoCell 
            label="Joining Date" 
            value={ 
              formatJoiningDate( 
                profile.joiningDate 
              ) 
            } 
          /> 
        </div> 
 
 
        <div className="mt-5"> 
          <div className="mb-3"> 
            <p className="text-sm font-semibold"> 
              Team & Reporting 
            </p> 
 
            <p className="text-xs text-muted-foreground"> 
              Where this employee sits in the organization. 
            </p> 
          </div> 
 
          <div 
            className=" 
              grid 
              gap-3 
              sm:grid-cols-2 
              lg:grid-cols-4 
            " 
          > 
            <InfoCell 
              label="Team Lead" 
              value={ 
                profile.teamLead 
              } 
            /> 
 
            <InfoCell 
              label="Department" 
              value={ 
                profile.department 
              } 
            /> 
 
            <InfoCell 
              label="Designation" 
              value={ 
                profile.designation 
              } 
            /> 
 
            <InfoCell 
              label="Location" 
              value={ 
                profile.location 
              } 
            /> 
          </div> 
        </div> 
      </CardContent> 
    </Card> 
  ); 
} 
 
 
function InfoCell({ 
  label, 
  value, 
}: { 
  label: string; 
  value?: unknown; 
}) { 
  return ( 
    <div className="border-b border-r p-4 last:border-r-0"> 
      <div 
        className=" 
          text-[10px] 
          font-medium 
          uppercase 
          tracking-wider 
          text-muted-foreground 
        " 
      > 
        {label} 
      </div> 
 
      <div className="mt-1 text-sm font-semibold"> 
        {String( 
          value ?? "" 
        ).trim() || "—"} 
      </div> 
    </div> 
  ); 
} 
 
 
/* ============================================================ 
   HEAD TEAM LEADER VIEW 
   ============================================================ */ 
 
function HeadTeamLeaderView({ 
  profile, 
  directReports, 
  teamEmployees, 
  teamSummary, 
  directTeamPerformance, 
  teamMonth, 
  performanceLoading, 
}: { 
  profile: SheetEmployee; 
  directReports: SheetEmployee[]; 
  teamEmployees: SheetEmployee[]; 
  teamSummary: TeamSummary | null; 
  directTeamPerformance: TeamMemberPerformance[]; 
  teamMonth: string; 
  performanceLoading: boolean; 
}) { 
  return ( 
    <div className="space-y-6"> 
 
      <Card> 
        <CardContent className="p-6"> 
          <div 
            className=" 
              flex 
              flex-col 
              gap-2 
              sm:flex-row 
              sm:items-center 
              sm:justify-between 
            " 
          > 
            <div> 
              <p 
                className=" 
                  text-xs 
                  font-semibold 
                  uppercase 
                  tracking-wider 
                  text-muted-foreground 
                " 
              > 
                Head Team Leader 
              </p> 
 
              <h2 className="mt-1 text-xl font-bold"> 
                {profile.name} 
              </h2> 
            </div> 
 
            <Badge variant="secondary"> 
              {teamEmployees.length} people 
            </Badge> 
          </div> 
        </CardContent> 
      </Card> 
 
 
      <TeamSection 
        profile={profile} 
        directReports={directReports} 
        teamEmployees={teamEmployees} 
        teamSummary={teamSummary} 
        directTeamPerformance={ 
          directTeamPerformance 
        } 
        teamMonth={teamMonth} 
        performanceLoading={ 
          performanceLoading 
        } 
        headView 
      /> 
 
    </div> 
  ); 
} 
 
 
/* ============================================================ 
   TEAM SECTION 
   ============================================================ */ 
 
interface TeamSummary { 
  people: number; 
  employeesWithPerformance: number; 
 
  productionActual: number; 
  productionTarget: number; 
 
  ticketActual: number; 
  ticketTarget: number; 
 
  errorActual: number; 
  errorTarget: number; 
 
  attendance: number; 
  behavior: number; 
 
  overall: number; 
} 
 
 
interface TeamMemberPerformance { 
  employee: SheetEmployee; 
  performance: SheetPerformance | null; 
} 
 
 
function TeamSection({ 
  profile, 
  directReports, 
  teamEmployees, 
  teamSummary, 
  directTeamPerformance, 
  teamMonth, 
  performanceLoading, 
  headView = false, 
}: { 
  profile: SheetEmployee; 
  directReports: SheetEmployee[]; 
  teamEmployees: SheetEmployee[]; 
  teamSummary: TeamSummary | null; 
  directTeamPerformance: TeamMemberPerformance[]; 
  teamMonth: string; 
  performanceLoading: boolean; 
  headView?: boolean; 
}) { 
  return ( 
    <Card> 
      <CardHeader> 
        <div 
          className=" 
            flex 
            flex-col 
            gap-3 
            sm:flex-row 
            sm:items-start 
            sm:justify-between 
          " 
        > 
          <div> 
            <CardTitle> 
              {headView 
                ? "Team Overall Performance" 
                : "Team"} 
            </CardTitle> 
 
            <CardDescription> 
              {headView 
                ? `TLs reporting to ${profile.name} and their team performance.` 
                : `Employees reporting to ${profile.name}.`} 
            </CardDescription> 
          </div> 
 
          <Badge variant="outline"> 
            {monthToLabel( 
              teamMonth 
            )} 
          </Badge> 
        </div> 
      </CardHeader> 
 
 
      <CardContent className="space-y-6"> 
 
        {/* ================================================= 
            TEAM KPI SUMMARY 
            ================================================= */} 
 
        {performanceLoading ? ( 
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"> 
            {Array.from({ 
              length: 6, 
            }).map((_, index) => ( 
              <Skeleton 
                key={index} 
                className="h-24 w-full" 
              /> 
            ))} 
          </div> 
        ) : teamSummary ? ( 
          <> 
 
            <div 
              className=" 
                grid 
                gap-3 
                sm:grid-cols-2 
                lg:grid-cols-3 
                xl:grid-cols-6 
              " 
            > 
 
              <TeamMetricCard 
                icon={ 
                  <Users className="size-4" /> 
                } 
                label="People" 
                value={ 
                  teamSummary.people 
                } 
                suffix="" 
              /> 
 
 
              <TeamMetricCard 
                icon={ 
                  <TrendingUp className="size-4" /> 
                } 
                label="Production" 
                value={ 
                  teamSummary.productionActual 
                } 
                secondaryValue={ 
                  teamSummary.productionTarget 
                } 
                suffix="" 
              /> 
 
 
              <TeamMetricCard 
                icon={ 
                  <Ticket className="size-4" /> 
                } 
                label="Tickets" 
                value={ 
                  teamSummary.ticketActual 
                } 
                secondaryValue={ 
                  teamSummary.ticketTarget 
                } 
                suffix="" 
              /> 
 
 
              <TeamMetricCard 
                icon={ 
                  <ShieldCheck className="size-4" /> 
                } 
                label="Quality" 
                value={ 
                  teamSummary.errorActual 
                } 
                secondaryValue={ 
                  teamSummary.errorTarget 
                } 
                suffix="" 
              /> 
 
 
              <TeamMetricCard 
                icon={ 
                  <CalendarCheck className="size-4" /> 
                } 
                label="Attendance" 
                value={ 
                  teamSummary.attendance 
                } 
                secondaryValue={10} 
                suffix="" 
                decimals 
              /> 
 
 
              <TeamMetricCard 
                icon={ 
                  <Brain className="size-4" /> 
                } 
                label="Behavior" 
                value={ 
                  teamSummary.behavior 
                } 
                secondaryValue={5} 
                suffix="" 
                decimals 
              /> 
 
            </div> 
 
 
            {/* ================================================= 
                OVERALL TEAM PERFORMANCE 
                ================================================= */} 
 
            <div 
              className=" 
                rounded-xl 
                border 
                bg-muted/20 
                p-5 
              " 
            > 
 
              <div className="mb-5"> 
                <p className="text-sm font-semibold"> 
                  Overall Team Performance 
                </p> 
 
                <p className="text-xs text-muted-foreground"> 
                  {monthToLabel( 
                    teamMonth 
                  )} 
                </p> 
              </div> 
 
 
              <div className="space-y-4"> 
 
                <ActualTargetRow 
                  label="Production" 
                  actual={ 
                    teamSummary.productionActual 
                  } 
                  target={ 
                    teamSummary.productionTarget 
                  } 
                /> 
 
 
                <ActualTargetRow 
                  label="Tickets" 
                  actual={ 
                    teamSummary.ticketActual 
                  } 
                  target={ 
                    teamSummary.ticketTarget 
                  } 
                /> 
 
 
                <ActualTargetRow 
                  label="Quality" 
                  actual={ 
                    teamSummary.errorActual 
                  } 
                  target={ 
                    teamSummary.errorTarget 
                  } 
                /> 
 
 
                <ActualTargetRow 
                  label="Attendance" 
                  actual={ 
                    teamSummary.attendance 
                  } 
                  target={10} 
                  decimals 
                /> 
 
 
                <ActualTargetRow 
                  label="Behavior" 
                  actual={ 
                    teamSummary.behavior 
                  } 
                  target={5} 
                  decimals 
                /> 
 
              </div> 
 
 
              <div 
                className=" 
                  mt-6 
                  border-t 
                  pt-5 
                  text-center 
                " 
              > 
                <p className="text-xs uppercase tracking-wider text-muted-foreground"> 
                  Overall 
                </p> 
 
                <p className="mt-1 text-3xl font-bold"> 
                  {Math.round( 
                    teamSummary.overall 
                  )} 
                </p> 
 
                <p className="text-xs font-medium text-muted-foreground"> 
                  {overallLabel( 
                    teamSummary.overall 
                  )} 
                </p> 
              </div> 
 
            </div> 
 
          </> 
        ) : ( 
          <div 
            className=" 
              rounded-xl 
              border 
              border-dashed 
              p-6 
              text-center 
            " 
          > 
            <p className="text-sm font-medium"> 
              No team performance data available. 
            </p> 
 
            <p className="mt-1 text-xs text-muted-foreground"> 
              No monthly performance records were found for{" "} 
              {monthToLabel( 
                teamMonth 
              )} 
              . 
            </p> 
          </div> 
        )} 
 
 
        {/* ================================================= 
            DIRECT REPORTS 
            ================================================= */} 
 
        <div> 
          <div className="mb-3"> 
            <p className="text-sm font-semibold"> 
              {headView 
                ? "Team Leaders Under This Head TL" 
                : "Team Members"} 
            </p> 
 
            <p className="text-xs text-muted-foreground"> 
              {headView 
                ? "Only the Team Leaders directly reporting to this Head TL are shown here." 
                : "Only employees directly reporting to this Team Leader are shown here."} 
            </p> 
          </div> 
 
 
          {directTeamPerformance.length === 0 ? ( 
            <div 
              className=" 
                rounded-xl 
                border 
                border-dashed 
                p-6 
                text-center 
              " 
            > 
              <p className="text-sm text-muted-foreground"> 
                No direct team members found. 
              </p> 
            </div> 
          ) : ( 
            <div className="overflow-x-auto rounded-xl border"> 
 
              <Table> 
 
                <TableHeader> 
                  <TableRow> 
 
                    <TableHead> 
                      Name 
                    </TableHead> 
 
                    <TableHead> 
                      Designation 
                    </TableHead> 
 
                    <TableHead> 
                      Production 
                    </TableHead> 
 
                    <TableHead> 
                      Tickets 
                    </TableHead> 
 
                    <TableHead> 
                      Quality 
                    </TableHead> 
 
                    <TableHead> 
                      Attendance 
                    </TableHead> 
 
                    <TableHead> 
                      Behavior 
                    </TableHead> 
 
                    <TableHead> 
                      Overall 
                    </TableHead> 
 
                  </TableRow> 
                </TableHeader> 
 
 
                <TableBody> 
 
                  {directTeamPerformance.map( 
                    ({ 
                      employee, 
                      performance, 
                    }) => { 
 
                      const overall = 
                        overallPercent( 
                          performance 
                        ); 
 
 
                      return ( 
                        <TableRow 
                          key={ 
                            employee.employeeId 
                          } 
                        > 
 
                          <TableCell className="font-medium"> 
                            {employee.name} 
                          </TableCell> 
 
 
                          <TableCell> 
                            {employee.designation || 
                              "—"} 
                          </TableCell> 
 
 
                          <TableCell> 
                            {performance 
                              ? `${safeNumber( 
                                  performance.productionActual 
                                )} / ${safeNumber( 
                                  performance.productionTarget 
                                )}` 
                              : "—"} 
                          </TableCell> 
 
 
                          <TableCell> 
                            {performance 
                              ? `${safeNumber( 
                                  performance.ticketActual 
                                )} / ${safeNumber( 
                                  performance.ticketTarget 
                                )}` 
                              : "—"} 
                          </TableCell> 
 
 
                          <TableCell> 
                            {performance 
                              ? `${safeNumber( 
                                  performance.errorActual 
                                )} / ${safeNumber( 
                                  performance.errorTarget 
                                )}` 
                              : "—"} 
                          </TableCell> 
 
 
                          <TableCell> 
                            {performance 
                              ? `${safeNumber( 
                                  performance.attendance 
                                ).toFixed( 
                                  1 
                                )}/10` 
                              : "—"} 
                          </TableCell> 
 
 
                          <TableCell> 
                            {performance 
                              ? `${safeNumber( 
                                  performance.behavior 
                                ).toFixed( 
                                  1 
                                )}/5` 
                              : "—"} 
                          </TableCell> 
 
 
                          <TableCell> 
                            {performance 
                              ? Math.round( 
                                  overall 
                                ) 
                              : "—"} 
                          </TableCell> 
 
                        </TableRow> 
                      ); 
                    } 
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
 
 
/* ============================================================ 
   TEAM METRIC CARD 
   ============================================================ */ 
 
function TeamMetricCard({ 
  icon, 
  label, 
  value, 
  secondaryValue, 
  suffix, 
  decimals = false, 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  secondaryValue?: number; 
  suffix: string; 
  decimals?: boolean; 
}) { 
 
  const formatValue = ( 
    number: number 
  ) => { 
    if (decimals) { 
      return number.toFixed(1); 
    } 
 
    return Math.round(number); 
  }; 
 
 
  return ( 
    <div 
      className=" 
        rounded-xl 
        border 
        bg-background 
        p-4 
      " 
    > 
 
      <div 
        className=" 
          flex 
          items-center 
          gap-2 
          text-xs 
          font-medium 
          uppercase 
          tracking-wide 
          text-muted-foreground 
        " 
      > 
        {icon} 
        {label} 
      </div> 
 
 
      <div className="mt-2 text-2xl font-bold"> 
 
        {formatValue(value)} 
 
        {secondaryValue !== undefined && ( 
          <> 
            {" / "} 
            {formatValue( 
              secondaryValue 
            )} 
          </> 
        )} 
 
        {suffix} 
 
      </div> 
 
    </div> 
  ); 
} 
 
 
/* ============================================================ 
   ACTUAL / TARGET ROW 
   ============================================================ */ 
 
function ActualTargetRow({ 
  label, 
  actual, 
  target, 
  decimals = false, 
}: { 
  label: string; 
  actual: number; 
  target: number; 
  decimals?: boolean; 
}) { 
 
  const formatValue = ( 
    value: number 
  ) => { 
    return decimals 
      ? value.toFixed(1) 
      : Math.round(value); 
  }; 
 
 
  const progressValue = 
    target > 0 
      ? Math.min( 
          100, 
          Math.max( 
            0, 
            ( 
              actual / 
              target 
            ) * 100 
          ) 
        ) 
      : 0; 
 
 
  return ( 
    <div> 
 
      <div 
        className=" 
          mb-1.5 
          flex 
          items-center 
          justify-between 
          text-sm 
        " 
      > 
 
        <span className="font-medium"> 
          {label} 
        </span> 
 
 
        <span className="font-semibold"> 
          {formatValue(actual)} 
          {" / "} 
          {formatValue(target)} 
        </span> 
 
      </div> 
 
 
      <Progress 
        value={ 
          progressValue 
        } 
      /> 
 
    </div> 
  ); 
} 
 
 
/* ============================================================ 
   CURRENT MONTH 
   ============================================================ */ 
 
function EmployeeCurrentMonth({ 
  performance, 
}: { 
  performance: SheetPerformance | null; 
}) { 
  return ( 
    <Card> 
 
      <CardHeader> 
 
        <div 
          className=" 
            flex 
            items-start 
            justify-between 
            gap-4 
          " 
        > 
 
          <div> 
 
            <CardTitle> 
              Current Month 
            </CardTitle> 
 
            <CardDescription> 
              Live performance snapshot. 
            </CardDescription> 
 
          </div> 
 
 
          {performance && ( 
            <Badge variant="secondary"> 
              {monthToLabel( 
                performance.month 
              )} 
            </Badge> 
          )} 
 
        </div> 
 
      </CardHeader> 
 
 
      <CardContent> 
 
        {!performance ? ( 
          <div 
            className=" 
              rounded-xl 
              border 
              border-dashed 
              p-6 
              text-center 
            " 
          > 
 
            <p className="text-sm font-medium"> 
              No performance data for the current month. 
            </p> 
 
            <p className="mt-1 text-xs text-muted-foreground"> 
              Monthly performance has not been uploaded yet. 
            </p> 
 
          </div> 
        ) : ( 
 
          <div className="space-y-6"> 
 
            <div 
              className=" 
                grid 
                gap-3 
                sm:grid-cols-2 
                lg:grid-cols-4 
              " 
            > 
 
              <PerformanceStat 
                label="Production" 
                value={`${safeNumber( 
                  performance.productionActual 
                )} / ${safeNumber( 
                  performance.productionTarget 
                )}`} 
                helper="Actual / Target" 
                icon={ 
                  <TrendingUp className="size-4" /> 
                } 
              /> 
 
 
              <PerformanceStat 
                label="Tickets" 
                value={`${safeNumber( 
                  performance.ticketActual 
                )} / ${safeNumber( 
                  performance.ticketTarget 
                )}`} 
                helper="Actual / Target" 
                icon={ 
                  <Ticket className="size-4" /> 
                } 
              /> 
 
 
              <PerformanceStat 
                label="Errors / Rejection" 
                value={`${safeNumber( 
                  performance.errorActual 
                )} / ${safeNumber( 
                  performance.errorTarget 
                )}`} 
                helper="Actual / Target" 
                icon={ 
                  <ShieldCheck className="size-4" /> 
                } 
              /> 
 
 
              <PerformanceStat 
                label="Attendance" 
                value={`${safeNumber( 
                  performance.attendance 
                ).toFixed(1)} / 10`} 
                helper="Actual / Maximum" 
                icon={ 
                  <CalendarCheck className="size-4" /> 
                } 
              /> 
 
            </div> 
 
 
            <div 
              className=" 
                grid 
                gap-3 
                sm:grid-cols-2 
              " 
            > 
 
              <PerformanceStat 
                label="Behavior" 
                value={`${safeNumber( 
                  performance.behavior 
                ).toFixed(1)} / 5`} 
                helper="Actual / Maximum" 
                icon={ 
                  <Brain className="size-4" /> 
                } 
              /> 
 
 
              <PerformanceStat 
                label="Overall" 
                value={`${Math.round( 
                  overallPercent( 
                    performance 
                  ) 
                )}`} 
                helper={ 
                  overallLabel( 
                    overallPercent( 
                      performance 
                    ) 
                  ) 
                } 
                icon={ 
                  <TrendingUp className="size-4" /> 
                } 
              /> 
 
            </div> 
 
 
            <div> 
 
              <p className="text-sm font-semibold"> 
                Manager Remarks 
              </p> 
 
              <p 
                className=" 
                  mt-2 
                  rounded-xl 
                  border 
                  bg-muted/30 
                  p-4 
                  text-sm 
                  text-muted-foreground 
                " 
              > 
                {performance.managerRemarks || 
                  "No manager remarks added."} 
              </p> 
 
            </div> 
 
          </div> 
 
        )} 
 
      </CardContent> 
 
    </Card> 
  ); 
} 
 
 
/* ============================================================ 
   PERFORMANCE STAT 
   ============================================================ */ 
 
function PerformanceStat({ 
  label, 
  value, 
  helper, 
  icon, 
}: { 
  label: string; 
  value: string; 
  helper: string; 
  icon: React.ReactNode; 
}) { 
  return ( 
    <div 
      className=" 
        rounded-xl 
        border 
        p-4 
      " 
    > 
 
      <div 
        className=" 
          flex 
          items-center 
          gap-2 
          text-xs 
          font-medium 
          uppercase 
          tracking-wide 
          text-muted-foreground 
        " 
      > 
        {icon} 
        {label} 
      </div> 
 
 
      <div className="mt-2 text-lg font-bold"> 
        {value} 
      </div> 
 
 
      <div className="mt-1 text-xs text-muted-foreground"> 
        {helper} 
      </div> 
 
    </div> 
  ); 
} 
 
 
/* ============================================================ 
   PREVIOUS MONTH 
   ============================================================ */ 
 
function EmployeePreviousMonth({ 
  performance, 
}: { 
  performance: SheetPerformance | null; 
}) { 
  return ( 
    <Card> 
 
      <CardHeader> 
 
        <div 
          className=" 
            flex 
            items-start 
            justify-between 
            gap-4 
          " 
        > 
 
          <div> 
 
            <CardTitle> 
              Previous Month 
            </CardTitle> 
 
            <CardDescription> 
              Latest completed monthly performance. 
            </CardDescription> 
 
          </div> 
 
 
          {performance && ( 
            <Badge variant="outline"> 
              {monthToLabel( 
                performance.month 
              )} 
            </Badge> 
          )} 
 
        </div> 
 
      </CardHeader> 
 
 
      <CardContent> 
 
        {!performance ? ( 
 
          <div 
            className=" 
              rounded-xl 
              border 
              border-dashed 
              p-6 
              text-center 
            " 
          > 
 
            <p className="text-sm text-muted-foreground"> 
              No previous month performance available. 
            </p> 
 
          </div> 
 
        ) : ( 
 
          <div className="space-y-5"> 
 
            <div 
              className=" 
                grid 
                gap-3 
                sm:grid-cols-2 
                lg:grid-cols-5 
              " 
            > 
 
              <MiniMetric 
                label="Production" 
                value={`${safeNumber( 
                  performance.productionActual 
                )} / ${safeNumber( 
                  performance.productionTarget 
                )}`} 
              /> 
 
 
              <MiniMetric 
                label="Tickets" 
                value={`${safeNumber( 
                  performance.ticketActual 
                )} / ${safeNumber( 
                  performance.ticketTarget 
                )}`} 
              /> 
 
 
              <MiniMetric 
                label="Quality" 
                value={`${safeNumber( 
                  performance.errorActual 
                )} / ${safeNumber( 
                  performance.errorTarget 
                )}`} 
              /> 
 
 
              <MiniMetric 
                label="Attendance" 
                value={`${safeNumber( 
                  performance.attendance 
                ).toFixed(1)} / 10`} 
              /> 
 
 
              <MiniMetric 
                label="Behavior" 
                value={`${safeNumber( 
                  performance.behavior 
                ).toFixed(1)} / 5`} 
              /> 
 
            </div> 
 
 
            <div 
              className=" 
                rounded-xl 
                border 
                bg-muted/20 
                p-4 
              " 
            > 
 
              <div className="flex items-center justify-between"> 
 
                <span className="text-sm font-medium"> 
                  Overall 
                </span> 
 
 
                <span className="text-lg font-bold"> 
                  {Math.round( 
                    overallPercent( 
                      performance 
                    ) 
                  )} 
                </span> 
 
              </div> 
 
 
              <Progress 
                className="mt-3" 
                value={Math.min( 
                  100, 
                  Math.max( 
                    0, 
                    overallPercent( 
                      performance 
                    ) 
                  ) 
                )} 
              /> 
 
            </div> 
 
          </div> 
 
        )} 
 
      </CardContent> 
 
    </Card> 
  ); 
} 
 
 
function MiniMetric({ 
  label, 
  value, 
}: { 
  label: string; 
  value: string; 
}) { 
  return ( 
    <div className="rounded-xl border p-4"> 
 
      <p className="text-xs text-muted-foreground"> 
        {label} 
      </p> 
 
      <p className="mt-1 text-lg font-bold"> 
        {value} 
      </p> 
 
    </div> 
  ); 
} 
 
 
/* ============================================================ 
   OVERALL LABEL 
   ============================================================ */ 
 
function overallLabel( 
  value: number 
): string { 
 
  if (value >= 95) { 
    return "Excellent"; 
  } 
 
  if (value >= 85) { 
    return "Very Good"; 
  } 
 
  if (value >= 75) { 
    return "Good"; 
  } 
 
  if (value >= 60) { 
    return "Needs Improvement"; 
  } 
 
  return "Poor"; 
} 
 
 
/* ============================================================ 
   EDIT FORM 
   ============================================================ */ 
 
function EditForm({ 
  employeeId, 
  initial, 
  onDone, 
}: { 
  employeeId: string; 
  initial: EmployeeProfile; 
  onDone: () => void; 
}) { 
  const { user } = 
    useAuth(); 
 
  const qc = 
    useQueryClient(); 
 
 
  const deptQ = 
    useQuery({ 
      queryKey: [ 
        "departments", 
      ], 
      queryFn: 
        listDepartments, 
    }); 
 
 
  const desigQ = 
    useQuery({ 
      queryKey: [ 
        "designations", 
      ], 
      queryFn: 
        listDesignations, 
    }); 
 
 
  const locQ = 
    useQuery({ 
      queryKey: [ 
        "locations", 
      ], 
      queryFn: 
        listLocations, 
    }); 
 
 
  const leadQ = 
    useQuery({ 
      queryKey: [ 
        "teamLeads", 
      ], 
      queryFn: 
        listTeamLeads, 
    }); 
 
 
  const [ 
    updatedEmployeeId, 
    setUpdatedEmployeeId, 
  ] = useState( 
    initial.employeeId ?? 
      employeeId 
  ); 
 
 
  const [ 
    email, 
    setEmail, 
  ] = useState( 
    initial.email ?? 
      "" 
  ); 
 
 
  const [ 
    department, 
    setDepartment, 
  ] = useState( 
    initial.department ?? 
      "" 
  ); 
 
 
  const [ 
    designation, 
    setDesignation, 
  ] = useState( 
    initial.designation ?? 
      "" 
  ); 
 
 
  const [ 
    teamLead, 
    setTeamLead, 
  ] = useState( 
    initial.teamLead ?? 
      "" 
  ); 
 
 
  const [ 
    location, 
    setLocation, 
  ] = useState( 
    initial.location ?? 
      "" 
  ); 
 
 
  const [ 
    joiningDate, 
    setJoiningDate, 
  ] = useState( 
    initial.joiningDate 
      ? String( 
          initial.joiningDate 
        ).slice(0, 10) 
      : "" 
  ); 
 
 
  const mutation = 
    useMutation({ 
      mutationFn: () => 
        adminUpdateEmployee( 
          user!.email, 
          employeeId, 
          { 
            ...(user?.role === 
            "super_admin" 
              ? { 
                  employeeId: 
                    updatedEmployeeId, 
                  email, 
                } 
              : {}), 
 
            department, 
            designation, 
            teamLead, 
            location, 
            joiningDate, 
          } 
        ), 
 
      onSuccess: 
        async () => { 
          await Promise.all([ 
            qc.refetchQueries({ 
              queryKey: [ 
                "employeeDetail", 
                employeeId, 
              ], 
            }), 
 
            qc.refetchQueries({ 
              queryKey: [ 
                "employees", 
              ], 
            }), 
 
            qc.refetchQueries({ 
              queryKey: [ 
                "performance", 
              ], 
            }), 
 
            qc.refetchQueries({ 
              queryKey: [ 
                "teamLeads", 
              ], 
            }), 
          ]); 
 
          toast.success( 
            "Employee updated" 
          ); 
 
          onDone(); 
        }, 
 
      onError: (error) => { 
        toast.error( 
          "Update failed", 
          { 
            description: 
              error instanceof Error 
                ? error.message 
                : String( 
                    error 
                  ), 
          } 
        ); 
      }, 
    }); 
 
 
  function handleSubmit( 
    event: FormEvent<HTMLFormElement> 
  ) { 
    event.preventDefault(); 
 
    if (!user) { 
      toast.error( 
        "User session not found" 
      ); 
 
      return; 
    } 
 
    mutation.mutate(); 
  } 
 
 
  return ( 
    <Card> 
 
      <CardHeader> 
 
        <CardTitle> 
          Edit Employee 
        </CardTitle> 
 
        <CardDescription> 
          Update employee master information. 
        </CardDescription> 
 
      </CardHeader> 
 
 
      <CardContent> 
 
        <form 
          className=" 
            grid 
            gap-4 
            sm:grid-cols-2 
          " 
          onSubmit={ 
            handleSubmit 
          } 
        > 
 
          {user?.role === 
            "super_admin" && ( 
            <> 
 
              <div className="space-y-1.5"> 
 
                <label 
                  className="text-sm font-medium" 
                  htmlFor="edit-employee-id" 
                > 
                  Employee ID 
                </label> 
 
                <Input 
                  id="edit-employee-id" 
                  value={ 
                    updatedEmployeeId 
                  } 
                  onChange={(event) => 
                    setUpdatedEmployeeId( 
                      event.target.value 
                    ) 
                  } 
                  required 
                /> 
 
              </div> 
 
 
              <div className="space-y-1.5"> 
 
                <label 
                  className="text-sm font-medium" 
                  htmlFor="edit-email" 
                > 
                  Email 
                </label> 
 
                <Input 
                  id="edit-email" 
                  type="email" 
                  value={ 
                    email 
                  } 
                  onChange={(event) => 
                    setEmail( 
                      event.target.value 
                    ) 
                  } 
                  required 
                /> 
 
              </div> 
 
            </> 
          )} 
 
 
          <Picker 
            label="Department" 
            value={ 
              department 
            } 
            onChange={ 
              setDepartment 
            } 
            options={ 
              deptQ.data ?? 
              [] 
            } 
          /> 
 
 
          <Picker 
            label="Designation" 
            value={ 
              designation 
            } 
            onChange={ 
              setDesignation 
            } 
            options={ 
              desigQ.data ?? 
              [] 
            } 
          /> 
 
 
          <Picker 
            label="Team Lead" 
            value={ 
              teamLead 
            } 
            onChange={ 
              setTeamLead 
            } 
            options={ 
              leadQ.data ?? 
              [] 
            } 
          /> 
 
 
          <Picker 
            label="Location" 
            value={ 
              location 
            } 
            onChange={ 
              setLocation 
            } 
            options={ 
              locQ.data ?? 
              [] 
            } 
          /> 
 
 
          <div className="space-y-1.5"> 
 
            <label 
              className="text-sm font-medium" 
              htmlFor="edit-joining" 
            > 
              Joining Date 
            </label> 
 
            <Input 
              id="edit-joining" 
              type="date" 
              value={ 
                joiningDate 
              } 
              onChange={(event) => 
                setJoiningDate( 
                  event.target.value 
                ) 
              } 
            /> 
 
          </div> 
 
 
          <div 
            className=" 
              flex 
              items-end 
              justify-end 
              gap-2 
              sm:col-span-2 
            " 
          > 
 
            <Button 
              type="button" 
              variant="outline" 
              onClick={ 
                onDone 
              } 
            > 
              Cancel 
            </Button> 
 
 
            <Button 
              type="submit" 
              disabled={ 
                mutation.isPending 
              } 
            > 
              {mutation.isPending 
                ? "Saving…" 
                : "Save changes"} 
            </Button> 
 
          </div> 
 
        </form> 
 
      </CardContent> 
 
    </Card> 
  ); 
} 
 
 
/* ============================================================ 
   PICKER 
   ============================================================ */ 
 
function Picker({ 
  label, 
  value, 
  onChange, 
  options, 
}: { 
  label: string; 
  value: string; 
  onChange: ( 
    value: string 
  ) => void; 
  options: string[]; 
}) { 
 
  const uniqueOptions = 
    Array.from( 
      new Set( 
        ( 
          options ?? 
          [] 
        ) 
          .map((option) => 
            String( 
              option 
            ).trim() 
          ) 
          .filter(Boolean) 
      ) 
    ); 
 
 
  return ( 
    <div className="space-y-1.5"> 
 
      <label className="text-sm font-medium"> 
        {label} 
      </label> 
 
 
      <Select 
        value={ 
          value 
        } 
        onValueChange={ 
          onChange 
        } 
      > 
 
        <SelectTrigger> 
          <SelectValue 
            placeholder={`Select ${label.toLowerCase()}`} 
          /> 
        </SelectTrigger> 
 
 
        <SelectContent> 
 
          {uniqueOptions.map( 
            (option) => ( 
              <SelectItem 
                key={option} 
                value={option} 
              > 
                {option} 
              </SelectItem> 
            ) 
          )} 
 
        </SelectContent> 
 
      </Select> 
 
    </div> 
  ); 
} 
 
 
/* ============================================================ 
   DATE 
   ============================================================ */ 
 
function formatJoiningDate( 
  value: unknown 
): string { 
 
  if (!value) { 
    return "—"; 
  } 
 
 
  const date = 
    new Date( 
      String(value) 
    ); 
 
 
  if ( 
    Number.isNaN( 
      date.getTime() 
    ) 
  ) { 
    return String( 
      value 
    ); 
  } 
 
 
  return date.toLocaleDateString( 
    "en-GB" 
  ); 
}
