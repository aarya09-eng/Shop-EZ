import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { fetchCart } from "@/lib/cart.functions";
import { fetchProduct } from "@/lib/catalog.functions";
import { fetchProfile } from "@/lib/admin.functions";
import { createOrder } from "@/lib/order.functions";
import { PAYMENT_METHODS, discountedPrice, formatMoney } from "@/lib/shop-types";

type CheckoutSearch = { productId?: string | undefined; qty?: number | undefined };

export const Route = createFileRoute("/_authenticated/checkout")({
  validateSearch: (search: Record<string, unknown>): CheckoutSearch => ({
    productId: typeof search['productId'] === "string" ? search['productId'] : undefined,
    qty: Number(search['qty']) > 0 ? Number(search['qty']) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Checkout — ShopEZ" },
      { name: "description", content: "Enter shipping details and pay by COD, card or UPI on ShopEZ." },
      { property: "og:title", content: "Checkout — ShopEZ" },
      { property: "og:description", content: "Complete your ShopEZ order in one page." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { productId, qty } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const buyNowMode = Boolean(productId);

  const { data: cart = [] } = useQuery({
    queryKey: ["cart"],
    queryFn: () => fetchCart(),
    enabled: !buyNowMode,
  });

  const { data: buyNowProduct } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetchProduct({ data: { id: productId! } }),
    enabled: buyNowMode,
  });

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    addressLine: "",
    city: "",
    postalCode: "",
    country: "India",
    specialRequirements: "",
  });
  const [payment, setPayment] = useState<string>(PAYMENT_METHODS[0]);
  const [prefilled, setPrefilled] = useState(false);

  if (profile && !prefilled) {
    setPrefilled(true);
    setForm((f) => ({
      ...f,
      fullName: profile.name || f.fullName,
      phone: profile.phone || f.phone,
      addressLine: profile.address || f.addressLine,
    }));
  }

  const lines = buyNowMode
    ? buyNowProduct
      ? [
          {
            id: buyNowProduct.product.id,
            name: buyNowProduct.product.name,
            image: buyNowProduct.product.image_url,
            quantity: qty ?? 1,
            unit: discountedPrice(buyNowProduct.product.price, buyNowProduct.product.discount),
          },
        ]
      : []
    : cart.map((l) => ({
        id: l.id,
        name: l.product.name,
        image: l.product.image_url,
        quantity: l.quantity,
        unit: discountedPrice(l.product.price, l.product.discount),
      }));

  const total = lines.reduce((s, l) => s + l.unit * l.quantity, 0);

  const place = useMutation({
    mutationFn: () =>
      createOrder({
        data: {
          ...form,
          paymentMethod: payment as (typeof PAYMENT_METHODS)[number],
          buyNow: buyNowMode ? { productId: productId!, quantity: qty ?? 1 } : null,
        },
      }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Order placed!");
      navigate({ to: "/order/$orderId", params: { orderId: order.id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">Checkout</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {buyNowMode ? "Buying this item right away." : "Ordering everything in your cart."}
      </p>

      <form
        className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]"
        onSubmit={(e) => {
          e.preventDefault();
          place.mutate();
        }}
      >
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold text-foreground">Shipping details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    required
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    required
                    value={form.addressLine}
                    onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="postal">Postal code</Label>
                  <Input
                    id="postal"
                    required
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold text-foreground">Payment method</h2>
              <RadioGroup value={payment} onValueChange={setPayment} className="mt-4 space-y-2">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-surface"
                  >
                    <RadioGroupItem value={method} id={method} />
                    <span className="text-sm font-medium text-foreground">{method}</span>
                  </label>
                ))}
              </RadioGroup>
              <p className="mt-3 text-xs text-muted-foreground">
                Payments are simulated for this demo store — no real charge is made.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <Label htmlFor="notes">Special requirements (optional)</Label>
              <Textarea
                id="notes"
                rows={3}
                className="mt-2"
                placeholder="Delivery instructions, gift wrapping, preferred time..."
                value={form.specialRequirements}
                onChange={(e) => setForm({ ...form, specialRequirements: e.target.value })}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardContent className="p-5">
            <h2 className="font-semibold text-foreground">Order summary</h2>
            <div className="mt-4 space-y-3">
              {lines.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nothing to order.{" "}
                  <Link to="/" className="text-primary hover:underline">
                    Browse products
                  </Link>
                </p>
              )}
              {lines.map((line) => (
                <div key={line.id} className="flex items-center gap-3">
                  <img
                    src={line.image}
                    alt={line.name}
                    className="h-12 w-12 rounded-md border border-border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{line.name}</p>
                    <p className="text-xs text-muted-foreground">Qty {line.quantity}</p>
                  </div>
                  <span className="text-sm font-medium">{formatMoney(line.unit * line.quantity)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between text-base font-semibold text-foreground">
              <span>Total</span>
              <span>{formatMoney(total)}</span>
            </div>
            <Button type="submit" className="mt-5 w-full" disabled={place.isPending || lines.length === 0}>
              {place.isPending ? "Placing order..." : "Place order"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
