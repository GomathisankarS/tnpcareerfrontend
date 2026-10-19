import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAdminJobQuery, useSaveJobMutation } from '../jobs/api';
import { label } from '../jobs/filters';
import { useJobOptionsQuery, useCatalogQuery } from './catalogApi';
import {
  AsyncState,
  Field,
  Select,
  Button,
  ErrorBox,
  fieldErrors,
  useToast
} from '../../shared/ui';
const initial = {
  title: '',
  companyName: '',
  categoryId: '',
  locationCity: '',
  employmentType: '',
  workMode: '',
  experienceLevel: '',
  minExperienceMonths: 0,
  maxExperienceMonths: '',
  salaryMinAnnualInr: '',
  salaryMaxAnnualInr: '',
  description: '',
  skills: '',
  isFeatured: false,
  status: 'draft'
};
function Editor({ job, categories, options }) {
  const [v, setV] = useState(() =>
    job
      ? {
          ...initial,
          ...job,
          categoryId: String(job.categoryId),
          skills: job.skills.join(', '),
          locationCity: job.locationCity || '',
          maxExperienceMonths: job.maxExperienceMonths ?? '',
          salaryMinAnnualInr: job.salaryMinAnnualInr ?? '',
          salaryMaxAnnualInr: job.salaryMaxAnnualInr ?? ''
        }
      : {
          ...initial,
          ...Object.fromEntries(
            ['employmentType', 'workMode', 'experienceLevel'].map((key) => [
              key,
              options[key]?.find((o) => o.isActive)?.code || ''
            ])
          )
        }
  );
  const requiresCity = options.workMode?.find((o) => o.code === v.workMode)?.requiresCity ?? true;
  const availableCategories = categories.filter((c) => c.isActive || c.id === job?.categoryId);
  const choices = (key) =>
    (options[key] || [])
      .filter((o) => o.isActive || o.code === job?.[key])
      .map((o) => [o.code, o.name + (o.isActive ? '' : ' (inactive)')]);
  const [save, state] = useSaveJobMutation();
  const [client, setClient] = useState({});
  const nav = useNavigate(),
    toast = useToast();
  const errors = { ...fieldErrors(state.error), ...client };
  const change = (e) =>
    setV({
      ...v,
      [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value
    });
  async function submit(e) {
    e.preventDefault();
    const problems = {};
    if (requiresCity && !v.locationCity.trim()) problems.locationCity = 'City is required';
    if ((v.salaryMinAnnualInr === '') !== (v.salaryMaxAnnualInr === ''))
      problems.salaryMaxAnnualInr = 'Provide both salary bounds';
    if (
      v.maxExperienceMonths !== '' &&
      Number(v.maxExperienceMonths) < Number(v.minExperienceMonths)
    )
      problems.maxExperienceMonths = 'Maximum must be at least minimum';
    if (v.salaryMaxAnnualInr !== '' && Number(v.salaryMaxAnnualInr) < Number(v.salaryMinAnnualInr))
      problems.salaryMaxAnnualInr = 'Maximum must be at least minimum';
    const skills = v.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (
      !skills.length ||
      skills.length > 30 ||
      skills.some((s) => s.length > 60) ||
      new Set(skills.map((s) => s.toLowerCase())).size !== skills.length
    )
      problems.skills = 'Use 1–30 unique skills, up to 60 characters each';
    setClient(problems);
    if (Object.keys(problems).length) return;
    const keys = Object.keys(initial);
    const body = Object.fromEntries(keys.map((k) => [k, v[k]]));
    for (const k of ['categoryId', 'minExperienceMonths']) body[k] = Number(body[k]);
    for (const k of ['maxExperienceMonths', 'salaryMinAnnualInr', 'salaryMaxAnnualInr'])
      body[k] = body[k] === '' ? null : Number(body[k]);
    body.locationCity = body.locationCity.trim() || null;
    body.skills = skills;
    try {
      await save({ ...body, ...(job ? { id: job.id } : {}) }).unwrap();
      toast(job ? 'Job updated.' : 'Job created.');
      nav('/admin/jobs');
    } catch {
      /* Keep form data and show server validation. */
    }
  }
  const input = (name, title, props = {}) => (
    <Field
      key={name}
      label={title}
      name={name}
      value={v[name]}
      onChange={change}
      error={errors[name]}
      {...props}
    />
  );
  const select = (name, title, values) => (
    <Select
      label={title}
      name={name}
      value={v[name]}
      onChange={change}
      error={errors[name]}
      options={values.map((s) => (Array.isArray(s) ? s : [s, label(s)]))}
    />
  );
  return (
    <form className="panel job-form" onSubmit={submit}>
      <ErrorBox error={state.error} />
      <h2>The essentials</h2>
      <div className="form-grid">
        {input('title', 'Job title', { required: true, maxLength: 150 })}
        {input('companyName', 'Company name', { required: true, maxLength: 150 })}
        <Select
          label="Category"
          name="categoryId"
          value={v.categoryId}
          onChange={change}
          error={errors.categoryId}
          required
          options={[
            ['', 'Select category'],
            ...availableCategories.map((c) => [String(c.id), c.name])
          ]}
        />
        {select('employmentType', 'Employment type', choices('employmentType'))}
        {select('workMode', 'Work mode', choices('workMode'))}
        {input('locationCity', 'City', { required: requiresCity, maxLength: 100 })}
        {select('experienceLevel', 'Experience level', choices('experienceLevel'))}
        {input('minExperienceMonths', 'Minimum experience (months)', {
          type: 'number',
          required: true,
          min: 0,
          max: 720
        })}
        {input('maxExperienceMonths', 'Maximum experience (months, optional)', {
          type: 'number',
          min: 0,
          max: 720
        })}
        {input('salaryMinAnnualInr', 'Minimum annual salary (INR)', {
          type: 'number',
          min: 0,
          max: 9999999999.99,
          step: '0.01'
        })}
        {input('salaryMaxAnnualInr', 'Maximum annual salary (INR)', {
          type: 'number',
          min: 0,
          max: 9999999999.99,
          step: '0.01'
        })}
      </div>
      <h2>Tell candidates about the role</h2>
      <Field label="Job description (plain text)" name="description" error={errors.description}>
        <textarea
          id="description"
          name="description"
          value={v.description}
          onChange={change}
          required
          maxLength={10000}
          rows={10}
        />
      </Field>
      {input('skills', 'Skills (comma separated)', { required: true, maxLength: 1830 })}
      <div className="form-grid">
        {select('status', 'Publication status', ['draft', 'published', 'closed'])}
        <label className="checkbox">
          <input type="checkbox" name="isFeatured" checked={v.isFeatured} onChange={change} />{' '}
          Feature this job on the home page
        </label>
      </div>
      <div className="actions">
        <Button
          type="submit"
          busy={state.isLoading}
          disabled={
            !availableCategories.length ||
            ['employmentType', 'workMode', 'experienceLevel'].some((key) => !choices(key).length)
          }
        >
          Save opportunity
        </Button>
        <Link className="button secondary" to="/admin/jobs">
          Cancel
        </Link>
      </div>
      {!availableCategories.length && (
        <p className="field-error">
          No active categories. Create a category in Job options before creating jobs.
        </p>
      )}
      {['employmentType', 'workMode', 'experienceLevel'].some((key) => !choices(key).length) && (
        <p className="field-error">
          Create an active experience level, work mode and employment type in Job options before
          saving a job.
        </p>
      )}
    </form>
  );
}
export default function JobForm() {
  const { id } = useParams();
  const r = useAdminJobQuery(id, { skip: !id }),
    cats = useCatalogQuery('categories'),
    options = useJobOptionsQuery();
  return (
    <div className="section page narrow">
      <Link className="back-link" to="/admin/jobs">
        ← Manage opportunities
      </Link>
      <div className="page-heading">
        <span className="eyebrow">ADMIN WORKSPACE</span>
        <h1>{id ? 'Refine the opportunity.' : 'Open a new door.'}</h1>
      </div>
      <AsyncState
        loading={r.isLoading || cats.isLoading || options.isLoading}
        error={r.error || cats.error || options.error}
        retry={() => {
          if (id) r.refetch();
          cats.refetch();
          options.refetch();
        }}
      >
        {(!id || r.data) && cats.data && options.data && (
          <Editor
            key={id || 'new'}
            job={r.data?.data}
            categories={cats.data.data}
            options={options.data.data}
          />
        )}
      </AsyncState>
    </div>
  );
}
