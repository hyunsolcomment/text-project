import { Router } from "express";
import { User } from "../modules/user";
import { error } from "console";
import { Note } from "../modules/note";
import { success } from "../util/res";
import { Log } from "../util/logger";
import url from 'url';
import { NotePermission } from "../@types/NotePermission";

export const noteRouter = Router();

noteRouter.use((req, res, next) => {
    const userId   = User.getIdByResponse(req);
    const prefix   = `[메모장 미들웨어] [${req.ip}]:`;
    const pathName = new URL(req.url).pathname;

    if(!userId) {   
        Log.warn(`${prefix} 로그인하지 않은 상태에서 접근했습니다.`);
        error(res, `로그인이 필요해요.`);
        return;
    }

    req["user_id"] = userId;
    next();
})

/*  메모장 생성  */
noteRouter.post("/create", async (req, res) => {
    const userId = req["user_id"];
    const prefix = `[note/create] [${userId}]:`;

    Log.log(`${prefix} 메모장 생성을 요청받았습니다.`);

    const note_id = await Note.create(userId);

    if(note_id === -1) {
        Log.error(`${prefix} 메모장 생성에 실패했습니다. DB를 점검해보십시오.`);
        error(res, `메모장 생성에 실패했어요.`)
        return;
    }

    Log.log(`${prefix} 메모장을 생성했습니다. (note_id: ${note_id})`);

    success(res, { note_id: note_id }); 
})

/*  메모장 권한 설정  */
noteRouter.post("/set-permission", async (req, res) => {
    const userId = req["user_id"];

    let note       = Note.getNoteFromObj(req.body.note);
    let targetUser = req.body.target_user;
    let permission = req.body.permission;
    let value      = req.body.permission_value;

    const prefix = `[note/set-permission] [${userId}]:`;

    if(!note || !targetUser || !permission || value === undefined) {
        Log.warn(`${prefix} 실패했습니다. (인자가 충분하지 않습니다.)`)        
        error(res, `올바르지 않은 요청이에요.`)
        return;
    }

    // 인자들이 올바른지 확인하기
    let isValidParams = (
        Note.validPermission(permission) &&
        ["true","false"].includes(value)
    )

    if(!isValidParams) {
        Log.warn(`${prefix} 실패했습니다. (인자가 올바르지 않습니다.) (permission: ${permission}, value: ${value})`);
        error(res, `올바르지 않은 요청이에요.`);
        return;
    }

    const rs = await Note.setPermission({
        note             : note,
        target_user      : targetUser,
        permission       : permission,
        permission_value : value
    })

    if(rs) {
        Log.log(`${prefix} 성공했습니다.`);
        success(res);
    } else {
        Log.error(`${prefix} 실패했습니다. (유저가 존재하지 않거나 DB 반영 오류)`)
        error(res, `올바르지 않은 요청이에요.`);
    }
})

/*  메모장 수정  */
noteRouter.post("/edit", async (req, res) => {
    const userId  = req["user_id"];
    const note    = Note.getNoteFromObj(req.body.note);
    const title   = req.body.title ?? ""
    const content = req.body.content ?? "";
    const prefix  = `[note/edit] [${userId}]:`;

    if(!note) {
        Log.warn(`${prefix} 메모장 정보가 없거나 올바르지 않습니다.`);
        error(res, `올바르지 않은 요청이에요.`)
        return;
    }

    // 메모장 수정 시작
    const rs = await Note.edit(note, { title: title, content: content });

    if(rs) {
        success(res);
    } else {
        error(res, `메모장 저장에 실패했어요. 나중에 다시시도해주세요.`);
    }
})

/*  메모장 공유 설정  */
noteRouter.post("/share", async (req, res) => {
    const userId     = req["user_id"];
    const note       = Note.getNoteFromObj(req.body.note);
    const targetUser = req.body.target_user;

    const prefix = `[note/share] [${userId}]:`;
    
    if(!note || !targetUser) {
        Log.warn(`${prefix} 실패했습니다. (메모장 정보가 올바르지 않습니다.)`);
        error(res, `올바르지 않은 요청이에요.`);
        return;
    }

    if(await Note.share(note, targetUser)) {
        success(res);
    } else {
        error(res, '메모장 공유에 실패했어요. 나중에 다시시도해주세요.');
    }
})

