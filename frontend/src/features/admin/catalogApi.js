import { baseApi } from '../../app/baseApi';
export const catalogApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    jobOptions: b.query({ query: () => '/job-options', providesTags: ['Options'] }),
    catalog: b.query({ query: (kind) => `/admin/catalog/${kind}`, providesTags: ['Options'] }),
    saveOption: b.mutation({
      query: ({ kind, id, ...body }) => ({
        url: `/admin/catalog/${kind}${id ? `/${id}` : ''}`,
        method: id ? 'PUT' : 'POST',
        body
      }),
      invalidatesTags: ['Options', 'Categories', 'Jobs', 'Dashboard']
    }),
    deleteOption: b.mutation({
      query: ({ kind, id }) => ({ url: `/admin/catalog/${kind}/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Options', 'Categories', 'Jobs', 'Dashboard']
    })
  })
});
export const {
  useJobOptionsQuery,
  useCatalogQuery,
  useSaveOptionMutation,
  useDeleteOptionMutation
} = catalogApi;
