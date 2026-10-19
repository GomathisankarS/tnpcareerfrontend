import { useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MapPin, ArrowLeft, BriefcaseBusiness } from 'lucide-react';
import { useJobQuery } from './api';
import { useApplyMutation, useApplicationForJobQuery } from '../applications/api';
import { AsyncState, Button, ErrorBox, Field, human, salary, useToast } from '../../shared/ui';
export default function JobDetails() {
  const { id } = useParams(),
    r = useJobQuery(id);
  const user = useSelector((s) => s.auth.user);
  const application = useApplicationForJobQuery(id, {
    skip: user?.role !== 'candidate',
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true
  });
  const [apply, state] = useApplyMutation(),
    [note, setNote] = useState('');
  const submittedThisJob = state.originalArgs?.jobId === Number(id);
  const alreadyApplied =
    !!application.currentData?.data ||
    (submittedThisJob && (state.isSuccess || state.error?.data?.error?.code === 'ALREADY_APPLIED'));
  const toast = useToast(),
    location = useLocation();
  async function submit(e) {
    e.preventDefault();
    if (alreadyApplied || application.isFetching || application.isError || state.isLoading) return;
    try {
      await apply({ jobId: Number(id), coverNote: note.trim() || null }).unwrap();
      toast('Application submitted. Good luck with your next chapter.');
    } catch {
      /* Display RTK Query error. */
    }
  }
  const j = r.data?.data;
  return (
    <div className="section page">
      <Link to="/jobs" className="back-link">
        <ArrowLeft size={16} /> All opportunities
      </Link>
      <AsyncState loading={r.isLoading} error={r.error} retry={r.refetch}>
        {j && (
          <>
            <div className="detail-heading">
              <span className="company-mark large">{j.companyName.slice(0, 2).toUpperCase()}</span>
              <div>
                <span className="eyebrow">{j.companyName}</span>
                <h1>{j.title}</h1>
                <p className="muted">
                  <MapPin size={16} /> {j.locationCity || 'Anywhere'} ·{' '}
                  {j.workModeName || human(j.workMode)} · {j.categoryName}
                </p>
              </div>
            </div>
            <div className="detail-layout">
              <article className="panel">
                <h2>About the opportunity</h2>
                <div className="description">{j.description}</div>
                <h2>Skills you'll bring</h2>
                <div className="tags">
                  {j.skills.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
              </article>
              <aside>
                <div className="panel">
                  <h3>
                    <BriefcaseBusiness size={18} /> Role at a glance
                  </h3>
                  <dl className="facts">
                    <dt>Employment</dt>
                    <dd>{j.employmentTypeName || human(j.employmentType)}</dd>
                    <dt>Experience level</dt>
                    <dd>{j.experienceLevelName || human(j.experienceLevel)}</dd>
                    <dt>Experience range</dt>
                    <dd>
                      {j.minExperienceMonths}–{j.maxExperienceMonths ?? '720'} months
                    </dd>
                    <dt>Annual salary</dt>
                    <dd>{salary(j)}</dd>
                  </dl>
                  {user?.role === 'candidate' ? (
                    alreadyApplied ? (
                      <div className="success-box">
                        <Button type="button" className="full" disabled>
                          Already applied
                        </Button>
                        <p>
                          {submittedThisJob && state.isSuccess
                            ? 'Application submitted.'
                            : 'You have already applied for this job.'}
                        </p>
                        {application.currentData?.data?.status && (
                          <p>Status: {human(application.currentData.data.status)}</p>
                        )}
                        <Link to="/applications">View your applications</Link>
                      </div>
                    ) : application.isLoading || application.isFetching ? (
                      <p className="muted" role="status">
                        Checking application status…
                      </p>
                    ) : application.error ? (
                      <ErrorBox error={application.error} retry={application.refetch} />
                    ) : (
                      <form onSubmit={submit}>
                        <Field label="Cover note (optional)" name="coverNote">
                          <textarea
                            id="coverNote"
                            maxLength={2000}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={4}
                          />
                        </Field>
                        <ErrorBox error={state.error} />
                        {['PROFILE_REQUIRED', 'RESUME_REQUIRED'].includes(
                          state.error?.data?.error?.code
                        ) && (
                          <p>
                            <Link to="/profile">Complete your profile first</Link>
                          </p>
                        )}
                        <Button type="submit" className="full" busy={state.isLoading}>
                          Apply for this role
                        </Button>
                        <small className="muted">Your saved profile and resume will be used.</small>
                      </form>
                    )
                  ) : user ? (
                    <p className="muted">Sign in with a candidate account to apply.</p>
                  ) : (
                    <Link className="button full" to="/login" state={{ from: location.pathname }}>
                      Sign in to apply
                    </Link>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </AsyncState>
    </div>
  );
}
