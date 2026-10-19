import { baseApi } from '../../app/baseApi';
export const applicationsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    applicationForJob: b.query({
      query: (jobId) => `/applications/job/${jobId}`,
      providesTags: ['Applications']
    }),
    applications: b.query({
      query: (params) => ({ url: '/applications', params }),
      providesTags: ['Applications']
    }),
    apply: b.mutation({
      query: (body) => ({ url: '/applications', method: 'POST', body }),
      invalidatesTags: ['Applications', 'Dashboard']
    })
  })
});
export const { useApplicationsQuery, useApplicationForJobQuery, useApplyMutation } =
  applicationsApi;
