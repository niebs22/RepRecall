'use client'
import { useState, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const gymCode = searchParams.get('gym')

  async function handleLogin(e: any) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      return
    }

    // If there's a gym code, store it so dashboard can link them
    if (gymCode) {
      localStorage.setItem('pending_gym_code', gymCode)
    }

    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: '#0A1628'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-1">
            <span style={{fontWeight: 300}}>scan</span><span style={{color: '#2563EB', fontWeight: 900}}>set</span>
          </h1>
          <p className="text-sm tracking-widest uppercase" style={{color: '#2563EB'}}>Welcome Back</p>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="px-4 py-3 rounded-lg text-white focus:outline-none"
            style={{background: '#0F2040', border: '1px solid #1E3A5F'}}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="px-4 py-3 rounded-lg text-white focus:outline-none"
            style={{background: '#0F2040', border: '1px solid #1E3A5F'}}
          />
          {gymCode && (
            <div className="rounded-lg px-4 py-3" style={{background: '#0F2040', border: '1px solid #2563EB'}}>
              <p className="text-xs" style={{color: '#3B82F6'}}>✓ You'll be joined to your gym after logging in</p>
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="py-3 rounded-full font-semibold text-white"
            style={{background: '#2563EB'}}
          >
            Log In
          </button>
        </form>
        <p className="text-center mt-6" style={{color: '#64748B'}}>
          No account?{' '}
          <a href={gymCode ? `/signup?gym=${gymCode}` : '/signup'} style={{color: '#3B82F6'}}>Sign Up</a>
        </p>
      </div>
    </main>
  )
}

export default function Login() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center" style={{background: '#0A1628'}}>
        <p style={{color: '#64748B'}}>Loading...</p>
      </main>
    }>
      <LoginForm />
    </Suspense>
  )
}