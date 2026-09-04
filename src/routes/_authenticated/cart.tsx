import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { deleteCartItem, fetchCart, updateCartItem } from "@/lib/cart.functions";
import { discountedPrice, formatMoney } from "@/lib/shop-types";

const cartQuery = queryOptions({ queryKey: ["cart"], queryFn: () => fetchCart() });

export const Route = createFileRoute("/_authenticated/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — ShopEZ" },
      { name: "description", content: "Review the items in your ShopEZ cart before checkout." },
      { property: "og:title", content: "Your cart — ShopEZ" },
      { property: "og:description", content: "Adjust quantities and continue to checkout." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { data: lines = [], isLoading } = useQuery(cartQuery);
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["cart"] });

  const update = useMutation({
    mutationFn: (input: { cartItemId: string; quantity: number }) => updateCartItem({ data: input }),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (cartItemId: string) => deleteCartItem({ data: { cartItemId } }),
    onSuccess: () => {
      invalidate();
      toast.success("Item removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const total = lines.reduce(
    (sum, line) => sum + discountedPrice(line.product.price, line.product.discount) * line.quantity,
    0,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">Your cart</h1>

      {isLoading ? (
        <p className="mt-6 text-muted-foreground">Loading your cart...</p>
      ) : lines.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button asChild>
              <Link to="/">Browse products</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {lines.map((line) => {
              const unit = discountedPrice(line.product.price, line.product.discount);
              return (
                <Card key={line.id}>
                  <CardContent className="flex gap-4 p-4">
                    <Link
                      to="/product/$id"
                      params={{ id: line.product_id }}
                      className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-surface"
                    >
                      <img
                        src={line.product.image_url}
                        alt={line.product.name}
                        className="h-full w-full object-cover"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <Link
                        to="/product/$id"
                        params={{ id: line.product_id }}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {line.product.name}
                      </Link>
                      <span className="text-sm text-muted-foreground">{line.product.category}</span>
                      <span className="mt-1 text-sm font-medium text-foreground">
                        {formatMoney(unit)} each
                      </span>

                      <div className="mt-auto flex items-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Decrease quantity"
                          disabled={update.isPending || line.quantity <= 1}
                          onClick={() =>
                            update.mutate({ cartItemId: line.id, quantity: line.quantity - 1 })
                          }
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{line.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Increase quantity"
                          disabled={update.isPending || line.quantity >= line.product.stock}
                          onClick={() =>
                            update.mutate({ cartItemId: line.id, quantity: line.quantity + 1 })
                          }
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${line.product.name}`}
                          className="ml-auto text-destructive hover:text-destructive"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(line.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="hidden shrink-0 self-center font-semibold text-foreground sm:block">
                      {formatMoney(unit * line.quantity)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="h-fit">
            <CardContent className="p-5">
              <h2 className="font-semibold text-foreground">Order summary</h2>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Items</span>
                  <span>{lines.reduce((s, l) => s + l.quantity, 0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery</span>
                  <span className="text-success">Free</span>
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between text-base font-semibold text-foreground">
                  <span>Total</span>
                  <span>{formatMoney(total)}</span>
                </div>
              </div>
              <Button asChild className="mt-5 w-full">
                <Link to="/checkout" search={{}}>
                  Proceed to checkout
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
