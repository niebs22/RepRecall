'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

function MachinePageInner() {
  const pathname = usePathname()
  const id = pathname?.split('/').pop()
  const searchParams = useSearchParams()
  const from = searchParams?.get('from')
  const exerciseParam = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('exercise')
    : searchParams?.get('exercise')
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
  const [historyOpen, setHistoryOpen] = useState(false)
  const [supersetExercise, setSupersetExercise] = useState('')
  const [supersetVariations, setSupersetVariations] = useState<any[]>([])
  const [validationError, setValidationError] = useState('')
  const [newQuickVariation, setNewQuickVariation] = useState('')
  const [showInlineAdd, setShowInlineAdd] = useState(false)
  const [showProgress, setShowProgress] = useState(false)

  // Superset state
  const [supersetMachine, setSupersetMachine] = useState<any>(null)
  const [showSupersetPicker, setShowSupersetPicker] = useState(false)
  const [supersetSearch, setSupersetSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A')
  const [supersetSets, setSupersetSets] = useState<any[]>([{reps: '', weight: ''}])
  const [supersetNotes, setSupersetNotes] = useState('')

  // Rotation state
  const [showSwitchPicker, setShowSwitchPicker] = useState(false)
  const [switchSearch, setSwitchSearch] = useState('')
  const [rotationMachines, setRotationMachines] = useState<any[]>([])

  const router = useRouter()

  // Load rotation and draft from localStorage on mount
  useEffect(() => {
    if (!id) return
    const savedRotation = localStorage.getItem('rotation_machines')
    if (savedRotation) setRotationMachines(JSON.parse(savedRotation))
    const draft = localStorage.getItem(`draft_${id}`)
    if (draft) {
      const parsed = JSON.parse(draft)
      if (parsed.sets) setSets(parsed.sets)
      if (parsed.notes) setNotes(parsed.notes)
      if (parsed.duration) setDuration(parsed.duration)
      if (parsed.distance) setDistance(parsed.distance)
      if (parsed.selectedExercise) setSelectedExercise(parsed.selectedExercise)
    }
  }, [id])

  function saveDraft() {
    if (!id) return
    localStorage.setItem(`draft_${id}`, JSON.stringify({ sets, notes, duration, distance, selectedExercise }))
  }

  function clearDraft() {
    if (!id) return
    localStorage.removeItem(`draft_${id}`)
  }

  function addToRotation(m: any) {
    if (!machine) return
    const current = { id, name: machine.name }
    const updated = [current, m].reduce((acc: any[], item: any) => {
      if (!acc.find((x: any) => x.id === item.id)) acc.push(item)
      return acc
    }, rotationMachines)
    setRotationMachines(updated)
    localStorage.setItem('rotation_machines', JSON.stringify(updated))
  }

  function clearRotation() {
    setRotationMachines([])
    localStorage.removeItem('rotation_machines')
  }

  function removeFromRotation() {
    const updated = rotationMachines.map((m: any) =>
      m.id === id ? { ...m, done: true } : m
    )
    const allDone = updated.every((m: any) => m.done)
    if (allDone) {
      setRotationMachines([])
      localStorage.removeItem('rotation_machines')
    } else {
      setRotationMachines(updated)
      localStorage.setItem('rotation_machines', JSON.stringify(updated))
    }
  }

  function switchToMachine(targetId: string) {
    saveDraft()
    router.push(`/machine/${targetId}`)
  }

  function FunctionalLogger({ machineId, userId, machineName, allWorkouts, onSaved, daysSince }: any) {
    const [activity, setActivity] = useState('')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const lastSession = allWorkouts.length > 0 ? allWorkouts[0] : null
    const lastSessionDate = lastSession?.created_at
    const lastActivity = lastSession?.exercise_name
    const lastDuration = lastSession?.duration
    const lastNotes = lastSession?.notes

    async function handleFinish() {
      if (!activity && !notes) { setError('Add what you did or some notes.'); return }
      setSaving(true)
      await supabase.from('workouts').insert({
        user_id: userId,
        machine_id: machineId,
        exercise_name: activity || 'Functional Training',
        duration: null,
        notes: notes || null,
        sets: null,
        reps: null,
        weight: null,
        superset: false
      })
      setSaving(false)
      onSaved()
    }

    return (
      <div>
        {/* Last session */}
        {lastSession && (
          <div className="rounded-2xl p-5 mb-8" style={{background: '#0F0F0F', borderLeft: '3px solid #E8440C'}}>
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-semibold tracking-widest uppercase" style={{color: '#6B5E55'}}>Last Session</p>
              <p className="text-xs" style={{color: '#E8440C'}}>{daysSince(lastSessionDate)}</p>
            </div>
            {lastActivity !== 'Functional Training' && (
              <p className="font-bold text-white text-lg mb-1">{lastActivity}</p>
            )}
            {lastDuration && <p className="text-sm" style={{color: '#6B5E55'}}>{lastDuration} min</p>}
            {lastNotes && (
              <p className="text-sm mt-1" style={{
                color: lastActivity === 'Functional Training' ? '#E8E0D8' : '#6B5E55',
                fontStyle: lastActivity === 'Functional Training' ? 'normal' : 'italic',
                borderTop: lastActivity !== 'Functional Training' ? '1px solid #1A1A1A' : 'none',
                paddingTop: lastActivity !== 'Functional Training' ? '8px' : '0'
              }}>{lastNotes}</p>
            )}
          </div>
        )}

        <h2 className="font-semibold text-lg text-white mb-6">Log Today's Workout</h2>

        <div className="flex flex-col gap-4 mb-6">
          <div>
            <label className="text-xs mb-1 block" style={{color: '#6B5E55'}}>What did you do?</label>
            <input
              type="text"
              placeholder="e.g. Battle rope, box jumps, stretching"
              value={activity}
              onChange={e => setActivity(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-white focus:outline-none"
              style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}
            />
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{color: '#6B5E55'}}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. 3 rounds, felt great"
              rows={3}
              className="w-full px-4 py-3 rounded-lg text-white focus:outline-none resize-none"
              style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}
            />
          </div>
        </div>

        {error && (
          <div className="flex justify-between items-center px-4 py-3 rounded-lg mb-4"
            style={{background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)'}}>
            <p className="text-sm" style={{color: '#EF4444'}}>{error}</p>
            <button onClick={() => setError('')} style={{color: '#EF4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px'}}>✕</button>
          </div>
        )}

        <button
          onClick={handleFinish}
          disabled={saving}
          className="w-full py-3 rounded-full font-semibold text-white"
          style={{background: '#E8440C'}}
        >
          {saving ? 'Saving...' : 'Finish Workout'}
        </button>
      </div>
    )
  }

  useEffect(() => {
    async function load() {
      try {
        if (!id) { setError('Invalid machine ID'); return }
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          const { data: machineData } = await supabase
            .from('machines')
            .select('gym_id')
            .eq('id', id)
            .single()
          if (machineData?.gym_id) {
            const { data: gymData } = await supabase
              .from('gyms')
              .select('code')
              .eq('id', machineData.gym_id)
              .single()
            if (gymData?.code) {
              router.push(`/join/${gymData.code}?next=/machine/${id}`)
              return
            }
          }
          router.push('/login')
          return
        }
        setUser(user)

        const { data: existingMembership } = await supabase
          .from('gym_members')
          .select('gym_id')
          .eq('user_id', user.id)
          .single()

        if (!existingMembership) {
          const { data: machineGym } = await supabase
            .from('machines')
            .select('gym_id')
            .eq('id', id)
            .single()
          if (machineGym) {
            await supabase
              .from('gym_members')
              .insert({ user_id: user.id, gym_id: machineGym.gym_id })
          }
        }

        const { data: machineData, error: machineError } = await supabase
          .from('machines').select('*').eq('id', id).single()
        if (machineError) { setError('Machine not found'); return }
        setMachine(machineData)
        setMachine(machineData)

        const draft = localStorage.getItem(`draft_${id}`)
        const draftExercise = draft ? JSON.parse(draft).selectedExercise : null

        if (!draftExercise) setSelectedExercise(machineData.name)

        const { data: variationData } = await supabase
          .from('variations').select('*')
          .eq('user_id', user.id).eq('machine_id', id)
          .order('created_at', { ascending: true })
        if (variationData) {
          setVariations(variationData)
          if (draftExercise) {
            setSelectedExercise(draftExercise)
          } else if (exerciseParam) {
            setSelectedExercise(decodeURIComponent(exerciseParam))
          } else if (variationData.length === 1) {
            setSelectedExercise(variationData[0].name)
          }
        }

        const { data: workoutData } = await supabase
          .from('workouts').select('*')
          .eq('user_id', user.id).eq('machine_id', id)
          .order('created_at', { ascending: false })
        if (workoutData) setAllWorkouts(workoutData)

        const { data: machinesData } = await supabase
          .from('machines').select('*').order('name', { ascending: true })
        if (machinesData) setAllMachines(machinesData)

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
      user_id: user.id, machine_id: id, name: newVariation.trim()
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
    const { data } = await supabase.from('variations')
      .update({ name: editingVariationName.trim() })
      .eq('id', variation.id).select().single()
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
  setValidationError('')
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
    const toUpdate = editableSets.filter(s => s.id && !s._deleted && !s._new)
    const toInsert = editableSets.filter(s => s._new && !s._deleted)
    const toDelete = editableSets.filter(s => s._deleted && s.id)

    for (const s of toUpdate) {
      await supabase.from('workouts').update({
        reps: parseInt(s.reps),
        weight: parseFloat(s.weight),
        duration: s.duration ? parseFloat(s.duration) : null,
        distance: s.distance ? parseFloat(s.distance) : null,
        notes: s.notes || null,
      }).eq('id', s.id)
    }

    if (toInsert.length > 0) {
      const ref = editableSets.find(s => s.id && !s._new)
      await supabase.from('workouts').insert(toInsert.map(s => ({
        user_id: user.id,
        machine_id: id,
        exercise_name: ref?.exercise_name || selectedExercise,
        sets: editableSets.filter(s => !s._deleted).length,
        reps: parseInt(s.reps),
        weight: parseFloat(s.weight),
        notes: null,
        duration: null,
        distance: null,
        superset: false,
        created_at: ref?.created_at || new Date().toISOString()
      })))
    }

    for (const s of toDelete) {
      await supabase.from('workouts').delete().eq('id', s.id)
    }

    const { data: workoutData } = await supabase
      .from('workouts').select('*')
      .eq('user_id', user.id).eq('machine_id', id)
      .order('created_at', { ascending: false })
    if (workoutData) setAllWorkouts(workoutData)
    setEditingSession(false)
  }

  async function handleFinishSuperset() {
    const validSetsA = sets.filter(s => s.reps && s.weight)
    if (validSetsA.length > 0) {
      const insertsA = validSetsA.map((s, i) => ({
        user_id: user.id, machine_id: id,
        exercise_name: selectedExercise,
        sets: validSetsA.length, reps: parseInt(s.reps), weight: parseFloat(s.weight),
        notes: i === 0 ? notes : null, duration: null, distance: null,
        superset: true,
        superset_machine_id: supersetMachine.id,
        superset_exercise_name: supersetExercise || supersetMachine.name
      }))
      await supabase.from('workouts').insert(insertsA)
    }

    const validSetsB = supersetSets.filter(s => s.reps && s.weight)
    if (validSetsB.length > 0) {
      const insertsB = validSetsB.map((s, i) => ({
        user_id: user.id, machine_id: supersetMachine.id,
        exercise_name: supersetExercise || supersetMachine.name,
        sets: validSetsB.length, reps: parseInt(s.reps), weight: parseFloat(s.weight),
        notes: i === 0 ? supersetNotes : null, duration: null, distance: null,
        superset: true,
        superset_machine_id: id,
        superset_exercise_name: selectedExercise
      }))
      await supabase.from('workouts').insert(insertsB)
    }

    removeFromRotation()
    setSaved(true)
  }

  async function handleSave(e: any) {
    e.preventDefault()
    if (machine.type === 'cardio') {
      if (!duration && !distance) return
      const { error } = await supabase.from('workouts').insert({
        user_id: user.id, machine_id: id, exercise_name: selectedExercise,
        duration: parseFloat(duration),
        distance: distance ? parseFloat(distance) : null,
        reps: sets[0]?.reps ? parseInt(sets[0].reps) : null,
        notes: notes || null, sets: null, weight: null,
        superset: false
      })
      if (!error) { clearDraft(); removeFromRotation(); setSaved(true) }
    } else {
      const validSets = sets.filter(s => s.reps && s.weight)
if (validSets.length === 0) {
  setValidationError('Please enter reps and weight for at least one set.')
  return
}
      const inserts = validSets.map((s, i) => ({
        user_id: user.id, machine_id: id, exercise_name: selectedExercise,
        sets: validSets.length, reps: parseInt(s.reps), weight: parseFloat(s.weight),
        notes: i === 0 ? notes : null, duration: null, distance: null,
        superset: false
      }))
      const { error } = await supabase.from('workouts').insert(inserts)
      if (!error) { clearDraft(); removeFromRotation(); setSaved(true) }
    }
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

  function formatHistoryDate(date: string) {
    const d = new Date(date)
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const diffMs = new Date().getTime() - d.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    let ago = ''
    if (diffHours < 24) ago = 'Today'
    else if (diffDays === 1) ago = 'Yesterday'
    else ago = diffDays + ' days ago'
    return { label, ago }
  }

  function getHistoryGrouped() {
    const exerciseWorkouts = allWorkouts.filter(w =>
      (w.exercise_name || machine?.name) === selectedExercise
    )
    const grouped: Record<string, any[]> = {}
    exerciseWorkouts.forEach(w => {
      const dateStr = new Date(w.created_at).toDateString()
      if (!grouped[dateStr]) grouped[dateStr] = []
      grouped[dateStr].push(w)
    })
    return Object.entries(grouped).map(([date, workouts]) => ({
      date,
      workouts,
      ...formatHistoryDate(workouts[0].created_at)
    }))
  }

  function getProgressData() {
    const exerciseWorkouts = allWorkouts.filter(w =>
      (w.exercise_name || machine?.name) === selectedExercise
    )
    if (exerciseWorkouts.length < 2) return null

    const isCardio = machine?.type === 'cardio'

    const sessionMap: Record<string, number> = {}
    exerciseWorkouts.forEach(w => {
      const dateStr = new Date(w.created_at).toDateString()
      const val = isCardio ? (w.duration || w.distance || 0) : (w.weight || 0)
      if (!sessionMap[dateStr] || val > sessionMap[dateStr]) {
        sessionMap[dateStr] = val
      }
    })

    const sessions = Object.entries(sessionMap)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, value]) => ({ date: new Date(date), value }))
      .filter(s => s.value > 10)

    if (sessions.length < 2) return null

    const first = sessions[0].value
    const last = sessions[sessions.length - 1].value
    const delta = last - first

    const firstThree = sessions.slice(0, 3).map(s => s.value)
    const lastThree = sessions.slice(-3).map(s => s.value)
    const avgFirst = firstThree.reduce((a, b) => a + b, 0) / firstThree.length
    const avgLast = lastThree.reduce((a, b) => a + b, 0) / lastThree.length
    const diff = avgLast - avgFirst
    const trend = diff > 2 ? '↑' : diff < -2 ? '↓' : '→'

    const unit = isCardio ? (sessions[0].value === Math.round(sessions[0].value) ? 'min' : 'mi') : 'lbs'

    return { sessions, first, last, delta, trend, unit, isCardio }
  }

  const filteredMachines = allMachines.filter(m =>
    m.name.toLowerCase().includes(supersetSearch.toLowerCase())
  )

  const validSetsACount = sets.filter(s => s.reps && s.weight).length
  const validSetsBCount = supersetSets.filter(s => s.reps && s.weight).length

  if (error) return (
    <main className="min-h-screen flex items-center justify-center" style={{background: '#080808'}}>
      <p className="text-red-400">{error}</p>
    </main>
  )

  if (!machine) return (
    <main className="min-h-screen flex items-center justify-center" style={{background: '#080808'}}>
      <p style={{color: '#6B5E55'}}>Loading...</p>
    </main>
  )

  if (saved) return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 pb-36" style={{background: '#080808'}}>

      {/* Rotation bar on saved screen */}
      {rotationMachines.length > 1 && (
        <div className="fixed bottom-6 left-0 right-0 z-40 px-4">
          <div className="max-w-lg mx-auto">
            <div className="rounded-2xl px-4 py-4 flex items-center gap-2" style={{background: '#E8440C'}}>
              <p className="text-xs font-bold tracking-widest uppercase mr-1" style={{color: 'rgba(255,255,255,0.7)'}}>Up next</p>
              <div className="flex gap-2 flex-1 overflow-x-auto">
                {rotationMachines.filter((m: any) => m.id !== id).map((m: any) => (
                  <button
                    key={m.id}
                    onClick={() => router.push(`/machine/${m.id}`)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                    style={{background: 'rgba(255,255,255,0.2)', color: '#fff'}}
                  >
                    {m.name} →
                  </button>
                ))}
              </div>
              <button onClick={clearRotation} style={{color: '#6B5E55', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', flexShrink: 0}}>×</button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background: '#E8440C'}}>
          <span className="text-2xl text-white">✓</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Workout Saved</h2>
        {supersetMachine && (
          <span className="text-xs px-3 py-1 rounded-full inline-block mb-3"
            style={{background: 'rgba(194,59,10,0.12)', color: '#E8440C'}}>
            SS — Superset logged
          </span>
        )}
        <p className="mb-8" style={{color: '#6B5E55'}}>Keep it up!</p>
        <div className="flex flex-col gap-3">
          <a href="/scan" className="py-3 px-8 rounded-full font-semibold text-white text-center" style={{background: '#E8440C'}}>
            Scan Next Machine
          </a>
          <a href={'/machine/' + id} className="py-3 px-8 rounded-full font-semibold text-center" style={{border: '1px solid #E8440C', color: '#E8440C'}}>
            Back to {machine?.name}
          </a>
          <a href="/dashboard" className="py-3 px-8 rounded-full font-semibold text-center" style={{color: '#6B5E55'}}>
            Back to Dashboard
          </a>
        </div>
      </div>
    </main>
  )

  const lastSessionSets = getLastSessionSets(selectedExercise)
  const lastSessionDate = lastSessionSets.length > 0 ? lastSessionSets[0].created_at : null
  const lastSessionNotes = lastSessionSets.find(s => s.notes)?.notes

  if (machine.type === 'functional') {
    return (
      <>
        <main className="min-h-screen p-6" style={{background: '#080808'}}>
          <div className="max-w-lg mx-auto">
            <a href="/dashboard" className="text-sm mb-6 inline-block" style={{color: '#6B5E55'}}>
              ← Back to Dashboard
            </a>
            <div className="flex items-center gap-3 mb-6">
              <h1 className="text-3xl font-bold text-white">{machine.name}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{background: 'rgba(194,59,10,0.1)', color: '#E8440C'}}>Functional</span>
            </div>
           <FunctionalLogger
              machineId={id!}
              userId={user.id}
              machineName={machine.name}
              allWorkouts={allWorkouts}
              onSaved={() => setSaved(true)}
              daysSince={daysSince}
            />

            {/* History */}
            {allWorkouts.length > 1 && (
              <div className="rounded-2xl overflow-hidden mt-6" style={{background: '#0F0F0F'}}>
                <button
                  onClick={() => setHistoryOpen(prev => !prev)}
                  className="w-full flex justify-between items-center p-5"
                  style={{background: 'transparent', border: 'none', cursor: 'pointer'}}
                >
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-white">History</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{background: '#1A1A1A', color: '#6B5E55'}}>
                      {allWorkouts.length} sessions
                    </span>
                  </div>
                  <span style={{
                    color: '#6B5E55', fontSize: '18px',
                    transform: historyOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease', display: 'inline-block', lineHeight: 1
                  }}>▾</span>
                </button>
                {historyOpen && (
                  <div className="flex flex-col gap-4 px-5 pb-5">
                    {allWorkouts.map((w, i) => (
                      <div key={i} style={{borderBottom: i < allWorkouts.length - 1 ? '1px solid #1A1A1A' : 'none', paddingBottom: i < allWorkouts.length - 1 ? '12px' : '0'}}>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-semibold text-white">{w.exercise_name}</p>
                          <p className="text-xs" style={{color: '#E8440C'}}>{daysSince(w.created_at)}</p>
                        </div>
                        {w.duration && <p className="text-xs" style={{color: '#6B5E55'}}>{w.duration} min</p>}
                        {w.notes && <p className="text-xs italic mt-1" style={{color: '#6B5E55'}}>"{w.notes}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </>
    )
  }

  return (
    <main className="min-h-screen p-6" style={{background: '#080808'}}>
      <div className="max-w-lg mx-auto">
        <a href={from === 'history' ? '/history' : '/dashboard'} className="text-sm mb-6 inline-block" style={{color: '#6B5E55'}}>
          {from === 'history' ? '← Back to History' : '← Back to Dashboard'}
        </a>

        <div className="flex items-center gap-3 mb-1">
  <h1 className="text-3xl font-bold text-white">{machine.name}</h1>
  <span className="text-xs px-2 py-0.5 rounded-full" style={{
    background: 'rgba(194,59,10,0.1)',
    color: '#E8440C'
  }}>
    {machine.type === 'cardio' ? 'Cardio' : machine.type === 'functional' ? 'Functional' : 'Strength'}
  </span>
</div>
        {machine.description && (
          <p className="mb-4" style={{color: '#6B5E55'}}>{machine.description}</p>
        )}

            {/* Exercise selector */}
             {machine.type === 'strength' && (
          <div className="mb-6">
            <label className="text-xs mb-2 block font-semibold tracking-widest uppercase" style={{color: '#6B5E55'}}>Exercise</label>

            {rotationMachines.length <= 1 && variations.length === 0 ? (
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="rounded-xl py-4 px-3 text-center"
                  style={{background: '#E8440C'}}>
                  <p className="text-sm font-bold text-white">{machine.name}</p>
                  <p className="text-xs mt-1" style={{color: 'rgba(255,255,255,0.6)'}}>default</p>
                </div>
                <button
                  onClick={() => setShowInlineAdd(true)}
                  className="rounded-xl py-4 px-3 text-center"
                  style={{background: 'transparent', border: '1px solid #E8440C', cursor: 'pointer'}}>
                  <p className="text-sm font-bold" style={{color: '#E8440C'}}>+ Add variation</p>
                  <p className="text-xs mt-1" style={{color: '#6B5E55'}}>e.g. Incline Press</p>
                </button>
              </div>
            ) : (
              <select
                value={selectedExercise}
                onChange={e => {
                  if (e.target.value === '__add__') { setShowAddVariation(true) }
                  else if (e.target.value === '__manage__') { setShowManageVariations(true) }
                  else { setSelectedExercise(e.target.value); setShowAddVariation(false); setHistoryOpen(false) }
                }}
                className="w-full px-4 py-3 rounded-lg text-white focus:outline-none mb-2"
                style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}
              >
                <option value={machine.name}>{machine.name}</option>
                {variations.map(v => (
                  <option key={v.id} value={v.name}>{v.name}</option>
                ))}
                <option value="__add__">+ Add variation...</option>
                <option value="__manage__">✎ Manage variations...</option>
              </select>
            )}

            {!showInlineAdd && variations.length > 0 && rotationMachines.length <= 1 && (
              <button
                onClick={() => setShowInlineAdd(true)}
                className="text-sm font-semibold mt-1 mb-2 inline-block px-3 py-1.5 rounded-full"
                style={{color: '#E8E0D8', background: 'transparent', border: '1px solid #3A3A3A', cursor: 'pointer'}}>
                + Add {machine.name} variation
              </button>
            )}

            {showInlineAdd && (
              <div className="flex gap-2 items-center mb-2 mt-1">
                <input
                  type="text"
                  value={newQuickVariation}
                  onChange={e => setNewQuickVariation(e.target.value)}
                  placeholder={`e.g. Bicep Curls`}
                  className="flex-1 px-3 py-2 rounded-lg text-white focus:outline-none text-sm"
                  style={{background: '#0F0F0F', border: '1px solid #E8440C'}}
                  autoFocus
                />
                <button
                  onClick={async () => {
                    if (!newQuickVariation.trim()) return
                    const { data } = await supabase.from('variations').insert({
                      user_id: user.id, machine_id: id, name: newQuickVariation.trim()
                    }).select().single()
                    if (data) {
                      setVariations(prev => [...prev, data])
                      setSelectedExercise(data.name)
                    }
                    setNewQuickVariation('')
                    setShowInlineAdd(false)
                  }}
                  className="px-3 py-2 rounded-lg text-white text-sm font-semibold"
                  style={{background: '#E8440C'}}>
                  Save
                </button>
                <button
                  onClick={() => { setShowInlineAdd(false); setNewQuickVariation('') }}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{background: 'transparent', border: '1px solid #1A1A1A', color: '#6B5E55'}}>
                  ✕
                </button>
              </div>
            )}

            {showAddVariation && (
              <div className="rounded-xl p-4 mb-2" style={{background: '#0F0F0F', border: '1px solid #E8440C'}}>
                <p className="text-white text-sm font-semibold mb-3">Add a variation</p>
                <input type="text" value={newVariation} onChange={e => setNewVariation(e.target.value)}
                  placeholder="e.g. Close Grip Bench Press"
                  className="w-full px-4 py-3 rounded-lg text-white focus:outline-none mb-3"
                  style={{background: '#080808', border: '1px solid #1A1A1A'}}/>
                <div className="flex gap-2">
                  <button onClick={handleAddVariation} className="flex-1 py-3 rounded-full font-semibold text-white"
                    style={{background: '#E8440C'}}>Save Variation</button>
                  <button onClick={() => { setShowAddVariation(false); setNewVariation('') }}
                    className="flex-1 py-3 rounded-full font-semibold"
                    style={{background: '#080808', border: '1px solid #1A1A1A', color: '#6B5E55'}}>Cancel</button>
                </div>
              </div>
            )}

            {showManageVariations && (
              <div className="rounded-xl p-4 mb-2" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-white text-sm font-semibold">Manage Variations</p>
                  <button onClick={() => { setShowManageVariations(false); setEditingVariation(null) }}
                    className="text-xs" style={{color: '#6B5E55'}}>Done</button>
                </div>
                <div className="flex flex-col gap-2">
                  {variations.map(v => (
                    <div key={v.id}>
                      {editingVariation?.id === v.id ? (
                        <div className="flex gap-2 items-center">
                          <input type="text" value={editingVariationName}
                            onChange={e => setEditingVariationName(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg text-white text-sm focus:outline-none"
                            style={{background: '#080808', border: '1px solid #E8440C'}}/>
                          <button onClick={() => handleRenameVariation(v)}
                            className="px-3 py-2 rounded-lg text-white text-sm font-semibold"
                            style={{background: '#E8440C'}}>Save</button>
                          <button onClick={() => { setEditingVariation(null); setEditingVariationName('') }}
                            className="px-3 py-2 rounded-lg text-sm"
                            style={{background: '#080808', border: '1px solid #1A1A1A', color: '#6B5E55'}}>✕</button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center px-3 py-2 rounded-lg"
                          style={{background: '#080808'}}>
                          <p className="text-white text-sm">{v.name}</p>
                          <div className="flex gap-2">
                            <button onClick={() => { setEditingVariation(v); setEditingVariationName(v.name) }}
                              className="text-xs px-2 py-1 rounded"
                              style={{color: '#E8440C', background: 'rgba(194,59,10,0.1)'}}>Rename</button>
                            <button onClick={() => handleDeleteVariation(v)}
                              className="text-xs px-2 py-1 rounded"
                              style={{color: '#EF4444', background: 'rgba(239,68,68,0.1)'}}>Delete</button>
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

{/* Functional training logger */}
        {machine.type === 'functional' && (
          <FunctionalLogger
            machineId={id!}
            userId={user.id}
            machineName={machine.name}
            allWorkouts={allWorkouts}
            onSaved={() => setSaved(true)}
            daysSince={daysSince}
          />
        )}

        {lastSessionSets.length > 0 ? (
          <div className="rounded-2xl p-5 mb-8" style={{background: '#0F0F0F', borderLeft: '3px solid #E8440C'}}>
            <div className="flex justify-between items-center mb-4">
              <p className="text-xs font-semibold tracking-widest uppercase" style={{color: '#6B5E55'}}>Last Session</p>
              <div className="flex gap-3 items-center">
                <div className="flex gap-2 items-center">
                  <p className="text-xs" style={{color: '#E8440C'}}>{daysSince(lastSessionDate)}</p>
                  <p className="text-xs" style={{color: '#6B5E55'}}>· {new Date(lastSessionDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</p>
                </div>
                {!editingSession && (
                  <button onClick={() => startEditingSession(lastSessionSets)}
                    className="text-xs px-2 py-1 rounded"
                    style={{color: '#E8440C', background: 'rgba(194,59,10,0.1)'}}>Edit</button>
                )}
              </div>
            </div>

            {editingSession ? (
              <div>
                {machine.type === 'cardio' ? (
                  <div className="flex flex-col gap-3 mb-3">
                    <div>
                      <label className="text-xs mb-1 block" style={{color: '#6B5E55'}}>Duration (minutes)</label>
                      <input type="number" value={editableSets[0]?.duration || ''}
                        onChange={e => updateEditableSet(0, 'duration', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg text-white focus:outline-none text-center"
                        style={{background: '#080808', border: '1px solid #E8440C'}}/>
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{color: '#6B5E55'}}>Distance (miles)</label>
                      <input type="number" value={editableSets[0]?.distance || ''}
                        onChange={e => updateEditableSet(0, 'distance', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg text-white focus:outline-none text-center"
                        style={{background: '#080808', border: '1px solid #1A1A1A'}}/>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="grid grid-cols-12 gap-2 mb-1 pb-2" style={{borderBottom: '1px solid #1A1A1A'}}>
                      <p className="col-span-1"></p>
                      <p className="col-span-4 text-xs font-bold tracking-widest uppercase" style={{color: '#6B5E55'}}>Reps</p>
                      <p className="col-span-4 text-xs font-bold tracking-widest uppercase" style={{color: '#6B5E55'}}>Weight</p>
                      <p className="col-span-3"></p>
                    </div>
                    {editableSets.filter(s => !s._deleted).map((s, i) => (
                      <div key={s.id || i} className="grid grid-cols-12 gap-2 items-center">
                        <p className="col-span-1 text-xs font-bold" style={{color: '#E8440C'}}>{i + 1}</p>
                        <input type="number" value={s.reps}
                          onChange={e => updateEditableSet(editableSets.indexOf(s), 'reps', e.target.value)}
                          className="col-span-4 px-3 py-2 rounded-lg text-white focus:outline-none text-center"
                          style={{background: '#080808', border: '1px solid #E8440C'}}/>
                        <input type="number" value={s.weight}
                          onChange={e => updateEditableSet(editableSets.indexOf(s), 'weight', e.target.value)}
                          className="col-span-5 px-3 py-2 rounded-lg text-white focus:outline-none text-center"
                          style={{background: '#080808', border: '1px solid #E8440C'}}/>
                        <button type="button"
                          onClick={() => {
                            const actualIndex = editableSets.indexOf(s)
                            if (s._new) {
                              setEditableSets(prev => prev.filter((_, idx) => idx !== actualIndex))
                            } else {
                              setEditableSets(prev => prev.map((es, idx) => idx === actualIndex ? {...es, _deleted: true} : es))
                            }
                          }}
                          className="col-span-2 text-center text-lg"
                          style={{color: editableSets.filter(s => !s._deleted).length === 1 ? '#1A1A1A' : '#6B5E55', background: 'transparent', border: 'none', cursor: 'pointer'}}>
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEditableSets(prev => [...prev, {reps: '', weight: '', _new: true}])}
                      className="w-full py-2 rounded-xl text-sm font-semibold mt-1"
                      style={{background: 'transparent', border: '1px dashed #E8440C', color: '#E8440C'}}>
                      + Add Set
                    </button>
                  </div>
                )}
                <div className="mb-3">
                  <label className="text-xs mb-1 block" style={{color: '#6B5E55'}}>Notes</label>
                  <input type="text" value={editableSets[0]?.notes || ''}
                    onChange={e => updateEditableSet(0, 'notes', e.target.value)}
                    placeholder="e.g. felt strong today"
                    className="w-full px-3 py-2 rounded-lg text-white focus:outline-none"
                    style={{background: '#080808', border: '1px solid #1A1A1A'}}/>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveEditedSession}
                    className="flex-1 py-2 rounded-full font-semibold text-white text-sm"
                    style={{background: '#E8440C'}}>Save Changes</button>
                  <button onClick={() => setEditingSession(false)}
                    className="flex-1 py-2 rounded-full text-sm font-semibold"
                    style={{background: '#080808', border: '1px solid #1A1A1A', color: '#6B5E55'}}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                {machine.type === 'cardio' ? (
                  <div className="flex gap-6">
                    <div>
                      <p className="text-white font-bold text-lg">{lastSessionSets[0].duration}</p>
                      <p className="text-xs" style={{color: '#6B5E55'}}>Minutes</p>
                    </div>
                    {lastSessionSets[0].reps && (
                      <div>
                        <p className="text-white font-bold text-lg">{lastSessionSets[0].reps}</p>
                        <p className="text-xs" style={{color: '#6B5E55'}}>Reps</p>
                      </div>
                    )}
                    {lastSessionSets[0].distance && (
                      <div>
                        <p className="text-white font-bold text-lg">{lastSessionSets[0].distance}</p>
                        <p className="text-xs" style={{color: '#6B5E55'}}>Miles</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-12 gap-2 mb-2 pb-2" style={{borderBottom: '1px solid #1A1A1A'}}>
                      <p className="col-span-1"></p>
                      <p className="col-span-5 text-xs font-bold tracking-widest uppercase" style={{color: '#6B5E55'}}>Reps</p>
                      <p className="col-span-6 text-xs font-bold tracking-widest uppercase" style={{color: '#6B5E55'}}>Weight</p>
                    </div>
                    {lastSessionSets.map((s, i) => (
                      <div key={s.id} className="grid grid-cols-12 gap-2 items-center">
                        <p className="col-span-1 text-xs font-bold" style={{color: '#E8440C'}}>{i + 1}</p>
                        <p className="col-span-5 text-white font-semibold">{s.reps}</p>
                        <p className="col-span-6 text-white font-semibold">{s.weight} lbs</p>
                      </div>
                    ))}
                    {lastSessionSets[0]?.superset && (
                      <p className="text-xs font-bold mt-2" style={{color: '#E8440C'}}>
                        SS{lastSessionSets[0]?.superset_exercise_name ? ` · ${lastSessionSets[0].superset_exercise_name}` : ''}
                      </p>
                    )}
                  </div>
                )}
                {lastSessionNotes && (
                  <p className="text-xs italic pt-3 mt-3" style={{color: '#6B5E55', borderTop: '1px solid #1A1A1A'}}>
                    "{lastSessionNotes}"
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
  <div className="rounded-2xl p-5 mb-8 text-center" style={{background: '#0F0F0F'}}>
    <p style={{color: '#6B5E55'}}>No previous session recorded</p>
  </div>
)}

        {/* History */}
        {getHistoryGrouped().length > 0 && allWorkouts.filter(w => (w.exercise_name || machine?.name) === selectedExercise).length > 1 && (
          <div className="rounded-2xl overflow-hidden mb-8" style={{background: '#0F0F0F'}}>
            <button
              onClick={() => setHistoryOpen(prev => !prev)}
              className="w-full flex justify-between items-center p-5"
              style={{background: 'transparent', border: 'none', cursor: 'pointer'}}
            >
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-white">History</h2>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{background: '#1A1A1A', color: '#6B5E55'}}>
                  {getHistoryGrouped().length} sessions
                </span>
              </div>
              <span style={{
                color: '#6B5E55',
                fontSize: '18px',
                transform: historyOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                display: 'inline-block',
                lineHeight: 1
              }}>▾</span>
            </button>

            {historyOpen && (
              <div className="flex flex-col gap-4 px-5 pb-5">
                {getHistoryGrouped().map((group, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-white text-sm font-semibold">{group.label}</p>
                      <p className="text-xs" style={{color: '#6B5E55'}}>({group.ago})</p>
                      {group.workouts[0]?.superset && (
                        <span className="text-xs font-bold" style={{color: '#E8440C'}}>
                          SS{group.workouts[0]?.superset_exercise_name ? ` · ${group.workouts[0].superset_exercise_name}` : ''}
                        </span>
                      )}
                    </div>
                    {group.workouts[0]?.duration ? (
                      <div className="flex gap-4">
                        <div>
                          <p className="text-white font-semibold">{group.workouts[0].duration}</p>
                          <p className="text-xs" style={{color: '#6B5E55'}}>min</p>
                        </div>
                        {group.workouts[0].reps && (
                          <div>
                            <p className="text-white font-semibold">{group.workouts[0].reps}</p>
                            <p className="text-xs" style={{color: '#6B5E55'}}>reps</p>
                          </div>
                        )}
                        {group.workouts[0].distance && (
                          <div>
                            <p className="text-white font-semibold">{group.workouts[0].distance}</p>
                            <p className="text-xs" style={{color: '#6B5E55'}}>mi</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {group.workouts.map((w, j) => (
                          <div key={j} className="flex gap-3 items-center">
                            <p className="text-xs font-bold w-4" style={{color: '#E8440C'}}>{j + 1}</p>
                            <p className="text-sm text-white">{w.reps} reps</p>
                            <p className="text-sm text-white">·</p>
                            <p className="text-sm text-white">{w.weight} lbs</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {i < getHistoryGrouped().length - 1 && (
                      <div className="mt-3" style={{borderBottom: '1px solid #1A1A1A'}}/>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Progress */}
        {allWorkouts.filter(w => (w.exercise_name || machine?.name) === selectedExercise && (w.weight || w.duration || w.distance)).length >= 2 && (
          <div className="mb-8">
            <button
              onClick={() => setShowProgress(prev => !prev)}
              className="px-4 py-2 rounded-full text-sm font-semibold"
              style={{
                background: showProgress ? 'rgba(155,109,255,0.15)' : 'transparent',
                border: '1px solid rgba(155,109,255,0.4)',
                color: '#9B6DFF',
                cursor: 'pointer'
              }}
            >
              {showProgress ? 'Hide Progress' : '↑ See Progress'}
            </button>

            {showProgress && (() => {
              const pd = getProgressData()
              if (!pd) return (
                <p className="text-sm mt-4" style={{color: '#6B5E55'}}>Not enough data yet — keep logging!</p>
              )

              const { sessions, first, last, delta, trend, unit } = pd
              const values = sessions.map(s => s.value)
              const minVal = Math.min(...values)
              const maxVal = Math.max(...values)
              const range = maxVal - minVal || 1
              const chartW = 300
              const chartH = 80
              const pts = sessions.map((s, i) => {
                const x = (i / (sessions.length - 1)) * chartW
                const y = chartH - ((s.value - minVal) / range) * (chartH - 10) - 5
                return `${x},${y}`
              }).join(' ')

              const n = sessions.length
              let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
              sessions.forEach((s, i) => {
                sumX += i; sumY += s.value; sumXY += i * s.value; sumX2 += i * i
              })
              const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
              const intercept = (sumY - slope * sumX) / n
              const trendY1 = chartH - ((intercept - minVal) / range) * (chartH - 10) - 5
              const trendY2 = chartH - ((slope * (n - 1) + intercept - minVal) / range) * (chartH - 10) - 5

              const lastPt = sessions[sessions.length - 1]
              const lastX = chartW
              const lastY = chartH - ((lastPt.value - minVal) / range) * (chartH - 10) - 5

              return (
                <div className="rounded-2xl p-5 mt-3" style={{background: '#0D0D12', border: '1px solid #1E1A2E'}}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{color: '#9B6DFF'}}>Progress</p>
                      <p className="text-xs" style={{color: '#6B5E55'}}>{selectedExercise}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black" style={{color: '#E8E0D8', letterSpacing: '-1px', lineHeight: 1}}>
                        {delta >= 0 ? '+' : ''}{Math.round(delta)}
                      </p>
                      <p className="text-xs mt-1" style={{color: '#6B5E55'}}>{unit} since you started</p>
                    </div>
                  </div>

                 <svg width="100%" height="120" viewBox={`0 0 ${chartW} ${chartH + 20}`} preserveAspectRatio="xMidYMid meet">
                    <line x1="0" y1={chartH + 2} x2={chartW} y2={chartH + 2} stroke="#1E1A2E" strokeWidth="1"/>
                    <line
                      x1="0" y1={trendY1}
                      x2={chartW} y2={trendY2}
                      stroke="rgba(155,109,255,0.5)"
                      strokeWidth="1.5"
                      strokeDasharray="5 4"
                    />
                    <polyline
                      points={pts}
                      fill="none"
                      stroke="#9B6DFF"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {sessions.map((s, i) => {
                      const x = (i / (sessions.length - 1)) * chartW
                      const y = chartH - ((s.value - minVal) / range) * (chartH - 10) - 5
                      const isLast = i === sessions.length - 1
                      return isLast
                        ? <circle key={i} cx={x} cy={y} r="5" fill="#9B6DFF"/>
                        : <circle key={i} cx={x} cy={y} r="4" fill="#0D0D12" stroke="#9B6DFF" strokeWidth="2"/>
                    })}
                  </svg>

                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs" style={{color: '#3A3A3A'}}>{first} {unit} · start</p>
                    <p className="text-xs font-semibold" style={{color: '#6B5E55'}}>{trend} {sessions.length} sessions</p>
                    <p className="text-xs font-bold" style={{color: '#9B6DFF'}}>{last} {unit} · now</p>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

              {true && (
<div>
<div className="flex justify-between items-center mb-4">
  <h2 className="font-semibold text-lg text-white">Log Today's Workout</h2>
          {!supersetMachine && (
            <div className="flex gap-2">
              <button onClick={() => setShowSwitchPicker(true)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{border: '1px solid #6B5E55', color: '#6B5E55'}}>
                 ⇄ Switch Machine
              </button>
              {machine.type === 'strength' && (
                <button onClick={() => setShowSupersetPicker(true)}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                  style={{border: '1px solid #E8440C', color: '#E8440C'}}>
                  + Superset
                </button>
              )}
            </div>
          )}
        </div>


{/* Switch machine picker */}
        {showSwitchPicker && (
          
          <div className="rounded-2xl p-4 mb-6" style={{background: '#0F0F0F', border: '1px solid #6B5E55'}}>
            <div className="flex justify-between items-center mb-3">
              <p className="text-white text-sm font-semibold">Switch to machine</p>
              <button onClick={() => { setShowSwitchPicker(false); setSwitchSearch('') }}
                className="text-xs" style={{color: '#6B5E55'}}>Cancel</button>
            </div>
            
              <a
              href="/scan"
              onClick={saveDraft}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-white mb-3"
              style={{background: '#E8440C'}}>
              Scan Next Machine
            </a>
            <input type="text" value={switchSearch} onChange={e => setSwitchSearch(e.target.value)}
              placeholder="Or search machines..."
              className="w-full px-4 py-3 rounded-lg text-white focus:outline-none mb-3"
              style={{background: '#080808', border: '1px solid #1A1A1A'}}/>
            <div className="flex flex-col gap-2" style={{maxHeight: '200px', overflowY: 'auto'}}>
              {allMachines
                .filter(m => m.name.toLowerCase().includes(switchSearch.toLowerCase()) && m.id !== id)
                .map(m => (
                  <button key={m.id}
                    onClick={() => {
                      addToRotation(m)
                      setShowSwitchPicker(false)
                      setSwitchSearch('')
                      switchToMachine(m.id)
                    }}
                    className="flex justify-between items-center px-3 py-2 rounded-lg text-left w-full"
                    style={{background: '#080808'}}>
                    <p className="text-white text-sm">{m.name}</p>
                    <p className="text-xs" style={{color: '#6B5E55'}}>Switch →</p>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Superset picker */}
        {showSupersetPicker && (
          <div className="rounded-2xl p-4 mb-6" style={{background: '#0F0F0F', border: '1px solid #E8440C'}}>
            <div className="flex justify-between items-center mb-3">
              <p className="text-white text-sm font-semibold">Pair with machine</p>
              <button onClick={() => { setShowSupersetPicker(false); setSupersetSearch('') }}
                className="text-xs" style={{color: '#6B5E55'}}>Cancel</button>
            </div>
            <input type="text" value={supersetSearch} onChange={e => setSupersetSearch(e.target.value)}
              placeholder="Search machines..."
              className="w-full px-4 py-3 rounded-lg text-white focus:outline-none mb-3"
              style={{background: '#080808', border: '1px solid #1A1A1A'}}/>
            <div className="flex flex-col gap-2" style={{maxHeight: '200px', overflowY: 'auto'}}>
              {filteredMachines.map(m => (
                <button key={m.id}
                  onClick={async () => {
                    setSupersetMachine(m)
                    setShowSupersetPicker(false)
                    setSupersetSearch('')
                    setActiveTab('A')
                    setSupersetExercise(m.name)
                    const { data: varData } = await supabase
                      .from('variations')
                      .select('*')
                      .eq('user_id', user.id)
                      .eq('machine_id', m.id)
                      .order('created_at', { ascending: true })
                    setSupersetVariations(varData || [])
                  }}
                  className="flex justify-between items-center px-3 py-2 rounded-lg text-left w-full"
                  style={{background: '#080808'}}>
                  <p className="text-white text-sm">{m.name}{m.id === id ? ' (same)' : ''}</p>
                  <p className="text-xs" style={{color: '#E8440C'}}>Pair</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Superset tab view */}
        {supersetMachine ? (
          <div>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab('A')}
                className="flex-1 py-3 rounded-xl font-semibold text-sm"
                style={{
                  background: activeTab === 'A' ? '#E8440C' : '#0F0F0F',
                  color: activeTab === 'A' ? '#fff' : '#6B5E55',
                  border: activeTab === 'A' ? 'none' : '1px solid #1A1A1A'
                }}
              >
                A: {selectedExercise}
                {validSetsACount > 0 && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                    style={{background: 'rgba(255,255,255,0.2)', color: '#fff'}}>
                    {validSetsACount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('B')}
                className="flex-1 py-3 rounded-xl font-semibold text-sm"
                style={{
                  background: activeTab === 'B' ? '#E8440C' : '#0F0F0F',
                  color: activeTab === 'B' ? '#fff' : '#6B5E55',
                  border: activeTab === 'B' ? 'none' : '1px solid #1A1A1A'
                }}
              >
                B: {supersetExercise}
                {validSetsBCount > 0 && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                    style={{background: 'rgba(255,255,255,0.2)', color: '#fff'}}>
                    {validSetsBCount}
                  </span>
                )}
              </button>
            </div>

            {/* Tab A */}
            {activeTab === 'A' && (
              <div className="flex flex-col gap-4 mb-4">
                {variations.length > 0 && (
                  <div>
                    <label className="text-xs mb-2 block font-semibold tracking-widest uppercase" style={{color: '#6B5E55'}}>Exercise (A)</label>
                    <select
                      value={selectedExercise}
                      onChange={e => setSelectedExercise(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg text-white focus:outline-none"
                      style={{background: '#0F0F0F', border: '1px solid #E8440C'}}
                    >
                      <option value={machine.name}>{machine.name} (default)</option>
                      {variations.map(v => (
                        <option key={v.id} value={v.name}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-12 gap-2 px-1">
                  <p className="col-span-1 text-xs" style={{color: '#6B5E55'}}></p>
                  <p className="col-span-5 text-xs" style={{color: '#6B5E55'}}>Reps</p>
                  <p className="col-span-5 text-xs" style={{color: '#6B5E55'}}>Weight (lbs)</p>
                  <p className="col-span-1"></p>
                </div>
                {sets.map((set, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-1 text-center">
                      <p className="text-xs font-bold" style={{color: '#E8440C'}}>{i + 1}</p>
                    </div>
                    <input type="number" value={set.reps} onChange={e => updateSet(i, 'reps', e.target.value)}
                      placeholder="0" className="col-span-5 px-4 py-3 rounded-lg text-white focus:outline-none text-center"
                      style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}/>
                    <input type="number" value={set.weight} onChange={e => updateSet(i, 'weight', e.target.value)}
                      placeholder="0" className="col-span-5 px-4 py-3 rounded-lg text-white focus:outline-none text-center"
                      style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}/>
                    <button type="button" onClick={() => removeSet(i)} className="col-span-1 text-center text-lg"
                      style={{color: sets.length === 1 ? '#1A1A1A' : '#6B5E55'}}>×</button>
                  </div>
                ))}
                <button type="button" onClick={addSet} className="py-3 rounded-xl font-semibold text-sm"
                  style={{background: 'transparent', border: '1px dashed #E8440C', color: '#E8440C'}}>
                  + Add Set
                </button>
                <div>
                  <label className="text-xs mb-1 block" style={{color: '#6B5E55'}}>Notes (optional)</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. felt strong today"
                    className="w-full px-4 py-3 rounded-lg text-white focus:outline-none"
                    style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}/>
                </div>
                <button onClick={() => setActiveTab('B')}
                  className="py-3 rounded-full font-semibold text-white"
                  style={{background: '#E8440C'}}>
                  Switch to B: {supersetExercise || supersetMachine.name}
                </button>
              </div>
            )}

            {/* Tab B */}
            {activeTab === 'B' && (
              <div className="flex flex-col gap-4 mb-4">
                {(supersetVariations.length > 0 || supersetMachine.id === id) && (
                  <div>
                    <label className="text-xs mb-2 block font-semibold tracking-widest uppercase" style={{color: '#6B5E55'}}>Exercise (B)</label>
                    <select
                      value={supersetExercise}
                      onChange={e => setSupersetExercise(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg text-white focus:outline-none"
                      style={{background: '#0F0F0F', border: '1px solid #E8440C'}}
                    >
                      <option value={supersetMachine.name}>{supersetMachine.name} (default)</option>
                      {supersetMachine.id === id
                        ? variations.map(v => <option key={v.id} value={v.name}>{v.name}</option>)
                        : supersetVariations.map(v => <option key={v.id} value={v.name}>{v.name}</option>)
                      }
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-12 gap-2 px-1">
                  <p className="col-span-1 text-xs" style={{color: '#6B5E55'}}></p>
                  <p className="col-span-5 text-xs" style={{color: '#6B5E55'}}>Reps</p>
                  <p className="col-span-5 text-xs" style={{color: '#6B5E55'}}>Weight (lbs)</p>
                  <p className="col-span-1"></p>
                </div>
                {supersetSets.map((set, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-1 text-center">
                      <p className="text-xs font-bold" style={{color: '#E8440C'}}>{i + 1}</p>
                    </div>
                    <input type="number" value={set.reps} onChange={e => updateSupersetSet(i, 'reps', e.target.value)}
                      placeholder="0" className="col-span-5 px-4 py-3 rounded-lg text-white focus:outline-none text-center"
                      style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}/>
                    <input type="number" value={set.weight} onChange={e => updateSupersetSet(i, 'weight', e.target.value)}
                      placeholder="0" className="col-span-5 px-4 py-3 rounded-lg text-white focus:outline-none text-center"
                      style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}/>
                    <button type="button" onClick={() => removeSupersetSet(i)} className="col-span-1 text-center text-lg"
                      style={{color: supersetSets.length === 1 ? '#1A1A1A' : '#6B5E55'}}>×</button>
                  </div>
                ))}
                <button type="button" onClick={addSupersetSet} className="py-3 rounded-xl font-semibold text-sm"
                  style={{background: 'transparent', border: '1px dashed #E8440C', color: '#E8440C'}}>
                  + Add Set
                </button>
                <div>
                  <label className="text-xs mb-1 block" style={{color: '#6B5E55'}}>Notes (optional)</label>
                  <input type="text" value={supersetNotes} onChange={e => setSupersetNotes(e.target.value)}
                    placeholder="e.g. felt strong today"
                    className="w-full px-4 py-3 rounded-lg text-white focus:outline-none"
                    style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}/>
                </div>
                <button onClick={() => setActiveTab('A')}
                  className="py-3 rounded-full font-semibold text-white"
                  style={{background: '#E8440C'}}>
                  Switch to A: {selectedExercise}
                </button>
              </div>
            )}

            <div className="flex flex-col gap-3 mt-2">
              <button onClick={handleFinishSuperset}
                className="py-3 rounded-full font-semibold text-white"
                style={{background: '#E8440C'}}>
                Finish Superset
              </button>
              <button onClick={() => { setSupersetMachine(null); setActiveTab('A'); setSupersetSets([{reps: '', weight: ''}]) }}
                className="py-2 rounded-full text-sm font-semibold"
                style={{background: 'transparent', border: '1px solid #1A1A1A', color: '#6B5E55'}}>
                Remove Superset
              </button>
            </div>
          </div>
        ) : (
          // Normal single machine logging
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {machine.type === 'cardio' ? (
              <>
                <div>
                  <label className="text-xs mb-1 block" style={{color: '#6B5E55'}}>Duration (minutes)</label>
                  <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
                    placeholder="0" className="w-full px-4 py-3 rounded-lg text-white focus:outline-none text-center"
                    style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}/>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{color: '#6B5E55'}}>Reps (optional)</label>
                  <input type="number" value={sets[0]?.reps || ''} onChange={e => updateSet(0, 'reps', e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-lg text-white focus:outline-none text-center"
                    style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}/>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{color: '#6B5E55'}}>Distance in miles (optional)</label>
                  <input type="number" value={distance} onChange={e => setDistance(e.target.value)}
                    placeholder="0.0" step="0.1"
                    className="w-full px-4 py-3 rounded-lg text-white focus:outline-none text-center"
                    style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}/>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-12 gap-2 px-1">
                  <p className="col-span-1 text-xs" style={{color: '#6B5E55'}}></p>
                  <p className="col-span-5 text-xs" style={{color: '#6B5E55'}}>Reps</p>
                  <p className="col-span-5 text-xs" style={{color: '#6B5E55'}}>Weight (lbs)</p>
                  <p className="col-span-1"></p>
                </div>
                {sets.map((set, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-1 text-center">
                      <p className="text-xs font-bold" style={{color: '#E8440C'}}>{i + 1}</p>
                    </div>
                    <input type="number" value={set.reps} onChange={e => updateSet(i, 'reps', e.target.value)}
                      placeholder="0" className="col-span-5 px-4 py-3 rounded-lg text-white focus:outline-none text-center"
                      style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}/>
                    <input type="number" value={set.weight} onChange={e => updateSet(i, 'weight', e.target.value)}
                      placeholder="0" className="col-span-5 px-4 py-3 rounded-lg text-white focus:outline-none text-center"
                      style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}/>
                    <button type="button" onClick={() => removeSet(i)} className="col-span-1 text-center text-lg"
                      style={{color: sets.length === 1 ? '#1A1A1A' : '#6B5E55'}}>×</button>
                  </div>
                ))}
                <button type="button" onClick={addSet} className="py-3 rounded-xl font-semibold text-sm"
                  style={{background: 'transparent', border: '1px dashed #E8440C', color: '#E8440C'}}>
                  + Add Set
                </button>
              </>
            )}
            <div>
              <label className="text-xs mb-1 block" style={{color: '#6B5E55'}}>Notes (optional)</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. felt strong today"
                className="w-full px-4 py-3 rounded-lg text-white focus:outline-none"
                style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}/>
            </div>
            {validationError && (
  <div className="flex justify-between items-center px-4 py-3 rounded-lg" style={{background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)'}}>
    <p className="text-sm" style={{color: '#EF4444'}}>{validationError}</p>
    <button onClick={() => setValidationError('')} style={{color: '#EF4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px'}}>✕</button>
  </div>
)}
<button type="submit" className="py-3 rounded-full font-semibold text-white"
  style={{background: '#E8440C'}}>
  Finish Workout
</button>
          </form>
        )}
</div>
)}

        {/* Rotation bar */}
        {rotationMachines.length > 1 && (
          <div className="fixed bottom-24 left-0 right-0 z-40 px-4">
            <div className="max-w-lg mx-auto">
              <div className="rounded-2xl px-4 py-3 flex items-center gap-2" style={{background: '#0F0F0F', border: '1px solid #3A3A3A', boxShadow: '0 0 0 1px rgba(255,255,255,0.05)'}}>
                <p className="text-xs font-bold tracking-widest uppercase mr-1" style={{color: '#6B5E55'}}>Rotating</p>
                <div className="flex gap-2 flex-1 overflow-x-auto">
                  {rotationMachines.map((m: any) => {
                    const isDone = m.done
                    const isCurrent = m.id === id
                    return (
                      <div key={m.id} className="flex items-center gap-1 rounded-lg"
                        style={{
                          background: isCurrent ? '#E8440C' : isDone ? 'transparent' : '#1A1A1A',
                          border: isDone ? '1px solid #2A2A2A' : 'none',
                          flexShrink: 0
                        }}>
                        <button
                          onClick={() => !isCurrent && !isDone && switchToMachine(m.id)}
                          className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap flex items-center gap-1"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isCurrent ? '#fff' : isDone ? '#3A3A3A' : '#6B5E55',
                            cursor: isCurrent || isDone ? 'default' : 'pointer',
                            textDecoration: isDone ? 'line-through' : 'none'
                          }}
                        >
                          {isDone && <span style={{color: '#3A3A3A'}}>✓</span>}
                          {m.name}
                        </button>
                        {!isDone && !isCurrent && (
                          <button
                            onClick={() => {
                              const updated = rotationMachines.filter((r: any) => r.id !== m.id)
                              setRotationMachines(updated)
                              if (updated.length === 0) {
                                localStorage.removeItem('rotation_machines')
                              } else {
                                localStorage.setItem('rotation_machines', JSON.stringify(updated))
                              }
                            }}
                            style={{
                              color: isCurrent ? 'rgba(255,255,255,0.6)' : '#3A3A3A',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '14px',
                              paddingRight: '8px',
                              paddingLeft: '0',
                              lineHeight: 1
                            }}>
                            ×
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                <button onClick={clearRotation} style={{color: '#6B5E55', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', flexShrink: 0}}>×</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
export default function MachinePage() {
  return (
    <Suspense>
      <MachinePageInner />
    </Suspense>
  )
}