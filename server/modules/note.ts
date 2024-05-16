import { INote, NoteMeta } from "../@types/INote";
import { NotePermission } from "../@types/NotePermission";
import { DBUtil } from "../util/db";
import { Log, LogLevel } from "../util/logger";

export class Note {

    /**
     * 특정 유저의 메모장을 생성
     * @returns 생성된 메모장의 note_id. 메모장 생성에 실패했을 경우 -1를 반환
     */
    static async create(user_id: string) {
        const prefix = `[note.create]`;
        const action = `'${user_id}' 소유의 메모장 생성`;

        try {

            // note-list 테이블에 정보 추가
            const [rs] = await DBUtil.query(`
                INSERT INTO
                    ${Note.getNoteListTableName(user_id)} (title,content)
                VALUES (
                    '제목없음', ''
                )
            `);
            
            const note_id = rs["insertId"];

            // note-share 테이블 생성
            await Note.createNoteShareTable({ user_id: user_id, note_id: note_id });

            Log.log(`${prefix} ${action}했습니다. (note_id: ${note_id})`, LogLevel.DETAIL);

            return note_id as number;

        } catch (e) {

            Log.error(`${prefix} ${action}하지 못했습니다:`);
            console.error(e);

            return -1;
        }
    }

    /**
     * 유저의 note-list 테이블 생성
     */
    static async createNoteListTable(user_id: string) {
        await DBUtil.query(`
            CREATE TABLE ${Note.getNoteListTableName(user_id)} (
                note_id         INT NOT NULL AUTO_INCREMENT COMMENT '노트 아이디',
                title           VARCHAR(100) DEFAULT '제목없음' COMMENT '노트 제목',
                content         TEXT COMMENT '노트 내용',
                create_date     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '노트 생성일',
                last_edit_date  TIMESTAMP COMMENT '노트 마지막 수정일',
                CONSTRAINT PK_NOTE_ID PRIMARY KEY (note_id)
            );
        `)

        Log.log(`[note] note-list-${user_id} 테이블을 생성했습니다.`, LogLevel.DETAIL);
    }

    /**
     * 유저의 note-shared 테이블 생성
     * (다른 유저로부터 공유받은 메모장 ID 목록)
     */
    static async createSharedNoteListTable(user_id: string) {
        try {
            await DBUtil.query(`
                CREATE TABLE ${Note.getNoteSharedTableName(user_id)} (
                    note_id     INT NOT NULL COMMENT '공유받은 메모장의 ID',
                    owner_id    VARCHAR(20) NOT NULL COMMENT '공유받은 메모장의 소유자',
                    PRIMARY KEY (note_id, owner_id)
                )
            `)
            Log.log(`[note] '${user_id}'의 note-shared 테이블을 생성했습니다.`, LogLevel.DETAIL);

        } catch (e) {
            Log.error(`[note] '${user_id}'의 note-shared 테이블을 생성하지 못했습니다.`);
            console.error(e);
            return false;
        }
    }

    /**
     * 유저의 note-shared 테이블 삭제
     */
    static async deleteSharedNoteListTable(user_id: string) {
        try {
            await DBUtil.query(`
                DROP TABLE \`note-shared-${user_id}\`
            `)
            Log.log(`[note] '${user_id}'의 note-shared 테이블을 삭제했습니다.`)
        } catch (e) {
            Log.error(`[note] '${user_id}'의 note-shared 테이블 삭제에 실패했습니다.`)
            console.error(e);
            return false;
        }
    }

    /**
     * 특정 메모장의 note-share 테이블 이름 반환
     */
    static getNoteShareTableName(note: NoteMeta) {
        return `\`note-share-${note.user_id}-${note.note_id}\``;
    }   

    /**
     * 특정 유저의 note-list 테이블(유저 메모장 목록 테이블) 이름을 반환
     */
    static getNoteListTableName(user_id: string) {
        return `\`note-list-${user_id}\``
    }

