'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const gymCode = searchParams.get('gym')

  useEffect(() => {
    if (gymCode) {
      localStorage.setItem('pending_gym_code', gymCode)
    }
  }, [gymCode])

  async function handleSignup(e: any) {
    e.preventDefault()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          pending_gym_code: gymCode || null
        }
      }
    })
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: '#080808'}}>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">
            <span style={{fontWeight: 300}}>scan</span><span style={{color: '#C23B0A', fontWeight: 900}}>set</span>
          </h1>
          <p className="text-white font-semibold text-lg mb-2">Check your email</p>
          <p style={{color: '#6B5E55'}}>We sent you a confirmation link. Click it to activate your account.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: '#080808'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-1">
            <span style={{fontWeight: 300}}>scan</span><span style={{color: '#C23B0A', fontWeight: 900}}>set</span>
          </h1>
          <p className="text-sm tracking-widest uppercase" style={{color: '#C23B0A'}}>Create Account</p>
        </div>
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="px-4 py-3 rounded-lg text-white focus:outline-none"
            style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}
          />
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
              <p className="text-xs" style={{color: '#C23B0A'}}>✓ You'll be joined to your gym automatically</p>
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="py-3 rounded-full font-semibold text-white"
            style={{background: '#C23B0A'}}
          >
            Create Account
          </button>
        </form>
        <p className="text-center mt-6" style={{color: '#6B5E55'}}>
          Already have an account?{' '}
          <a href={gymCode ? `/login?gym=${gymCode}` : '/login'} style={{color: '#C23B0A'}}>Log In</a>
        </p>
      </div>
    </main>
  )
}

export default function Signup() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center" style={{background: '#080808'}}>
        <p style={{color: '#6B5E55'}}>Loading...</p>
      </main>
    }>
      <SignupForm />
    </Suspense>
  )
}