import { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Upload, Download, UserRound } from 'lucide-react';
import { useProfileQuery, useSaveProfileMutation, useDownloadResumeMutation } from './api';
import { AsyncState, Field, Button, ErrorBox, fieldErrors, useToast } from '../../shared/ui';
export function ResumeDownload({ url, name = 'resume.pdf' }) {
  const [download, state] = useDownloadResumeMutation();
  async function run() {
    try {
      const r = await download(url).unwrap();
      const a = document.createElement('a');
      a.href = r;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(r), 1000);
    } catch {
      /* Display download error. */
    }
  }
  return (
    <>
      <Button variant="secondary" type="button" busy={state.isLoading} onClick={run}>
        <Download size={16} /> Download resume
      </Button>
      <ErrorBox error={state.error} />
    </>
  );
}
function ProfileForm({ profile }) {
  const [values, setValues] = useState({
    currentCity: profile?.currentCity || '',
    totalExperienceMonths: profile?.totalExperienceMonths || 0,
    skills: profile?.skills.join(', ') || ''
  });
  const [file, setFile] = useState(null),
    [client, setClient] = useState({});
  const [save, state] = useSaveProfileMutation();
  const picker = useRef(null),
    toast = useToast();
  const errors = { ...fieldErrors(state.error), ...client };
  const change = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
    setClient({ ...client, [e.target.name]: undefined });
  };
  async function submit(e) {
    e.preventDefault();
    const skills = values.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      issues = {};
    if (
      !skills.length ||
      skills.length > 30 ||
      skills.some((s) => s.length > 60) ||
      new Set(skills.map((s) => s.toLowerCase())).size !== skills.length
    )
      issues.skills = 'Use 1�30 unique skills up to 60 characters each';
    if (!file && !profile?.resume)
      issues.resume = 'Choose a PDF resume up to 5 MiB to save your profile.';
    if (
      file &&
      (file.size < 1 ||
        file.size > 5242880 ||
        !file.name.toLowerCase().endsWith('.pdf') ||
        file.type !== 'application/pdf')
    )
      issues.resume = 'Choose a PDF file up to 5 MiB.';
    setClient(issues);
    if (Object.keys(issues).length) {
      if (issues.resume) picker.current?.focus();
      return;
    }
    const body = new FormData();
    body.append('currentCity', values.currentCity);
    body.append('totalExperienceMonths', String(values.totalExperienceMonths));
    body.append('skills', JSON.stringify(skills));
    if (file) body.append('resume', file);
    try {
      await save(body).unwrap();
      setFile(null);
      if (picker.current) picker.current.value = '';
      toast('Profile and resume saved. You�re ready to apply.');
    } catch {
      /* Preserve the draft and show the API error. */
    }
  }
  return (
    <form onSubmit={submit}>
      <div className="detail-layout">
        <section className="panel" id="professional-profile">
          <h2>Your professional profile</h2>
          <p className="muted">Save your details and required PDF resume together.</p>
          <Field
            label="Current city"
            name="currentCity"
            value={values.currentCity}
            onChange={change}
            required
            maxLength={100}
            error={errors.currentCity}
          />
          <Field
            label="Total experience (months)"
            name="totalExperienceMonths"
            type="number"
            min={0}
            max={720}
            step={1}
            value={values.totalExperienceMonths}
            onChange={change}
            required
            error={errors.totalExperienceMonths}
          />
          <Field
            label="Skills (comma separated)"
            name="skills"
            value={values.skills}
            onChange={change}
            required
            maxLength={1830}
            error={errors.skills}
          />
        </section>
        <aside className="panel">
          <Upload size={24} />
          <h2>Your resume</h2>
          <p className="muted">
            Required to save your profile. PDF only, up to 5 MiB. Your file is private.
          </p>
          {profile?.resume && (
            <div className="resume-info">
              <strong>{profile.resume.originalName}</strong>
              <small>
                {Math.ceil(profile.resume.sizeBytes / 1024)} KB � Saved{' '}
                {new Date(profile.resume.uploadedAt).toLocaleDateString('en-IN')}
              </small>
              <ResumeDownload name={profile.resume.originalName} />
              <p className="muted">This resume is saved. Choose another PDF only to replace it.</p>
            </div>
          )}
          <Field
            label={profile?.resume ? 'Replace PDF resume' : 'Choose PDF resume'}
            name="resume"
            error={errors.resume}
          >
            <input
              ref={picker}
              id="resume"
              name="resume"
              type="file"
              accept=".pdf,application/pdf"
              aria-required={!profile?.resume}
              aria-invalid={!!errors.resume}
              aria-describedby={errors.resume ? 'resume-error' : undefined}
              disabled={state.isLoading}
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setClient({ ...client, resume: undefined });
                state.reset();
              }}
            />
          </Field>
          {file && (
            <p className="muted" role="status">
              Selected: {file.name}. Click Save profile to store it.
            </p>
          )}
        </aside>
      </div>
      <ErrorBox error={state.error} />
      <Button type="submit" busy={state.isLoading}>
        Save profile
      </Button>
    </form>
  );
}
export default function Profile() {
  const r = useProfileQuery(),
    user = useSelector((s) => s.auth.user);
  return (
    <div className="section page">
      <div className="page-heading">
        <span className="eyebrow">YOUR CANDIDATE SPACE</span>
        <h1>Your story, so far.</h1>
        <p className="muted">Keep your profile and resume ready for the right opportunity.</p>
      </div>
      <AsyncState loading={r.isLoading} error={r.error} retry={r.refetch}>
        <div className="identity">
          <span className="company-mark">
            <UserRound />
          </span>
          <div>
            <strong>{user.fullName}</strong>
            <p>{user.email || user.mobileNumber}</p>
          </div>
        </div>
        {r.data && <ProfileForm profile={r.data.data} />}
      </AsyncState>
    </div>
  );
}
