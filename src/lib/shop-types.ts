// Shared, browser-safe domain types for ShopEZ.

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  discount: number;
  category: string;
  image_url: string;
  stock: number;
};

export type Review = {
  id: string;
  product_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

export type ProductWithMeta = Product & {
  rating: number;
  review_count: number;
};

export type CartLine = {
  id: string;
  product_id: string;
  quantity: number;
  product: Product;
};

export type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  image_url: string;
  quantity: number;
  unit_price: number;
};

export type Order = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  postal_code: string;
  country: string;
  payment_method: string;
  special_requirements: string;
  order_status: string;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
};

export const PAYMENT_METHODS = ["Cash on Delivery", "Credit / Debit Card", "UPI"] as const;
export const ORDER_STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered"] as const;

export function discountedPrice(price: number, discount: number): number {
  return Math.round(price * (1 - discount / 100) * 100) / 100;
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}
