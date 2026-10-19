import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCategoriesQuery, useJobsQuery } from './api';
import { AsyncState, JobCard } from '../../shared/ui';
export default function CategoryJobs() {
  const categories = useCategoriesQuery();
  const [selected, setSelected] = useState(null);
  const id = selected || categories.data?.data[0]?.id;
  const jobs = useJobsQuery({ categoryId: id, limit: 3 }, { skip: !id });
  if (!id) return null;
  return (
    <section className="section category-jobs">
      <div className="section-heading">
        <div>
          <span className="eyebrow">FOLLOW YOUR INTERESTS</span>
          <h2>Find your kind of work.</h2>
        </div>
        <Link className="text-link" to={`/jobs?categoryId=${id}`}>
          See more in this category →
        </Link>
      </div>
      <div className="category-tabs" aria-label="Choose a job category">
        {categories.data.data.map((c) => (
          <button key={c.id} aria-pressed={id === c.id} onClick={() => setSelected(c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      <AsyncState
        loading={jobs.isLoading}
        error={jobs.error}
        retry={jobs.refetch}
        empty={!jobs.data?.data.length}
      >
        <div className="job-grid" aria-busy={jobs.isFetching}>
          {jobs.data?.data.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      </AsyncState>
    </section>
  );
}
