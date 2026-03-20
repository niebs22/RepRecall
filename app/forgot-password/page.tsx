'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleReset(e: any) {
    e.preventDefault()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://scanset.app/reset-password'
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: '#0A1628'}}>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">
          <span style={{fontWeight: 300}}>scan</span><span style={{color: '#2563EB', fontWeight: 900}}>set</span>
        </h1>
        <p className="text-white font-semibold text-lg mb-2">Check your email</p>
        <p style={{color: '#64748B'}}>We sent you a password reset link.</p>
        <a href="/login" className="block mt-6 text-sm" style={{color: '#3B82F6'}}>Back to Login</a>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: '#0A1628'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-1">
            <span style={{fontWeight: 300}}>scan</span><span style={{color: '#2563EB', fontWeight: 900}}>set</span>
          </h1>
          <p className="text-sm tracking-widest uppercase" style={{color: '#2563EB'}}>Reset Password</p>
        </div>
        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="px-4 py-3 rounded-lg text-white focus:outline-none"
            style={{background: '#0F2040', border: '1px solid #1E3A5F'}}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="py-3 rounded-full font-semibold text-white"
            style={{background: '#2563EB'}}
          >
            Send Reset Link
          </button>
        </form>
        <p className="text-center mt-6">
          <a href="/login" className="text-sm" style={{color: '#64748B'}}>Back to Login</a>
        </p>
      </div>
    </main>
  )
}