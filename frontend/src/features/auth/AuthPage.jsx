import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { useLoginMutation, useRegisterMutation } from './api';
import { Button, Field, ErrorBox, fieldErrors, useToast } from '../../shared/ui';
function registrationErrors(values) {
  const issues = {};
  if (!values.fullName.trim()) issues.fullName = 'Full name is required';
  if (!values.email.trim()) issues.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    issues.email = 'Enter a valid email address';
  if (!values.mobileNumber.trim()) issues.mobileNumber = 'Mobile number is required';
  else if (
    !/^\+[1-9][\d\s()-]*$/.test(values.mobileNumber.trim()) ||
    !/^\+[1-9]\d{6,14}$/.test(values.mobileNumber.replace(/[\s()-]/g, ''))
  )
    issues.mobileNumber = 'Enter a valid mobile number with country code, e.g. +919876543210';
  if (!values.password) issues.password = 'Password is required';
  else if (values.password.length < 10) issues.password = 'Use at least 10 characters';
  if (!values.confirm) issues.confirm = 'Confirm your password';
  else if (values.password !== values.confirm) issues.confirm = 'Passwords do not match';
  return issues;
}
export default function AuthPage({ register = false, admin = false }) {
  const [values, setValues] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    identifier: '',
    password: '',
    confirm: ''
  });
  const [clientErrors, setClientErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [login, loginState] = useLoginMutation(),
    [signup, signupState] = useRegisterMutation();
  const state = register ? signupState : loginState;
  const errors = { ...fieldErrors(state.error), ...clientErrors };
  const nav = useNavigate(),
    location = useLocation(),
    toast = useToast();
  const change = (e) => {
    const { name, value } = e.target;
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);
    const issues = register ? registrationErrors(nextValues) : {};
    setClientErrors((previous) => ({
      ...previous,
      [name]: touched[name] ? issues[name] : undefined,
      ...(register && name === 'password' && touched.confirm ? { confirm: issues.confirm } : {})
    }));
  };
  const blur = (e) => {
    if (!register) return;
    const { name } = e.target;
    setTouched((previous) => ({ ...previous, [name]: true }));
    setClientErrors((previous) => ({ ...previous, [name]: registrationErrors(values)[name] }));
  };
  async function submit(e) {
    e.preventDefault();
    const issues = register ? registrationErrors(values) : {};
    if (register)
      setTouched({
        fullName: true,
        email: true,
        mobileNumber: true,
        password: true,
        confirm: true
      });
    setClientErrors(issues);
    if (Object.keys(issues).length) return;
    try {
      if (register) {
        await signup({
          fullName: values.fullName,
          email: values.email,
          mobileNumber: values.mobileNumber,
          password: values.password
        }).unwrap();
        toast('Account created. Sign in to get started.');
        nav('/login');
      } else {
        const r = await login({
          identifier: values.identifier,
          password: values.password,
          loginRole: admin ? 'admin' : 'candidate'
        }).unwrap();
        const destination = r.data.user.role === 'admin' ? '/admin' : '/jobs';
        const from = location.state?.from;
        nav(from?.startsWith('/') && !from.startsWith('//') ? from : destination, {
          replace: true
        });
      }
    } catch {
      /* RTK Query owns the error shown below. */
    }
  }
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <span className="eyebrow light">YOUR NEXT CHAPTER</span>
        <h1>
          Good work.
          <br />
          Great possibilities<span>.</span>
        </h1>
        <p>Find a role that fits your skills, your ambitions, and the life you want to build.</p>
        <div className="story-note">
          <ArrowUpRight size={28} />
          <span>
            A fresh perspective.
            <br />A new opportunity.
          </span>
        </div>
      </aside>
      <section className="auth-form">
        <span className="eyebrow">{admin ? 'ADMIN WORKSPACE' : 'TNP CAREERS'}</span>
        <h1>
          {register ? 'Start your next chapter' : admin ? 'Welcome back, admin' : 'Welcome back'}
        </h1>
        <p className="muted">
          {register
            ? 'Create your candidate account. All fields are required.'
            : 'Sign in with your email or international mobile number.'}
        </p>
        <form onSubmit={submit} noValidate={register}>
          <ErrorBox error={state.error} />
          {register ? (
            <>
              <Field
                label="Full name"
                name="fullName"
                value={values.fullName}
                onChange={change}
                onBlur={blur}
                required
                maxLength={100}
                autoComplete="name"
                error={errors.fullName}
              />
              <Field
                label="Email"
                name="email"
                type="email"
                required
                value={values.email}
                onChange={change}
                onBlur={blur}
                maxLength={254}
                autoComplete="email"
                error={errors.email}
              />
              <Field
                label="Mobile with country code"
                name="mobileNumber"
                type="tel"
                required
                placeholder="+919876543210"
                value={values.mobileNumber}
                onChange={change}
                onBlur={blur}
                maxLength={40}
                autoComplete="tel"
                error={errors.mobileNumber}
              />
            </>
          ) : (
            <Field
              label="Email or mobile number"
              name="identifier"
              value={values.identifier}
              onChange={change}
              onBlur={blur}
              required
              maxLength={254}
              autoComplete="username"
              error={errors.identifier}
            />
          )}
          <Field
            label="Password"
            name="password"
            type="password"
            value={values.password}
            onChange={change}
            onBlur={blur}
            required
            minLength={register ? 10 : 1}
            maxLength={128}
            autoComplete={register ? 'new-password' : 'current-password'}
            error={errors.password}
          />
          {register && (
            <Field
              label="Confirm password"
              name="confirm"
              type="password"
              value={values.confirm}
              onChange={change}
              onBlur={blur}
              required
              maxLength={128}
              autoComplete="new-password"
              error={errors.confirm}
            />
          )}
          <Button type="submit" busy={state.isLoading} className="full">
            {register ? 'Create account' : 'Sign in'} <ArrowUpRight size={17} />
          </Button>
        </form>
        <p className="auth-switch">
          {register ? 'Already have an account?' : 'New to TNP Careers?'}{' '}
          <Link to={register ? '/login' : '/register'}>
            {register ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
        <p className="secure-note">
          <ShieldCheck size={15} />
          Your account, securely connected.
        </p>
      </section>
    </div>
  );
}
