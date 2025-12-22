const Minio = require('minio');
const { Pool } = require('pg');

const envInt = (key, def) => {
  const v = Number.parseInt(process.env[key] ?? `${def}`, 10);
  return Number.isFinite(v) ? v : def;
};

const pool = new Pool({
  user: process.env.POSTGRES_USER ?? 'admin',
  host: process.env.DB_HOST ?? 'db',
  database: process.env.POSTGRES_DB ?? 'gallery',
  password: process.env.POSTGRES_PASSWORD ?? 'root',
  port: envInt('DB_PORT', 5432),

  connectionTimeoutMillis: envInt('DB_CONN_TIMEOUT_MS', 5000),
  max: envInt('DB_POOL_MAX', 10),
  idleTimeoutMillis: envInt('DB_IDLE_TIMEOUT_MS', 30000),
  allowExitOnIdle: true,
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err);
});

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_HOST ?? 'fs',
  port: envInt('MINIO_PORT', 9000),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY ?? process.env.MINIO_ROOT_USER ?? 'minio123',
  secretKey: process.env.MINIO_SECRET_KEY ?? process.env.MINIO_ROOT_PASSWORD ?? 'minio123',
});

module.exports = { minioClient, pool };
