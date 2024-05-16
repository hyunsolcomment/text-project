import express from 'express';
import cors from 'cors';
import { config } from './node_modules/dotenv/lib/main';
import cookieParser from 'cookie-parser';
import { Log } from './util/logger';
import { userRouter } from './api/user';
import { profileRouter } from './api/profile';
import { noteRouter } from './api/note';
import { V } from './v';
import { Debug } from './modules/debug';

config();

const app = express();

app.use(cors({
    credentials: true,
    origin: process.env.ORIGIN.split(","),
}))

app.use(express.json());
app.use(cookieParser());

app.use('/user', userRouter);
app.use('/profile', profileRouter);
app.use('/note', noteRouter);

app.listen(process.env.PORT, async () => {
    console.clear();
    
    if(V.DEBUG) {
        Log.warn(`! 디버그 모드 !`);
        await Debug.clearDB();
        Log.log(`DB 초기화`)
        Log.warn(`! 디버그 모드 !`);
    }
    Log.log(`텍스트 프로젝트 (${process.env.PORT})`)
})