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
  const nextUrl = searchParams.get('next')

  async function handleLogin(e: any) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      return
    }

    if (gymCode) {
      localStorage.setItem('pending_gym_code', gymCode)
    }

    const pendingNext = nextUrl || localStorage.getItem('pending_next_url')
    if (pendingNext) {
      localStorage.removeItem('pending_next_url')
      router.push(pendingNext)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: '#080808'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-1">
            <span style={{fontWeight: 300}}>scan</span><span style={{color: '#C23B0A', fontWeight: 900}}>set</span>
          </h1>
          <p className="text-sm tracking-widest uppercase" style={{color: '#C23B0A'}}>Welcome Back</p>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="px-4 py-3 rounded-lg text-white focus:outline-none"
            style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="px-4 py-3 rounded-lg text-white focus:outline-none"
            style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}
          />
          {gymCode && (
            <div className="rounded-lg px-4 py-3" style={{background: '#0F0F0F', border: '1px solid #C23B0A'}}>
              <p className="text-xs" style={{color: '#C23B0A'}}>✓ You'll be joined to your gym after logging in</p>
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="py-3 rounded-full font-semibold text-white"
            style={{background: '#C23B0A'}}
          >
            Log In
          </button>
        </form>
        <p className="text-center mt-4">
  <a href="/forgot-password" className="text-sm" style={{color: '#6B5E55'}}>Forgot password?</a>
</p>
<p className="text-center mt-3" style={{color: '#6B5E55'}}>
  No account?{' '}
  <a href="/signup" style={{color: '#C23B0A'}}>Sign Up</a>
</p>
      </div>
    </main>
  )
}

export default function Login() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center" style={{background: '#080808'}}>
        <p style={{color: '#6B5E55'}}>Loading...</p>
      </main>
    }>
      <LoginForm />
    </Suspense>
  )
}