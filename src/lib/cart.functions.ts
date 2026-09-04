// ENDPOINT LAYER — cart endpoints (authenticated). No business logic here.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { addToCart, getCart, removeFromCart, setCartQuantity } from "@/controllers/cart.controller";

export const fetchCart = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getCart(context.supabase, context.userId));

export const addCartItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string; quantity?: number }) => input)
  .handler(async ({ data, context }) => addToCart(context.supabase, context.userId, data));

export const updateCartItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cartItemId: string; quantity: number }) => input)
  .handler(async ({ data, context }) => setCartQuantity(context.supabase, context.userId, data));

export const deleteCartItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cartItemId: string }) => input)
  .handler(async ({ data, context }) => removeFromCart(context.supabase, context.userId, data));
