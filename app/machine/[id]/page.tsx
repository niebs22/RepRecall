'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function MachinePage() {
  const pathname = usePathname()
  const id = pathname?.split('/').pop()
  const [machine, setMachine] = useState<any>(null)
  const [lastWorkout, setLastWorkout] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      try {
        if (!id) { setError('Invalid machine ID'); return }
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setUser(user)
        const { data: machineData, error: machineError } = await supabase
          .from('machines').select('*').eq('id', id).single()
        if (machineError) { setError('Machine not found'); return }
        setMachine(machineData)
        const { data: workoutData } = await supabase
          .from('workouts').select('*').eq('user_id', user.id).eq('machine_id', id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle()
        setLastWorkout(workoutData)
      } catch (err) {
        setError('Something went wrong. Please try again.')
      }
    }
    load()
  }, [id])

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

  function daysSince(date: string) {
    const days = Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return '1 day ago'
    return days + ' days ago'
  }

  if (error) return (
    <main className="min-h-screen flex items-center justify-center" style={{background: '#0A1628'}}>
      <p className="text-red-400">{error}</p>
    </main>
  )

  if (!machine) return (
    <main className="min-h-screen flex items-center justify-center" style={{background: '#0A1628'}}>
      <p style={{color: '#64748B'}}>Loading...</p>
    </main>
  )

  if (saved) return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: '#0A1628'}}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background: '#2563EB'}}>
          <span className="text-2xl">✓</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Workout Saved</h2>
        <p className="mb-8" style={{color: '#64748B'}}>Keep it up!</p>
        <div className="flex flex-col gap-3">
          <a href="/dashboard" className="py-3 px-8 rounded-full font-semibold text-white text-center" style={{background: '#2563EB'}}>
            Back to Dashboard
          </a>
          <a href={'/machine/' + id} className="py-3 px-8 rounded-full font-semibold text-center" style={{border: '1px solid #2563EB', color: '#3B82F6'}}>
            Log Another Set
          </a>
        </div>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen p-6" style={{background: '#0A1628'}}>
      <div className="max-w-lg mx-auto">
        <a href="/dashboard" className="text-sm mb-6 inline-block" style={{color: '#64748B'}}>
          Back to Dashboard
        </a>

        <h1 className="text-3xl font-bold text-white mb-1">{machine.name}</h1>
        {machine.description && (
          <p className="mb-6" style={{color: '#64748B'}}>{machine.description}</p>
        )}

        {lastWorkout ? (
          <div className="rounded-2xl p-5 mb-8" style={{background: '#0F2040'}}>
            <p className="text-sm mb-1" style={{color: '#64748B'}}>Last Session</p>
            <p className="text-xs mb-4" style={{color: '#3B82F6'}}>
              {new Date(lastWorkout.created_at).toLocaleDateString()} · {daysSince(lastWorkout.created_at)}
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{lastWorkout.sets}</p>
                <p className="text-xs" style={{color: '#64748B'}}>Sets</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{lastWorkout.reps}</p>
                <p className="text-xs" style={{color: '#64748B'}}>Reps</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{lastWorkout.weight}</p>
                <p className="text-xs" style={{color: '#64748B'}}>Lbs</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-5 mb-8 text-center" style={{background: '#0F2040'}}>
            <p style={{color: '#64748B'}}>No previous session on this machine</p>
          </div>
        )}

        <h2 className="font-semibold text-lg mb-4 text-white">Log Today's Workout</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{color: '#64748B'}}>Sets</label>
              <input
                type="number"
                value={sets}
                onChange={e => setSets(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-white focus:outline-none"
                style={{background: '#0F2040', border: '1px solid #1E3A5F'}}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{color: '#64748B'}}>Reps</label>
              <input
                type="number"
                value={reps}
                onChange={e => setReps(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-white focus:outline-none"
                style={{background: '#0F2040', border: '1px solid #1E3A5F'}}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{color: '#64748B'}}>Lbs</label>
              <input
                type="number"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-white focus:outline-none"
                style={{background: '#0F2040', border: '1px solid #1E3A5F'}}
              />
            </div>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{color: '#64748B'}}>Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. felt strong today"
              className="w-full px-4 py-3 rounded-lg text-white focus:outline-none"
              style={{background: '#0F2040', border: '1px solid #1E3A5F'}}
            />
          </div>
          <button
            type="submit"
            className="py-3 rounded-full font-semibold text-white"
            style={{background: '#2563EB'}}
          >
            Save Workout
          </button>
        </form>
      </div>
    </main>
  )
}