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
    <main className="min-h-screen bg-black p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Rep Recall</h1>
          <button onClick={handleLogout} className="text-gray-400 hover:text-white text-sm">
            Log Out
          </button>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 mb-6 text-center">
          <p className="text-white text-lg font-semibold mb-2">Ready to train?</p>
          <p className="text-gray-500 text-sm mb-4">Scan the QR code on any piece of equipment to get started</p>
          <a href="/scan" className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200 inline-block">
            Scan Equipment
          </a>
        </div>

        <h2 className="text-white font-semibold text-lg mb-4">My Equipment</h2>

        {machineWorkouts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No workouts yet. Scan a machine to get started.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {machineWorkouts.map(workout => (
              <a href={'/machine/' + workout.machine_id} key={workout.machine_id} className="bg-gray-900 rounded-xl p-4 block hover:bg-gray-800">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-white font-semibold">{workout.machines?.name}</p>
                  <p className="text-green-400 text-xs">{daysSince(workout.created_at)}</p>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-white font-bold">{workout.sets}</p>
                    <p className="text-gray-500 text-xs">Sets</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold">{workout.reps}</p>
                    <p className="text-gray-500 text-xs">Reps</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold">{workout.weight}</p>
                    <p className="text-gray-500 text-xs">Lbs</p>
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