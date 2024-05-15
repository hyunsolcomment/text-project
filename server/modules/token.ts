import { config } from 'dotenv';
import jwt from 'jsonwebtoken';

config();

const TOKEN_KEY = process.env.TOKEN_KEY;

export class Token {
    static createToken(user_id: string) {
        jwt.sign({
            id: user_id,
            date: new Date().getTime()
        }, TOKEN_KEY);
    }

    static getIdByToken(token: string | undefined) {
        if(token && jwt.verify(token, TOKEN_KEY)) {
            return jwt.decode(token)["id"];
        }

        return undefined;
    }

    static verifyToken(token: string) {
        return jwt.verify(token, TOKEN_KEY);
    }
}