import { Global, Module } from '@nestjs/common';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * 数据库连接注入令牌（替代原 @lark-apaas/fullstack-nestjs-core 的 DRIZZLE_DATABASE）
 */
export const DRIZZLE_DATABASE = Symbol('DRIZZLE_DATABASE');

/**
 * 启动时自动建表（幂等），确保 PostgreSQL 中表结构存在
 */
async function ensureSchema(client: postgres.Sql): Promise<void> {
  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS employees (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar(100) NOT NULL,
      username varchar(50) NOT NULL UNIQUE,
      password_hash varchar(255) NOT NULL,
      _created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      _created_by uuid,
      _updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      _updated_by uuid
    );

    CREATE TABLE IF NOT EXISTS customers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar(100) NOT NULL,
      phone varchar(50),
      company varchar(255),
      source varchar(100),
      stage varchar(50) NOT NULL DEFAULT 'new',
      remark text,
      owner uuid,
      employee_id uuid,
      _created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      _created_by uuid,
      _updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      _updated_by uuid
    );

    CREATE TABLE IF NOT EXISTS follow_ups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      content text NOT NULL,
      result varchar(255),
      follow_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      owner uuid,
      employee_id uuid,
      _created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      _created_by uuid,
      _updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      _updated_by uuid
    );

    CREATE INDEX IF NOT EXISTS idx_follow_ups_customer ON follow_ups(customer_id);
    CREATE INDEX IF NOT EXISTS idx_follow_ups_employee ON follow_ups(employee_id);
    CREATE INDEX IF NOT EXISTS idx_customers_stage ON customers(stage);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_customers_employee ON customers(employee_id);

    -- 收藏字段（老表升级用，幂等）
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;
  `);
}

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DATABASE,
      useFactory: async (): Promise<PostgresJsDatabase<typeof schema>> => {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
          throw new Error('DATABASE_URL 环境变量未设置，无法连接 PostgreSQL');
        }
        // Render 等托管数据库强制 SSL，这里统一开启
        const client = postgres(connectionString, { max: 5, ssl: 'require' });
        await ensureSchema(client);
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DRIZZLE_DATABASE],
})
export class DatabaseModule {}
