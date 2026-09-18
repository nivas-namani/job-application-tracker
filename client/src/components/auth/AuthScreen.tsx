import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../lib/api';
import type { User } from '../../types';
import { Brand } from '../ui/Brand';
import { Field } from '../ui/Field';

type Credentials = { name: string; email: string; password: string };
type AuthScreenProps = { onAuthenticated: (user: User) => Promise<void> };

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Credentials>({ defaultValues: { name: '', email: '', password: '' } });

  const submit = handleSubmit(async (values) => {
    setError(null);
    setPending(true);
    try {
      const response = mode === 'login' ? await api.login({ email: values.email, password: values.password }) : await api.register(values);
      await onAuthenticated(response.user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to continue.');
    } finally {
      setPending(false);
    }
  });

  return <div className="grid min-h-screen place-items-center bg-gradient-to-br from-violet/10 via-canvas to-white p-5"><section className="w-full max-w-[440px] rounded-3xl border bg-white p-7 shadow-soft sm:p-9"><Brand /><h1 className="mt-8 text-2xl font-extrabold tracking-tight">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1><p className="mt-1 text-sm text-muted">{mode === 'login' ? 'Pick your job search back up.' : 'One place for every application.'}</p><form onSubmit={submit} className="mt-7 space-y-4">{mode === 'register' && <Field label="Name" error={errors.name?.message}><input className="form-input" placeholder="Your name" {...register('name', { required: mode === 'register' ? 'Name is required' : false })} /></Field>}<Field label="Email" error={errors.email?.message}><input className="form-input" type="email" placeholder="you@email.com" {...register('email', { required: 'Email is required' })} /></Field><Field label="Password" error={errors.password?.message}><input className="form-input" type="password" placeholder="At least 10 characters" {...register('password', { required: 'Password is required', minLength: { value: 10, message: 'Use at least 10 characters.' } })} /></Field>{error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}<button disabled={pending} className="button-primary w-full">{pending ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button></form><p className="mt-6 text-center text-sm text-muted">{mode === 'login' ? 'New here?' : 'Already registered?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }} className="font-bold text-violet hover:underline">{mode === 'login' ? 'Create an account' : 'Log in'}</button></p></section></div>;
}