    /**
     * 특정 유저의 note-shared 테이블(공유받은 메모장 목록) 이름 반환
     */
    static getNoteSharedTableName(user_id: string) {
        return `\`note-shared-${user_id}\``;
    }

    /**
     * 공유받은 메모장의 기본 정보(NoteMeta) 목록을 반환
     */
    static async getSharedNoteMetaList(user_id: string) {
        const [rs] = await DBUtil.query(`
            SELECT
                note_id, owner_id
            FROM
                ${Note.getNoteSharedTableName(user_id)}
        `)

        return (rs as any).map((data: any) => ({
            note_id: data["note_id"] as number,
            owner_id: data["owner_id"] as string
        })) as { note_id: number, owner_id: string }[]
    }

    /**
     * 특정 유저가 소유 중인 메모장 목록을 반환
     */
    static async getNoteList(user_id: string) {
        const finalNoteList: INote[] = [];

        let sql = `
            SELECT
                note_id, title, content, create_date, last_edit_date
            FROM
                ${Note.getNoteListTableName(user_id)}
        `;

        // 나의 메모장 목록 불러오기
        const [myNoteListRs] = await DBUtil.query(sql)

        const myNoteList: INote[] = (
            myNoteListRs as { 
                note_id: number, 
                title: string, 
                content: string, 
                create_date: Date, 
                last_edit_date: Date | undefined | null
            }[]
        ).map(el => ({
            ...el, owner_id: user_id
        }))

        finalNoteList.push(...myNoteList);

        return finalNoteList;
    }

    /**
     * 특정 유저가 공유받고 있는 메모장 목록을 반환
     */
    static async getSharedNoteList(user_id: string): Promise<INote[]> {
        const result: INote[] = [];

        const sharedNotes = await Note.getSharedNoteMetaList(user_id);

        for(let n of sharedNotes) {
            let info = await Note.getInfoById({ note_id: n.note_id, user_id: n.owner_id });

            if(!info) {
                result.push({...info, owner_id: n.owner_id })
            }
        }

        return result;
    }

    /**
     * 특정 유저가 열람할 수 있는 모든 메모장을 반환합니다.
     * @param user_id 대상 유저 아이디
     */
    static async getNoteListAll(user_id: string) {
        const prefix = `[메모장 목록 반환] [${user_id}]:`;

        try {   

            // 소유하고 있는 메모장 목록 불러오기
            const myNoteList = await Note.getNoteList(user_id);

            // 공유받고 있는 메모장 목록 불러오기
            const sharedNotes = await Note.getSharedNoteList(user_id);

            const result = [...myNoteList, ...sharedNotes];
            
            Log.log(`${prefix} 메모장 목록을 반환했습니다. (소유 메모장: ${result.length}개, 공유 받은 메모장: ${result.filter(n => n.owner_id !== user_id).length}개)`)

            return result;

        } catch (e) {
            Log.error(`${prefix} 메모장 목록 반환에 실패했습니다:`)
            console.error(e);
            return [];
        }
    }

    /**
     * 특정 메모장의 공유 옵션 테이블 생성
     */
    static async createNoteShareTable(note: NoteMeta) {
        await DBUtil.query(`
            CREATE TABLE ${Note.getNoteShareTableName(note)} (
                user_id    VARCHAR(20) PRIMARY KEY,
                can_read   BOOLEAN DEFAULT TRUE COMMENT '읽기 권한',
                can_write  BOOLEAN DEFAULT FALSE COMMENT '쓰기 권한',
                can_delete BOOLEAN DEFAULT FALSE COMMENT '삭제 권한'
            );
        `)
    }

