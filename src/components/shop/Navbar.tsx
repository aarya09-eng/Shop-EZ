import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldCheck, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useShopAuth } from "@/hooks/useShopAuth";
import { fetchCart } from "@/lib/cart.functions";

export function Navbar() {
  const { isAuthenticated, isAdmin, user, ready } = useShopAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: cart } = useQuery({
    queryKey: ["cart"],
    queryFn: () => fetchCart(),
    enabled: isAuthenticated,
  });

  const count = (cart ?? []).reduce((sum, line) => sum + line.quantity, 0);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="mr-auto flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">ShopEZ</span>
        </Link>

        {ready && isAdmin && (
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/admin">
              <ShieldCheck className="mr-1.5 h-4 w-4" />
              Admin
            </Link>
          </Button>
        )}

        {isAuthenticated ? (
          <>
            <Button asChild variant="ghost" size="sm">
              <Link to="/cart" className="relative">
                <ShoppingCart className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">Cart</span>
                {count > 0 && (
                  <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
                    {count}
                  </span>
                )}
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/profile">
                <User className="h-4 w-4" />
                <span className="ml-1.5 hidden max-w-28 truncate sm:inline">
                  {user?.email ?? "Account"}
                </span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Sign out</span>
            </Button>
          </>
        ) : (
          <>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/login">Admin</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
