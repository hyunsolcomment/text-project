import { config } from "dotenv"

config();

export const V = {
    
    REQ_TOKEN_KEY: "tp.token",

    /** 프로필 이미지 크기 제한 */
    PROFILE_IMAGE_LIMIT: 10 * 1024 * 1024,

    /** 비밀번호 암호화 키 */
    PASSWORD_KEY: process.env.PASSWORD_KEY
}