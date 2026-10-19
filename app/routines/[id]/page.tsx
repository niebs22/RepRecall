'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function RoutinePage() {
  const pathname = usePathname()
  const id = pathname?.split('/').pop()
  const [routine, setRoutine] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
    const [gymTimezone, setGymTimezone] = useState('America/New_York')
  const [editing, setEditing] = useState(false)
  const [gymMachines, setGymMachines] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [pickingMachine, setPickingMachine] = useState<any>(null)
  const [pickVariations, setPickVariations] = useState<any[]>([])
  const [newExercise, setNewExercise] = useState('')
  const router = useRouter()

  const NAVY = '#253D5B'
  const NAVY_BG = 'rgba(37,61,91,0.15)'
  const NAVY_BORDER = 'rgba(37,61,91,0.4)'

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
const isViewMode = new URLSearchParams(window.location.search).get('view') === 'true'

      const { data: memberData } = await supabase
        .from('gym_members')
        .select('gym_id, gyms(timezone)')
        .eq('user_id', user.id)
        .single()
            if (memberData?.gyms) {
        setGymTimezone((memberData.gyms as any).timezone || 'America/New_York')
      }
      if (memberData?.gym_id) {
        const { data: gm } = await supabase
          .from('machines').select('id, name, type')
          .eq('gym_id', memberData.gym_id)
          .order('name', { ascending: true })
        if (gm) setGymMachines(gm)
      }
      if (isViewMode) setEditing(true)

      const { data } = await supabase
        .from('routines')
        .select('*, routine_machines(*, machines(*))')
        .eq('id', id)
        .single()
      if (data) {
  const sorted = { ...data, routine_machines: [...data.routine_machines].sort((a, b) => a.order_index - b.order_index) }
  setRoutine(sorted)
  if (!isViewMode) {
    localStorage.setItem('active_routine', JSON.stringify(sorted))
  }
}

      // Only mark done if logged after routine was started
