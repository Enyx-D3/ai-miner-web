import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  signedIn: boolean;
}

const initialState: AuthState = {
  signedIn: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<unknown | undefined>) => {
      void action;
      state.signedIn = true;
    },
    setRefreshToken: (state, action: PayloadAction<unknown | undefined>) => {
      void state;
      void action;
    },
    logout: (state) => {
      state.signedIn = false;
    },
  },
});

export const { setUser, setRefreshToken, logout } = authSlice.actions;

export default authSlice.reducer;