    /**
     * 특정 메모장의 특정 유저에 대한 권한 설정
     */
    static async setPermission(
        { note, target_user, permission, permission_value }: 
        { note: NoteMeta, target_user: string, permission: NotePermission, permission_value: boolean }
    ) {

        const prefix = `[note.setPermission]`;
        const action = `'${note.user_id}'의 ${note.note_id} 노트에 대한 ${target_user}의 권한을 설정`;

        try {

            let noteShareTable = Note.getNoteShareTableName(note);

            // note-share 테이블에 추가
            await DBUtil.query(`
                INSERT INTO ${noteShareTable} (
                    user_id, ${permission}
                ) VALUES (
                    ?, ${permission_value ? 1 : 0}
                )
                ON DUPLICATE KEY UPDATE
                    ${permission} = VALUES(${permission});
            `, [target_user]);
            
            // target_user의 note-shared 테이블에 이 메모장을 추가
            await Note.addSharedNote(target_user, note);

            Log.log(`${prefix} ${action}했습니다. (권한: ${permission}, 권한 값: ${permission_value})`)
            return true;

        } catch (e) {

            Log.error(`${prefix} ${action}하지 못했습니다:`)
            console.error(e);
            return false;
        }
    }

    /**
     * 특정 유저의 특정 메모장에 대한 권한을 가지는지 여부 반환
     */
    static async hasPermission(note: NoteMeta, target_user: string, permission: NotePermission) {
        
        const prefix = `[note.hasPermission]`;
        const action = `'${note.user_id}' 소유의 ${note.note_id} 메모장에 대해 '${target_user}'(이)가 '${permission}' 권한 여부 반환`

        try {

            const [result] = await DBUtil.query(`
                SELECT
                    user_id
                FROM
                    ${Note.getNoteShareTableName(note)}
                WHERE
                    user_id = ? AND
                    ${permission} = 1
            `, [target_user])

            Log.log(`${prefix} ${action}했습니다.`, LogLevel.DETAIL)

            //@ts-ignore
            return result.length > 0;

        } catch (e) {

            let reason = "";

            switch(e.code) {
                case 'ER_NO_SUCH_TABLE':
                    reason = "메모장을 찾을 수 없습니다."
                    break;
                default:
                    console.error(e);
                    reason = "↑↑↑"
                    break;
            }

            Log.error(`${prefix} ${action}에 실패했습니다. (${reason})`);
            return false;
        }
    }

    /**
     * 특정 유저의 특정 메모장에 대한 권한 목록을 반환
     */
    static async getPermissions(note: NoteMeta, target_user: string) {
        const prefix = `[note.getPermissions]`;
        const action = `'${note.user_id}' 소유의 ${note.note_id} 메모장에 대한 '${target_user}'에게 부여된 모든 권한을 반환`
        
        const [result] = await DBUtil.query(`
            SELECT
                can_write, can_read, can_delete
            FROM
                ${Note.getNoteShareTableName(note)}
            WHERE
                user_id = ?
        `, [target_user])

        if(result[0]) {

            Log.log(`${prefix} ${action}했습니다.`, LogLevel.DETAIL);

            return {
                can_write: result[0]["can_write"] as boolean,
                can_read: result[0]["can_read"] as boolean,
                can_delete: result[0]["can_delete"] as boolean,
            }
        }

        Log.log(`${prefix} ${action}했습니다. (공유되지 않은 유저이므로 아무 권한도 없습니다.)`, LogLevel.DETAIL);

        return {
            can_write: false,
            can_read: false,
            can_delete: false
        }
    }

    static validPermission(permission: string) {
        return ["can_write","can_read","can_delete"].includes(permission);
    }

    /**
     * 특정 유저의 note-shared(공유받은 메모장 목록)에 특정 메모장을 추가
     * @param shared_user_id 메모장을 공유받은 유저 아이디
     * @param note 공유받은 메모장 정보
     */
    static async addSharedNote(shared_user_id: string, note: NoteMeta) {
        const action = `공유받은 메모장 목록에 ${Note.toString(note)}을 추가`;

        try {
            await DBUtil.query(`
            INSERT INTO ${Note.getNoteSharedTableName(shared_user_id)} (note_id, owner_id)
                VALUES (${note.note_id}, ?)
        `, [note.user_id])

        Log.log(`[note] [${shared_user_id}]: ${action}했습니다.`);
        } catch (e) {
            if(e.code === 'ER_DUP_ENTRY') {
                Log.log(`[note] [${shared_user_id}] ${action}했습니다. (이미 공유받고 있는 메모장입니다.)`);
            }

            else {
                Log.error(`[note] [${shared_user_id}]: ${action}하지 못했습니다.`)
                console.error(e);
            }
        }
    }

