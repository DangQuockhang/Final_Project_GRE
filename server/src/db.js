import pg from 'pg';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL chưa cấu hình. Hãy copy server/.env.example thành server/.env');
}
export const pool = new pg.Pool({connectionString:process.env.DATABASE_URL, connectionTimeoutMillis:5000});
export const query = (sql, params=[]) => pool.query(sql,params);
