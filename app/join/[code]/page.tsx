'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function JoinGym() {
  const pathname = usePathname()
  const code = pathname?.split('/').pop()
  const [gym, setGym] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'join' | 'done' | 'error'>('loading')
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Detect iOS
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    setIsIOS(ios)

    // Capture Android install prompt
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

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

  async function handleInstall() {
    if (isIOS) {
      setShowIOSInstructions(true)
      return
    }
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferredPrompt(null)
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
        <p className="text-sm tracking-widest uppercase mb-8" style={{color: '#2563EB'}}>Scan. Log. Repeat.</p>

        {/* Gym card */}
        <div className="rounded-2xl p-6 mb-6" style={{background: '#0F2040'}}>
          <p className="text-xs uppercase tracking-widest mb-2" style={{color: '#64748B'}}>You've been invited to join</p>
          <p className="text-2xl font-bold text-white mb-1">{gym?.name}</p>
          <p className="text-sm" style={{color: '#64748B'}}>Create an account or log in to get started</p>
        </div>

        {/* Install prompt */}
        {!installed && (
          <div className="rounded-2xl p-5 mb-6" style={{background: '#0F2040', border: '1px solid #2563EB'}}>
            <p className="text-white font-semibold mb-1">Step 1 — Install the app</p>
            <p className="text-xs mb-4" style={{color: '#64748B'}}>Get the best experience by adding ScanSet to your home screen</p>

            {!showIOSInstructions ? (
              <button
                onClick={handleInstall}
                className="w-full py-3 rounded-full font-semibold text-white"
                style={{background: '#2563EB'}}
              >
                Add ScanSet to Home Screen
              </button>
            ) : (
              <div className="text-left">
                <div className="flex items-start gap-3 mb-3">
                  <span style={{color: '#2563EB', fontWeight: 700, minWidth: '20px'}}>1</span>
                  <p className="text-sm text-white">Tap the <span style={{color: '#2563EB'}}>Share</span> button at the bottom of your screen</p>
                </div>
                <div className="flex items-start gap-3 mb-3">
                  <span style={{color: '#2563EB', fontWeight: 700, minWidth: '20px'}}>2</span>
                  <p className="text-sm text-white">Scroll down and tap <span style={{color: '#2563EB'}}>"Add to Home Screen"</span></p>
                </div>
                <div className="flex items-start gap-3">
                  <span style={{color: '#2563EB', fontWeight: 700, minWidth: '20px'}}>3</span>
                  <p className="text-sm text-white">Tap <span style={{color: '#2563EB'}}>"Add"</span> in the top right corner</p>
                </div>
              </div>
            )}
          </div>
        )}

        {installed && (
          <div className="rounded-2xl p-4 mb-6 flex items-center gap-3" style={{background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)'}}>
            <span style={{color: '#22C55E', fontSize: '20px'}}>✓</span>
            <p className="text-sm font-semibold" style={{color: '#22C55E'}}>ScanSet installed</p>
          </div>
        )}

        {/* Step 2 — Account */}
        <p className="text-xs mb-4" style={{color: '#64748B'}}>Step 2 — Create your account</p>
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