    /**
     * INote를 출력 시 사용할 문자열로 반환
     */
    static toString(note: NoteMeta | undefined) {
        note = Note.getNoteFromObj(note);

        if(note) {
            return `'${note.user_id}' 소유의 메모장(아이디: ${note.note_id})`;
        } else {
            return `(올바른 메모장이 아님)`;
        }
    }

    /**
     * 특정 유저의 note-shared(공유받은 메모장 목록)에서 특정 메모장을 삭제
     * @param shared_user_id 메모장을 공유 받았던 유저 아이디
     * @param note 공유되었던 메모장 정보
     */
    static async removeSharedNote(shared_user_id: string, note: NoteMeta) {
        
        // 공유받은 유저의 note-shared 테이블에서 제거
        await DBUtil.query(`
            DELETE FROM 
                ${Note.getNoteSharedTableName(shared_user_id)} 
            WHERE
                note_id = ? AND
                owner_id = ?
        `, [note.note_id, note.user_id])

        Log.log(`[note] [${shared_user_id}]: 공유받은 메모장 목록에서 ${Note.toString(note)}을 제거했습니다.`)
    }

    /**
     * 특정 메모장을 특정 유저와 공유하도록 합니다.
     * @param note 공유할 메모장 정보
     * @param target_user 공유할 대상 유저의 아이디
     */
    static async share(note: NoteMeta, target_user: string) {
        const prefix = `[note.share]`;
        const action = `[${note.user_id}]: ${note.note_id} 메모장을 '${target_user}'와 공유`;

        try {

            // target_user의 읽기 권한 활성화
            await Note.setPermission({
                note             : note,
                target_user      : target_user,
                permission       : NotePermission.READ,
                permission_value : true
            })

            // 공유받은 유저의 note-shared 테이블에 추가
            await Note.addSharedNote(target_user, note)

            Log.log(`${prefix} ${action}했습니다. (읽기 권한 활성화)`);
            return true;

        } catch (e) {
            Log.error(`${prefix} ${action}에 실패했습니다:`)
            console.error(e);
            return false;
        }
    }

    /**
     * 특정 메모장의 특정 유저에 대한 공유 해제
     * 
     * @param note 대상 메모장
     * @param target_user 공유 해제될 유저의 아이디
     */
    static async deleteShare(note: NoteMeta, target_user: string) {
        const prefix  = `[note.deleteShareUser]`;
        const action  = `'${note.user_id}' 소유의 ${note.note_id} 메모장으로부터 '${target_user}'의 공유를 해제`;

        if(note.user_id === target_user) {
            Log.warn(`${prefix} ${action}하지 못했습니다. 본인 소유의 메모장에서 본인에 대한 공유를 해제할 수 없습니다.`, LogLevel.DETAIL)
            return false;
        }

        try {

            // note-share 테이블에서 삭제
            await DBUtil.query(`
                DELETE FROM
                    ${Note.getNoteShareTableName(note)}
                WHERE
                    user_id = ?;
            `, [ target_user ]);

            // note-shared 테이블에서 삭제
            await Note.removeSharedNote(target_user, note);

            Log.log(`${prefix} ${action}했습니다.`)
            return true;

        } catch (e) {
            Log.error(`${prefix} ${action}하지 못했습니다:`)
            console.error(e);
            return false;
        }
    }

    /**
     * 메모장 수정
     */
    static async edit(note: NoteMeta, {title,content}: { title: string, content: string }) {
        
        const prefix = `[note.edit]`;
        const action = `'${note.user_id}' 소유의 ${note.note_id} 메모장을 수정`;

        try {

            await DBUtil.query(`
                UPDATE ${Note.getNoteListTableName(note.user_id)} SET
                    title = ?,
                    content = ?,
                    last_edit_date = ?
                WHERE
                    note_id = ${note.note_id}
            `, [title, content, new Date()])

            Log.log(`${prefix} ${action}했습니다.`);
            return true;

        } catch (e) {
            Log.error(`${prefix} ${action}하지 못했습니다:`)
            console.error(e);

            return false;
        }
    }

