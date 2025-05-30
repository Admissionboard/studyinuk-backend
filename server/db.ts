import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use Supabase database URL from environment
const supabaseUrl = process.env.SUPABASE_DATABASE_URL;

if (!supabaseUrl) {
  throw new Error(
    "SUPABASE_DATABASE_URL must be set in environment variables.",
  );
}

export const pool = new Pool({ 
  connectionString: supabaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: { rejectUnauthorized: false }
});
export const db = drizzle(pool, { schema });

// Admin database connection with service role (bypasses RLS)
const adminDbUrl = supabaseUrl.replace(
  process.env.SUPABASE_ANON_KEY!, 
  process.env.SUPABASE_SERVICE_KEY!
);

export const adminPool = new Pool({ 
  connectionString: adminDbUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: { rejectUnauthorized: false }
});
export const adminDb = drizzle(adminPool, { schema });