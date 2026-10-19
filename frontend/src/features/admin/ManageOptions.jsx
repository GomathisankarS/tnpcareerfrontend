import { useState } from 'react';
import {
  AsyncState,
  Button,
  Field,
  Select,
  ErrorBox,
  fieldErrors,
  useToast
} from '../../shared/ui';
import { useCatalogQuery, useSaveOptionMutation, useDeleteOptionMutation } from './catalogApi';
const kinds = [
  ['categories', 'Categories'],
  ['experienceLevel', 'Experience levels'],
  ['workMode', 'Work modes'],
  ['employmentType', 'Employment types']
];
function OptionForm({ kind, item, onDone }) {
  const [v, setV] = useState(
    item
      ? {
          name: item.name,
          code: item.code,
          isActive: !!item.isActive,
          requiresCity: kind === 'workMode' ? !!item.requiresCity : null
        }
      : { name: '', code: '', isActive: true, requiresCity: kind === 'workMode' ? true : null }
  );
  const [save, state] = useSaveOptionMutation();
  const toast = useToast();
  const errors = fieldErrors(state.error);
  async function submit(e) {
    e.preventDefault();
    try {
      await save({
        kind,
        ...v,
        requiresCity: kind === 'workMode' ? v.requiresCity : null,
        ...(item ? { id: item.id } : {})
      }).unwrap();
      toast(item ? 'Option updated.' : 'Option created.');
      onDone();
    } catch {
      /* Keep the draft and display API errors. */
    }
  }
  const change = (e) =>
    setV({
      ...v,
      [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value
    });
  return (
    <form className="panel" onSubmit={submit}>
      <h2>{item ? 'Edit option' : 'Create option'}</h2>
      <ErrorBox error={state.error} />
      <Field
        label="Display name"
        name="name"
        value={v.name}
        onChange={change}
        required
        maxLength={80}
        error={errors.name}
      />
      <Field
        label={
          kind === 'categories'
            ? 'Code (lowercase, hyphens allowed)'
            : 'Code (lowercase, underscores allowed)'
        }
        name="code"
        value={v.code}
        onChange={change}
        required
        maxLength={kind === 'categories' ? 80 : 40}
        pattern={kind === 'categories' ? '[a-z0-9]+(-[a-z0-9]+)*' : '[a-z][a-z0-9_]{0,39}'}
        readOnly={!!item}
        error={errors.code}
      />
      <p className="muted">The code is permanent. Change the display name to rename an option.</p>
      <label className="checkbox">
        <input type="checkbox" name="isActive" checked={v.isActive} onChange={change} /> Active for
        new jobs
      </label>
      {kind === 'workMode' && (
        <label className="checkbox">
          <input type="checkbox" name="requiresCity" checked={v.requiresCity} onChange={change} />{' '}
          City required for this work mode
        </label>
      )}
      <div className="actions">
        <Button type="submit" busy={state.isLoading}>
          Save option
        </Button>
        <Button type="button" variant="secondary" onClick={onDone} disabled={state.isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
function OptionsList({ kind }) {
  const r = useCatalogQuery(kind),
    [editing, setEditing] = useState(undefined),
    [selected, setSelected] = useState(null);
  const [remove, state] = useDeleteOptionMutation();
  const toast = useToast();
  async function confirm() {
    try {
      await remove({ kind, id: selected.id }).unwrap();
      setSelected(null);
      toast('Option deleted.');
    } catch {
      /* Display the deletion error. */
    }
  }
  return (
    <>
      <div className="actions">
        <Button
          onClick={() => {
            state.reset();
            setSelected(null);
            setEditing(null);
          }}
        >
          Create option
        </Button>
      </div>
      {editing !== undefined && (
        <OptionForm
          key={editing?.id || 'new'}
          kind={kind}
          item={editing}
          onDone={() => setEditing(undefined)}
        />
      )}
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
                <th>Name</th>
                <th>Code</th>
                <th>Status</th>
                <th>Jobs using it</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {r.data?.data.map((o) => (
                <tr key={o.id}>
                  <td>{o.name}</td>
                  <td>{o.code}</td>
                  <td>{o.isActive ? 'Active' : 'Inactive'}</td>
                  <td>{o.jobCount}</td>
                  <td>
                    <div className="actions">
                      <Button
                        variant="secondary"
                        aria-label={`Edit ${o.name}`}
                        onClick={() => {
                          state.reset();
                          setSelected(null);
                          setEditing(o);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        aria-label={`Delete ${o.name}`}
                        onClick={() => {
                          state.reset();
                          setSelected(o);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncState>
      {selected && (
        <div className="panel" role="region" aria-label="Delete option confirmation">
          <h2>Delete {selected.name}?</h2>
          <p>Options used by jobs cannot be deleted. Edit and deactivate them instead.</p>
          <div className="actions">
            <Button variant="danger" busy={state.isLoading} onClick={confirm}>
              Confirm delete
            </Button>
            <Button
              variant="secondary"
              disabled={state.isLoading}
              onClick={() => setSelected(null)}
            >
              Cancel deletion
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
export default function ManageOptions() {
  const [kind, setKind] = useState('categories');
  return (
    <div className="section page">
      <div className="page-heading">
        <span className="eyebrow">ADMIN WORKSPACE</span>
        <h1>Manage job options.</h1>
        <p className="muted">
          Manage dropdown choices. Deactivate used options to preserve existing jobs. Inactive
          categories also hide their jobs from public browsing.
        </p>
      </div>
      <Select
        label="Option group"
        name="optionGroup"
        value={kind}
        options={kinds}
        onChange={(e) => setKind(e.target.value)}
      />
      <OptionsList key={kind} kind={kind} />
    </div>
  );
}
