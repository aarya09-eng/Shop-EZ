// ENDPOINT LAYER — order endpoints (authenticated). No business logic here.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  changeOrderStatus,
  getAllOrdersAsAdmin,
  getMyOrders,
  getOrderForUser,
  placeOrder,
  type CheckoutInput,
} from "@/controllers/order.controller";

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CheckoutInput) => input)
  .handler(async ({ data, context }) => placeOrder(context.supabase, context.userId, data));

export const fetchMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getMyOrders(context.supabase, context.userId));

export const fetchOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data, context }) => getOrderForUser(context.supabase, context.userId, data.orderId));

export const fetchAllOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getAllOrdersAsAdmin(context.supabase, context.userId));

export const setOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; status: string }) => input)
  .handler(async ({ data, context }) =>
    changeOrderStatus(context.supabase, context.userId, {
      orderId: data.orderId,
      status: data.status as "Pending" | "Confirmed" | "Shipped" | "Delivered",
    }),
  );
