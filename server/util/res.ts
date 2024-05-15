export function success(res: any, data?: any) {

    if(data) {
        res.json({ success: true, data: data });
    } else {
        res.json({ success: true });
    }
}

export function error(res: any, error?: any) {

    if(error) {
        res.json({ success: false, error: error });
    } else {
        res.json({ success: false });
    }
}