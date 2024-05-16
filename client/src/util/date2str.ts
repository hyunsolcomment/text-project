export function date2str(date: Date, options?: { year: boolean, month: boolean, day: boolean, hour: boolean, minutes: boolean, seconds: boolean }) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    let finalStr: string[] = [];

    if(options?.year ?? true) {
        finalStr.push(`${year}년`);
    }

    if(options?.month ?? true) {
        finalStr.push(`${month}월`);
    }

    if(options?.day ?? true) {
        finalStr.push(`${day}일`);
    }

    if(options?.hour ?? true) {
        finalStr.push(`${hours}시`);
    }

    if(options?.minutes ?? true) {
        finalStr.push(`${minutes}분`);
    }

    if(options?.seconds ?? true) {
        finalStr.push(`${seconds}초`);
    }

    return finalStr.join(" ");

}