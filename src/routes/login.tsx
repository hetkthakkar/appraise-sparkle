import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/mock-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — Appraise" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, signInWithCredential } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

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
        <CardContent className="flex flex-col items-center space-y-4">
          <div className={busy ? "pointer-events-none opacity-60" : ""}>
            <GoogleLogin
              onSuccess={async (resp) => {
                if (!resp.credential) {
                  toast.error("Google did not return a credential");
                  return;
                }
                setBusy(true);
                try {
                  await signInWithCredential(resp.credential);
                  navigate({ to: "/" });
                } catch (e) {
                  toast.error("Sign-in failed", {
                    description: e instanceof Error ? e.message : String(e),
                  });
                } finally {
                  setBusy(false);
                }
              }}
              onError={() => toast.error("Google sign-in was cancelled or failed")}
              useOneTap={false}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            By signing in you agree to the internal usage policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
