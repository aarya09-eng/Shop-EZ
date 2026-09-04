// CONTROLLER LAYER — cart rules (stock limits, quantity bounds).
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  deleteCartRow,
  findCartRow,
  findCartRows,
  insertCartRow,
  updateCartQuantity,
} from "@/models/cart.model";
import { findProductById, findProductsByIds } from "@/models/product.model";
import type { CartLine } from "@/lib/shop-types";

type DB = SupabaseClient<Database>;

export async function getCart(db: DB, userId: string): Promise<CartLine[]> {
  const rows = await findCartRows(db, userId);
  if (rows.length === 0) return [];
  const products = await findProductsByIds(db, rows.map((r) => r.product_id));
  const byId = new Map(products.map((p) => [p.id, p]));
  return rows
    .filter((row) => byId.has(row.product_id))
    .map((row) => ({
      id: row.id,
      product_id: row.product_id,
      quantity: row.quantity,
      product: byId.get(row.product_id)!,
    }));
}

const addSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20).default(1),
});

export async function addToCart(db: DB, userId: string, input: z.input<typeof addSchema>) {
  const data = addSchema.parse(input);
  const product = await findProductById(db, data.productId);
  if (!product) throw new Error("Product not found");
  if (product.stock < 1) throw new Error(`${product.name} is out of stock`);

  const existing = await findCartRow(db, userId, data.productId);
  const nextQuantity = Math.min((existing?.quantity ?? 0) + data.quantity, product.stock);

  if (existing) {
    await updateCartQuantity(db, userId, existing.id, nextQuantity);
  } else {
    await insertCartRow(db, userId, data.productId, nextQuantity);
  }
  return { ok: true, quantity: nextQuantity };
}

const quantitySchema = z.object({
  cartItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
});

export async function setCartQuantity(db: DB, userId: string, input: z.input<typeof quantitySchema>) {
  const data = quantitySchema.parse(input);
  const rows = await findCartRows(db, userId);
  const row = rows.find((r) => r.id === data.cartItemId);
  if (!row) throw new Error("Cart item not found");

  const product = await findProductById(db, row.product_id);
  if (!product) throw new Error("Product no longer available");
  if (data.quantity > product.stock) throw new Error(`Only ${product.stock} left in stock`);

  await updateCartQuantity(db, userId, row.id, data.quantity);
  return { ok: true };
}

const removeSchema = z.object({ cartItemId: z.string().uuid() });

export async function removeFromCart(db: DB, userId: string, input: z.input<typeof removeSchema>) {
  const data = removeSchema.parse(input);
  await deleteCartRow(db, userId, data.cartItemId);
  return { ok: true };
}
