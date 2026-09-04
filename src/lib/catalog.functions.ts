// ENDPOINT LAYER — public catalog endpoints. No business logic here.
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getProductDetail, listProducts, createReview } from "@/controllers/catalog.controller";

function publicClient() {
  const url = process.env['SUPABASE_URL']!;
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input as RequestInfo, { ...init, headers });
      },
    },
  });
}

export const fetchProducts = createServerFn({ method: "GET" }).handler(async () =>
  listProducts(publicClient()),
);

export const fetchProduct = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => getProductDetail(publicClient(), data.id));

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string; rating: number; comment: string; reviewerName: string }) => input)
  .handler(async ({ data, context }) => createReview(context.supabase, context.userId, data));
