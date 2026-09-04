// MODEL LAYER — orders and order items.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Order, OrderItem } from "@/lib/shop-types";

type DB = SupabaseClient<Database>;

const ORDER_COLUMNS =
  "id, user_id, full_name, phone, address_line, city, postal_code, country, payment_method, special_requirements, order_status, total_amount, created_at";
const ITEM_COLUMNS = "id, product_id, product_name, image_url, quantity, unit_price";

function toItem(row: Record<string, unknown>): OrderItem {
  return {
    id: String(row['id']),
    product_id: row['product_id'] ? String(row['product_id']) : null,
    product_name: String(row['product_name'] ?? ""),
    image_url: String(row['image_url'] ?? ""),
    quantity: Number(row['quantity'] ?? 0),
    unit_price: Number(row['unit_price'] ?? 0),
  };
}

function toOrder(row: Record<string, unknown>): Order {
  const items = ((row['order_items'] as Record<string, unknown>[] | undefined) ?? []).map(toItem);
  return {
    id: String(row['id']),
    user_id: String(row['user_id']),
    full_name: String(row['full_name'] ?? ""),
    phone: String(row['phone'] ?? ""),
    address_line: String(row['address_line'] ?? ""),
    city: String(row['city'] ?? ""),
    postal_code: String(row['postal_code'] ?? ""),
    country: String(row['country'] ?? ""),
    payment_method: String(row['payment_method'] ?? ""),
    special_requirements: String(row['special_requirements'] ?? ""),
    order_status: String(row['order_status'] ?? "Pending"),
    total_amount: Number(row['total_amount'] ?? 0),
    created_at: String(row['created_at']),
    items,
  };
}

export type OrderInput = {
  user_id: string;
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  postal_code: string;
  country: string;
  payment_method: string;
  special_requirements: string;
  total_amount: number;
};

export async function insertOrder(db: DB, values: OrderInput): Promise<string> {
  const { data, error } = await db.from("orders").insert(values).select("id").single();
  if (error) throw new Error(error.message);
  return String(data.id);
}

export async function insertOrderItems(
  db: DB,
  orderId: string,
  items: { product_id: string; product_name: string; image_url: string; quantity: number; unit_price: number }[],
): Promise<void> {
  const { error } = await db
    .from("order_items")
    .insert(items.map((item) => ({ ...item, order_id: orderId })));
  if (error) throw new Error(error.message);
}

export async function findOrdersByUser(db: DB, userId: string): Promise<Order[]> {
  const { data, error } = await db
    .from("orders")
    .select(`${ORDER_COLUMNS}, order_items(${ITEM_COLUMNS})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toOrder(row as Record<string, unknown>));
}

export async function findAllOrders(db: DB): Promise<Order[]> {
  const { data, error } = await db
    .from("orders")
    .select(`${ORDER_COLUMNS}, order_items(${ITEM_COLUMNS})`)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toOrder(row as Record<string, unknown>));
}

export async function findOrderById(db: DB, id: string): Promise<Order | null> {
  const { data, error } = await db
    .from("orders")
    .select(`${ORDER_COLUMNS}, order_items(${ITEM_COLUMNS})`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toOrder(data as Record<string, unknown>) : null;
}

export async function updateOrderStatus(db: DB, id: string, status: string): Promise<void> {
  const { error } = await db
    .from("orders")
    .update({ order_status: status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
