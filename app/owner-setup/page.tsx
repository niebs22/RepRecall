'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

function OwnerSetupForm() {
  const [token, setToken] = useState<string | null>(null)
  const [invite, setInvite] = useState<any>(null)
  const [gymName, setGymName] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'submitting' | 'done' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token')
    setToken(t)

    async function loadInvite() {
      if (!t) { setStatus('error'); setErrorMsg('Invalid setup link.'); return }

      const { data: inv } = await supabase
        .from('gym_owner_invites')
        .select('*, gyms(name)')
        .eq('token', t)
        .eq('used', false)
        .single()

      if (!inv) { setStatus('error'); setErrorMsg('This link is invalid or has already been used.'); return }

      setInvite(inv)
      setGymName(inv.gyms?.name || '')
      setStatus('ready')
    }
    loadInvite()
  }, [])

  async function handleSubmit(e: any) {
    e.preventDefault()
    if (!invite || !token) return
    setStatus('submitting')

    // 1. Create auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invite.email,
      password,
      options: { data: { full_name: name } }
    })

    if (authError || !authData.user) {
      setErrorMsg(authError?.message || 'Signup failed.')
      setStatus('ready')
      return
    }

    const userId = authData.user.id

    // 2. Set role to gym_owner
    await supabase.from('profiles').update({ role: 'gym_owner', full_name: name }).eq('id', userId)

    // 3. Link gym to owner
    await supabase.from('gyms').update({ owner_id: userId }).eq('id', invite.gym_id)

    // 4. Add as gym member
    await supabase.from('gym_members').upsert(
      { user_id: userId, gym_id: invite.gym_id },
      { onConflict: 'user_id,gym_id' }
    )

    // 5. Mark invite as used
    await supabase.from('gym_owner_invites').update({ used: true }).eq('token', token)

    setStatus('done')
    setTimeout(() => router.push('/admin'), 2500)
  }

  if (status === 'loading') return (
    <main className="min-h-screen flex items-center justify-center" style={{background: '#080808'}}>
      <p style={{color: '#6B5E55'}}>Loading...</p>
    </main>
  )

  if (status === 'error') return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{background: '#080808'}}>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Invalid Link</h1>
        <p style={{color: '#6B5E55'}}>{errorMsg}</p>
      </div>
    </main>
  )

  if (status === 'done') return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{background: '#080808'}}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background: '#C23B0A'}}>
          <span className="text-2xl text-white">✓</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">You're all set!</h2>
        <p style={{color: '#6B5E55'}}>Taking you to your admin panel...</p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: '#080808'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-1">
            <span style={{fontWeight: 300}}>scan</span><span style={{color: '#C23B0A', fontWeight: 900}}>set</span>
          </h1>
          <p className="text-sm tracking-widest uppercase" style={{color: '#C23B0A'}}>Gym Owner Setup</p>
        </div>

        <div className="rounded-2xl p-4 mb-6" style={{background: '#0F0F0F', border: '1px solid #C23B0A'}}>
          <p className="text-xs uppercase tracking-widest mb-1" style={{color: '#6B5E55'}}>Setting up</p>
          <p className="text-lg font-bold text-white">{gymName}</p>
          <p className="text-xs mt-1" style={{color: '#6B5E55'}}>{invite?.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="px-4 py-3 rounded-lg text-white focus:outline-none"
            style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}
          />
          <input
            type="password"
            placeholder="Create a Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="px-4 py-3 rounded-lg text-white focus:outline-none"
            style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}
          />
          {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="py-3 rounded-full font-semibold text-white"
            style={{background: '#C23B0A'}}
          >
            {status === 'submitting' ? 'Setting up...' : 'Create My Account'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function OwnerSetup() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center" style={{background: '#080808'}}>
        <p style={{color: '#6B5E55'}}>Loading...</p>
      </main>
    }>
      <OwnerSetupForm />
    </Suspense>
  )
}