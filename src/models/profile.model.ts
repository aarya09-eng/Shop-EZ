// MODEL LAYER — user profile + role reads.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;

export type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
};

export async function findProfile(db: DB, userId: string): Promise<Profile | null> {
  const { data, error } = await db
    .from("profiles")
    .select("id, name, email, phone, address")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: String(data.id),
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    phone: String(data.phone ?? ""),
    address: String(data.address ?? ""),
  };
}

export async function upsertProfile(
  db: DB,
  userId: string,
  values: { name: string; phone: string; address: string },
): Promise<Profile> {
  const { data, error } = await db
    .from("profiles")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id, name, email, phone, address")
    .single();
  if (error) throw new Error(error.message);
  return {
    id: String(data.id),
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    phone: String(data.phone ?? ""),
    address: String(data.address ?? ""),
  };
}

export async function isAdmin(db: DB, userId: string): Promise<boolean> {
  const { data, error } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}
