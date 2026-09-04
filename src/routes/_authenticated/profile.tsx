import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchProfile, updateProfile } from "@/lib/admin.functions";
import { fetchMyOrders } from "@/lib/order.functions";
import { formatMoney } from "@/lib/shop-types";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My account & orders — ShopEZ" },
      { name: "description", content: "Manage your ShopEZ delivery details and review past orders." },
      { property: "og:title", content: "My account & orders — ShopEZ" },
      { property: "og:description", content: "Your ShopEZ profile and order history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => fetchMyOrders() });

  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [loaded, setLoaded] = useState(false);

  if (profile && !loaded) {
    setLoaded(true);
    setForm({ name: profile.name, phone: profile.phone, address: profile.address });
  }

  const save = useMutation({
    mutationFn: () => updateProfile({ data: form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">My account</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit">
          <CardContent className="p-5">
            <h2 className="font-semibold text-foreground">Delivery details</h2>
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <div>
                <Label htmlFor="p-name">Full name</Label>
                <Input
                  id="p-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="p-phone">Phone</Label>
                <Input
                  id="p-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="p-address">Default address</Label>
                <Textarea
                  id="p-address"
                  rows={3}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving..." : "Save details"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <section>
          <h2 className="font-semibold text-foreground">Order history</h2>
          {orders.length === 0 ? (
            <Card className="mt-4">
              <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
                <p className="text-muted-foreground">You haven't placed any orders yet.</p>
                <Button asChild>
                  <Link to="/">Start shopping</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-4 space-y-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <Badge variant="secondary">{order.order_status}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                      <span className="ml-auto font-semibold">{formatMoney(order.total_amount)}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {order.items.length} item{order.items.length > 1 ? "s" : ""} · {order.payment_method}
                    </p>
                    <Button asChild variant="outline" size="sm" className="mt-3">
                      <Link to="/order/$orderId" params={{ orderId: order.id }}>
                        View order
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
