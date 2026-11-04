'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const isSignUp = mode === 'sign-up'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const result = isSignUp
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password })
    setLoading(false)
    if (result.error) {
      setError('We could not complete that request. Check your details and try again.')
      return
    }
    window.location.assign('/')
  }

  return <main className="min-h-svh bg-background flex items-center justify-center px-4"><section className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm"><h1 className="text-2xl font-semibold">{isSignUp ? 'Create your account' : 'Welcome back'}</h1><p className="mt-1 text-sm text-muted-foreground">{isSignUp ? 'Sign up to continue to PayPal Checkout.' : 'Sign in to continue to PayPal Checkout.'}</p><form onSubmit={handleSubmit} className="mt-6 grid gap-4">{isSignUp && <label className="grid gap-2 text-sm">Name<input className="rounded-md border bg-background px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" /></label>}<label className="grid gap-2 text-sm">Email<input className="rounded-md border bg-background px-3 py-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label><label className="grid gap-2 text-sm">Password<input className="rounded-md border bg-background px-3 py-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={isSignUp ? 'new-password' : 'current-password'} /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<button className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" disabled={loading}>{loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}</button></form><p className="mt-6 text-center text-sm text-muted-foreground">{isSignUp ? 'Already have an account? ' : "Don't have an account? "}<Link className="font-medium text-foreground underline" href={isSignUp ? '/sign-in' : '/sign-up'}>{isSignUp ? 'Sign in' : 'Sign up'}</Link></p></section></main>
}
