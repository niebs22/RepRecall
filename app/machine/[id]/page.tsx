'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function MachinePage({ params }: { params: any }) {
  const id = params.id
  const [machine, setMachine] = useState<any>(null)
  const [lastWorkout, setLastWorkout] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data: machineData } = await supabase
        .from('machines')
        .select('*')
        .eq('id', id)
        .single()
      setMachine(machineData)

      const { data: workoutData } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .eq('machine_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      setLastWorkout(workoutData)
    }
    load()
  }, [])

  async function handleSave(e: any) {
    e.preventDefault()
    const { error } = await supabase.from('workouts').insert({
      user_id: user.id,
      machine_id: id,
      sets: parseInt(sets),
      reps: parseInt(reps),
      weight: parseFloat(weight),
      notes
    })
    if (!error) setSaved(true)
  }

  if (!machine) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </main>
  )

  if (saved) return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="text-center">
        <p className="text-5xl mb-4">✅</p>
        <h2 className="text-2xl font-bold text-white mb-2">Workout Saved</h2>
        <p className="text-gray-400 mb-8">Keep it up!</p>
        <a href="/dashboard" className="bg-white text-black px-8 py-3 rounded-full font-semibold">
          Back to Dashboard
        </a>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-black p-6">
      <div className="max-w-lg mx-auto">
        <a href="/dashboard" className="text-gray-400 hover:text-white text-sm mb-6 inline-block">
          ← Dashboard
        </a>

        <h1 className="text-3xl font-bold text-white mb-2">{machine.name}</h1>
        {machine.description && (
          <p className="text-gray-400 mb-6">{machine.description}</p>
        )}

        {lastWorkout ? (
          <div className="bg-gray-900 rounded-2xl p-5 mb-8">
            <p className="text-gray-400 text-sm mb-1">Last Session</p>
            <p className="text-gray-500 text-xs mb-3">
              {new Date(lastWorkout.created_at).toLocaleDateString()} · {
                Math.floor((new Date().getTime() - new Date(lastWorkout.created_at).getTime()) / (1000 * 60 * 60 * 24)) === 0
                  ? 'Today'
                  : Math.floor((new Date().getTime() - new Date(lastWorkout.created_at).getTime()) / (1000 * 60 * 60 * 24)) === 1
                  ? '1 day ago'
                  : `${Math.floor((new Date().getTime() - new Date(lastWorkout.created_at).getTime()) / (1000 * 60 * 60 * 24))} days ago`
              }
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{lastWorkout.sets}</p>
                <p className="text-gray-400 text-sm">Sets</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{lastWorkout.reps}</p>
                <p className="text-gray-400 text-sm">Reps</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{lastWorkout.weight}</p>
                <p className="text-gray-400 text-sm">Lbs</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-2xl p-5 mb-8">
            <p className="text-gray-400 text-center">No previous session on this machine</p>
          </div>
        )}

        <h2 className="text-white font-semibold text-lg mb-4">Log Today's Workout</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Sets</label>
              <input
                type="number"
                value={sets}
                onChange={e => setSets(e.target.value)}
                className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Reps</label>
              <input
                type="number"
                value={reps}
                onChange={e => setReps(e.target.value)}
                className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Weight (lbs)</label>
              <input
                type="number"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-white"
              />
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. felt strong today"
              className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-white"
            />
          </div>
          <button type="submit" className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200">
            Save Workout
          </button>
        </form>
      </div>
    </main>
  )
}