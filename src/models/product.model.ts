// MODEL LAYER — all product/review database access lives here.
// No HTTP, no auth, no validation: only data operations.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Product, ProductWithMeta, Review } from "@/lib/shop-types";

type DB = SupabaseClient<Database>;

const PRODUCT_COLUMNS = "id, name, description, price, discount, category, image_url, stock";

function toProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row['id']),
    name: String(row['name'] ?? ""),
    description: String(row['description'] ?? ""),
    price: Number(row['price'] ?? 0),
    discount: Number(row['discount'] ?? 0),
    category: String(row['category'] ?? ""),
    image_url: String(row['image_url'] ?? ""),
    stock: Number(row['stock'] ?? 0),
  };
}

function toReview(row: Record<string, unknown>): Review {
  return {
    id: String(row['id']),
    product_id: String(row['product_id']),
    reviewer_name: String(row['reviewer_name'] ?? "Customer"),
    rating: Number(row['rating'] ?? 5),
    comment: String(row['comment'] ?? ""),
    created_at: String(row['created_at']),
  };
}

export async function findAllProducts(db: DB): Promise<ProductWithMeta[]> {
  const { data, error } = await db
    .from("products")
    .select(`${PRODUCT_COLUMNS}, reviews(rating)`)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const ratings = ((row as unknown as { reviews?: { rating: number }[] }).reviews ?? []).map(
      (r) => Number(r.rating),
    );
    const avg = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 0;
    return { ...toProduct(row as Record<string, unknown>), rating: avg, review_count: ratings.length };
  });
}

export async function findProductById(db: DB, id: string): Promise<Product | null> {
  const { data, error } = await db.from("products").select(PRODUCT_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProduct(data as Record<string, unknown>) : null;
}

export async function findProductsByIds(db: DB, ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { data, error } = await db.from("products").select(PRODUCT_COLUMNS).in("id", ids);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toProduct(row as Record<string, unknown>));
}

export async function findReviewsByProduct(db: DB, productId: string): Promise<Review[]> {
  const { data, error } = await db
    .from("reviews")
    .select("id, product_id, reviewer_name, rating, comment, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toReview(row as Record<string, unknown>));
}

export async function insertReview(
  db: DB,
  values: { product_id: string; user_id: string; reviewer_name: string; rating: number; comment: string },
): Promise<Review> {
  const { data, error } = await db
    .from("reviews")
    .insert(values)
    .select("id, product_id, reviewer_name, rating, comment, created_at")
    .single();
  if (error) throw new Error(error.message);
  return toReview(data as Record<string, unknown>);
}

export type ProductInput = {
  name: string;
  description: string;
  price: number;
  discount: number;
  category: string;
  image_url: string;
  stock: number;
};

export async function insertProduct(db: DB, values: ProductInput): Promise<Product> {
  const { data, error } = await db.from("products").insert(values).select(PRODUCT_COLUMNS).single();
  if (error) throw new Error(error.message);
  return toProduct(data as Record<string, unknown>);
}

export async function updateProduct(db: DB, id: string, values: Partial<ProductInput>): Promise<Product> {
  const { data, error } = await db
    .from("products")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(PRODUCT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toProduct(data as Record<string, unknown>);
}

export async function deleteProduct(db: DB, id: string): Promise<void> {
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function decrementStock(db: DB, id: string, quantity: number, currentStock: number): Promise<void> {
  const { error } = await db
    .from("products")
    .update({ stock: Math.max(0, currentStock - quantity) })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
