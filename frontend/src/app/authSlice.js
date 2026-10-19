import { createSlice } from '@reduxjs/toolkit';
const auth = createSlice({
  name: 'auth',
  initialState: { user: null, accessToken: null, bootstrapped: false, sessionVersion: 0 },
  reducers: {
    credentials: (s, a) => {
      s.user = a.payload.user;
      s.accessToken = a.payload.accessToken;
      s.bootstrapped = true;
    },
    signedOut: (s) => {
      s.user = null;
      s.accessToken = null;
      s.bootstrapped = true;
      s.sessionVersion++;
    },
    sessionStarted: (s, a) => {
      s.user = a.payload.user;
      s.accessToken = a.payload.accessToken;
      s.bootstrapped = true;
      s.sessionVersion++;
    }
  }
});
export const { credentials, signedOut, sessionStarted } = auth.actions;
export default auth.reducer;
