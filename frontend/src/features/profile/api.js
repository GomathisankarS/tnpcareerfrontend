import { baseApi } from '../../app/baseApi';
export const profileApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    profile: b.query({ query: () => '/profile', providesTags: ['Profile'] }),
    saveProfile: b.mutation({
      query: (body) => ({ url: '/profile', method: 'PUT', body }),
      invalidatesTags: ['Profile'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(baseApi.util.updateQueryData('profile', undefined, () => data));
        } catch {
          /* The form keeps the draft and displays the failed request. */
        }
      }
    }),
    downloadResume: b.mutation({
      async queryFn(url, api, options, query) {
        const r = await query({
          url: url || '/profile/resume',
          responseHandler: async (response) =>
            response.ok ? URL.createObjectURL(await response.blob()) : response.json()
        });
        return r;
      }
    })
  })
});
export const { useProfileQuery, useSaveProfileMutation, useDownloadResumeMutation } = profileApi;
