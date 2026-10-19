import { useJobsQuery } from './api';
import { useFilters, JobFilters } from './filters';
import { AsyncState, JobCard, Pagination } from '../../shared/ui';
export default function JobList() {
  const { filters, update, reset } = useFilters();
  const r = useJobsQuery(filters);
  return (
    <div className="section page">
      <div className="page-heading">
        <span className="eyebrow">YOUR NEXT OPPORTUNITY</span>
        <h1>Make room for what's next.</h1>
        <p className="muted">Find a role that fits the way you want to work.</p>
      </div>
      <div className="listing-layout">
        <aside>
          <JobFilters filters={filters} update={update} reset={reset} />
        </aside>
        <section aria-label="Job results" aria-busy={r.isFetching}>
          <div className="results-bar">
            <strong>{r.data?.meta.total ?? '…'} opportunities</strong>
            {r.isFetching && <span role="status">Updating…</span>}
          </div>
          <AsyncState
            loading={r.isLoading}
            error={r.error}
            retry={r.refetch}
            empty={!r.data?.data.length}
          >
            <div className="job-grid listing-grid">
              {r.data?.data.map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </div>
          </AsyncState>
          <Pagination meta={r.data?.meta} onChange={(p) => update('page', p)} />
        </section>
      </div>
    </div>
  );
}
