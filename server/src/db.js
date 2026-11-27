import pg from 'pg';
import 'dotenv/config';
import {databaseConfig, observePoolErrors} from './databaseConfig.js';

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL chưa cấu hình. Hãy copy server/.env.example thành server/.env');
}
export const pool = observePoolErrors(new pg.Pool(databaseConfig()));
export const query = (sql, params=[]) => pool.query(sql,params);
