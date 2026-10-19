import { baseApi, renew } from '../../app/baseApi';
import { sessionStarted, signedOut } from '../../app/authSlice';
export const authApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    login: b.mutation({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(baseApi.util.resetApiState());
          dispatch(sessionStarted(data.data));
        } catch {
          /* Error is displayed by the form. */
        }
      }
    }),
    register: b.mutation({ query: (body) => ({ url: '/auth/register', method: 'POST', body }) }),
    logout: b.mutation({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(signedOut());
          dispatch(baseApi.util.resetApiState());
        } catch {
          /* Keep the session visible so logout can be retried. */
        }
      }
    }),
    bootstrap: b.mutation({
      async queryFn(arg, api, options) {
        const r = await renew(api, options);
        if (r.error?.status === 401) return { data: null };
        return r;
      }
    })
  })
});
export const { useLoginMutation, useRegisterMutation, useLogoutMutation, useBootstrapMutation } =
  authApi;
