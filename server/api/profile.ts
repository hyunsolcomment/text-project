import { Router } from "express";
import multer, { MulterError } from "multer";
import { Profile } from "../modules/profile";
import { Token } from "../modules/token";
import path from "path";
import { error, success } from "../util/res";
import { Log, LogLevel } from "../util/logger";
import { V } from "../v";

export const profileRouter = Router();

const storage = multer.diskStorage({
    filename(req, file, next)    {

        const user_id = req["user_id"];
        const ext     = path.parse(file.filename).ext;

        next(null, `${user_id}${ext}`);
    },

    destination(req, file, next) {
        next(null, Profile.getImageFolderPath())
    }
})

const profileUpload = multer({
    storage: storage,
    limits: { fileSize: V.PROFILE_IMAGE_LIMIT },
})

/*  미들웨어  */
profileRouter.use((req, res, next) => {

    const prefix = `[프로필 미들웨어]`;
    
    // 토큰이 없으면 profile 라우터에서 할 수 있는 작업이 없음
    const token = req.cookies[V.REQ_TOKEN_KEY];

    if(!token || !Token.verifyToken(token)) {
        res.cookie(V.REQ_TOKEN_KEY, undefined, { httpOnly: true, sameSite: 'strict' });
        Log.warn(`${prefix} ${req.ip}: 로그인되어 있지 않거나 올바르지 않은 토큰으로 접근했습니다.`);
        error(res, `로그인이 필요해요.`)
        return;
    }

    req["user_id"] = Token.getIdByToken(token);

    Log.log(`${prefix} ${req["user_id"]}(${req.ip})가 접근합니다.`, LogLevel.DETAIL);

    next();
})

/*  프로필 이미지 업데이트  */
profileRouter.post("/edit", async (req, res) => {

    const token  = req[V.REQ_TOKEN_KEY];
    const userId = Token.getIdByToken(token);
    const prefix = `[profile/edit]`;
    const action = `'${userId}'의 프로필 이미지 변경`;

    // 기존 프로필 이미지 삭제
    await Profile.removeImage(userId);

    profileUpload.single('profile')(req, res, err => {
        
        if(err && err instanceof MulterError) {
            if(err.code === 'LIMIT_FILE_SIZE') {
                Log.warn(`${prefix} ${action}에 실패했습니다. 파일 크기 제한을 초과했습니다.`)
            }

            console.error(err);

            error(res, '올바르지 않은 요청이에요.')
            return;
        }
    
        Log.log(`${prefix} ${action}했습니다.`);
    
        success(res)
    })
})

/*  프로필 이미지 반환  */
profileRouter.get("/image", async (req, res) => {
    const userId  = req.query.user_id as string;
    const prefix  = `[profile/image] [${req.ip}]`;
    const action = `'${userId}'의 프로필 이미지 반환`;

    // 프로필 이미지를 반환할 유저 아이디가 넘어오지 않음
    if(!userId) {
        Log.warn(`${prefix} ${action}에 실패했습니다. 대상 유저 아이디가 없습니다.`);
        error(res, '올바르지 않은 요청이에요.');
        return;
    }

    const imgPath = await Profile.getImagePath(userId);

    if(imgPath) {
        Log.warn(`${prefix} ${action}에 실패했습니다. 해당 유저의 프로필 사진이 존재하지 않습니다.`)
        error(res, '프로필 사진을 찾을 수 없어요.');
        return;
    }

    Log.log(`${prefix} ${action}했습니다.`)

    res.sendFile(imgPath);
})