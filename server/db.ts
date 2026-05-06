import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export async function ensureDatabaseSchema(): Promise<void> {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id varchar(36) PRIMARY KEY,
      username text NOT NULL UNIQUE,
      password text NOT NULL,
      email varchar,
      first_name varchar,
      last_name varchar,
      profile_image_url varchar,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    );
  `);

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email varchar;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name varchar;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name varchar;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url varchar;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id varchar(36) PRIMARY KEY,
      user_id varchar(36) NOT NULL REFERENCES users(id),
      name text NOT NULL,
      description text,
      product_spec text,
      schedule_image text,
      schedule_description text,
      product_image text,
      product_spec_description text,
      start_date text,
      end_date text,
      status text NOT NULL DEFAULT '진행중',
      last_updated_at text
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS test_items (
      id varchar(36) PRIMARY KEY,
      project_id varchar(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name text NOT NULL,
      last_modified_date text,
      planned_start_date text,
      planned_end_date text,
      actual_end_date text,
      test_condition text,
      judgment_criteria text,
      test_data text,
      test_result text NOT NULL DEFAULT '',
      progress_status text NOT NULL DEFAULT '대기중',
      report_status text NOT NULL DEFAULT '대기중',
      notes text,
      photos jsonb NOT NULL DEFAULT '[]'::jsonb,
      graphs jsonb NOT NULL DEFAULT '[]'::jsonb,
      attachments jsonb NOT NULL DEFAULT '[]'::jsonb
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS issue_items (
      id varchar(36) PRIMARY KEY,
      project_id varchar(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name text NOT NULL,
      last_modified_date text,
      severity text NOT NULL DEFAULT 'Medium',
      occurred_date text,
      planned_end_date text,
      actual_end_date text,
      related_test_item_id text,
      issue_content text,
      issue_cause text,
      issue_countermeasure text,
      verification_result text,
      progress_status text NOT NULL DEFAULT '대기중',
      notes text,
      photos jsonb NOT NULL DEFAULT '[]'::jsonb,
      graphs jsonb NOT NULL DEFAULT '[]'::jsonb,
      attachments jsonb NOT NULL DEFAULT '[]'::jsonb
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid varchar PRIMARY KEY,
      sess jsonb NOT NULL,
      expire timestamp NOT NULL
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_session_expire"
    ON sessions (expire);
  `);
}
