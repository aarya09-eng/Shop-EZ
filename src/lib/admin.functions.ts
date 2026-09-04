// ENDPOINT LAYER — admin + profile endpoints (authenticated). No business logic here.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  checkAdmin,
  createProduct,
  editProduct,
  removeProduct,
  type ProductFormInput,
} from "@/controllers/admin.controller";
import { getProfile, saveProfile } from "@/controllers/profile.controller";

export const fetchIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ isAdmin: await checkAdmin(context.supabase, context.userId) }));

export const adminCreateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ProductFormInput) => input)
  .handler(async ({ data, context }) => createProduct(context.supabase, context.userId, data));

export const adminUpdateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ProductFormInput & { id: string }) => input)
  .handler(async ({ data, context }) => editProduct(context.supabase, context.userId, data));

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string }) => input)
  .handler(async ({ data, context }) => removeProduct(context.supabase, context.userId, data.productId));

export const fetchProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getProfile(context.supabase, context.userId));

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; phone?: string; address?: string }) => input)
  .handler(async ({ data, context }) => saveProfile(context.supabase, context.userId, data));

export const claimAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // The bootstrap function is service-role only; it is never callable directly by clients.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("bootstrap_admin_for", {
      _user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { granted: Boolean(data) };
  });
