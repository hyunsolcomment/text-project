import { DBUtil } from "../util/db";

export class Debug {
    static async clearDB() {
        try {
            // Get all tables excluding 'users'
            const [tables] = await DBUtil.query(`SHOW tables`);

            for (const row of tables as { [key: string]: string }[]) {
                const key = Object.keys(row)[0];
                const tableName = row[key];

                if(tableName !== 'users') {
                    await DBUtil.query(`DROP TABLE IF EXISTS \`${tableName}\``);
                }
            }

            await DBUtil.query('DELETE FROM `users`');

        } catch (err) {
            console.error('Error clearing the database:', err);
        }
    }
}