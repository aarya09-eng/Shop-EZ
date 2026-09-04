import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { claimAdminRole, fetchIsAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin sign in — ShopEZ" },
      { name: "description", content: "Staff sign in for the ShopEZ store dashboard." },
      { property: "og:title", content: "Admin sign in — ShopEZ" },
      { property: "og:description", content: "Manage ShopEZ products and orders." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    // The very first signed-in account can claim the admin role.
    await claimAdminRole().catch(() => null);
    const { isAdmin } = await fetchIsAdmin();
    setBusy(false);
    if (!isAdmin) {
      toast.error("This account does not have admin access.");
      return;
    }
    toast.success("Signed in as admin");
    navigate({ to: "/admin" });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-foreground">ShopEZ admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Staff access to manage products and order statuses.
        </p>
      </div>

      <Card className="mt-8">
        <CardContent className="p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Checking access..." : "Sign in to dashboard"}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Shopping instead?{" "}
            <Link to="/auth" className="font-medium text-primary hover:underline">
              Customer sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