const startedAt = localStorage.getItem('routine_started_at')
if (!isViewMode && startedAt) {
  const { data: routineWorkouts } = await supabase
    .from('workouts')
    .select('machine_id, exercise_name, created_at')
    .eq('user_id', user.id)
    .gte('created_at', startedAt)
  if (routineWorkouts) {
    setCompletedIds(new Set(routineWorkouts.map(w => w.machine_id + '|' + w.exercise_name)))
  }
}
    }
    load()
  }, [id])

  async function pickMachine(m: any) {
    setPickingMachine(m)
    setNewExercise('')
    const { data } = await supabase.from('variations').select('*')
      .eq('user_id', user.id).eq('machine_id', m.id)
      .order('created_at', { ascending: true })
    setPickVariations(data || [])
  }

  async function addMachine(m: any, exerciseName?: string) {
    const name = exerciseName?.trim() || null
    if (name && name !== m.name && !pickVariations.some(v => v.name === name)) {
      await supabase.from('variations').insert({ user_id: user.id, machine_id: m.id, name })
    }
    const nextIndex = routine.routine_machines.length
    const { data } = await supabase.from('routine_machines')
      .insert({ routine_id: id, machine_id: m.id, order_index: nextIndex, exercise_name: name && name !== m.name ? name : null })
      .select('*, machines(*)').single()
    if (data) setRoutine((prev: any) => ({ ...prev, routine_machines: [...prev.routine_machines, data] }))
    setShowAdd(false)
    setAddSearch('')
    setPickingMachine(null)
  }

  async function moveMachine(index: number, dir: -1 | 1) {
    const list = [...routine.routine_machines]
    const j = index + dir
    if (j < 0 || j >= list.length) return
    ;[list[index], list[j]] = [list[j], list[index]]
    setRoutine((prev: any) => ({ ...prev, routine_machines: list }))
    await Promise.all(list.map((rm: any, i: number) =>
      supabase.from('routine_machines').update({ order_index: i }).eq('id', rm.id)))
  }

  async function deleteRoutine() {
    if (!confirm(`Delete "${routine.name}"? This can't be undone.`)) return
    await supabase.from('routine_machines').delete().eq('routine_id', id)
    const { error } = await supabase.from('routines').delete().eq('id', id)
    if (error) { alert('Could not delete routine. Try again.'); return }
    const active = localStorage.getItem('active_routine')
    if (active && JSON.parse(active).id === id) {
      localStorage.removeItem('active_routine')
      localStorage.removeItem('routine_started_at')
    }
    router.push('/dashboard')
  }

  function endRoutine() {
  localStorage.removeItem('active_routine')
  localStorage.removeItem('routine_started_at')
  router.push('/dashboard')
}

  if (!routine) return (
    <main className="min-h-screen flex items-center justify-center" style={{background: '#080808'}}>
      <p style={{color: '#6B5E55'}}>Loading...</p>
    </main>
  )

  const total = routine.routine_machines.length
  const completed = routine.routine_machines.filter((rm: any) => completedIds.has(rm.machine_id + '|' + (rm.exercise_name || rm.machines?.name))).length
  const isViewOnly = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'true'

  return (
    <main className="min-h-screen p-6 pb-24" style={{background: '#080808'}}>
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <a href="/dashboard" className="text-sm" style={{color: '#6B5E55'}}>← Dashboard</a>
          <div className="flex gap-2">
          <button onClick={() => { setEditing(!editing); setShowAdd(false) }}
            className="text-sm px-3 py-1.5 rounded-full font-semibold"
            style={{background: editing ? NAVY : 'transparent', color: editing ? 'white' : '#B0A89F', border: `1px solid ${editing ? NAVY : '#333333'}`, cursor: 'pointer'}}>
            {editing ? 'Done' : 'Edit'}
          </button>
          <button onClick={endRoutine}
            className="text-sm px-3 py-1.5 rounded-full font-semibold"
            style={{background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'none', cursor: 'pointer'}}>
            End Routine
          </button>
          </div>
        </div>

        {/* Routine header */}
        <div className="rounded-2xl p-5 mb-6" style={{background: NAVY, border: `1px solid ${NAVY}`}}>
          <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{color: 'rgba(255,255,255,0.6)'}}>Active Routine</p>
          <h1 className="text-2xl font-bold text-white mb-3">{routine.name}</h1>
          {!isViewOnly && (
  <div className="flex items-center gap-3">
    <div className="flex-1 rounded-full overflow-hidden" style={{height: '4px', background: 'rgba(255,255,255,0.2)'}}>
      <div style={{width: `${total > 0 ? (completed / total) * 100 : 0}%`, height: '100%', background: 'white', borderRadius: '2px', transition: 'width 0.3s ease'}}/>
    </div>
    <p className="text-xs font-bold text-white">{completed} / {total}</p>
  </div>
)}
        </div>

        {/* Machine list */}
        <div className="flex flex-col gap-3">
          {routine.routine_machines.map((rm: any, i: number) => {
            const machine = rm.machines
            const isDone = completedIds.has(rm.machine_id + '|' + (rm.exercise_name || machine?.name))
            return (
              
                <a
                key={rm.id}
                href={`/machine/${rm.machine_id}?from=routine&routineId=${id}${rm.exercise_name ? '&exercise=' + encodeURIComponent(rm.exercise_name) : ''}`}
                onClick={e => { if (editing) e.preventDefault() }}
                className="rounded-2xl p-4 flex items-center gap-4"
                style={{
                  background: isDone ? 'rgba(37,61,91,0.15)' : 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)',
                  border: isDone ? `1px solid ${NAVY}` : '1px solid #222222',
                  borderLeft: isDone ? `3px solid ${NAVY}` : '3px solid #333333',
                  opacity: isDone ? 0.7 : 1
                }}>
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{background: isDone ? NAVY : '#222222', color: isDone ? 'white' : '#6B5E55'}}>
                  {isDone ? '✓' : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{color: isDone ? '#6B5E55' : '#E8E0D8'}}>{rm.exercise_name || machine?.name}</p>
                  <p className="text-xs mt-0.5" style={{color: '#6B5E55'}}>
                    {rm.exercise_name ? machine?.name : machine?.type === 'cardio' ? 'Cardio' : machine?.type === 'functional' ? 'Functional' : 'Strength'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
  {editing && (
    <>
    <button onClick={(e) => { e.preventDefault(); moveMachine(i, -1) }}
      className="text-xs px-2 py-1 rounded"
      style={{color: '#B0A89F', background: 'transparent', border: 'none', cursor: 'pointer', opacity: i === 0 ? 0.3 : 1}}>↑</button>
    <button onClick={(e) => { e.preventDefault(); moveMachine(i, 1) }}
      className="text-xs px-2 py-1 rounded"
      style={{color: '#B0A89F', background: 'transparent', border: 'none', cursor: 'pointer', opacity: i === total - 1 ? 0.3 : 1}}>↓</button>
    <button
      onClick={async (e) => {
        e.preventDefault()
        await supabase.from('routine_machines').delete().eq('id', rm.id)
        setRoutine((prev: any) => ({
          ...prev,
          routine_machines: prev.routine_machines.filter((r: any) => r.id !== rm.id)
        }))
      }}
      className="text-xs px-2 py-1 rounded"
      style={{color: '#EF4444', background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer'}}>
      ✕
    </button>
    </>
  )}
  {!isDone && !editing && (
    <span style={{color: '#E8440C', fontSize: '18px'}}>→</span>
  )}
</div>
              </a>
            )
          })}
        </div>

        {editing && (
          <div className="mt-4">
            {!showAdd ? (
              <button onClick={() => setShowAdd(true)}
                className="w-full py-3 rounded-xl font-semibold text-sm"
                style={{background: 'transparent', border: `1px dashed ${NAVY_BORDER}`, color: '#B0A89F', cursor: 'pointer'}}>
                + Add Machine
              </button>
            ) : (
              <div className="rounded-2xl p-4" style={{background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', border: `1px solid ${NAVY}`}}>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-white text-sm font-semibold">Add a machine</p>
                  <button onClick={() => { setShowAdd(false); setAddSearch(''); setPickingMachine(null) }}
                    className="text-xs" style={{color: '#6B5E55', background: 'transparent', border: 'none', cursor: 'pointer'}}>Cancel</button>
                </div>
                {pickingMachine && (
                  <div className="mb-3">
                    <p className="text-xs mb-2" style={{color: '#B0A89F'}}>Exercise on {pickingMachine.name}</p>
                    <div className="flex flex-col gap-2 mb-2">
                      <button onClick={() => addMachine(pickingMachine)}
                        className="px-3 py-2 rounded-lg text-left text-sm text-white"
                        style={{background: '#080808', border: '1px solid #222222', cursor: 'pointer'}}>
                        {pickingMachine.name} (default)
                      </button>
                      {pickVariations.map(v => (
                        <button key={v.id} onClick={() => addMachine(pickingMachine, v.name)}
                          className="px-3 py-2 rounded-lg text-left text-sm text-white"
                          style={{background: '#080808', border: '1px solid #222222', cursor: 'pointer'}}>
                          {v.name}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs font-bold tracking-widest uppercase mt-4 mb-2" style={{color: '#B0A89F'}}>+ New exercise</p>
                    <div className="flex gap-2">
                      <input type="text" value={newExercise} onChange={e => setNewExercise(e.target.value)}
                         placeholder="Type a name, e.g. Lateral Raise"
                        onKeyDown={e => { if (e.key === 'Enter' && newExercise.trim()) addMachine(pickingMachine, newExercise) }}
                        className="flex-1 px-3 py-2 rounded-lg text-white text-sm focus:outline-none"
                        style={{background: '#080808', border: '1px solid #222222'}}/>
                      <button onClick={() => newExercise.trim() && addMachine(pickingMachine, newExercise)}
                        className="px-3 py-2 rounded-lg text-sm font-semibold text-white"
                        style={{background: NAVY, border: 'none', cursor: 'pointer'}}>
                        + Add
                      </button>
                    </div>
                    <button onClick={() => setPickingMachine(null)}
                      className="text-xs mt-2" style={{color: '#6B5E55', background: 'transparent', border: 'none', cursor: 'pointer'}}>
                      ← Back to machines
                    </button>
                  </div>
                )}
                <input type="text" hidden={!!pickingMachine} value={addSearch} onChange={e => setAddSearch(e.target.value)}
                  placeholder="Search machines..."
                  className="w-full px-4 py-3 rounded-lg text-white focus:outline-none mb-3"
                  style={{background: '#080808', border: '1px solid #222222'}}/>
                <div className="flex flex-col gap-2" style={{maxHeight: '260px', overflowY: 'auto'}}>
                  {gymMachines
                    .filter(m => !pickingMachine && m.name.toLowerCase().includes(addSearch.toLowerCase()))
                    .map(m => (
                     <button key={m.id} onClick={() => pickMachine(m)}
                        className="flex justify-between items-center px-3 py-2 rounded-lg text-left w-full"
                        style={{background: '#080808', border: 'none', cursor: 'pointer'}}>
                        <p className="text-white text-sm">{m.name}</p>
                        <p className="text-xs" style={{color: '#B0A89F'}}>+ Add</p>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {editing && (
          <button onClick={deleteRoutine}
            className="w-full py-3 rounded-full font-semibold text-sm mt-6"
            style={{background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer'}}>
            Delete Routine
          </button>
        )}

        {/* All done state */}
        {!isViewOnly && completed === total && total > 0 && (
          <div className="rounded-2xl p-6 mt-6 text-center" style={{background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', border: `1px solid ${NAVY}`}}>
            <p className="font-bold text-white mb-1">Routine Complete!</p>
<p className="text-sm mb-4" style={{color: '#6B5E55'}}>You crushed {routine.name}.</p>
<div className="flex flex-col gap-3">
  <button onClick={() => { localStorage.setItem('routine_started_at', new Date().toISOString()); setCompletedIds(new Set()) }}
    className="py-3 px-8 rounded-full font-semibold text-white"
    style={{background: '#253D5B', border: 'none', cursor: 'pointer'}}>
    Restart Routine
  </button>
  <button onClick={endRoutine}
    className="py-3 px-8 rounded-full font-semibold text-white"
    style={{background: '#E8440C', border: 'none', cursor: 'pointer'}}>
    Back to Dashboard
  </button>
</div>
          </div>
        )}
      </div>
    </main>
  )
}