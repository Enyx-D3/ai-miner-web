import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type UploadedArchive = {
  name: string;
  size: string;
  sizeBytes?: number;
  source: string;
};

type RefineryState = {
  uploadedArchive: UploadedArchive | null;
};

const initialState: RefineryState = {
  uploadedArchive: null,
};

const refinerySlice = createSlice({
  name: "refinery",
  initialState,
  reducers: {
    setUploadedArchive(state, action: PayloadAction<UploadedArchive>) {
      state.uploadedArchive = action.payload;
    },
    clearUploadedArchive(state) {
      state.uploadedArchive = null;
    },
  },
});

export const { setUploadedArchive, clearUploadedArchive } = refinerySlice.actions;
export default refinerySlice.reducer;
