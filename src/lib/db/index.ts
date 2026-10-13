import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DB = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __runamDb?: DB; __runamSql?: postgres.Sql };

function connect(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and point it at a Postgres database.");
  const client = postgres(url, {
    max: process.env.NODE_ENV === "production" ? 5 : 10,
    prepare: false, // required for pooled connections (Neon, Supabase, PgBouncer)
    idle_timeout: 20,
  });
  globalForDb.__runamSql = client;
  return drizzle(client, { schema, casing: undefined });
}

export const db: DB = globalForDb.__runamDb ?? (globalForDb.__runamDb = connect());
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type DbOrTx = DB | Tx;
export { schema };
