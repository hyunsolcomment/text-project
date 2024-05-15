import express from 'express';
import cors from 'cors';
import { config } from './node_modules/dotenv/lib/main';
import cookieParser from 'cookie-parser';
import { Log } from './util/logger';
import { userRouter } from './api/user';
import { profileRouter } from './api/profile';
import { noteRouter } from './api/note';

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

app.listen(process.env.PORT, () => {
    console.clear();
    Log.log(`텍스트 프로젝트 (${process.env.PORT})`)
})