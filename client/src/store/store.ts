import { configureStore } from "@reduxjs/toolkit";
import { noteSlice } from "./note";

export const store = configureStore({
    reducer: {
        note: noteSlice.reducer
    }
})

export type RootState = ReturnType<typeof store.getState>