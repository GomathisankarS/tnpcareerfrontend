import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Select, Button, ErrorBox } from '../../shared/ui';
import { useCategoriesQuery } from './api';
import { useJobOptionsQuery } from '../admin/catalogApi';
export const label = (s) => s.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
export function validFilters(params, admin = false) {
  const f = { page: Math.max(1, Math.min(100000, Number(params.get('page')) || 1)) };
  f.page = Math.floor(f.page);
  for (const k of ['q', 'city']) {
    const v = params.get(k)?.trim();
    if (v) f[k] = v.slice(0, 100);
  }
  const cat = params.get('categoryId');
  if (/^\d+$/.test(cat) && Number(cat) > 0 && Number(cat) <= 4294967295) f.categoryId = cat;
  for (const [k, values] of Object.entries({
    sort: ['latest', 'salary'],
    ...(admin ? { status: ['draft', 'published', 'closed'] } : {})
  })) {
    const v = params.get(k);
    if (values.includes(v)) f[k] = v;
  }
  for (const key of ['experienceLevel', 'workMode', 'employmentType']) {
    const value = params.get(key);
    if (/^[a-z][a-z0-9_]{0,39}$/.test(value || '')) f[key] = value;
  }
  return f;
}
export function useFilters(admin = false) {
  const [params, setParams] = useSearchParams();
  const latestParams = useRef(params);
  const pendingSearch = useRef(null);
  useEffect(() => {
    // An earlier navigation may commit after a newer selection was queued.
    if (pendingSearch.current !== null && params.toString() !== pendingSearch.current) return;
    latestParams.current = params;
    pendingSearch.current = null;
  }, [params]);
  const filters = validFilters(params, admin);
  const update = useCallback(
    (key, value) => {
      // Keep rapid filter changes together while the router commits navigation.
      const next = new URLSearchParams(latestParams.current);
      if (value) next.set(key, String(value));
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      latestParams.current = next;
      pendingSearch.current = next.toString();
      setParams(next);
    },
    [setParams]
  );
  return {
    filters,
    update,
    reset: () => {
      latestParams.current = new URLSearchParams();
      pendingSearch.current = '';
      setParams({});
    }
  };
}
export function JobFilters({ filters, update, reset, admin = false }) {
  const categories = useCategoriesQuery();
  const options = useJobOptionsQuery();
  const [keyword, setKeyword] = useState(filters.q || '');
  useEffect(() => {
    setKeyword(filters.q || '');
  }, [filters.q]);
  useEffect(() => {
    if (keyword.trim() === (filters.q || '')) return;
    const timer = setTimeout(() => update('q', keyword.trim()), 350);
    return () => clearTimeout(timer);
  }, [keyword, filters.q, update]);
  const opts = (title, values) => [['', title], ...values.map((s) => [s, label(s)])];
  return (
    <div className="filters">
      <ErrorBox error={options.error} retry={options.refetch} />
      <div className="search-input">
        <Search size={18} />
        <input
          aria-label="Search jobs"
          placeholder="Job title, company or keyword"
          value={keyword}
          maxLength={100}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>
      <Select
        label="Category"
        name="categoryId"
        value={filters.categoryId || ''}
        onChange={(e) => update('categoryId', e.target.value)}
        options={[
          ['', categories.isError ? 'Categories unavailable' : 'All categories'],
          ...(categories.data?.data || []).map((c) => [String(c.id), c.name])
        ]}
      />
      <Select
        label="Experience"
        name="experienceLevel"
        value={filters.experienceLevel || ''}
        onChange={(e) => update('experienceLevel', e.target.value)}
        options={[
          ['', 'Any experience'],
          ...(options.data?.data?.experienceLevel || []).map((o) => [o.code, o.name])
        ]}
      />
      <Select
        label="Work mode"
        name="workMode"
        value={filters.workMode || ''}
        onChange={(e) => update('workMode', e.target.value)}
        options={[
          ['', 'Any work mode'],
          ...(options.data?.data?.workMode || []).map((o) => [o.code, o.name])
        ]}
      />
      <Select
        label="Employment"
        name="employmentType"
        value={filters.employmentType || ''}
        onChange={(e) => update('employmentType', e.target.value)}
        options={[
          ['', 'All types'],
          ...(options.data?.data?.employmentType || []).map((o) => [o.code, o.name])
        ]}
      />
      <div className="field">
        <label htmlFor="city">City</label>
        <input
          id="city"
          value={filters.city || ''}
          maxLength={100}
          onChange={(e) => update('city', e.target.value)}
          placeholder="e.g. Kochi"
        />
      </div>
      {admin && (
        <Select
          label="Status"
          name="status"
          value={filters.status || ''}
          onChange={(e) => update('status', e.target.value)}
          options={opts('All statuses', ['draft', 'published', 'closed'])}
        />
      )}
      <Select
        label="Sort by"
        name="sort"
        value={filters.sort || 'latest'}
        onChange={(e) => update('sort', e.target.value)}
        options={[
          ['latest', 'Newest first'],
          ['salary', 'Highest salary']
        ]}
      />
      <Button
        variant="text-button"
        onClick={() => {
          setKeyword('');
          reset();
        }}
      >
        Reset filters
      </Button>
    </div>
  );
}
