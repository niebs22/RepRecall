'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function JoinGym() {
  const pathname = usePathname()
  const code = pathname?.split('/').pop()
  const [gym, setGym] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'join' | 'joining' | 'done' | 'error'>('loading')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      if (!code) { setStatus('error'); return }

      const { data: gymData } = await supabase
        .from('gyms')
        .select('*')
        .eq('code', code)
        .single()

      if (!gymData) { setStatus('error'); return }
      setGym(gymData)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Store gym code in localStorage so we can link after signup
        localStorage.setItem('pending_gym_code', code)
        setStatus('join')
        return
      }

      // User is logged in — link them to the gym
      await linkUserToGym(user.id, gymData.id)
    }
    load()
  }, [code])

  async function linkUserToGym(userId: string, gymId: string) {
    const { error } = await supabase
      .from('gym_members')
      .upsert({ user_id: userId, gym_id: gymId }, { onConflict: 'user_id,gym_id' })

    if (!error) {
      setStatus('done')
      setTimeout(() => router.push('/dashboard'), 2000)
    } else {
      setStatus('error')
    }
  }

  if (status === 'loading') return (
    <main className="min-h-screen flex items-center justify-center" style={{background: '#0A1628'}}>
      <p style={{color: '#64748B'}}>Loading...</p>
    </main>
  )

  if (status === 'error') return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{background: '#0A1628'}}>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Invalid QR Code</h1>
        <p style={{color: '#64748B'}}>This gym code doesn't exist or has expired.</p>
      </div>
    </main>
  )

  if (status === 'done') return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{background: '#0A1628'}}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background: '#2563EB'}}>
          <span className="text-2xl text-white">✓</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">You're in!</h2>
        <p style={{color: '#64748B'}}>Welcome to {gym?.name}. Taking you to the app...</p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: '#0A1628'}}>
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-bold text-white mb-1">
          <span style={{fontWeight: 300}}>scan</span><span style={{color: '#2563EB', fontWeight: 900}}>set</span>
        </h1>
        <p className="text-sm tracking-widest uppercase mb-8" style={{color: '#2563EB'}}>Scan. Lift. Repeat.</p>

        <div className="rounded-2xl p-6 mb-6" style={{background: '#0F2040'}}>
          <p className="text-xs uppercase tracking-widest mb-2" style={{color: '#64748B'}}>You've been invited to join</p>
          <p className="text-2xl font-bold text-white mb-1">{gym?.name}</p>
          <p className="text-sm" style={{color: '#64748B'}}>Create an account or log in to get started</p>
        </div>

        <div className="flex flex-col gap-3">
          
            <a
            href={`/signup?gym=${code}`}
            className="py-3 rounded-full font-semibold text-white text-center"
            style={{background: '#2563EB'}}
          >
            Create Account
          </a>
          
            <a
            href={`/login?gym=${code}`}
            className="py-3 rounded-full font-semibold text-center"
            style={{border: '1px solid #2563EB', color: '#3B82F6'}}
          >
            Log In
          </a>
        </div>
      </div>
    </main>
  )
}