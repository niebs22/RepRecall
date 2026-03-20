'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleUpdate(e: any) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  if (done) return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: '#0A1628'}}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background: '#2563EB'}}>
          <span className="text-2xl text-white">✓</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Password Updated</h2>
        <p style={{color: '#64748B'}}>Taking you to the app...</p>
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
          <p className="text-sm tracking-widest uppercase" style={{color: '#2563EB'}}>New Password</p>
        </div>
        <form onSubmit={handleUpdate} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="px-4 py-3 rounded-lg text-white focus:outline-none"
            style={{background: '#0F2040', border: '1px solid #1E3A5F'}}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="px-4 py-3 rounded-lg text-white focus:outline-none"
            style={{background: '#0F2040', border: '1px solid #1E3A5F'}}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="py-3 rounded-full font-semibold text-white"
            style={{background: '#2563EB'}}
          >
            Update Password
          </button>
        </form>
      </div>
    </main>
  )
}