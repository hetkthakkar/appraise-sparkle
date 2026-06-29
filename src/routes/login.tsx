import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth, ROLE_LABEL } from "@/lib/mock-auth";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — Appraise" }],
  }),
  component: LoginPage,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.6 14.7 2.6 12 2.6c-5.2 0-9.4 4.2-9.4 9.4S6.8 21.4 12 21.4c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.2-1.6H12z"/>
      <path fill="#34A853" d="M3.5 7.5l3.2 2.3C7.5 8 9.5 6.6 12 6.6c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.6 14.7 2.6 12 2.6 8.2 2.6 4.9 4.6 3.5 7.5z"/>
      <path fill="#FBBC05" d="M12 21.4c2.6 0 4.8-.9 6.4-2.4l-3-2.4c-.8.6-1.9 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1l-3.2 2.5c1.4 2.8 4.6 5.4 8.8 5.4z"/>
      <path fill="#4285F4" d="M21 12.3c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.4-1.1 2.4-2.1 3.1l3 2.4c1.8-1.6 2.6-4 2.6-7.8z"/>
    </svg>
  );
}

function LoginPage() {
  const { users, signInAs, user } = useAuth();
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);

  if (user) return <Navigate to="/" />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-bold">
            EP
          </div>
          <CardTitle className="text-2xl">Welcome to Appraise</CardTitle>
          <CardDescription>
            Sign in with your company Google account to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!picking ? (
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => setPicking(true)}
            >
              <GoogleIcon />
              <span className="ml-2">Sign in with Google</span>
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Demo mode — choose an account to impersonate
              </p>
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    signInAs(u.id);
                    navigate({ to: "/" });
                  }}
                  className="flex w-full items-center justify-between rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{u.name}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {ROLE_LABEL[u.role]}
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              ))}
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setPicking(false)}>
                Cancel
              </Button>
            </div>
          )}
          <p className="text-center text-xs text-muted-foreground">
            By signing in you agree to the internal usage policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
