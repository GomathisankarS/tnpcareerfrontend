import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { credentials, signedOut } from './authSlice';
const raw = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || '/api',
  credentials: 'include',
  timeout: 15000,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }
});
let refreshPromise;
export async function renew(api, options) {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const version = api.getState().auth.sessionVersion;
      // A canceled query must not cancel the shared refresh for all other requests.
      const result = await raw(
        { url: '/auth/refresh', method: 'POST' },
        { ...api, signal: new AbortController().signal },
        options
      );
      if (version !== api.getState().auth.sessionVersion)
        return {
          error: {
            status: 401,
            data: { error: { code: 'SESSION_CHANGED', message: 'Session changed. Please retry.' } }
          }
        };
      if (result.data) {
        const previous = api.getState().auth.user;
        if (
          previous &&
          (previous.id !== result.data.data.user.id || previous.role !== result.data.data.user.role)
        )
          api.dispatch(baseApi.util.resetApiState());
        api.dispatch(credentials(result.data.data));
      } else if (result.error?.status === 401 || result.error?.status === 403) {
        api.dispatch(signedOut());
        api.dispatch(baseApi.util.resetApiState());
      }
      return result;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
export const baseQuery = async (args, api, options) => {
  const url = typeof args === 'string' ? args : args.url;
  if (['/auth/login', '/auth/logout'].includes(url) && refreshPromise) await refreshPromise;
  let result = await raw(args, api, options);
  if (result.error?.status === 401 && !url.startsWith('/auth/')) {
    const refreshed = await renew(api, options);
    if (refreshed.data) result = await raw(args, api, options);
    else if (refreshed.error?.status !== 401) result = refreshed;
  }
  return result;
};
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Jobs', 'Categories', 'Dashboard', 'Profile', 'Applications', 'Options'],
  endpoints: () => ({})
});
