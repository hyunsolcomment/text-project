import axios from "axios";
import { noteSlice } from "../store/note";
import { RootState, store } from "../store/store";

export class Note {
    static get() {
        return (state: RootState) => state.note;
    }

    /**
     * 메모장 목록을 불러옵니다.
     */
    static async loadNoteList() {

        try {

            const {data} = await axios.post("/notes");

            console.log(`loadNoteList:`,data);
            
            store.dispatch(noteSlice.actions.setNoteList(data.note_list))
        } catch (e) {
            console.error(e);
            alert("메모장 목록을 불러오지 못했어요.");
        }
    }
}