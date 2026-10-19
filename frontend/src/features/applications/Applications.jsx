import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { useApplicationsQuery } from './api';
import { AsyncState, Pagination } from '../../shared/ui';
import { ResumeDownload } from '../profile/Profile';
export default function Applications() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Math.min(100000, Math.floor(Number(params.get('page')) || 1)));
  const r = useApplicationsQuery({ page });
  return (
    <div className="section page">
      <div className="page-heading">
        <span className="eyebrow">YOUR NEXT CHAPTER</span>
        <h1>Moves you've made.</h1>
        <p className="muted">Every application is a step forward.</p>
      </div>
      <AsyncState
        loading={r.isLoading}
        error={r.error}
        retry={r.refetch}
        empty={!r.data?.data.length}
      >
        <div className="application-list">
          {r.data?.data.map((a) => (
            <article className="panel application-card" key={a.id}>
              <div>
                <span className="eyebrow">{a.companyName}</span>
                <h2>
                  {a.jobStatus === 'published' && !a.jobDeletedAt ? (
                    <Link to={`/jobs/${a.jobId}`}>{a.title}</Link>
                  ) : (
                    a.title
                  )}
                </h2>
                <p className="muted">Applied {new Date(a.createdAt).toLocaleDateString('en-IN')}</p>
                {a.coverNote && <p className="description">{a.coverNote}</p>}
              </div>
              <div className="application-actions">
                <span className="badge accent">{a.status}</span>
                {a.resumeOriginalName && (
                  <ResumeDownload
                    url={`/applications/${a.id}/resume`}
                    name={a.resumeOriginalName}
                  />
                )}
              </div>
            </article>
          ))}
        </div>
      </AsyncState>
      <Pagination meta={r.data?.meta} onChange={(p) => setParams({ page: p })} />
    </div>
  );
}
