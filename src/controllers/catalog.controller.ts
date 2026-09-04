// CONTROLLER LAYER — validation + business rules for the public catalog.
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  findAllProducts,
  findProductById,
  findReviewsByProduct,
  insertReview,
} from "@/models/product.model";
import type { Product, ProductWithMeta, Review } from "@/lib/shop-types";

type DB = SupabaseClient<Database>;

export async function listProducts(db: DB): Promise<ProductWithMeta[]> {
  return findAllProducts(db);
}

const idSchema = z.string().uuid("Invalid product id");

export async function getProductDetail(
  db: DB,
  rawId: string,
): Promise<{ product: Product; reviews: Review[] }> {
  const id = idSchema.parse(rawId);
  const product = await findProductById(db, id);
  if (!product) throw new Error("Product not found");
  const reviews = await findReviewsByProduct(db, id);
  return { product, reviews };
}

const reviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(3, "Please write a short comment").max(600),
  reviewerName: z.string().trim().min(1).max(80),
});

export async function createReview(
  db: DB,
  userId: string,
  input: z.input<typeof reviewSchema>,
): Promise<Review> {
  const data = reviewSchema.parse(input);
  const product = await findProductById(db, data.productId);
  if (!product) throw new Error("Product not found");
  return insertReview(db, {
    product_id: data.productId,
    user_id: userId,
    reviewer_name: data.reviewerName,
    rating: data.rating,
    comment: data.comment,
  });
}
