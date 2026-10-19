import { baseApi } from '../../app/baseApi';
export const jobsApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    jobs: b.query({ query: (params) => ({ url: '/jobs', params }), providesTags: ['Jobs'] }),
    job: b.query({ query: (id) => `/jobs/${id}`, providesTags: ['Jobs'] }),
    categories: b.query({ query: () => '/categories', providesTags: ['Categories'] }),
    adminJobs: b.query({
      query: (params) => ({ url: '/admin/jobs', params }),
      providesTags: ['Jobs']
    }),
    adminJob: b.query({ query: (id) => `/admin/jobs/${id}`, providesTags: ['Jobs'] }),
    saveJob: b.mutation({
      query: ({ id, ...body }) => ({
        url: `/admin/jobs${id ? `/${id}` : ''}`,
        method: id ? 'PUT' : 'POST',
        body
      }),
      invalidatesTags: ['Jobs', 'Categories', 'Dashboard']
    }),
    deleteJob: b.mutation({
      query: (id) => ({ url: `/admin/jobs/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Jobs', 'Categories', 'Dashboard']
    }),
    dashboard: b.query({ query: () => '/admin/dashboard', providesTags: ['Dashboard'] })
  })
});
export const {
  useJobsQuery,
  useJobQuery,
  useCategoriesQuery,
  useAdminJobsQuery,
  useAdminJobQuery,
  useSaveJobMutation,
  useDeleteJobMutation,
  useDashboardQuery
} = jobsApi;
