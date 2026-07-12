import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Chrome } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/mock-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — Appraise" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" />;

  const handleGoogleSignIn = async () => {
    setBusy(true);
    try {
      const session = await signInWithGoogle();
      if (session) navigate({ to: "/" });
    } catch (e) {
      toast.error("Google sign-in failed", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  };

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
          <Button className="w-full" onClick={handleGoogleSignIn} disabled={busy}>
            <Chrome className="mr-2 h-4 w-4" />
            {busy ? "Signing you in…" : "Continue with Google"}
          </Button>
          {busy && (
            <p className="text-center text-xs text-muted-foreground">Signing you in…</p>
          )}
          <p className="text-center text-xs text-muted-foreground">
            By signing in you agree to the internal usage policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
