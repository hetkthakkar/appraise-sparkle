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
} from "@/lib/sheetsApi";

export const Route = createFileRoute("/_app/admin/lists")({
  component: ManageLists,
});

function ManageLists() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "super_admin") return <Navigate to="/" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Manage Lists</h2>
        <p className="text-sm text-muted-foreground">
          Maintain the lookup values used across the app.
        </p>
      </div>

      <ListSection
        title="Departments"
        description="Options shown when assigning an employee's department."
        queryKey="departments"
        list={listDepartments}
        add={(name) => addDepartment(user.email, name)}
        placeholder="e.g. Operations"
      />
      <ListSection
        title="Designations"
        description="Options shown when assigning an employee's designation."
        queryKey="designations"
        list={listDesignations}
        add={(name) => addDesignation(user.email, name)}
        placeholder="e.g. Senior Analyst"
      />
      <ListSection
        title="Locations"
        description="Options shown when assigning an employee's location."
        queryKey="locations"
        list={listLocations}
        add={(name) => addLocation(user.email, name)}
        placeholder="e.g. Mumbai"
      />
    </div>
  );
}

function ListSection({
  title,
  description,
  queryKey,
  list,
  add,
  placeholder,
}: {
  title: string;
  description: string;
  queryKey: string;
  list: () => Promise<string[]>;
  add: (name: string) => Promise<{ ok: true }>;
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
              <Badge key={item} variant="secondary" className="text-sm">
                {item}
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
