'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [workouts, setWorkouts] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        fetchRecentWorkouts(user.id)
      }
    }
    getUser()
  }, [])

  async function fetchRecentWorkouts(userId: string) {
    const { data } = await supabase
      .from('workouts')
      .select('*, machines(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
    if (data) setWorkouts(data)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
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
          <p className="text-gray-500 text-sm">Open your camera app and scan the QR code on any piece of equipment to get started</p>
        </div>

        <h2 className="text-white font-semibold text-lg mb-4">Recent Workouts</h2>

        {workouts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No workouts yet. Scan a machine to get started.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {workouts.map(workout => (
              <a href={`/machine/${workout.machine_id}`} key={workout.id} className="bg-gray-900 rounded-xl p-4 block hover:bg-gray-800">
                <div className="flex justify-between items-center">
                  <p className="text-white font-semibold">{workout.machines?.name}</p>
                  <p className="text-gray-400 text-sm">{new Date(workout.created_at).toLocaleDateString()}</p>
                </div>
                <p className="text-gray-400 text-sm mt-1">
                  {workout.sets} sets · {workout.reps} reps · {workout.weight} lbs
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}