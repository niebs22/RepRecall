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
  const router = useRouter()

  const NAVY = '#253D5B'
  const NAVY_BG = 'rgba(37,61,91,0.15)'
  const NAVY_BORDER = 'rgba(37,61,91,0.4)'

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: memberData } = await supabase
        .from('gym_members')
        .select('gym_id, gyms(timezone)')
        .eq('user_id', user.id)
        .single()
      if (memberData?.gyms) {
        setGymTimezone((memberData.gyms as any).timezone || 'America/New_York')
      }

      const { data } = await supabase
        .from('routines')
        .select('*, routine_machines(*, machines(*))')
        .eq('id', id)
        .single()
      if (data) {
        const sorted = { ...data, routine_machines: [...data.routine_machines].sort((a, b) => a.order_index - b.order_index) }
        setRoutine(sorted)
        localStorage.setItem('active_routine', JSON.stringify(sorted))
      }

      // Check which machines already logged today
      const today = new Date().toDateString()
      const { data: todayWorkouts } = await supabase
        .from('workouts')
        .select('machine_id, created_at')
        .eq('user_id', user.id)
        .gte('created_at', new Date(today).toISOString())
      if (todayWorkouts) {
        setCompletedIds(new Set(todayWorkouts.map(w => w.machine_id)))
      }
    }
    load()
  }, [id])

  function endRoutine() {
    localStorage.removeItem('active_routine')
    router.push('/dashboard')
  }

  if (!routine) return (
    <main className="min-h-screen flex items-center justify-center" style={{background: '#080808'}}>
      <p style={{color: '#6B5E55'}}>Loading...</p>
    </main>
  )

  const total = routine.routine_machines.length
  const completed = routine.routine_machines.filter((rm: any) => completedIds.has(rm.machine_id)).length

  return (
    <main className="min-h-screen p-6 pb-24" style={{background: '#080808'}}>
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <a href="/dashboard" className="text-sm" style={{color: '#6B5E55'}}>← Dashboard</a>
          <button onClick={endRoutine}
            className="text-sm px-3 py-1.5 rounded-full font-semibold"
            style={{background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'none', cursor: 'pointer'}}>
            End Routine
          </button>
        </div>

        {/* Routine header */}
        <div className="rounded-2xl p-5 mb-6" style={{background: NAVY, border: `1px solid ${NAVY}`}}>
          <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{color: 'rgba(255,255,255,0.6)'}}>Active Routine</p>
          <h1 className="text-2xl font-bold text-white mb-3">{routine.name}</h1>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-full overflow-hidden" style={{height: '4px', background: 'rgba(255,255,255,0.2)'}}>
              <div style={{width: `${total > 0 ? (completed / total) * 100 : 0}%`, height: '100%', background: 'white', borderRadius: '2px', transition: 'width 0.3s ease'}}/>
            </div>
            <p className="text-xs font-bold text-white">{completed} / {total}</p>
          </div>
        </div>

        {/* Machine list */}
        <div className="flex flex-col gap-3">
          {routine.routine_machines.map((rm: any, i: number) => {
            const machine = rm.machines
            const isDone = completedIds.has(rm.machine_id)
            return (
              
                <a
                key={rm.id}
                href={`/machine/${rm.machine_id}?from=routine&routineId=${id}`}
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
                  <p className="font-semibold text-sm" style={{color: isDone ? '#6B5E55' : '#E8E0D8'}}>{machine?.name}</p>
                  <p className="text-xs mt-0.5" style={{color: '#6B5E55'}}>
                    {machine?.type === 'cardio' ? 'Cardio' : machine?.type === 'functional' ? 'Functional' : 'Strength'}
                  </p>
                </div>
                {!isDone && (
                  <span style={{color: '#E8440C', fontSize: '18px'}}>→</span>
                )}
              </a>
            )
          })}
        </div>

        {/* All done state */}
        {completed === total && total > 0 && (
          <div className="rounded-2xl p-6 mt-6 text-center" style={{background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', border: `1px solid ${NAVY}`}}>
            <p className="font-bold text-white mb-1">Routine Complete!</p>
<p className="text-sm mb-4" style={{color: '#6B5E55'}}>You crushed {routine.name}.</p>
<div className="flex flex-col gap-3">
  <button onClick={() => setCompletedIds(new Set())}
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