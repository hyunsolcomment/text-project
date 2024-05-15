import { INote } from "../@types/INote";
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
            const rs = await DBUtil.query(`
                INSERT INTO
                    note-list-${user_id} (title, content,create_date)
                VALUES (
                    '제목없음', '', ${new Date().getTime()}
                )
            `);

            const note_id = rs["insertId"];

            // note-share 테이블 생성
            await Note.createNoteShareTable({ user_id: user_id, note_id: note_id });

            Log.log(`${prefix} ${action}했습니다. (note_id: ${note_id})`);

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
            CREATE TABLE \`note-list-${user_id}\` (
                note_id         INT NOT NULL AUTO_INCREMENT COMMENT '노트 아이디',
                title           VARCHAR(100) DEFAULT '제목없음' COMMENT '노트 제목',
                content         TEXT COMMENT '노트 내용',
                create_date     INT NOT NULL COMMENT '노트 생성일',
                last_edit_date  INT COMMENT '노트 마지막 수정일',
                CONSTRAINT PK_NOTE_ID PRIMARY KEY (note_id)
            );
        `)

        Log.log(`[note] note-list-${user_id} 테이블을 생성했습니다.`);
    }

    static getNoteShareTableName(note: INote) {
        return `note-share-${note.user_id}-${note.note_id}`;
    }   

    /**
     * 특정 메모장의 공유 옵션 테이블 생성
     */
    static async createNoteShareTable(note: INote) {
        await DBUtil.query(`
            CREATE TABLE ${Note.getNoteShareTableName(note)} (
                user_id    VARCHAR(20),
                can_read   BOOLEAN DEFAULT TRUE COMMENT '읽기 권한',
                can_write  BOOLEAN DEFAULT FALSE COMMENT '쓰기 권한',
                can_delete BOOLEAN DEFAULT FALSE COMMENT '삭제 권한',

                CONSTRAINT FK_USER_ID FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `)
    }

    /**
     * 특정 메모장의 특정 유저에 대한 권한 설정
     */
    static async setPermission(
        { note, target_user, permission, permission_value }: 
        { note: INote, target_user: string, permission: NotePermission, permission_value: boolean }
    ) {

        const prefix = `[note.setPermission]`;
        const action = `${note.user_id}의 ${note.note_id} 노트에 대한 ${target_user}의 권한을 설정`;

        try {

            let noteShareTable = Note.getNoteShareTableName(note);

            await DBUtil.query(`
                INSERT INTO ${noteShareTable} (user_id, permission, permission_value)
                    VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    permission = VALUES(permission),
                    permission_value = VALUES(permission_value);

            `, [target_user, permission, permission_value]);

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
    static async hasPermission(note: INote, target_user: string, permission: NotePermission) {
        
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

            console.log(result[0],result[0].length);

            Log.log(`${prefix} ${action}했습니다.`)
            return result[0].length > 0;

        } catch (e) {
            Log.error(`${prefix} ${action}에 실패했습니다:`);
            console.error(e);
            return false;
        }
    }

    /**
     * 특정 유저의 특정 메모장에 대한 권한 목록을 반환
     */
    static async getPermissions(note: INote, target_user: string) {
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
     * 특정 메모장을 특정 유저와 공유하도록 합니다.
     */
    static async share(note: INote, target_user: string) {
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
    static async deleteShare(note: INote, target_user: string) {
        const prefix  = `[note.deleteShareUser]`;
        const action  = `'${note.user_id}' 소유의 ${note.note_id} 메모장으로부터 '${target_user}'의 공유를 해제`;

        if(note.user_id === target_user) {
            Log.warn(`${prefix} ${action}하지 못했습니다. 본인 소유의 메모장에서 본인에 대한 공유를 해제할 수 없습니다.`, LogLevel.DETAIL)
            return false;
        }

        try {

            await DBUtil.query(`
                DELETE FROM
                    ${Note.getNoteShareTableName(note)}
                WHERE
                    user_id = ?;
            `, [ target_user ]);

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
    static async edit(note: INote, {title,content}: { title: string, content: string }) {
        
        const prefix = `[note.edit]`;
        const action = `'${note.user_id}' 소유의 ${note.note_id} 메모장을 수정`;

        try {

            await DBUtil.query(`
                UPDATE SET
                    title = ?,
                    content = ?,
                    last_edit_date = ${new Date().getTime()}
                FROM
                    note-list-${note.user_id}
                WHERE
                    note_id = ?
            `, [title, content, note.note_id])

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
    static async getInfoById(note: INote) {

        const prefix = `[note.getInfoById]`;
        const action = `'${note.user_id}' 소유의 ${note.note_id} 메모장 내용을 반환`;
    
        try {
            const rs = await DBUtil.query(`
                SELECT
                    title, content, create_date, last_edit_date
                FROM
                    note-list-${note.user_id}
                WHERE
                    note_id = ${note.note_id}
            `);

            const data = rs[0][0];

            return {
                title          : data["title"] as string,
                content        : data["content"] as string,
                create_date    : new Date(data["create_data"] as number),
                last_edit_date : new Date(data["last_edit_date"] as number)
            }

        } catch (e) {
            Log.error(`${prefix} ${action}하지 못했습니다:`)
            console.error(e);

            return undefined;
        }
    }

    /**
     * 메모장 삭제
     */
    static async delete(note: INote) {

        const prefix = '[note.delete]'
        const action = `'${note.user_id}' 소유의 ${note.note_id} 메모장 삭제`;

        try {   
            await DBUtil.query(`
            
                -- note-list에서 정보 삭제
                DELETE FROM
                    note-list-${note.user_id}
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
    static getNoteFromObj(obj: any): INote {
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