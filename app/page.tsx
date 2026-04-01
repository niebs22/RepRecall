'use client'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      }
    }
    checkSession()
  }, [])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: '#080808'}}>
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-1">
            <span style={{fontWeight: 300}}>scan</span><span style={{color: '#C23B0A', fontWeight: 900}}>set</span>
          </h1>
          <p className="text-sm font-semibold tracking-widest uppercase" style={{color: '#C23B0A'}}>Scan. Lift. Repeat.</p>
        </div>
        <p className="mb-10 max-w-xs mx-auto" style={{color: '#6B5E55'}}>Simplifying the way gym-goers log and recall their workouts</p>
        <div className="flex flex-col gap-4">
          <a href="/login" className="px-8 py-3 rounded-full font-semibold text-white" style={{background: '#C23B0A'}}>
            Log In
          </a>
          <a href="/signup" className="px-8 py-3 rounded-full font-semibold border text-white" style={{borderColor: '#C23B0A', color: '#C23B0A'}}>
            Sign Up
          </a>
        </div>
      </div>
    </main>
  )
}