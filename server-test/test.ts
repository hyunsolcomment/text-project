/*
    텍스트 프로젝트 백엔드 테스트 코드
*/

import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

// axios 설정
axios.defaults.url = 'http://localhost:1205';
axios.defaults.baseURL = 'http://localhost:1205';
axios.defaults.withCredentials = true;
axios.defaults.headers["Content-Type"] = 'application/json';

// 쿠키를 저장할 CookieJar 인스턴스 생성
const jar = new CookieJar();

// axios 인스턴스 생성하고 쿠키 지원 추가
const client = wrapper(axios.create({ jar }));

let err = false;

function pass() {
    //@ts-ignore
    process.stdout.write(`\x1b[92m → 통과\x1b[0m`)
}

function fail(err_message?: string | undefined) {
    //@ts-ignore
    process.stdout.write(`\x1b[91m → 실패 (오류: ${err_message})\x1b[0m`)
}

function log(message: string) {
    //@ts-ignore
    process.stdout.write(`\n${message}\x1b[0m`)
}

/*
계정1 - ParkSaehyeon._.
계정2 - LeeChaeYeun1201
공통 비밀번호 - test1234
*/

const TEST_ID_1 = 'ParkSaehyeon._.';
const TEST_ID_2 = 'LeeChaeYeun1201';

/** ParkSaehyeon._. 계정 생성 테스트 */
async function register1() {
    log(`계정 생성 (${TEST_ID_1})`)
    await client.post('/user/register', {
        id: TEST_ID_1,
        pw: 'test1234'
    })
}

/** LeeChaeYeun1201 계정 생성 테스트 */
async function register2() {
    log(`계정 생성 (${TEST_ID_2})`)
    await client.post('/user/register', {
        id: TEST_ID_2,
        pw: 'test1234'
    })
}

async function login1() {
    const {data} = await client.post('/user/login', {
        id: TEST_ID_1,
        pw: 'test1234'
    })

    return data;
}

async function login2() {
    const {data} = await client.post('/user/login', {
        id: TEST_ID_2,
        pw: 'test1234'
    })

    return data;
}

async function create_note() {
    const {data} = await client.post('/note/create');

    return data;
}

async function edit_note() {
    const {data} = await client.post("/note/edit", {
        note: {note_id: 1, user_id: TEST_ID_2},
        content: "권한없이 수정"
    })

    return data;
}

/** 쓰기 권한을 부여받은 유저가 남의 메모장을 편집할 수 있는지 테스트 */
async function note_test_1() {
    console.log("\n\n---\n쓰기 권한 테스트")
    console.log(`(공유받는 유저: ${TEST_ID_1}, 메모장 소유 유저: ${TEST_ID_2})`)

    log(`소유 유저 로그인`)
    let rs = await login2();

    if(rs.success) {
        pass();
    } else {
        return fail(rs.error);
    }

    log(`메모장 생성`)
    rs = await create_note();

    if(rs.success) {
        pass();
    } else {
        return fail(rs.error);
    }

    const note_id = rs.data.note_id as number;

    // 다른 계정으로 로그인
    log(`공유받는 유저 로그인`);
    
    rs = await login1();

    if(rs.success) {
        pass();
    } else {
        return fail(rs.error);
    }

    // 권한이 없는 상태에서 메모장 수정 시도
    log(`권한이 없는 상태에서 메모장 수정`)
    
    rs = await edit_note();

    if(rs.success) {
        return fail(`쓰기 권한이 없는데 메모장 수정에 성공함.`);
    } else {
        pass();
    }

    // 권한 부여를 위해 메모장 소유 계정에 로그인
    log(`소유 유저 로그인`)

    await login2();

    // ParkSaehyeon._.에게 쓰기 권한 부여
    log(`쓰기 권한 부여`)
    rs = (await client.post("/note/set-permission", {
        note: {note_id: note_id, user_id: TEST_ID_2},
        target_user: TEST_ID_1,
        permission: 'can_write',
        permission_value: 'true'
    })).data;

    if(rs.success) {
        pass();
    } else {
        return fail(rs.error);
    }

    // 권한이 제대로 부여되었는지 확인
    log(`권한 목록 확인`)
    rs = (await client.post("/note/permission", {
        note: {note_id: note_id, user_id: TEST_ID_2 },
        target_user: TEST_ID_1
    })).data

    if(rs.success) {

        if(rs.data.permissions.can_write) {
            pass();
        } else {
            return fail(`쓰기 권한이 부여되지 않음.`)
        }
    } else {
        return fail(rs.error);
    }

    // 공유받은 계정으로 로그인
    log(`공유받는 유저 로그인`)
    await login1();

    // 메모장 수정
    log(`공유받은 메모장 편집`)
    
    rs = (await client.post("/note/edit", {
        note: {note_id: note_id, user_id: TEST_ID_2 },
        content: "hello world"
    })).data;

    if(rs.success) {
        pass();
    } else {
        return fail(rs.error);
    }

    // 메모장 수정 확인
    log(`수정된 메모장 내용 확인`)
    rs = (await client.get(`/note/notes/${TEST_ID_2}/${note_id}`)).data;

    if(rs.success) {
        
        if(rs.data.info.content === 'hello world') {
            pass();
        } else {
            return fail(`수정된 내용이 올바르지 않음. (content: ${rs.data.info.content})`)
        }
    } else {
        return fail(rs.error);
    }

    // 끝
    log(`테스트 끝`)
}

const funcList = [
    register1,
    register2,
    note_test_1
]

async function start() {
    console.clear();
    console.log("테스트 시작");

    for(let func of funcList) {
        if(err) return;
    
        try {
            await func()
        } catch (e) {
            console.error(e);
            fail("오류 메세지를 참고하시오");
        }
    }
}

console.clear();
start();