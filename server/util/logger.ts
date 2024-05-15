export enum LogLevel {
    DEFAULT = 1,
    DETAIL  = 2
}

export class Log {

    static LOG_LEVEL: number = 1;

    static nowStr() {
        const now     = new Date();
        const year    = now.getFullYear();
        const month   = String(now.getMonth() + 1).padStart(2, '0');
        const day     = String(now.getDate()).padStart(2, '0');
        const hours   = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    static error(content: string, level: LogLevel = 1) {
        if(Log.LOG_LEVEL < level) {
            return;
        }
        
        for(let str of content.split("\n")) {
            console.log(`\x1b[91m[${Log.nowStr()}] [오류] ${str}\x1b[0m`);
        }
    }

    static warn(content: string, level: LogLevel = 1) {
        if(Log.LOG_LEVEL < level) {
            return;
        }

        for(let str of content.split("\n")) {
            console.log(`\x1b[33m[${Log.nowStr()}] [경고] ${str}\x1b[0m`);
        }
    }

    static log(content: string, level: LogLevel = 1) {
        if(Log.LOG_LEVEL < level) {
            return;
        }

        if(content.length === 0) {
            console.log("");
        }
    
        for(let str of content.split("\n")) {
            console.log(`[${Log.nowStr()}] ${str}\x1b[0m`);
        }
    }
}