'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function MachinePage() {
  const pathname = usePathname()
  const id = pathname?.split('/').pop()
  const [machine, setMachine] = useState<any>(null)
  const [allWorkouts, setAllWorkouts] = useState<any[]>([])
  const [allMachines, setAllMachines] = useState<any[]>([])
  const [variations, setVariations] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [selectedExercise, setSelectedExercise] = useState('')
  const [showAddVariation, setShowAddVariation] = useState(false)
  const [showManageVariations, setShowManageVariations] = useState(false)
  const [newVariation, setNewVariation] = useState('')
  const [editingVariation, setEditingVariation] = useState<any>(null)
  const [editingVariationName, setEditingVariationName] = useState('')
  const [sets, setSets] = useState<any[]>([{reps: '', weight: ''}])
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [editingSession, setEditingSession] = useState(false)
  const [editableSets, setEditableSets] = useState<any[]>([])

  // Superset state
  const [supersetMachine, setSupersetMachine] = useState<any>(null)
  const [showSupersetPicker, setShowSupersetPicker] = useState(false)
  const [supersetSearch, setSupersetSearch] = useState('')
  const [activeSupersetPanel, setActiveSupersetPanel] = useState<'A' | 'B'>('A')
  const [supersetSets, setSupersetSets] = useState<any[]>([{reps: '', weight: ''}])
  const [supersetNotes, setSupersetNotes] = useState('')
  const [supersetSaved, setSupersetSaved] = useState(false)

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

        const { data: machinesData } = await supabase
          .from('machines').select('*')
          .order('name', { ascending: true })
        if (machinesData) setAllMachines(machinesData.filter(m => m.id !== id))

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

  async function handleRenameVariation(variation: any) {
    if (!editingVariationName.trim()) return
    const { data } = await supabase
      .from('variations')
      .update({ name: editingVariationName.trim() })
      .eq('id', variation.id)
      .select()
      .single()
    if (data) {
      setVariations(variations.map(v => v.id === variation.id ? data : v))
      if (selectedExercise === variation.name) setSelectedExercise(data.name)
    }
    setEditingVariation(null)
    setEditingVariationName('')
  }

  async function handleDeleteVariation(variation: any) {
    await supabase.from('variations').delete().eq('id', variation.id)
    setVariations(variations.filter(v => v.id !== variation.id))
    if (selectedExercise === variation.name) setSelectedExercise(machine.name)
  }

  function addSet() { setSets([...sets, {reps: '', weight: ''}]) }
  function removeSet(index: number) {
    if (sets.length === 1) return
    setSets(sets.filter((_, i) => i !== index))
  }
  function updateSet(index: number, field: string, value: string) {
    const updated = [...sets]
    updated[index] = {...updated[index], [field]: value}
    setSets(updated)
  }

  function addSupersetSet() { setSupersetSets([...supersetSets, {reps: '', weight: ''}]) }
  function removeSupersetSet(index: number) {
    if (supersetSets.length === 1) return
    setSupersetSets(supersetSets.filter((_, i) => i !== index))
  }
  function updateSupersetSet(index: number, field: string, value: string) {
    const updated = [...supersetSets]
    updated[index] = {...updated[index], [field]: value}
    setSupersetSets(updated)
  }

  function startEditingSession(sessionSets: any[]) {
    setEditableSets(sessionSets.map(s => ({...s})))
    setEditingSession(true)
  }

  function updateEditableSet(index: number, field: string, value: string) {
    const updated = [...editableSets]
    updated[index] = {...updated[index], [field]: value}
    setEditableSets(updated)
  }

  async function saveEditedSession() {
    for (const s of editableSets) {
      await supabase.from('workouts').update({
        reps: parseInt(s.reps),
        weight: parseFloat(s.weight),
        duration: s.duration ? parseFloat(s.duration) : null,
        distance: s.distance ? parseFloat(s.distance) : null,
        notes: s.notes || null,
      }).eq('id', s.id)
    }
    const { data: workoutData } = await supabase
      .from('workouts').select('*')
      .eq('user_id', user.id)
      .eq('machine_id', id)
      .order('created_at', { ascending: false })
    if (workoutData) setAllWorkouts(workoutData)
    setEditingSession(false)
  }

  async function handleSave(e: any) {
    e.preventDefault()
    if (machine.type === 'cardio') {
      if (!duration) return
      const { error } = await supabase.from('workouts').insert({
        user_id: user.id, machine_id: id, exercise_name: selectedExercise,
        duration: parseFloat(duration), distance: distance ? parseFloat(distance) : null,
        notes: notes || null, sets: null, reps: null, weight: null,
        superset: !!supersetMachine
      })
      if (!error) setSaved(true)
    } else {
      const validSets = sets.filter(s => s.reps && s.weight)
      if (validSets.length === 0) return
      const inserts = validSets.map((s, i) => ({
        user_id: user.id, machine_id: id, exercise_name: selectedExercise,
        sets: validSets.length, reps: parseInt(s.reps), weight: parseFloat(s.weight),
        notes: i === 0 ? notes : null, duration: null, distance: null,
        superset: !!supersetMachine
      }))
      const { error } = await supabase.from('workouts').insert(inserts)
      if (!error) setSaved(true)
    }
  }

  async function handleSupersetSave() {
    const validSets = supersetSets.filter(s => s.reps && s.weight)
    if (validSets.length === 0) return
    const inserts = validSets.map((s, i) => ({
      user_id: user.id, machine_id: supersetMachine.id,
      exercise_name: supersetMachine.name,
      sets: validSets.length, reps: parseInt(s.reps), weight: parseFloat(s.weight),
      notes: i === 0 ? supersetNotes : null, duration: null, distance: null,
      superset: true
    }))
    await supabase.from('workouts').insert(inserts)
    setSupersetSaved(true)
  }

  function daysSince(date: string) {
    const now = new Date()
    const past = new Date(date)
    const diffMs = now.getTime() - past.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return diffDays + ' days ago'
  }

  const filteredMachines = allMachines.filter(m =>
    m.name.toLowerCase().includes(supersetSearch.toLowerCase())
  )

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

  if (saved && supersetMachine && !supersetSaved) return (
    <main className="min-h-screen p-6" style={{background: '#0A1628'}}>
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background: '#2563EB'}}>
            <span className="text-2xl text-white">✓</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{machine.name} saved</h2>
          <p style={{color: '#64748B'}}>Now log your superset</p>
        </div>

        <div className="rounded-2xl p-5 mb-4" style={{background: '#0F2040', borderLeft: '3px solid #22C55E'}}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{color: '#22C55E'}}>Superset — {supersetMachine.name}</p>
        </div>

        <h2 className="font-semibold text-lg mb-4 text-white">Log {supersetMachine.name}</h2>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-12 gap-2 px-1">
            <p className="col-span-1 text-xs" style={{color: '#64748B'}}></p>
            <p className="col-span-5 text-xs" style={{color: '#64748B'}}>Reps</p>
            <p className="col-span-5 text-xs" style={{color: '#64748B'}}>Weight (lbs)</p>
            <p className="col-span-1"></p>
          </div>
          {supersetSets.map((set, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-1 text-center">
                <p className="text-xs font-bold" style={{color: '#22C55E'}}>{i + 1}</p>
              </div>
              <input type="number" value={set.reps} onChange={e => updateSupersetSet(i, 'reps', e.target.value)}
                placeholder="0" className="col-span-5 px-4 py-3 rounded-lg text-white focus:outline-none text-center"
                style={{background: '#0F2040', border: '1px solid #1E3A5F'}}/>
              <input type="number" value={set.weight} onChange={e => updateSupersetSet(i, 'weight', e.target.value)}
                placeholder="0" className="col-span-5 px-4 py-3 rounded-lg text-white focus:outline-none text-center"
                style={{background: '#0F2040', border: '1px solid #1E3A5F'}}/>
              <button type="button" onClick={() => removeSupersetSet(i)}
                className="col-span-1 text-center text-lg"
                style={{color: supersetSets.length === 1 ? '#1E3A5F' : '#64748B'}}>×</button>
            </div>
          ))}
          <button type="button" onClick={addSupersetSet}
            className="py-3 rounded-xl font-semibold text-sm"
            style={{background: 'transparent', border: '1px dashed #22C55E', color: '#22C55E'}}>
            + Add Set
          </button>
          <div>
            <label className="text-xs mb-1 block" style={{color: '#64748B'}}>Notes (optional)</label>
            <input type="text" value={supersetNotes} onChange={e => setSupersetNotes(e.target.value)}
              placeholder="e.g. felt strong today"
              className="w-full px-4 py-3 rounded-lg text-white focus:outline-none"
              style={{background: '#0F2040', border: '1px solid #1E3A5F'}}/>
          </div>
          <button onClick={handleSupersetSave}
            className="py-3 rounded-full font-semibold text-white"
            style={{background: '#22C55E'}}>
            Finish Superset
          </button>
        </div>
      </div>
    </main>
  )

  if (saved && (!supersetMachine || supersetSaved)) return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: '#0A1628'}}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background: '#2563EB'}}>
          <span className="text-2xl text-white">✓</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Workout Saved</h2>
        {supersetMachine && (
          <p className="text-xs px-3 py-1 rounded-full inline-block mb-2" style={{background: 'rgba(34,197,94,0.15)', color: '#22C55E'}}>Superset logged</p>
        )}
        {machine.type === 'cardio' ? (
          <p className="mb-2" style={{color: '#64748B'}}>{duration} min{distance ? ' · ' + distance + ' miles' : ''}</p>
        ) : (
          <p className="mb-2" style={{color: '#64748B'}}>{sets.filter(s => s.reps && s.weight).length} sets logged</p>
        )}
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

        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-bold text-white">{machine.name}</h1>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{
            background: machine.type === 'cardio' ? 'rgba(34,197,94,0.1)' : 'rgba(37,99,235,0.1)',
            color: machine.type === 'cardio' ? '#22C55E' : '#3B82F6'
          }}>
            {machine.type === 'cardio' ? 'Cardio' : 'Strength'}
          </span>
        </div>
        {machine.description && (
          <p className="mb-4" style={{color: '#64748B'}}>{machine.description}</p>
        )}

        {/* Superset banner if active */}
        {supersetMachine && (
          <div className="rounded-xl px-4 py-3 mb-4 flex justify-between items-center" style={{background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)'}}>
            <div>
              <p className="text-xs font-semibold" style={{color: '#22C55E'}}>Superset with</p>
              <p className="text-white text-sm font-semibold">{supersetMachine.name}</p>
            </div>
            <button onClick={() => setSupersetMachine(null)} className="text-xs" style={{color: '#64748B'}}>Remove</button>
          </div>
        )}

        {/* Exercise selector */}
        {machine.type === 'strength' && (
          <div className="mb-6">
            <label className="text-xs mb-2 block font-semibold tracking-widest uppercase" style={{color: '#64748B'}}>Exercise</label>
            <select
              value={selectedExercise}
              onChange={e => {
                if (e.target.value === '__add__') { setShowAddVariation(true) }
                else if (e.target.value === '__manage__') { setShowManageVariations(true) }
                else { setSelectedExercise(e.target.value); setShowAddVariation(false) }
              }}
              className="w-full px-4 py-3 rounded-lg text-white focus:outline-none mb-2"
              style={{background: '#0F2040', border: '1px solid #1E3A5F'}}
            >
              <option value={machine.name}>{machine.name} (default)</option>
              {variations.map(v => (
                <option key={v.id} value={v.name}>{v.name}</option>
              ))}
              <option value="__add__">+ Add variation...</option>
              {variations.length > 0 && <option value="__manage__">✎ Manage variations...</option>}
            </select>

            {showAddVariation && (
              <div className="rounded-xl p-4 mb-2" style={{background: '#0F2040', border: '1px solid #2563EB'}}>
                <p className="text-white text-sm font-semibold mb-3">Add a variation</p>
                <input type="text" value={newVariation} onChange={e => setNewVariation(e.target.value)}
                  placeholder="e.g. Close Grip Bench Press"
                  className="w-full px-4 py-3 rounded-lg text-white focus:outline-none mb-3"
                  style={{background: '#0A1628', border: '1px solid #1E3A5F'}}/>
                <div className="flex gap-2">
                  <button onClick={handleAddVariation} className="flex-1 py-3 rounded-full font-semibold text-white" style={{background: '#2563EB'}}>Save Variation</button>
                  <button onClick={() => { setShowAddVariation(false); setNewVariation('') }}
                    className="flex-1 py-3 rounded-full font-semibold"
                    style={{background: '#0A1628', border: '1px solid #1E3A5F', color: '#64748B'}}>Cancel</button>
                </div>
              </div>
            )}

            {showManageVariations && (
              <div className="rounded-xl p-4 mb-2" style={{background: '#0F2040', border: '1px solid #1E3A5F'}}>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-white text-sm font-semibold">Manage Variations</p>
                  <button onClick={() => { setShowManageVariations(false); setEditingVariation(null) }} className="text-xs" style={{color: '#64748B'}}>Done</button>
                </div>
                <div className="flex flex-col gap-2">
                  {variations.map(v => (
                    <div key={v.id}>
                      {editingVariation?.id === v.id ? (
                        <div className="flex gap-2 items-center">
                          <input type="text" value={editingVariationName} onChange={e => setEditingVariationName(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg text-white text-sm focus:outline-none"
                            style={{background: '#0A1628', border: '1px solid #2563EB'}}/>
                          <button onClick={() => handleRenameVariation(v)} className="px-3 py-2 rounded-lg text-white text-sm font-semibold" style={{background: '#2563EB'}}>Save</button>
                          <button onClick={() => { setEditingVariation(null); setEditingVariationName('') }}
                            className="px-3 py-2 rounded-lg text-sm"
                            style={{background: '#0A1628', border: '1px solid #1E3A5F', color: '#64748B'}}>✕</button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center px-3 py-2 rounded-lg" style={{background: '#0A1628'}}>
                          <p className="text-white text-sm">{v.name}</p>
                          <div className="flex gap-2">
                            <button onClick={() => { setEditingVariation(v); setEditingVariationName(v.name) }}
                              className="text-xs px-2 py-1 rounded" style={{color: '#3B82F6', background: 'rgba(59,130,246,0.1)'}}>Rename</button>
                            <button onClick={() => handleDeleteVariation(v)}
                              className="text-xs px-2 py-1 rounded" style={{color: '#EF4444', background: 'rgba(239,68,68,0.1)'}}>Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Last session */}
        {lastSessionSets.length > 0 ? (
          <div className="rounded-2xl p-5 mb-8" style={{background: '#0F2040', borderLeft: '3px solid #2563EB'}}>
            <div className="flex justify-between items-center mb-4">
              <p className="text-xs font-semibold tracking-widest uppercase" style={{color: '#64748B'}}>Last Session</p>
              <div className="flex gap-3 items-center">
                <div className="flex gap-2 items-center">
                  <p className="text-xs" style={{color: '#3B82F6'}}>{daysSince(lastSessionDate)}</p>
                  <p className="text-xs" style={{color: '#64748B'}}>· {new Date(lastSessionDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</p>
                </div>
                {!editingSession && (
                  <button onClick={() => startEditingSession(lastSessionSets)}
                    className="text-xs px-2 py-1 rounded" style={{color: '#3B82F6', background: 'rgba(59,130,246,0.1)'}}>Edit</button>
                )}
              </div>
            </div>

            {editingSession ? (
              <div>
                {machine.type === 'cardio' ? (
                  <div className="flex flex-col gap-3 mb-3">
                    <div>
                      <label className="text-xs mb-1 block" style={{color: '#64748B'}}>Duration (minutes)</label>
                      <input type="number" value={editableSets[0]?.duration || ''}
                        onChange={e => updateEditableSet(0, 'duration', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg text-white focus:outline-none text-center"
                        style={{background: '#0A1628', border: '1px solid #2563EB'}}/>
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{color: '#64748B'}}>Distance (miles)</label>
                      <input type="number" value={editableSets[0]?.distance || ''}
                        onChange={e => updateEditableSet(0, 'distance', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg text-white focus:outline-none text-center"
                        style={{background: '#0A1628', border: '1px solid #1E3A5F'}}/>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="grid grid-cols-12 gap-2 mb-1 pb-2" style={{borderBottom: '1px solid #1E3A5F'}}>
                      <p className="col-span-1"></p>
                      <p className="col-span-5 text-xs font-bold tracking-widest uppercase" style={{color: '#64748B'}}>Reps</p>
                      <p className="col-span-6 text-xs font-bold tracking-widest uppercase" style={{color: '#64748B'}}>Weight</p>
                    </div>
                    {editableSets.map((s, i) => (
                      <div key={s.id} className="grid grid-cols-12 gap-2 items-center">
                        <p className="col-span-1 text-xs font-bold" style={{color: '#3B82F6'}}>{i + 1}</p>
                        <input type="number" value={s.reps} onChange={e => updateEditableSet(i, 'reps', e.target.value)}
                          className="col-span-5 px-3 py-2 rounded-lg text-white focus:outline-none text-center"
                          style={{background: '#0A1628', border: '1px solid #2563EB'}}/>
                        <input type="number" value={s.weight} onChange={e => updateEditableSet(i, 'weight', e.target.value)}
                          className="col-span-6 px-3 py-2 rounded-lg text-white focus:outline-none text-center"
                          style={{background: '#0A1628', border: '1px solid #2563EB'}}/>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mb-3">
                  <label className="text-xs mb-1 block" style={{color: '#64748B'}}>Notes</label>
                  <input type="text" value={editableSets[0]?.notes || ''} onChange={e => updateEditableSet(0, 'notes', e.target.value)}
                    placeholder="e.g. felt strong today"
                    className="w-full px-3 py-2 rounded-lg text-white focus:outline-none"
                    style={{background: '#0A1628', border: '1px solid #1E3A5F'}}/>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveEditedSession} className="flex-1 py-2 rounded-full font-semibold text-white text-sm" style={{background: '#2563EB'}}>Save Changes</button>
                  <button onClick={() => setEditingSession(false)} className="flex-1 py-2 rounded-full text-sm font-semibold"
                    style={{background: '#0A1628', border: '1px solid #1E3A5F', color: '#64748B'}}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                {machine.type === 'cardio' ? (
                  <div className="flex gap-6">
                    <div>
                      <p className="text-white font-bold text-lg">{lastSessionSets[0].duration}</p>
                      <p className="text-xs" style={{color: '#64748B'}}>Minutes</p>
                    </div>
                    {lastSessionSets[0].distance && (
                      <div>
                        <p className="text-white font-bold text-lg">{lastSessionSets[0].distance}</p>
                        <p className="text-xs" style={{color: '#64748B'}}>Miles</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
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
                )}
                {lastSessionNotes && (
                  <p className="text-xs italic pt-3 mt-3" style={{color: '#64748B', borderTop: '1px solid #1E3A5F'}}>
                    "{lastSessionNotes}"
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="rounded-2xl p-5 mb-8 text-center" style={{background: '#0F2040'}}>
            <p style={{color: '#64748B'}}>No previous session recorded</p>
          </div>
        )}

        {/* Log workout */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg text-white">Log Today's Workout</h2>
          {!supersetMachine && machine.type === 'strength' && (
            <button onClick={() => setShowSupersetPicker(true)}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold"
              style={{border: '1px solid #2563EB', color: '#3B82F6'}}>
              + Superset
            </button>
          )}
        </div>

        {/* Superset picker */}
        {showSupersetPicker && (
          <div className="rounded-2xl p-4 mb-6" style={{background: '#0F2040', border: '1px solid #2563EB'}}>
            <div className="flex justify-between items-center mb-3">
              <p className="text-white text-sm font-semibold">Pair with machine</p>
              <button onClick={() => { setShowSupersetPicker(false); setSupersetSearch('') }} className="text-xs" style={{color: '#64748B'}}>Cancel</button>
            </div>
            <input type="text" value={supersetSearch} onChange={e => setSupersetSearch(e.target.value)}
              placeholder="Search machines..."
              className="w-full px-4 py-3 rounded-lg text-white focus:outline-none mb-3"
              style={{background: '#0A1628', border: '1px solid #1E3A5F'}}/>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {filteredMachines.map(m => (
                <button key={m.id} onClick={() => { setSupersetMachine(m); setShowSupersetPicker(false); setSupersetSearch('') }}
                  className="flex justify-between items-center px-3 py-2 rounded-lg text-left"
                  style={{background: '#0A1628'}}>
                  <p className="text-white text-sm">{m.name}</p>
                  <p className="text-xs" style={{color: '#3B82F6'}}>Pair</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {machine.type === 'cardio' ? (
            <>
              <div>
                <label className="text-xs mb-1 block" style={{color: '#64748B'}}>Duration (minutes)</label>
                <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
                  placeholder="0" className="w-full px-4 py-3 rounded-lg text-white focus:outline-none text-center"
                  style={{background: '#0F2040', border: '1px solid #1E3A5F'}}/>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{color: '#64748B'}}>Distance in miles (optional)</label>
                <input type="number" value={distance} onChange={e => setDistance(e.target.value)}
                  placeholder="0.0" step="0.1"
                  className="w-full px-4 py-3 rounded-lg text-white focus:outline-none text-center"
                  style={{background: '#0F2040', border: '1px solid #1E3A5F'}}/>
              </div>
            </>
          ) : (
            <>
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
                  <input type="number" value={set.reps} onChange={e => updateSet(i, 'reps', e.target.value)}
                    placeholder="0" className="col-span-5 px-4 py-3 rounded-lg text-white focus:outline-none text-center"
                    style={{background: '#0F2040', border: '1px solid #1E3A5F'}}/>
                  <input type="number" value={set.weight} onChange={e => updateSet(i, 'weight', e.target.value)}
                    placeholder="0" className="col-span-5 px-4 py-3 rounded-lg text-white focus:outline-none text-center"
                    style={{background: '#0F2040', border: '1px solid #1E3A5F'}}/>
                  <button type="button" onClick={() => removeSet(i)} className="col-span-1 text-center text-lg"
                    style={{color: sets.length === 1 ? '#1E3A5F' : '#64748B'}}>×</button>
                </div>
              ))}
              <button type="button" onClick={addSet} className="py-3 rounded-xl font-semibold text-sm"
                style={{background: 'transparent', border: '1px dashed #2563EB', color: '#3B82F6'}}>
                + Add Set
              </button>
            </>
          )}
          <div>
            <label className="text-xs mb-1 block" style={{color: '#64748B'}}>Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. felt strong today"
              className="w-full px-4 py-3 rounded-lg text-white focus:outline-none"
              style={{background: '#0F2040', border: '1px solid #1E3A5F'}}/>
          </div>
          <button type="submit" className="py-3 rounded-full font-semibold text-white" style={{background: '#2563EB'}}>
            {supersetMachine ? `Finish ${machine.name} — Log Superset Next` : 'Finish Workout'}
          </button>
        </form>
      </div>
    </main>
  )
}