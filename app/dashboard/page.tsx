'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [machineWorkouts, setMachineWorkouts] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        fetchMachineWorkouts(user.id)
      }
    }
    getUser()
  }, [])

  async function fetchMachineWorkouts(userId: string) {
    const { data } = await supabase
      .from('workouts')
      .select('*, machines(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) {
      const seen = new Set()
      const grouped = data.filter(workout => {
        if (seen.has(workout.machine_id)) return false
        seen.add(workout.machine_id)
        return true
      })
      setMachineWorkouts(grouped)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function daysSince(date: string) {
    const days = Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return days + ' days ago'
  }

  return (
    <main className="min-h-screen p-6" style={{background: '#0A1628'}}>
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Rep<span style={{color: '#2563EB'}}>Recall</span></h1>
          <button onClick={handleLogout} className="text-sm" style={{color: '#64748B'}}>
            Log Out
          </button>
        </div>

        <div className="rounded-2xl p-6 mb-6 text-center" style={{background: '#0F2040'}}>
          <p className="text-white font-semibold text-lg mb-2">Ready to train?</p>
          <p className="text-sm mb-4" style={{color: '#64748B'}}>Scan the QR code on any piece of equipment to get started</p>
          <a href="/scan" className="px-8 py-3 rounded-full font-semibold text-white inline-block" style={{background: '#2563EB'}}>
            Scan Equipment
          </a>
        </div>

        <h2 className="font-semibold text-lg mb-4 text-white">My Equipment</h2>

        {machineWorkouts.length === 0 ? (
          <p className="text-center py-8" style={{color: '#64748B'}}>No workouts yet. Scan a machine to get started.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {machineWorkouts.map(workout => (
              <a href={'/machine/' + workout.machine_id} key={workout.machine_id} className="rounded-xl p-4 block" style={{background: '#0F2040'}}>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-white font-semibold">{workout.machines?.name}</p>
                  <p className="text-xs font-medium" style={{color: '#3B82F6'}}>{daysSince(workout.created_at)}</p>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-white font-bold text-lg">{workout.sets}</p>
                    <p className="text-xs" style={{color: '#64748B'}}>Sets</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{workout.reps}</p>
                    <p className="text-xs" style={{color: '#64748B'}}>Reps</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{workout.weight}</p>
                    <p className="text-xs" style={{color: '#64748B'}}>Lbs</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}