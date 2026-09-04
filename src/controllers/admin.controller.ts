// CONTROLLER LAYER — admin product management + role checks.
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { deleteProduct, insertProduct, updateProduct } from "@/models/product.model";
import { isAdmin } from "@/models/profile.model";
import type { Product } from "@/lib/shop-types";

type DB = SupabaseClient<Database>;

async function assertAdmin(db: DB, userId: string) {
  if (!(await isAdmin(db, userId))) throw new Error("Forbidden: admin access required");
}

const productSchema = z.object({
  name: z.string().trim().min(2, "Product name is required").max(140),
  description: z.string().trim().max(2000).default(""),
  price: z.number().min(0.01, "Price must be greater than zero").max(1000000),
  discount: z.number().int().min(0).max(90),
  category: z.string().trim().min(2, "Category is required").max(60),
  imageUrl: z.string().trim().url("Image must be a valid URL").or(z.literal("")),
  stock: z.number().int().min(0).max(100000),
});

export type ProductFormInput = z.input<typeof productSchema>;

function toRow(data: z.output<typeof productSchema>) {
  return {
    name: data.name,
    description: data.description ?? "",
    price: data.price,
    discount: data.discount,
    category: data.category,
    image_url: data.imageUrl,
    stock: data.stock,
  };
}

export async function createProduct(db: DB, userId: string, input: ProductFormInput): Promise<Product> {
  await assertAdmin(db, userId);
  return insertProduct(db, toRow(productSchema.parse(input)));
}

export async function editProduct(
  db: DB,
  userId: string,
  input: ProductFormInput & { id: string },
): Promise<Product> {
  await assertAdmin(db, userId);
  const id = z.string().uuid().parse(input.id);
  return updateProduct(db, id, toRow(productSchema.parse(input)));
}

export async function removeProduct(db: DB, userId: string, productId: string) {
  await assertAdmin(db, userId);
  await deleteProduct(db, z.string().uuid().parse(productId));
  return { ok: true };
}

export async function checkAdmin(db: DB, userId: string): Promise<boolean> {
  return isAdmin(db, userId);
}
