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
  const [brandColor, setBrandColor] = useState('#E8440C')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const gymCode = searchParams.get('gym')
  const nextUrl = searchParams.get('next')

  useEffect(() => {
    if (gymCode) {
      localStorage.setItem('pending_gym_code', gymCode)
    }
    if (nextUrl) {
      localStorage.setItem('pending_next_url', nextUrl)
    }
  }, [gymCode, nextUrl])

  useEffect(() => {
    async function fetchGymBranding() {
      if (!gymCode) return
      const { data } = await supabase
        .from('gyms')
        .select('gym_branding(primary_color, logo_url)')
        .eq('code', gymCode)
        .single()
      if (data) {
        const branding = (data as any).gym_branding
        const brandingRow = Array.isArray(branding) ? branding[0] : branding
        if (brandingRow?.primary_color) setBrandColor(brandingRow.primary_color)
        if (brandingRow?.logo_url) setLogoUrl(brandingRow.logo_url)
      }
    }
    fetchGymBranding()
  }, [gymCode])

  async function handleSignup(e: any) {
    e.preventDefault()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://scanset.app/auth/callback',
        data: {
          full_name: name,
          pending_gym_code: gymCode || null
        }
      }
    })
    if (error) {
      setError(error.message)
    } else {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const pendingNext = localStorage.getItem('pending_next_url')
        if (pendingNext) {
          localStorage.removeItem('pending_next_url')
          router.push(pendingNext)
        } else {
          router.push('/dashboard')
        }
      } else {
        setSuccess(true)
      }
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: '#080808'}}>
        <div className="text-center max-w-sm">
          {logoUrl ? (
            <img src={logoUrl} alt="Gym logo" className="mx-auto mb-4" style={{maxWidth: '200px', maxHeight: '80px', width: 'auto', height: 'auto', objectFit: 'contain'}} />
          ) : (
            <h1 className="text-3xl font-bold text-white mb-4">
              <span style={{fontWeight: 300}}>scan</span><span style={{color: '#E8440C', fontWeight: 900}}>set</span>
            </h1>
          )}
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background: brandColor}}>
            <span className="text-2xl text-white">✓</span>
          </div>
          <p className="text-white font-semibold text-lg mb-2">Account created!</p>
          <p className="text-sm mb-6" style={{color: '#6B5E55'}}>You're almost ready to start tracking your workouts.</p>
          <div className="rounded-2xl p-4 text-left mb-4" style={{background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', border: '1px solid #222222'}}>
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{color: brandColor}}>Add to your home screen</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold" style={{color: brandColor, minWidth: '16px'}}>1</span>
                <p className="text-xs text-white">Tap the <span style={{color: brandColor}}>Share</span> button at the bottom of Safari</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold" style={{color: brandColor, minWidth: '16px'}}>2</span>
                <p className="text-xs text-white">Scroll down and tap <span style={{color: brandColor}}>"Add to Home Screen"</span> — you may need to tap <span style={{color: brandColor}}>"View More"</span></p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold" style={{color: brandColor, minWidth: '16px'}}>3</span>
                <p className="text-xs text-white">Open the app from your home screen and <span style={{color: brandColor}}>log in once</span> — you'll stay logged in after that</p>
              </div>
            </div>
          </div>
          <a href="/dashboard" className="block w-full py-3 rounded-full font-semibold text-white text-center" style={{background: brandColor}}>
            Go to Dashboard
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: '#080808'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt="Gym logo" className="mx-auto mb-2" style={{maxWidth: '200px', maxHeight: '90px', width: 'auto', height: 'auto', objectFit: 'contain'}} />
          ) : (
            <h1 className="text-4xl font-bold text-white mb-1">
              <span style={{fontWeight: 300}}>scan</span><span style={{color: '#E8440C', fontWeight: 900}}>set</span>
            </h1>
          )}
          <p className="text-sm tracking-widest uppercase" style={{color: brandColor}}>Create Account</p>
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
            <div className="rounded-lg px-4 py-3" style={{background: '#0F0F0F', border: `1px solid ${brandColor}`}}>
              <p className="text-xs" style={{color: brandColor}}>✓ You'll be joined to your gym automatically</p>
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="py-3 rounded-full font-semibold text-white"
            style={{background: brandColor}}
          >
            Create Account
          </button>
        </form>
        <p className="text-center mt-6" style={{color: '#6B5E55'}}>
          Already have an account?{' '}
          <a href={gymCode ? `/login?gym=${gymCode}` : '/login'} style={{color: brandColor}}>Log In</a>
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