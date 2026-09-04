import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stars } from "@/components/shop/Stars";
import { fetchProduct, submitReview } from "@/lib/catalog.functions";
import { addCartItem } from "@/lib/cart.functions";
import { useShopAuth } from "@/hooks/useShopAuth";
import { discountedPrice, formatMoney } from "@/lib/shop-types";

const detailQuery = (id: string) =>
  queryOptions({
    queryKey: ["product", id],
    queryFn: () => fetchProduct({ data: { id } }),
  });

export const Route = createFileRoute("/product/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(detailQuery(params.id)),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Product unavailable — ShopEZ" }, { name: "robots", content: "noindex" }],
      };
    }
    const { product } = loaderData;
    const description = product.description.slice(0, 150) || `Buy ${product.name} on ShopEZ.`;
    return {
      meta: [
        { title: `${product.name} — ShopEZ` },
        { name: "description", content: description },
        { property: "og:title", content: `${product.name} — ShopEZ` },
        { property: "og:description", content: description },
        ...(product.image_url.startsWith("https://")
          ? [
              { property: "og:image", content: product.image_url },
              { name: "twitter:image", content: product.image_url },
            ]
          : []),
      ],
    };
  },
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-xl font-semibold">We couldn't load this product</h1>
      <Button asChild className="mt-6">
        <Link to="/">Back to shop</Link>
      </Button>
    </div>
  ),
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery(detailQuery(id));
  const { isAuthenticated, user } = useShopAuth();
  const queryClient = useQueryClient();
  const [qty, setQty] = useState("1");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [reviewerName, setReviewerName] = useState("");

  const product = data?.product;
  const reviews = data?.reviews ?? [];

  const add = useMutation({
    mutationFn: () => addCartItem({ data: { productId: id, quantity: Number(qty) } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to your cart");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const review = useMutation({
    mutationFn: () =>
      submitReview({
        data: {
          productId: id,
          rating: Number(rating),
          comment,
          reviewerName: reviewerName.trim() || user?.email?.split("@")[0] || "Customer",
        },
      }),
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Thanks for your review!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!product) return null;

  const final = discountedPrice(product.price, product.discount);
  const avg =
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Continue shopping
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <img src={product.image_url} alt={product.name} className="aspect-[4/3] w-full object-cover" />
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {product.category}
          </span>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{product.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Stars rating={avg} />
            <span>{reviews.length > 0 ? `${avg} from ${reviews.length} reviews` : "No reviews yet"}</span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-foreground">{formatMoney(final)}</span>
            {product.discount > 0 && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {formatMoney(product.price)}
                </span>
                <Badge className="bg-primary text-primary-foreground">Save {product.discount}%</Badge>
              </>
            )}
          </div>

          <p className="mt-4 leading-relaxed text-muted-foreground">{product.description}</p>

          <p className="mt-4 text-sm font-medium">
            {product.stock > 0 ? (
              <span className="text-success">In stock — {product.stock} available</span>
            ) : (
              <span className="text-destructive">Currently out of stock</span>
            )}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Select value={qty} onValueChange={setQty}>
              <SelectTrigger className="w-24" aria-label="Quantity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: Math.min(10, Math.max(product.stock, 1)) }).map((_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button asChild disabled={product.stock <= 0}>
              <Link to="/checkout" search={{ productId: product.id, qty: Number(qty) }}>
                Shop Now
              </Link>
            </Button>
            <Button
              variant="outline"
              disabled={product.stock <= 0 || add.isPending}
              onClick={() => {
                if (!isAuthenticated) {
                  toast.error("Please sign in to add items to your cart");
                  return;
                }
                add.mutate();
              }}
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-foreground">Customer reviews</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {reviews.length === 0 && (
              <p className="text-sm text-muted-foreground">Be the first to review this product.</p>
            )}
            {reviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{r.reviewer_name}</span>
                    <Stars rating={r.rating} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-foreground">Write a review</h3>
              {isAuthenticated ? (
                <form
                  className="mt-4 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    review.mutate();
                  }}
                >
                  <div>
                    <Label htmlFor="reviewer">Display name</Label>
                    <Input
                      id="reviewer"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder={user?.email?.split("@")[0] ?? "Your name"}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rating">Rating</Label>
                    <Select value={rating} onValueChange={setRating}>
                      <SelectTrigger id="rating">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 4, 3, 2, 1].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} star{n > 1 ? "s" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="comment">Your review</Label>
                    <Textarea
                      id="comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={4}
                      placeholder="What did you like about it?"
                    />
                  </div>
                  <Button type="submit" disabled={review.isPending}>
                    {review.isPending ? "Posting..." : "Post review"}
                  </Button>
                </form>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  <Link to="/auth" className="font-medium text-primary hover:underline">
                    Sign in
                  </Link>{" "}
                  to share your experience with this product.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
