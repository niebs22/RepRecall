'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function JoinGym() {
  const pathname = usePathname()
  const code = pathname?.split('/').pop()
  const [gym, setGym] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'join' | 'done' | 'error'>('loading')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      if (!code) { setStatus('error'); return }

      const { data: gymData } = await supabase
        .from('gyms').select('*').eq('code', code).single()

      if (!gymData) { setStatus('error'); return }
      setGym(gymData)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        localStorage.setItem('pending_gym_code', code)
        setStatus('join')
        return
      }

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
    <main className="min-h-screen flex items-center justify-center" style={{background: '#080808'}}>
      <p style={{color: '#6B5E55'}}>Loading...</p>
    </main>
  )

  if (status === 'error') return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{background: '#080808'}}>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Invalid QR Code</h1>
        <p style={{color: '#6B5E55'}}>This gym code doesn't exist or has expired.</p>
      </div>
    </main>
  )

  if (status === 'done') return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{background: '#080808'}}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background: '#C23B0A'}}>
          <span className="text-2xl text-white">✓</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">You're in!</h2>
        <p style={{color: '#6B5E55'}}>Welcome to {gym?.name}. Taking you to the app...</p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: '#080808'}}>
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-bold text-white mb-1">
          <span style={{fontWeight: 300}}>scan</span><span style={{color: '#C23B0A', fontWeight: 900}}>set</span>
        </h1>
        <p className="text-sm tracking-widest uppercase mb-8" style={{color: '#C23B0A'}}>Scan. Log. Repeat.</p>

        <div className="rounded-2xl p-6 mb-6" style={{background: '#0F0F0F'}}>
          <p className="text-xs uppercase tracking-widest mb-2" style={{color: '#6B5E55'}}>You've been invited to join</p>
          <p className="text-2xl font-bold text-white mb-1">{gym?.name}</p>
          <p className="text-sm" style={{color: '#6B5E55'}}>Create an account or log in to get started</p>
        </div>

        <div className="flex flex-col gap-3">
          
            <a
            href={`/signup?gym=${code}${typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('next') ? '&next=' + encodeURIComponent(new URLSearchParams(window.location.search).get('next')!) : ''}`}
            className="py-3 rounded-full font-semibold text-white text-center"
            style={{background: '#C23B0A'}}>
            Create Account
          </a>
          
            <a
            href={`/login?gym=${code}${typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('next') ? '&next=' + encodeURIComponent(new URLSearchParams(window.location.search).get('next')!) : ''}`}
            className="py-3 rounded-full font-semibold text-center"
            style={{border: '1px solid #C23B0A', color: '#C23B0A'}}>
            Log In
          </a>
        </div>
      </div>
    </main>
  )
}