// CONTROLLER LAYER — profile reads/updates.
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { findProfile, upsertProfile, type Profile } from "@/models/profile.model";

type DB = SupabaseClient<Database>;

export async function getProfile(db: DB, userId: string): Promise<Profile | null> {
  return findProfile(db, userId);
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  phone: z.string().trim().max(30).default(""),
  address: z.string().trim().max(400).default(""),
});

export async function saveProfile(
  db: DB,
  userId: string,
  input: z.input<typeof profileSchema>,
): Promise<Profile> {
  const data = profileSchema.parse(input);
  return upsertProfile(db, userId, {
    name: data.name,
    phone: data.phone ?? "",
    address: data.address ?? "",
  });
}
