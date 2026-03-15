'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function MachinePage() {
  const pathname = usePathname()
  const id = pathname?.split('/').pop()
  const [machine, setMachine] = useState<any>(null)
  const [allWorkouts, setAllWorkouts] = useState<any[]>([])
  const [variations, setVariations] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [selectedExercise, setSelectedExercise] = useState('')
  const [showAddVariation, setShowAddVariation] = useState(false)
  const [newVariation, setNewVariation] = useState('')
  const [sets, setSets] = useState<any[]>([{reps: '', weight: ''}])
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
        setSelectedExercise(machineData.name)

        const { data: variationData } = await supabase
          .from('variations')
          .select('*')
          .eq('user_id', user.id)
          .eq('machine_id', id)
          .order('created_at', { ascending: true })
        if (variationData) setVariations(variationData)

        const { data: workoutData } = await supabase
          .from('workouts').select('*')
          .eq('user_id', user.id)
          .eq('machine_id', id)
          .order('created_at', { ascending: false })
        if (workoutData) setAllWorkouts(workoutData)

      } catch (err) {
        setError('Something went wrong. Please try again.')
      }
    }
    load()
  }, [id])

  function getLastSessionSets(exerciseName: string) {
    const exerciseWorkouts = allWorkouts.filter(w =>
      (w.exercise_name || machine?.name) === exerciseName
    )
    if (exerciseWorkouts.length === 0) return []

    const lastDate = new Date(exerciseWorkouts[0].created_at).toDateString()
    return exerciseWorkouts.filter(w =>
      new Date(w.created_at).toDateString() === lastDate
    )
  }

  async function handleAddVariation() {
    if (!newVariation.trim()) return
    const { data } = await supabase.from('variations').insert({
      user_id: user.id,
      machine_id: id,
      name: newVariation.trim()
    }).select().single()
    if (data) {
      setVariations([...variations, data])
      setSelectedExercise(data.name)
    }
    setNewVariation('')
    setShowAddVariation(false)
  }

  function addSet() {
    setSets([...sets, {reps: '', weight: ''}])
  }

  function removeSet(index: number) {
    if (sets.length === 1) return
    setSets(sets.filter((_, i) => i !== index))
  }

  function updateSet(index: number, field: string, value: string) {
    const updated = [...sets]
    updated[index] = {...updated[index], [field]: value}
    setSets(updated)
  }

  async function handleSave(e: any) {
    e.preventDefault()
    const validSets = sets.filter(s => s.reps && s.weight)
    if (validSets.length === 0) return

    const inserts = validSets.map((s, i) => ({
      user_id: user.id,
      machine_id: id,
      exercise_name: selectedExercise,
      sets: validSets.length,
      reps: parseInt(s.reps),
      weight: parseFloat(s.weight),
      notes: i === 0 ? notes : null
    }))

    const { error } = await supabase.from('workouts').insert(inserts)
    if (!error) setSaved(true)
  }

  function daysSince(date: string) {
    const diffMs = new Date().getTime() - new Date(date).getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    const diffDays = Math.floor(diffHours / 24)
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return 'Today'
    if (diffDays === 1) return '1 day ago'
    return diffDays + ' days ago'
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
          <span className="text-2xl text-white">✓</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Workout Saved</h2>
        <p className="mb-2" style={{color: '#64748B'}}>{sets.filter(s => s.reps && s.weight).length} sets logged</p>
        <p className="mb-8" style={{color: '#64748B'}}>Keep it up!</p>
        <div className="flex flex-col gap-3">
          <a href="/scan" className="py-3 px-8 rounded-full font-semibold text-white text-center" style={{background: '#2563EB'}}>
            Scan Next Machine
          </a>
          <a href="/dashboard" className="py-3 px-8 rounded-full font-semibold text-center" style={{border: '1px solid #2563EB', color: '#3B82F6'}}>
            Back to Dashboard
          </a>
        </div>
      </div>
    </main>
  )

  const lastSessionSets = getLastSessionSets(selectedExercise)
  const lastSessionDate = lastSessionSets.length > 0 ? lastSessionSets[0].created_at : null
  const lastSessionNotes = lastSessionSets.find(s => s.notes)?.notes

  return (
    <main className="min-h-screen p-6" style={{background: '#0A1628'}}>
      <div className="max-w-lg mx-auto">
        <a href="/dashboard" className="text-sm mb-6 inline-block" style={{color: '#64748B'}}>
          Back to Dashboard
        </a>

        <h1 className="text-3xl font-bold text-white mb-1">{machine.name}</h1>
        {machine.description && (
          <p className="mb-4" style={{color: '#64748B'}}>{machine.description}</p>
        )}

        {/* Exercise selector */}
        <div className="mb-6">
          <label className="text-xs mb-2 block font-semibold tracking-widest uppercase" style={{color: '#64748B'}}>Exercise</label>
          <select
            value={selectedExercise}
            onChange={e => {
              if (e.target.value === '__add__') {
                setShowAddVariation(true)
              } else {
                setSelectedExercise(e.target.value)
                setShowAddVariation(false)
              }
            }}
            className="w-full px-4 py-3 rounded-lg text-white focus:outline-none mb-2"
            style={{background: '#0F2040', border: '1px solid #1E3A5F'}}
          >
            <option value={machine.name}>{machine.name} (default)</option>
            {variations.map(v => (
              <option key={v.id} value={v.name}>{v.name}</option>
            ))}
            <option value="__add__">+ Add variation...</option>
          </select>

          {showAddVariation && (
            <div className="rounded-xl p-4" style={{background: '#0F2040', border: '1px solid #2563EB'}}>
              <p className="text-white text-sm font-semibold mb-3">Add a variation</p>
              <input
                type="text"
                value={newVariation}
                onChange={e => setNewVariation(e.target.value)}
                placeholder="e.g. Close Grip Bench Press"
                className="w-full px-4 py-3 rounded-lg text-white focus:outline-none mb-3"
                style={{background: '#0A1628', border: '1px solid #1E3A5F'}}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddVariation}
                  className="flex-1 py-3 rounded-full font-semibold text-white"
                  style={{background: '#2563EB', border: '2px solid #EF4444', boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)'}}
                >
                  Save Variation
                </button>
                <button
                  onClick={() => { setShowAddVariation(false); setNewVariation('') }}
                  className="flex-1 py-3 rounded-full font-semibold"
                  style={{background: '#0A1628', border: '1px solid #1E3A5F', color: '#64748B'}}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Last session — all sets */}
        {lastSessionSets.length > 0 ? (
          <div className="rounded-2xl p-5 mb-8" style={{background: '#0F2040', borderLeft: '3px solid #2563EB'}}>
            <div className="flex justify-between items-center mb-4">
              <p className="text-xs font-semibold tracking-widest uppercase" style={{color: '#64748B'}}>
                Last Session — {selectedExercise}
              </p>
              <p className="text-xs" style={{color: '#3B82F6'}}>{daysSince(lastSessionDate)}</p>
            </div>

            {/* Set list */}
            <div className="flex flex-col gap-2 mb-3">
              <div className="grid grid-cols-12 gap-2 mb-2 pb-2" style={{borderBottom: '1px solid #1E3A5F'}}>
                <p className="col-span-1"></p>
                <p className="col-span-5 text-xs font-bold tracking-widest uppercase" style={{color: '#64748B'}}>Reps</p>
                <p className="col-span-6 text-xs font-bold tracking-widest uppercase" style={{color: '#64748B'}}>Weight</p>
              </div>
              {lastSessionSets.map((s, i) => (
             <div key={s.id} className="grid grid-cols-12 gap-2 items-center">
                <p className="col-span-1 text-xs font-bold" style={{color: '#3B82F6'}}>{i + 1}</p>
                <p className="col-span-5 text-white font-semibold">{s.reps}</p>
                <p className="col-span-6 text-white font-semibold">{s.weight} lbs</p>
            </div>
          ))}
        </div>

            {lastSessionNotes && (
              <p className="text-xs italic pt-3" style={{color: '#64748B', borderTop: '1px solid #1E3A5F'}}>
                "{lastSessionNotes}"
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl p-5 mb-8 text-center" style={{background: '#0F2040'}}>
            <p style={{color: '#64748B'}}>No previous session for {selectedExercise}</p>
          </div>
        )}

        {/* Log workout */}
        <h2 className="font-semibold text-lg mb-4 text-white">Log Today's Workout</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-12 gap-2 px-1">
            <p className="col-span-1 text-xs" style={{color: '#64748B'}}></p>
            <p className="col-span-5 text-xs" style={{color: '#64748B'}}>Reps</p>
            <p className="col-span-5 text-xs" style={{color: '#64748B'}}>Weight (lbs)</p>
            <p className="col-span-1"></p>
          </div>

          {sets.map((set, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-1 text-center">
                <p className="text-xs font-bold" style={{color: '#3B82F6'}}>{i + 1}</p>
              </div>
              <input
                type="number"
                value={set.reps}
                onChange={e => updateSet(i, 'reps', e.target.value)}
                placeholder="0"
                className="col-span-5 px-4 py-3 rounded-lg text-white focus:outline-none text-center"
                style={{background: '#0F2040', border: '1px solid #1E3A5F'}}
              />
              <input
                type="number"
                value={set.weight}
                onChange={e => updateSet(i, 'weight', e.target.value)}
                placeholder="0"
                className="col-span-5 px-4 py-3 rounded-lg text-white focus:outline-none text-center"
                style={{background: '#0F2040', border: '1px solid #1E3A5F'}}
              />
              <button
                type="button"
                onClick={() => removeSet(i)}
                className="col-span-1 text-center text-lg"
                style={{color: sets.length === 1 ? '#1E3A5F' : '#64748B'}}
              >
                ×
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addSet}
            className="py-3 rounded-xl font-semibold text-sm"
            style={{background: 'transparent', border: '1px dashed #2563EB', color: '#3B82F6'}}
          >
            + Add Set
          </button>

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
            Finish Workout
          </button>
        </form>
      </div>
    </main>
  )
}