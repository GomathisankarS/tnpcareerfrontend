import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import auth from './authSlice';
import { baseApi } from './baseApi';
export const makeStore = () =>
  configureStore({
    reducer: { auth, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (g) => g().concat(baseApi.middleware),
    devTools: import.meta.env.DEV
  });
export const store = makeStore();
setupListeners(store.dispatch);
