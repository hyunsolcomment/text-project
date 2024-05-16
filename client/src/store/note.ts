import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { NoteItem } from "../@types/INoteList";

interface init {
    noteList: NoteItem[]
}

export const noteInit: init = {
    noteList: []
}

export const noteSlice = createSlice({
    name: 'note',
    initialState: noteInit,
    reducers: {
        setNoteList(state, action: PayloadAction<typeof noteInit.noteList>) {
            state.noteList = action.payload;
        }
    }
})