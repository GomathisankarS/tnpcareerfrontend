import { Link } from 'react-router-dom';
import { BriefcaseBusiness, Users, Send, Plus, ArrowUpRight } from 'lucide-react';
import { useDashboardQuery } from '../jobs/api';
import { AsyncState, human } from '../../shared/ui';
export default function Dashboard() {
  const r = useDashboardQuery();
  const d = r.data?.data;
  return (
    <div className="section page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ADMIN WORKSPACE</span>
          <h1>
            A little overview.
            <br />A lot of possibility.
          </h1>
          <p className="muted">Your opportunities and the people behind them.</p>
        </div>
        <Link className="button" to="/admin/jobs/new">
          <Plus size={17} /> Create a job
        </Link>
      </div>
      <AsyncState loading={r.isLoading} error={r.error} retry={r.refetch}>
        {d && (
          <>
            <div className="stats-grid">
              {[
                [BriefcaseBusiness, 'Total jobs', d.totalJobs],
                [ArrowUpRight, 'Published', d.publishedJobs],
                [Users, 'Active candidates', d.candidates],
                [Send, 'Applications', d.applications]
              ].map(([Icon, label, value]) => (
                <div className="stat-card" key={label}>
                  <Icon size={21} />
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="panel">
              <div className="section-heading">
                <div>
                  <h2>Recent opportunities</h2>
                  <p className="muted">
                    {d.draftJobs} drafts · {d.closedJobs} closed
                  </p>
                </div>
                <Link to="/admin/jobs">Manage all jobs →</Link>
              </div>
              {d.recentJobs.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Opportunity</th>
                        <th>Status</th>
                        <th>Applications</th>
                        <th>
                          <span className="sr-only">Action</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.recentJobs.map((j) => (
                        <tr key={j.id}>
                          <td>
                            <strong>{j.title}</strong>
                            <small>{j.companyName}</small>
                          </td>
                          <td>
                            <span className={`badge ${j.status}`}>{human(j.status)}</span>
                          </td>
                          <td>{j.applicationCount}</td>
                          <td>
                            <Link to={`/admin/jobs/${j.id}/edit`}>Edit →</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No jobs yet. Create your first opportunity.</p>
              )}
            </div>
          </>
        )}
      </AsyncState>
    </div>
  );
}
