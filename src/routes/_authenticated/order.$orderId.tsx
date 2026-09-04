import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fetchOrder } from "@/lib/order.functions";
import { formatMoney } from "@/lib/shop-types";

export const Route = createFileRoute("/_authenticated/order/$orderId")({
  head: () => ({
    meta: [
      { title: "Order confirmation — ShopEZ" },
      { name: "description", content: "Your ShopEZ order details and delivery information." },
      { property: "og:title", content: "Order confirmation — ShopEZ" },
      { property: "og:description", content: "Track the status of your ShopEZ order." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { orderId } = Route.useParams();
  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder({ data: { orderId } }),
  });

  if (isLoading) {
    return <p className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground">Loading your order...</p>;
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground">We couldn't find that order</h1>
        <Button asChild className="mt-6">
          <Link to="/profile">Go to my orders</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-accent/60 p-5">
        <CheckCircle2 className="mt-0.5 h-6 w-6 text-success" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Thank you, your order is confirmed!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Order #{order.id.slice(0, 8).toUpperCase()} placed on{" "}
            {new Date(order.created_at).toLocaleDateString()}. We'll email you when it ships.
          </p>
        </div>
      </div>

      <Card className="mt-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Items</h2>
            <Badge variant="secondary">{order.order_status}</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <img
                  src={item.image_url}
                  alt={item.product_name}
                  className="h-14 w-14 rounded-md border border-border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Qty {item.quantity} · {formatMoney(item.unit_price)} each
                  </p>
                </div>
                <span className="font-medium">{formatMoney(item.unit_price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between text-base font-semibold text-foreground">
            <span>Total paid ({order.payment_method})</span>
            <span>{formatMoney(order.total_amount)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-5 text-sm">
          <h2 className="font-semibold text-foreground">Delivery details</h2>
          <p className="mt-2 text-muted-foreground">
            {order.full_name} · {order.phone}
            <br />
            {order.address_line}, {order.city} {order.postal_code}, {order.country}
          </p>
          {order.special_requirements && (
            <p className="mt-3 text-muted-foreground">
              <span className="font-medium text-foreground">Notes:</span> {order.special_requirements}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link to="/">Continue shopping</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/profile">View my orders</Link>
        </Button>
      </div>
    </div>
  );
}
