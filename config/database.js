import mysql from 'mysql2/promise';
import logger from './logger.js';

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'linkedinto_user',
  password: process.env.MYSQL_PASSWORD || 'linkedinto_pass',
  database: process.env.MYSQL_DATABASE || 'linkedinto_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

let pool = null;

export async function getPool() {
  if (!pool) {
    try {
      pool = mysql.createPool(config);
      logger.info('MySQL connection pool created');
      
      // Test connection
      const connection = await pool.getConnection();
      logger.info('MySQL connection successful');
      connection.release();
    } catch (error) {
      logger.error('MySQL connection failed:', error);
      throw error;
    }
  }
  return pool;
}

export async function query(sql, params) {
  const pool = await getPool();
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('MySQL connection pool closed');
  }
}

export default { getPool, query, closePool };
