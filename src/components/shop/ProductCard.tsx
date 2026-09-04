import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stars } from "@/components/shop/Stars";
import { discountedPrice, formatMoney, type ProductWithMeta } from "@/lib/shop-types";

export function ProductCard({
  product,
  onAddToCart,
  adding,
}: {
  product: ProductWithMeta;
  onAddToCart: (product: ProductWithMeta) => void;
  adding?: boolean;
}) {
  const final = discountedPrice(product.price, product.discount);
  const outOfStock = product.stock <= 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-card)]">
      <Link to="/product/$id" params={{ id: product.id }} className="relative block aspect-[4/3] overflow-hidden bg-surface">
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {product.discount > 0 && (
          <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">
            -{product.discount}%
          </Badge>
        )}
        {outOfStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-card/80 text-sm font-medium text-muted-foreground">
            Out of stock
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {product.category}
        </span>
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          className="font-semibold leading-snug text-foreground hover:text-primary"
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Stars rating={product.rating} />
          <span>{product.review_count > 0 ? `${product.rating} (${product.review_count})` : "No reviews yet"}</span>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>

        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-lg font-semibold text-foreground">{formatMoney(final)}</span>
          {product.discount > 0 && (
            <span className="text-sm text-muted-foreground line-through">{formatMoney(product.price)}</span>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <Button asChild className="flex-1" disabled={outOfStock}>
            <Link to="/checkout" search={{ productId: product.id, qty: 1 }}>
              Shop Now
            </Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Add ${product.name} to cart`}
            disabled={outOfStock || adding}
            onClick={() => onAddToCart(product)}
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}