    /**
     * 노트 내용 반환
     * 
     * @returns title(제목), content(내용), create_date(메모장 생성일), last_edit_date(메모장 마지막 수정일)을 반환합니다.
     *          메모장이 존재하지 않거나 하는 이유로 정보 수집에 실패했다면 undefined를 반환합니다.
     */
    static async getInfoById(note: NoteMeta): Promise<INote> {

        const prefix = `[note.getInfoById]`;
        const action = `'${note.user_id}' 소유의 ${note.note_id} 메모장 내용을 반환`;
    
        try {
            const [rs] = await DBUtil.query(`
                SELECT
                    title, content, create_date, last_edit_date
                FROM
                    ${Note.getNoteListTableName(note.user_id)}
                WHERE
                    note_id = ${note.note_id}
            `);

            const data = rs[0];
            console.log(data);

            return {
                note_id        : note.note_id,
                title          : data["title"],
                content        : data["content"],
                create_date    : data["create_data"],
                last_edit_date : data["last_edit_date"],
                owner_id       : note.user_id,
            }

        } catch (e) {
            Log.error(`${prefix} ${action}하지 못했습니다:`)
            console.error(e);

            return undefined;
        }
    }

    /**
     * 특정 메모장을 공유받고 있는 모든 유저들을 반환
     * @param shareNote 공유 중인 메모장 정보
     * @returns 메모장을 공유받고 있는 유저들의 아이디 목록
     */
    static async getUsersByShareNote(shareNote: NoteMeta) {
        const [userList] = await DBUtil.query(`
            SELECT
                user_id
            FROM
                ${Note.getNoteShareTableName(shareNote)}
        `)

        
        return (userList as { user_id: string }[])?.map(el => el.user_id) ?? [];
    }

    /**
     * 메모장 삭제
     */
    static async delete(note: NoteMeta) {

        const prefix = '[note.delete]'
        const action = `'${note.user_id}' 소유의 ${note.note_id} 메모장 삭제`;

        try {   

            Log.log(`${prefix} ${action}를 시작합니다.`);

            /*  메모장을 공유받고 있는 모든 유저들의 note-shared에서 삭제  */

            // 1. 메모장을 공유받고 있는 모든 유저들을 반환
            const sharedUsers = await Note.getUsersByShareNote(note);

            // 2. 해당 유저들의 note-shared 테이블에서 이 메모장을 삭제
            for(let user of sharedUsers) {
                await Note.removeSharedNote(user, note);
            }

            /*  note-list에서 삭제, note-share 테이블 삭제  */
            await DBUtil.query(`
            
                -- note-list에서 정보 삭제
                DELETE FROM
                    ${Note.getNoteListTableName(note.user_id)}
                WHERE
                    note_id = ${note.note_id};

                -- note-share 테이블 삭제
                DROP TABLE ${Note.getNoteShareTableName(note)};
            `)

            Log.log(`${prefix} ${action}했습니다.`);
            return true;

        } catch (e) {
            Log.error(`${prefix} ${action}에 실패했습니다.`);
            console.error(e);
            return false;
        }
    }

    /**
     * 특정 값이 INote로써 이용될 수 있는지 여부를 반환
     */
    static getNoteFromObj(obj: any): NoteMeta {
        if(obj && typeof obj === 'object') {

            let user_id = obj["user_id"];
            let note_id = obj["note_id"];

            let flag = false;

            try {
                parseInt(note_id);
                flag = true;
            } catch (e) { 
                return undefined; 
            }

            if(user_id && flag) {

                note_id = typeof note_id === 'string' ? parseInt(note_id) : note_id;

                return {
                    user_id: user_id,
                    note_id: obj["note_id"]
                }
            }
        }

        return undefined;
    }

}