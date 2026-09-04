// CONTROLLER LAYER — checkout, order history, admin order management.
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  findAllOrders,
  findOrderById,
  findOrdersByUser,
  insertOrder,
  insertOrderItems,
  updateOrderStatus,
} from "@/models/order.model";
import { decrementStock, findProductsByIds } from "@/models/product.model";
import { deleteCartRowsByProducts, findCartRows } from "@/models/cart.model";
import { isAdmin } from "@/models/profile.model";
import { ORDER_STATUSES, PAYMENT_METHODS, discountedPrice } from "@/lib/shop-types";
import type { Order } from "@/lib/shop-types";

type DB = SupabaseClient<Database>;

const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(120),
  phone: z.string().trim().min(6, "A contact phone is required").max(30),
  addressLine: z.string().trim().min(5, "Shipping address is required").max(240),
  city: z.string().trim().min(2, "City is required").max(80),
  postalCode: z.string().trim().min(3, "Postal code is required").max(20),
  country: z.string().trim().min(2, "Country is required").max(80),
  paymentMethod: z.enum(PAYMENT_METHODS),
  specialRequirements: z.string().trim().max(1000).default(""),
  // Buy-now purchases pass a single line; cart checkout omits it.
  buyNow: z
    .object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(20) })
    .nullish(),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;

export async function placeOrder(db: DB, userId: string, input: CheckoutInput): Promise<Order> {
  const data = checkoutSchema.parse(input);

  const requested = data.buyNow
    ? [{ product_id: data.buyNow.productId, quantity: data.buyNow.quantity }]
    : (await findCartRows(db, userId)).map((r) => ({ product_id: r.product_id, quantity: r.quantity }));

  if (requested.length === 0) throw new Error("Your cart is empty");

  const products = await findProductsByIds(db, requested.map((r) => r.product_id));
  const byId = new Map(products.map((p) => [p.id, p]));

  let total = 0;
  const lines = requested.map((line) => {
    const product = byId.get(line.product_id);
    if (!product) throw new Error("A product in your order is no longer available");
    if (product.stock < line.quantity) {
      throw new Error(`Only ${product.stock} of ${product.name} left in stock`);
    }
    const unitPrice = discountedPrice(product.price, product.discount);
    total += unitPrice * line.quantity;
    return {
      product_id: product.id,
      product_name: product.name,
      image_url: product.image_url,
      quantity: line.quantity,
      unit_price: unitPrice,
      stock: product.stock,
    };
  });

  const orderId = await insertOrder(db, {
    user_id: userId,
    full_name: data.fullName,
    phone: data.phone,
    address_line: data.addressLine,
    city: data.city,
    postal_code: data.postalCode,
    country: data.country,
    payment_method: data.paymentMethod,
    special_requirements: data.specialRequirements ?? "",
    total_amount: Math.round(total * 100) / 100,
  });

  await insertOrderItems(
    db,
    orderId,
    lines.map(({ stock: _stock, ...item }) => item),
  );

  for (const line of lines) {
    await decrementStock(db, line.product_id, line.quantity, line.stock);
  }

  await deleteCartRowsByProducts(db, userId, lines.map((l) => l.product_id));

  const order = await findOrderById(db, orderId);
  if (!order) throw new Error("Order could not be loaded after checkout");
  return order;
}

export async function getMyOrders(db: DB, userId: string): Promise<Order[]> {
  return findOrdersByUser(db, userId);
}

export async function getOrderForUser(db: DB, userId: string, orderId: string): Promise<Order> {
  const id = z.string().uuid().parse(orderId);
  const order = await findOrderById(db, id);
  if (!order) throw new Error("Order not found");
  if (order.user_id !== userId && !(await isAdmin(db, userId))) throw new Error("Order not found");
  return order;
}

export async function getAllOrdersAsAdmin(db: DB, userId: string): Promise<Order[]> {
  if (!(await isAdmin(db, userId))) throw new Error("Forbidden: admin access required");
  return findAllOrders(db);
}

const statusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(ORDER_STATUSES),
});

export async function changeOrderStatus(db: DB, userId: string, input: z.input<typeof statusSchema>) {
  if (!(await isAdmin(db, userId))) throw new Error("Forbidden: admin access required");
  const data = statusSchema.parse(input);
  await updateOrderStatus(db, data.orderId, data.status);
  return { ok: true };
}