/*  메모장 공유 해제  */
noteRouter.post("/delete-share", async (req, res) => {
    const userId     = req["user_id"];
    const note       = Note.getNoteFromObj(req.body.note);
    const targetUser = req.body.target_user;
    const prefix     = `[note/delete-share] [${userId}]:`;

    if(!note || !targetUser) {
        Log.warn(`${prefix} 실패했습니다. (충분한 인자가 넘어오지 않았습니다.)`)
        error(res, `올바르지 않은 요청이에요.`)
        return;
    }

    const rs = await Note.deleteShare(note, targetUser);

    if(rs) {
        success(res);
    } else {
        error(res,`공유 해제에 실패했어요.`)
    }
})

/*  메모장 삭제  */
noteRouter.post("/delete", async (req, res) => {
    const userId = req["user_id"];
    const note   = Note.getNoteFromObj(req.body.note);
    const prefix = `[note/delete] [${userId}]:`;

    if(!note) {
        Log.warn(`${prefix} 실패했습니다. (메모장 정보가 올바르지 않습니다.)`);
        error(res, `올바르지 않은 요청이에요.`);
        return;
    }

    // 삭제 시작
    const rs = await Note.delete({
        note_id: note.note_id,
        user_id: note.user_id
    })

    if(rs) {
        Log.log(`${prefix} 성공했습니다.`);
        success(res);
    } else {
        Log.error(`${prefix} 실패했습니다.`);
        error(res, `메모장 삭제에 실패했어요.`);
    }
})

/*  메모장 정보 반환  */
noteRouter.get("/notes/:uid/:nid", async (req, res) => {

    // 나의 유저 아이디
    const userId  = req["user_id"];

    // 노트 소유자 아이디
    const ownerId = req.params.uid;

    // 노트 아이디
    const noteId  = req.params.nid;

    // 노트
    const note = Note.getNoteFromObj({ note_id: noteId, user_id: ownerId });

    const prefix = `[note/notes] [${userId}]:`;
    const suffix = `(uid: ${ownerId}, nid: ${noteId})`;

    // 메모장 소유자나 메모장 아이디를 입력하지 않음
    if(!ownerId || !noteId) {
        Log.warn(`${prefix} 메모장을 찾을 수 없습니다. ${suffix}`)
        error(res, `메모장을 찾을 수 없어요.`)
        return;   
    }

    // 메모장 읽기 권한 확인하기
    if(await Note.hasPermission(note, userId, NotePermission.READ)) {

        Log.log(`${prefix} 메모장 정보를 불러오고 있습니다. ${suffix}`);

        // 정보 가져오고 반환하기
        const info = await Note.getInfoById(note);

        Log.log(`${prefix} 메모장 정보를 반환했습니다. ${suffix}`);
        success(res, info)

    } else {

        Log.warn(`${prefix} 실패했습니다. ${suffix}`)
        error(res, `메모장을 찾을 수 없거나 권한이 없어요.`);

    }
})

/*  특정 유저에 대한 메모장 권한 반환  */
noteRouter.post("/permission", async (req, res) => {
    const userId     = req["user_id"];
    const targetUser = req.body.target_user;
    const note       = Note.getNoteFromObj(req.body.note);

    const prefix = `[note/permission] [${userId}]:`;

    if(!note) {
        Log.warn(`${prefix} 노트 정보가 올바르지 않거나 넘어오지 않았습니다.`);
        error(res, `노트를 찾을 수 없어요.`);
        return;
    }

    const permissions = Note.getPermissions(note, targetUser);

    Log.log(`${prefix} ${note.note_id} 메모장에 대한 '${targetUser}'에게 허용된 모든 권한을 반환했습니다.`)
    success(res, { permissions: permissions });
})