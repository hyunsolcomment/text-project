import { useSelector } from "react-redux"
import { Note } from "../../modules/note";
import uuidv4 from "../../util/uuid";
import { date2str } from "../../util/date2str";
import { useEffect } from "react";

export default function NoteList() {
    const {noteList} = useSelector(Note.get());

    useEffect(() => {
        
    },[]);

    
    return (
        <div className="note-list">
            {
                noteList &&
                noteList.map(note => (
                    <div className="note-item" key={uuidv4()}>
                        <div className="title">{note.title}</div>
                        <div className="preview">{note.preview}</div>
                        <div className="create_date">{date2str(note.createDate)}</div>
                        <div className="last_edit_date">{date2str(note.lastEditDate)}</div>
                    </div>
                ))
            }
        </div>
    )
}