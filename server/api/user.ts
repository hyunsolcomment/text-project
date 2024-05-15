import { Router } from "express";
import { User } from "../modules/user";
import { Token } from "../modules/token";
import { V } from "../v";
import { error, success } from "../util/res";
import { Log } from "../util/logger";

export const userRouter = Router();

/*  로그인  */
userRouter.post("/login", async (req, res) => {
    const id = req.body.id;
    const pw = req.body.pw;
    const prefix = `[user/login]`;
    const action = `[${req.ip}]: '${id}' 로그인`;

    // 유저 정보 얻기
    const userInfo = await User.getUserInfo(id);

    // 유저가 없음
    if(!userInfo) {
        Log.warn(`${prefix} ${action}하지 못했습니다. 해당하는 유저가 없습니다.`);
        error(res, `아이디 또는 비밀번호가 올바르지 않아요.`);
        return;
    }

    // 문자 확인
    if(!User.verifyId(id) || !User.verifyPassword(pw)) {
        Log.error(`${prefix} ${action}에 실패했습니다. 허용하지 않은 문자가 포함된 인자가 요청으로 들어왔습니다. (id: ${id}, pw: ${pw})`)
        error(res, `올바르지 않은 요청이에요.`);
        return;
    }

    if(userInfo.password === User.encryptPassword(pw)) {

        // 쿠키 설정
        res.cookie(V.REQ_TOKEN_KEY, Token.createToken(id), { httpOnly: true, sameSite: 'strict' });

        Log.log(`${prefix} ${action}했습니다.`);

        // 성공 반환
        success(res, { name: userInfo.name });

    } else {

        Log.warn(`${prefix} ${action}하지 못했습니다.`);

        error(res, `아이디 또는 비밀번호가 올바르지 않아요.`);
    }
})

/*  회원가입  */
userRouter.post("/register", async (req, res) => {

    const id = req.body.id as string;
    const pw = req.body.pw as string;
    const name = req.body.name ?? id as string;
    const prefix = `[user/register] [${req.ip}]:`;
    const action = `회원가입 (아이디: ${id}, 비밀번호: ${pw})`;

    if(!id || !pw || !name) {
        Log.warn(`${prefix} ${action}`)
        return;
    }

    // 문자 확인
    if(!User.verifyId(id) || !User.verifyPassword(pw)) {
        Log.error(`${prefix} ${action}에 실패했습니다. 허용하지 않은 문자가 포함된 인자가 요청으로 들어왔습니다.`)
        error(res, `올바르지 않은 요청이에요.`);
        return;
    }

    if( await User.create({ id: id, pw: pw, name: name }) ) {
        Log.log(`[user/register] [${req.ip}]: '${id}' 회원가입했습니다.`)
        success(res);
    } else {
        error(res, `이미 해당 아이디를 사용 중인 유저가 있습니다.`)
    }
})

/*  로그아웃  */
userRouter.get("/logout", (req, res) => {
    const token   = req.cookies[V.REQ_TOKEN_KEY];
    const user_id = Token.getIdByToken(token);

    const prefix = `[user/logout]`;
    const action = `[${req.ip}]: ${user_id ? `${user_id}: 로그아웃` : '로그인하지 않은 상태에서 로그아웃'}`;

    // 쿠키 삭제
    User.logout(res);

    Log.log(`${prefix} ${action}했습니다.`);

    success(res);
})

/*  설정 변경  */
userRouter.post("/edit", async (req, res) => {
    const prefix = `[user/edit]`;
    const token  = req.cookies?.[V.REQ_TOKEN_KEY];
    const userId = Token.getIdByToken(token);

    if(!userId) {
        Log.warn(`${prefix} [${req.ip}]: 로그인하지 않은 상태에서 계정 설정을 변경하려고 하였습니다.`);
        error(res, `올바르지 않은 요청이에요.`);
        return;
    }

    const action = `[${userId}]: 계정 설정 변경`;
    const oldPw  = req.body.old_pw;
    const newPw  = req.body.new_pw;
    const name   = req.body.name;

    // 기존 비밀번호가 입력되지 않음
    if(!oldPw) {
        Log.warn(`${prefix} ${action}에 실패했습니다. 기존 비밀번호가 입력되지 않았습니다.`)
        error(res, `기존 비밀번호가 올바르지 않아요.`);
        return;
    }

    // 기존 비밀번호가 일치하지 않음
    if(!await User.checkPassword(userId, oldPw)) {
        Log.warn(`${prefix} ${action}에 실패했습니다. 기존 비밀번호가 일치하지 않습니다.`);
        return;
    }

    // 계정 설정 변경 작업 시작
    const rs = await User.edit({
        user_id : userId,
        pw      : newPw,
        name    : name
    })

    if(rs) {
        success(res);
    } else {
        error(res, `설정 변경에 실패했어요.`);
    }
})

/*  회원탈퇴 */
userRouter.post("/delete", async (req, res) => {
    const prefix = `[user/delete]`;
    const token  = req.cookies?.[V.REQ_TOKEN_KEY];
    const userId = Token.getIdByToken(token);
    const pw     = req.body.pw;

    if(!userId) {
        Log.warn(`${prefix} [${req.ip}]: 로그인하지 않은 상태에서 회원탈퇴하려고 했습니다.`);
        error(res, `올바르지 않은 요청이에요.`);
        return;
    }

    const action = `[${userId}]: 회원탈퇴`;

    // 기존 비밀번호가 입력되지 않음
    if(!pw) {
        Log.warn(`${prefix} ${action}에 실패했습니다. 기존 비밀번호가 입력되지 않았습니다.`)
        error(res, `기존 비밀번호가 올바르지 않아요.`);
        return;
    }

    // 기존 비밀번호가 일치하지 않음
    if(!await User.checkPassword(userId, pw)) {
        Log.warn(`${prefix} ${action}에 실패했습니다. 기존 비밀번호가 일치하지 않습니다.`);
        return;
    }

    // 삭제 시작
    await User.delete(userId);

    // 로그아웃
    User.logout(res);
    
    success(res);
})