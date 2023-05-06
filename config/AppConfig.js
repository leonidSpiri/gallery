const Minio = require('minio');
const {Pool} = require('pg');

const DB_HOST = process.env.DB_HOST || '192.158.1.71';
const DB_PORT = parseInt(process.env.DB_PORT) || 5432;
const POSTGRES_USER = process.env.POSTGRES_USER || 'admin';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'root';
const POSTGRES_DB = process.env.POSTGRES_DB || 'gallery';

const MINIO_ROOT_USER = process.env.MINIO_ROOT_USER || 'minio123';
const MINIO_ROOT_PASSWORD = process.env.MINIO_ROOT_PASSWORD || 'minio123';
const MINIO_HOST = process.env.MINIO_HOST || '192.158.1.71';
const MINIO_PORT = parseInt(process.env.MINIO_PORT) || 9000;

const minioClient = new Minio.Client({
    endPoint: MINIO_HOST,
    port: MINIO_PORT,
    useSSL: false,
    accessKey: MINIO_ROOT_USER,
    secretKey: MINIO_ROOT_PASSWORD
});

const pool = new Pool({
    user: POSTGRES_USER,
    host: DB_HOST,
    database: POSTGRES_DB,
    password: POSTGRES_PASSWORD,
    port: DB_PORT,
});

module.exports = {
    minioClient,
    pool
}
