import { Connection, createPool } from "mysql2/promise";

export class DBUtil {
    private static connection: Connection;
        
    static async getConnection() {
        if(!this.connection) {
            this.connection = await createPool({
                user     : process.env.DB_USER,
                password : process.env.DB_PW,
                port     : parseInt(process.env.DB_PORT),
                database : process.env.DB_NAME,
                host     : process.env.DB_HOST,
                
                connectionLimit    : parseInt(process.env.DB_CON_LIMT),
                multipleStatements : true
            });
        }

        return this.connection;
    }

    static async query(sql: string, value: any = undefined) {
        return await (await this.getConnection()).query(sql, value);
    }
}