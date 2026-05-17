'use client'
import { useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    async function handleCallback() {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // Check for pending next URL
        const pendingNext = localStorage.getItem('pending_next_url')
        if (pendingNext) {
          localStorage.removeItem('pending_next_url')
          router.push(pendingNext)
          return
        }
        router.push('/dashboard')
      } else {
        // Try to exchange the code for a session
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
        if (!error) {
          const pendingNext = localStorage.getItem('pending_next_url')
          if (pendingNext) {
            localStorage.removeItem('pending_next_url')
            router.push(pendingNext)
            return
          }
          router.push('/dashboard')
        } else {
          router.push('/login')
        }
      }
    }
    handleCallback()
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center" style={{background: '#080808'}}>
      <p style={{color: '#6B5E55'}}>Signing you in...</p>
    </main>
  )
}