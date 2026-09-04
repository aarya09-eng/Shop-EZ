// MODEL LAYER — cart persistence.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;

export type CartRow = { id: string; product_id: string; quantity: number };

export async function findCartRows(db: DB, userId: string): Promise<CartRow[]> {
  const { data, error } = await db
    .from("cart_items")
    .select("id, product_id, quantity")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    product_id: String(r.product_id),
    quantity: Number(r.quantity),
  }));
}

export async function findCartRow(db: DB, userId: string, productId: string): Promise<CartRow | null> {
  const { data, error } = await db
    .from("cart_items")
    .select("id, product_id, quantity")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { id: String(data.id), product_id: String(data.product_id), quantity: Number(data.quantity) } : null;
}

export async function insertCartRow(db: DB, userId: string, productId: string, quantity: number): Promise<void> {
  const { error } = await db
    .from("cart_items")
    .insert({ user_id: userId, product_id: productId, quantity });
  if (error) throw new Error(error.message);
}

export async function updateCartQuantity(db: DB, userId: string, rowId: string, quantity: number): Promise<void> {
  const { error } = await db
    .from("cart_items")
    .update({ quantity })
    .eq("id", rowId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function deleteCartRow(db: DB, userId: string, rowId: string): Promise<void> {
  const { error } = await db.from("cart_items").delete().eq("id", rowId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function deleteCartRowsByProducts(db: DB, userId: string, productIds: string[]): Promise<void> {
  if (productIds.length === 0) return;
  const { error } = await db
    .from("cart_items")
    .delete()
    .eq("user_id", userId)
    .in("product_id", productIds);
  if (error) throw new Error(error.message);
}
