import path from "path";
import fs from 'fs-extra';
import { config } from "dotenv";
import { Log, LogLevel } from "../util/logger";

config();

export class Profile {

    /** 
     * 프로필 이미지 허용 확장자 
     */
    private static allowImageExt: string[] = [];

    /**
     * 프로필 이미지가 저장되는 폴더를 반환
     */
    static getImageFolderPath() {
        return path.join(__dirname, 'avaters');
    }

    /** 
     * 프로필 이미지 업로드에 대해 허용된 확장자인지 여부를 반환 
     * @param ext 확장자
     */
    static isAllowImageExt(ext: string) {
        if(!ext.includes(".")) return false;

        return Profile.allowImageExt.includes(ext);
    }

    /** 
     * 파일 이름을 가지고 이미지 경로를 반환 
     */
    static createImagePath(file: string) {
        return path.join(Profile.getImageFolderPath(), file);
    }

    /**
     * 특정 유저 아이디의 프로필 사진 경로를 반환
     * @param user_id 유저 아이디
     */
    static async getImagePath(user_id: string) {
        const logPrefix = `[profile.getImagePath]`;

        for(let file of await fs.readdir(Profile.getImageFolderPath(), { withFileTypes: true })) {
            if(file.isFile()) {

                const name = path.parse(file.name).name;
                const ext  = path.parse(file.name).ext;
                
                // 파일 이름이 유저 아이디인지 확인
                if(name === user_id) {
                    if(Profile.isAllowImageExt(ext)) {
                        const finalImgPath = Profile.createImagePath(name+ext);

                        Log.log(`${logPrefix} '${user_id}' 유저의 프로필 사진 경로를 반환합니다. (경로: ${finalImgPath})`, LogLevel.DETAIL);

                        return Profile.createImagePath(name+ext);

                    } else {

                        Log.warn(`${logPrefix} '${user_id}' 유저의 아이디와 같은 이름의 파일이 있으나 허용되지 않은 파일이므로 경로를 반환하지 않았습니다.`, LogLevel.DETAIL);
                    }

                    return undefined;
                }
            }
        }

        Log.log(`${logPrefix} '${user_id}' 유저의 프로필 사진이 없기때문에 경로를 반환하지 않았습니다.`, LogLevel.DETAIL);
        return undefined;
    }

    /**
     * 특정 유저의 프로필 사진을 삭제
     */
    static async removeImage(user_id: string) {
        const imgPath = await Profile.getImagePath(user_id);

        Log.log(`[profile.removeImage] 호출되었습니다. (user_id = '${user_id}')`, LogLevel.DETAIL);

        if(imgPath) {
            await fs.rm(imgPath, { recursive: true, force: true });
            Log.log(`[profile.removeImage] '${user_id}' 유저의 프로필 이미지를 삭제했습니다. (경로: ${imgPath})`);
        } else {
            Log.log(`[profile.removeImage] '${user_id}' 유저 프로필 이미지가 없어 삭제하지 못했습니다.`)
        }
    }
} 