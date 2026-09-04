import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCard } from "@/components/shop/ProductCard";
import { fetchProducts } from "@/lib/catalog.functions";
import { addCartItem } from "@/lib/cart.functions";
import { useShopAuth } from "@/hooks/useShopAuth";
import type { ProductWithMeta } from "@/lib/shop-types";

const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: () => fetchProducts(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  head: () => ({
    meta: [
      { title: "ShopEZ — Shop electronics, home & lifestyle deals" },
      {
        name: "description",
        content:
          "Browse the ShopEZ catalog: electronics, kitchen, home, bags and footwear with live discounts and easy checkout.",
      },
      { property: "og:title", content: "ShopEZ — Shop electronics, home & lifestyle deals" },
      {
        property: "og:description",
        content: "Discounted everyday essentials with a simple cart and one-page checkout.",
      },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const loaderProducts = Route.useLoaderData();
  const { data: products = [], isLoading } = useQuery({
    ...productsQuery,
    initialData: loaderProducts,
  });
  const { isAuthenticated } = useShopAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("featured");

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(products.map((p) => p.category))).sort()],
    [products],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = products.filter((p) => {
      const matchesTerm =
        !term || p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term);
      const matchesCategory = category === "all" || p.category === category;
      return matchesTerm && matchesCategory;
    });
    list = [...list];
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    if (sort === "discount") list.sort((a, b) => b.discount - a.discount);
    return list;
  }, [products, search, category, sort]);

  const add = useMutation({
    mutationFn: (product: ProductWithMeta) =>
      addCartItem({ data: { productId: product.id, quantity: 1 } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to your cart");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleAdd(product: ProductWithMeta) {
    if (!isAuthenticated) {
      toast.error("Please sign in to add items to your cart");
      return;
    }
    add.mutate(product);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          <ShoppingBag className="h-3.5 w-3.5" /> Free returns within 14 days
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl font-bold text-foreground sm:text-4xl">
          Everyday essentials at prices that make sense.
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Electronics, kitchen, home and lifestyle picks — add to cart or buy instantly with Cash on
          Delivery, Card or UPI.
        </p>
        {!isAuthenticated && (
          <Button asChild className="mt-6">
            <Link to="/auth">Create your account</Link>
          </Button>
        )}
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-9"
            aria-label="Search products"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-44" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c === "all" ? "All categories" : c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="sm:w-44" aria-label="Sort products">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="price-asc">Price: low to high</SelectItem>
            <SelectItem value="price-desc">Price: high to low</SelectItem>
            <SelectItem value="rating">Top rated</SelectItem>
            <SelectItem value="discount">Biggest discount</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          No products match your search. Try a different term or category.
        </p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAdd}
              adding={add.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
