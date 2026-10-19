import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAdminJobsQuery, useDeleteJobMutation } from '../jobs/api';
import { useFilters, JobFilters } from '../jobs/filters';
import { AsyncState, Pagination, ConfirmDialog, ErrorBox, useToast } from '../../shared/ui';
export default function AdminJobs() {
  const { filters, update, reset } = useFilters(true);
  const r = useAdminJobsQuery(filters);
  const [remove, state] = useDeleteJobMutation(),
    [selected, setSelected] = useState(null);
  const toast = useToast();
  async function confirm() {
    try {
      await remove(selected.id).unwrap();
      setSelected(null);
      toast('Job deleted. Application history is preserved.');
      if (r.data.data.length === 1 && filters.page > 1) update('page', filters.page - 1);
    } catch {
      /* Display mutation error. */
    }
  }
  return (
    <div className="section page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ADMIN WORKSPACE</span>
          <h1>Manage opportunities.</h1>
          <p className="muted">Make the right connections happen.</p>
        </div>
        <Link className="button" to="/admin/jobs/new">
          <Plus size={17} /> Create a job
        </Link>
      </div>
      <div className="listing-layout">
        <aside>
          <JobFilters admin filters={filters} update={update} reset={reset} />
        </aside>
        <section aria-busy={r.isFetching}>
          <div className="results-bar">
            <strong>{r.data?.meta.total ?? '…'} jobs</strong>
            {r.isFetching && <span>Updating…</span>}
          </div>
          <ErrorBox error={state.error} />
          <AsyncState
            loading={r.isLoading}
            error={r.error}
            retry={r.refetch}
            empty={!r.data?.data.length}
          >
            <div className="panel table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Opportunity</th>
                    <th>Status</th>
                    <th>Category</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {r.data?.data.map((j) => (
                    <tr key={j.id}>
                      <td>
                        <strong>{j.title}</strong>
                        <small>{j.companyName}</small>
                      </td>
                      <td>
                        <span className={`badge ${j.status}`}>{j.status}</span>
                      </td>
                      <td>{j.categoryName}</td>
                      <td>
                        <div className="actions">
                          <Link
                            className="icon-button"
                            aria-label={`Edit ${j.title}`}
                            to={`/admin/jobs/${j.id}/edit`}
                          >
                            <Pencil size={17} />
                          </Link>
                          <button
                            className="icon-button danger-text"
                            aria-label={`Delete ${j.title}`}
                            onClick={() => setSelected(j)}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AsyncState>
          <Pagination meta={r.data?.meta} onChange={(p) => update('page', p)} />
        </section>
      </div>
      {selected && (
        <ConfirmDialog
          title={`Delete “${selected.title}”?`}
          onCancel={() => setSelected(null)}
          onConfirm={confirm}
          busy={state.isLoading}
        />
      )}
    </div>
  );
}
