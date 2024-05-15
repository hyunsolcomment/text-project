import { DBUtil } from "../util/db";
import { Log } from "../util/logger";
import CryptoJS from "crypto-js";
import { V } from "../v";
import { Note } from "./note";
import { Token } from "./token";

export class User {
    static async create({ id, pw, name }: {id: string, pw: string, name: string}) {
        
        const prefix = `[user.create]`;

        // 이미 있는 유저인지 확인
        if(await User.exist(id)) {
            Log.warn(`${prefix} '${id}' 유저를 생성하지 못헀습니다. 이미 해당 아이디를 사용 중인 유저가 있습니다.`)
            return false;
        }

        // 유저 생성 시작

        // users 테이블에 정보 추가
        const encPw = User.encryptPassword(pw);

        await DBUtil.query(`
            INSERT INTO
                users(id,password,name)
            VALUES (
                ?, ?, ?
            );
        `, [id,encPw,name])

        // note-list 테이블 생성
        await Note.createNoteListTable(id);

        Log.log(`${prefix} [${id}]: 회원가입했습니다.`);
        return true;
    }

    static verifyId(str: string) {
        return /^[a-zA-Z0-9_.]{4,20}$/.test(str);
    }

    static verifyPassword(str: string) {
        return /^[a-zA-Z0-9_.!]{6,30}$/.test(str);
    }

    /**
     * 특정 유저의 정보를 수정 후 성공 여부를 반환
     */
    static async edit({ user_id, pw, name }: { user_id: string, pw?: string | undefined, name?: string | undefined}) {

        const prefix = `[user.edit]`;

        try {

            const encPw = User.encryptPassword(pw);

            // 비밀번호 변경
            if(pw) {
                await DBUtil.query(`
                    UPDATE SET
                        password = ?
                    FROM
                        users
                    WHERE
                        id = ?
                `, [encPw,user_id]);    
            }

            // 이름 변경
            if(name) {
                await DBUtil.query(`
                    UPDATE SET
                        name = ?
                    FROM
                        users
                    WHERE
                        id = ?
                `, [name, user_id]);
            }

            Log.log(`${prefix} '${user_id}'의 정보를 수정했습니다. (암호: ${pw}, 닉네임: ${name})`);
            return true;

        } catch (e) {
            Log.error(`${prefix} '${user_id}'의 정보를 수정하지 못했습니다:`);
            return false;
        }
    }

    /**
     * 비밀번호를 암호화 후 반환
     */
    static encryptPassword(password: string) {
        return CryptoJS.HmacSHA256(password, V.PASSWORD_KEY).toString();
    }

    /**
     * 특정 유저의 비밀번호 일치 여부를 반환
     * @param user_id 유저 아이디
     * @param password 검사할 비밀번호
     */
    static async checkPassword(user_id: string, password: string) {
        try {

            const encPassword     = User.encryptPassword(password);
            const correctPassword = (await User.getUserInfo(user_id)).password;

            return encPassword === correctPassword;

        } catch (e) {
            console.error(e);
            return false;
        }
    }

    /**
     * 특정 유저의 아이디, 닉네임, 암호화된 비밀번호를 반환
     * @param user_id 유저 아이디
     */
    static async getUserInfo(user_id: string) {

        const prefix = `[user.getUserInfo]`;

        try {
            
            const rs = await DBUtil.query(`
                SELECT
                    password, name
                FROM
                    users
                WHERE
                    id = ?
            `,[user_id]);

            //@ts-ignore
            if(rs[0].length === 0) {
                Log.error(`${prefix} '${user_id}' 유저를 찾을 수 없습니다.`);
                return undefined;
            }

            return {
                id       : user_id,
                password : rs[0][0]["password"] as string,
                name     : rs[0][0]["name"] as string,
            }

        } catch (e) {
            Log.error(`${prefix} '${user_id}'의 정보를 반환하지 못했습니다:`);
            console.error(e);
            return undefined;
        }
    }

    /**
     * 특정 아이디를 가지고 있는 유저가 있는지 여부를 반환
     */
    static async exist(user_id: string) {
        const rs = await DBUtil.query(`
            SELECT
                COUNT(*)
            FROM
                users
            WHERE
                id = ?
        `,[user_id]);

        let c = rs[0][0]["COUNT(*)"] as number

        return c === 1;
    }

    /**
     * 특정 유저를 삭제
     * @param user_id 유저 아이디
     */
    static async delete(user_id: string) {

        const prefix = `[user.delete]`;

        try {

            await DBUtil.query(`

                -- 유저의 메모장 목록 삭제
                DROP TABLE note-list-${user_id};

                -- 유저 정보 삭제
                DELETE FROM
                    users
                WHERE
                    id = ?;

            `,[user_id]);

            Log.log(`${prefix} '${user_id}' 유저를 삭제했습니다.`); 

        } catch (e) {
            console.error(e);
            Log.error(`${prefix} '${user_id}' 유저를 삭제하지 못했습니다.`);
        }
    }

    /**
     * 로그아웃합니다.
     * @param res express 콜백의 res 인자
     */
    static logout(res: any) {
        res.cookie(V.REQ_TOKEN_KEY, undefined);
    }

    /**
     * express 요청으로부터 요청자의 유저 아이디를 반환합니다.
     * @param req express의 req 인자
     */
    static getIdByResponse(req: any) {
        const token  = req.cookies?.[V.REQ_TOKEN_KEY];
        const userId = Token.getIdByToken(token);

        return userId;
    }
}