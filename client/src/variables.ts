export class V {
    static PORT = 1205;
    static DEV = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    static BACKEND = V.DEV ? `http://localhost:${V.PORT}` : `http://saehyeon.kr:${V.PORT}`;
}