import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  BriefcaseBusiness,
  Code2,
  ChartNoAxesCombined,
  Palette,
  Blocks
} from 'lucide-react';
import { useJobsQuery, useCategoriesQuery } from './api';
import { AsyncState, JobCard, Button } from '../../shared/ui';
import CategoryJobs from './CategoryJobs';
import { useJobOptionsQuery } from '../admin/catalogApi';
export default function Home() {
  const jobs = useJobsQuery({ featured: 'true', limit: 6 });
  const categories = useCategoriesQuery();
  const options = useJobOptionsQuery();
  const shortcuts = ['workMode', 'experienceLevel', 'employmentType'].flatMap((key) => {
    const option = options.data?.data?.[key]?.find((value) => value.isActive);
    return option ? [{ key, code: option.code, name: option.name }] : [];
  });
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const icons = [Code2, ChartNoAxesCombined, Palette, Blocks];
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <span className="hero-kicker">
            <span /> OPPORTUNITY STARTS HERE
          </span>
          <h1>
            Find work.
            <br />
            Build your <em>next.</em>
          </h1>
          <p>
            Discover opportunities that move you forward.
            <br className="desktop-break" /> Your skills. Your ambition. Your next chapter.
          </p>
          <form
            className="hero-search"
            onSubmit={(e) => {
              e.preventDefault();
              nav(`/jobs${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
            }}
          >
            <Search size={21} />
            <input
              aria-label="Search for your next job"
              placeholder="Job title, keyword or company"
              value={q}
              maxLength={100}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button type="submit">
              Find jobs <ArrowRight size={17} />
            </Button>
          </form>
          {shortcuts.length > 0 && (
            <div className="popular">
              EXPLORE{' '}
              {shortcuts.map((option) => (
                <Link
                  key={option.key}
                  to={`/jobs?${option.key}=${encodeURIComponent(option.code)}`}
                >
                  {option.name}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit" />
          <div className="art-card">
            <span className="art-star">✳</span>
            <div className="art-line" />
            <span className="art-label">
              THE NEXT
              <br />
              IS YOURS.
            </span>
            <ArrowUpRight size={70} />
          </div>
          <div className="art-tag">
            <BriefcaseBusiness size={19} /> Make your move
          </div>
          <span className="art-dot" />
        </div>
      </section>
      <div className="trust-strip">
        <span>A better way to find your fit</span>
        <span>Purposeful opportunities</span>
        <span>Simple applications</span>
        <span>Room to grow</span>
      </div>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FIND YOUR DIRECTION</span>
            <h2>A world of possibilities.</h2>
          </div>
          <Link className="text-link" to="/jobs">
            Explore all jobs <ArrowRight size={17} />
          </Link>
        </div>
        <AsyncState
          loading={categories.isLoading}
          error={categories.error}
          retry={categories.refetch}
          empty={!categories.data?.data.length}
        >
          <div className="category-grid">
            {categories.data?.data.map((c, i) => {
              const Icon = icons[i % icons.length];
              return (
                <Link className="category-card" key={c.id} to={`/jobs?categoryId=${c.id}`}>
                  <Icon size={26} />
                  <h3>{c.name}</h3>
                  <span>
                    {c.jobCount} open roles <ArrowUpRight size={17} />
                  </span>
                </Link>
              );
            })}
          </div>
        </AsyncState>
      </section>
      <section className="section featured-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">WORTH A CLOSER LOOK</span>
            <h2>Featured opportunities.</h2>
            <p className="muted">A few great places to start your next chapter.</p>
          </div>
          <Link className="text-link" to="/jobs">
            View all opportunities <ArrowRight size={17} />
          </Link>
        </div>
        <AsyncState
          loading={jobs.isLoading}
          error={jobs.error}
          retry={jobs.refetch}
          empty={!jobs.data?.data.length}
        >
          <div className="job-grid">
            {jobs.data?.data.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        </AsyncState>
      </section>
      <CategoryJobs />
      <section className="cta-band">
        <div>
          <span className="eyebrow">READY WHEN YOU ARE</span>
          <h2>Your next move starts with you.</h2>
          <p>Create a profile and put your experience to work.</p>
        </div>
        <Link to="/register" className="button">
          Get started <ArrowUpRight size={18} />
        </Link>
      </section>
    </>
  );
}
