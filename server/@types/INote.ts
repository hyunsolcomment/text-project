export interface NoteMeta {
    user_id: string,
    note_id: number
}

export interface INote { 
    note_id: number, 
    title: string, 
    content: string, 
    owner_id: string, 
    create_date: Date, 
    last_edit_date: Date | undefined | null 
}
