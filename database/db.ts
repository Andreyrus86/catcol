import {Pool} from 'pg';
import dotenv from 'dotenv';

export default class DbPool {
    protected pool: Pool;
    constructor() {
        if (DbPool._instance) {
            return DbPool._instance;
        }
        this.pool = new Pool({
            host: process.env.DB_HOST,
            user: process.env.DB_USERNAME,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            max: 100,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        })

        DbPool._instance = this;
    }

    public getPool() {
        return this.pool;
    }
}



