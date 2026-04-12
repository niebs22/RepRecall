'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '../components/BottomNav'

export default function MyStats() {
  const [user, setUser] = useState<any>(null)
  const [allWorkouts, setAllWorkouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [prsOpen, setPrsOpen] = useState(false)
  const [challengeOpen, setChallengeOpen] = useState(false)
  const [challengeExercises, setChallengeExercises] = useState<any[]>([])
  const [challengePool, setChallengePool] = useState<any[]>([])
  const [progressMachineId, setProgressMachineId] = useState('')
  const [progressExercise, setProgressExercise] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data } = await supabase
        .from('workouts')
        .select('*, machines!workouts_machine_id_fkey(name, type)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (data) setAllWorkouts(data)
      await fetchChallengeExercises(user.id)
      setLoading(false)
    }
    load()
  }, [])

  // PRs — heaviest weight per exercise, sorted alphabetically
  function getPRs() {
    const prMap: Record<string, { weight: number; machineName: string; date: string }> = {}
    allWorkouts.forEach(w => {
      if (!w.weight || w.machines?.type === 'cardio') return
      const key = w.exercise_name || w.machines?.name
      if (!key) return
      if (!prMap[key] || w.weight > prMap[key].weight) {
        prMap[key] = { weight: w.weight, machineName: w.machines?.name || key, date: w.created_at }
      }
    })
    return Object.entries(prMap)
      .map(([exercise, data]) => ({ exercise, ...data }))
      .sort((a, b) => a.exercise.localeCompare(b.exercise))
  }

  // Top 4 most used equipment
  function getTopEquipment() {
    const countMap: Record<string, { name: string; count: number; lastDate: string }> = {}
    allWorkouts.forEach(w => {
      const key = w.machine_id
      const name = w.machines?.name || 'Unknown'
      if (!countMap[key]) countMap[key] = { name, count: 0, lastDate: w.created_at }
      countMap[key].count++
    })
    return Object.values(countMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  }

  // Rolling 4-week activity
  function getFourWeekTrend() {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    thisMonday.setHours(0, 0, 0, 0)

    return [3, 2, 1, 0].map(w => {
      const start = new Date(thisMonday)
      start.setDate(thisMonday.getDate() - w * 7)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      const label = w === 0 ? 'This week' : w === 1 ? 'Last week' : `${w + 1} wks ago`
      const days = new Set(
        allWorkouts
          .filter(wo => { const d = new Date(wo.created_at); return d >= start && d <= end })
          .map(wo => new Date(wo.created_at).toDateString())
      )
      return { label, days: days.size }
    })
  }

  // Active weeks out of last 8
  function getActiveWeeks() {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    thisMonday.setHours(0, 0, 0, 0)
    let active = 0
    for (let w = 0; w < 8; w++) {
      const start = new Date(thisMonday)
      start.setDate(thisMonday.getDate() - w * 7)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      const hasWorkout = allWorkouts.some(wo => {
        const d = new Date(wo.created_at)
        return d >= start && d <= end
      })
      if (hasWorkout) active++
    }
    return active
  }

  async function fetchChallengeExercises(userId: string) {
    const { data } = await supabase
      .from('workouts')
      .select('exercise_name, machine_id, created_at, weight, reps, sets, machines!workouts_machine_id_fkey(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (!data) return
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 10)
    const exerciseMap: Record<string, any> = {}
    data.forEach((w: any) => {
      const key = w.exercise_name || w.machines?.name
      if (!key || !w.machine_id) return
      if (!exerciseMap[key]) {
        exerciseMap[key] = {
          name: key,
          machineId: w.machine_id,
          lastDate: w.created_at,
          lastWeight: w.weight,
          lastReps: w.reps,
          lastSets: w.sets
        }
      }
    })
    const pool = Object.values(exerciseMap)
      .filter(e => new Date(e.lastDate) < cutoff)
      .sort((a, b) => new Date(a.lastDate).getTime() - new Date(b.lastDate).getTime())
    setChallengePool(pool)
    setChallengeExercises(pool.slice(0, 4))
  }

  function shuffleChallenges() {
    const shuffled = [...challengePool].sort(() => Math.random() - 0.5)
    setChallengeExercises(shuffled.slice(0, 4))
  }

  const totalSessions = allWorkouts.length
  const totalWeight = allWorkouts.reduce((sum, w) => {
    if (w.weight && w.reps) return sum + w.weight * w.reps
    if (w.weight) return sum + w.weight
    return sum
  }, 0)

  function getProgressData(machineId: string, exerciseName: string) {
    const machineWorkouts = allWorkouts.filter(w => w.machine_id === machineId)
    const isCardio = machineWorkouts[0]?.machines?.type === 'cardio'

    const exerciseWorkouts = machineWorkouts.filter(w =>
      (w.exercise_name || w.machines?.name) === exerciseName
    )
    if (exerciseWorkouts.length < 2) return null

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
    const unit = isCardio ? 'min' : 'lbs'

    return { sessions, first, last, delta, trend, unit }
  }

  function daysSince(date: string) {
    const now = new Date()
    const past = new Date(date)
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const pastDate = new Date(past.getFullYear(), past.getMonth(), past.getDate())
    const diffMs = nowDate.getTime() - pastDate.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays}d ago`
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{background: '#080808'}}>
      <p style={{color: '#6B5E55'}}>Loading...</p>
    </main>
  )

  const prs = getPRs()
  const topEquipment = getTopEquipment()
  const fourWeekTrend = getFourWeekTrend()
  const activeWeeks = getActiveWeeks()
  const maxDays = Math.max(...fourWeekTrend.map(w => w.days), 1)

  return (
    <>
    <main className="min-h-screen p-6 pb-28" style={{background: '#080808'}}>
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl" style={{fontWeight: 300, color: '#E8E0D8'}}>
            scan<span style={{fontWeight: 900, color: '#C23B0A'}}>set</span>
          </h1>
          <a href="/dashboard" className="text-sm" style={{color: '#6B5E55'}}>← Dashboard</a>
        </div>

        <h2 className="text-3xl font-bold mb-6" style={{color: '#E8E0D8', letterSpacing: '-0.5px'}}>My Stats</h2>

        {/* Summary row */}
        {/* Summary row */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-2xl p-5" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{color: '#6B5E55'}}>Sessions</p>
            <p className="font-bold" style={{fontSize: '42px', color: '#E8E0D8', letterSpacing: '-2px', lineHeight: 1}}>{totalSessions}</p>
            <p className="text-xs mt-2" style={{color: '#6B5E55'}}>total logged</p>
          </div>
          <div className="rounded-2xl p-5" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{color: '#6B5E55'}}>Lifted</p>
            <p className="font-bold" style={{fontSize: '42px', color: '#E8E0D8', letterSpacing: '-2px', lineHeight: 1}}>
              {Math.round(totalWeight / 1000)}k
            </p>
            <p className="text-xs mt-2" style={{color: '#6B5E55'}}>lbs all time</p>
          </div>
        </div>
        <div className="rounded-2xl px-5 py-4 mb-4 flex justify-between items-center" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{color: '#6B5E55'}}>Consistency</p>
            <p className="font-semibold text-sm" style={{color: '#E8E0D8'}}>Active {activeWeeks} of the last 8 weeks</p>
          </div>
          <div className="flex gap-1.5">
            {Array.from({length: 8}, (_, i) => (
              <div key={i} style={{
                width: '8px', height: '8px', borderRadius: '2px',
                background: i < activeWeeks ? '#C23B0A' : '#1A1A1A'
              }}/>
            ))}
          </div>
        </div>

        {/* 4-week trend */}
        <div className="rounded-2xl p-5 mb-4" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{color: '#6B5E55'}}>4-Week Trend</p>
          <div className="flex gap-3 items-end" style={{height: '80px'}}>
            {fourWeekTrend.map((week, i) => {
              const height = Math.max((week.days / maxDays) * 64, week.days > 0 ? 12 : 6)
              return (
                <div key={i} className="flex flex-col items-center gap-2 flex-1">
                  <p className="text-xs font-bold" style={{color: '#C23B0A'}}>{week.days > 0 ? week.days : ''}</p>
                   <div className="w-full rounded" style={{
                    height: `${height}px`,
                    background: week.days > 0
                      ? i === 3 ? '#C23B0A' : '#6B2510'
                      : '#1A1A1A'
                  }}/>
                  <p className="text-center" style={{color: '#6B5E55', fontSize: '9px', lineHeight: 1.2}}>{week.label}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top Equipment */}
        <div className="rounded-2xl p-5 mb-4" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{color: '#6B5E55'}}>Top Equipment</p>
          <div className="flex flex-col gap-3">
            {topEquipment.map((eq, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold w-4" style={{color: '#C23B0A'}}>#{i + 1}</span>
                  <p className="font-semibold text-sm" style={{color: '#E8E0D8'}}>{eq.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold" style={{color: '#C23B0A'}}>{eq.count} sessions</p>
                  <p className="text-xs" style={{color: '#6B5E55'}}>{daysSince(eq.lastDate)}</p>
                </div>
              </div>
            ))}
            {topEquipment.length === 0 && (
              <p className="text-sm" style={{color: '#6B5E55'}}>No equipment logged yet.</p>
            )}
          </div>
        </div>

        {/* Looking for a Challenge */}
        {challengeExercises.length === 0 ? (
          <div className="rounded-2xl mb-4 p-5" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{color: '#C23B0A'}}>Looking for a Challenge?</p>
            <p className="text-sm" style={{color: '#6B5E55'}}>Keep logging sessions — once you've built some history we'll start suggesting exercises to revisit.</p>
          </div>
        ) : (
          <div className="rounded-2xl mb-4 overflow-hidden" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
            <button
              onClick={() => setChallengeOpen(prev => !prev)}
              className="w-full p-5 text-left"
              style={{background: 'transparent', border: 'none', cursor: 'pointer'}}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-bold tracking-widest uppercase" style={{color: '#C23B0A'}}>Looking for a Challenge?</p>
                    {challengePool.length > 4 && (
                      <button
                        onClick={e => { e.stopPropagation(); shuffleChallenges() }}
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{color: '#6B5E55', background: '#1A1A1A', lineHeight: 1}}
                        title="Shuffle"
                      >
                        ↻
                      </button>
                    )}
                  </div>
                  <p className="text-sm" style={{color: '#6B5E55'}}>
                    {challengeOpen ? 'Try to beat your last session on these.' : "Not sure what to work today? We picked exercises you haven't hit in a while — try to beat your last session."}
                  </p>
                </div>
                <span style={{
                  color: '#6B5E55', fontSize: '18px', marginLeft: '12px',
                  transform: challengeOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease', display: 'inline-block', lineHeight: 1, flexShrink: 0
                }}>▾</span>
              </div>
            </button>
            {challengeOpen && (
              <div className="flex flex-col gap-2 px-5 pb-5">
                {challengeExercises.map((ex, i) => (
                  <a key={i}
                    href={`/machine/${ex.machineId}?exercise=${encodeURIComponent(ex.name)}`}
                    className="flex justify-between items-center p-4 rounded-xl"
                    style={{background: '#080808', border: '1px solid #1A1A1A', borderLeft: '2px solid #C23B0A'}}>
                    <div>
                      <p className="font-semibold text-sm" style={{color: '#E8E0D8'}}>{ex.name}</p>
                      <p className="text-xs mt-0.5" style={{color: '#6B5E55'}}>
                        {ex.lastSets && ex.lastReps ? `Last: ${ex.lastSets}x${ex.lastReps}` : ''}
                        {ex.lastWeight ? ` · ${ex.lastWeight} lbs` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold" style={{color: '#C23B0A'}}>
                        {(() => {
                          const days = Math.round((new Date().getTime() - new Date(ex.lastDate).getTime()) / (1000 * 60 * 60 * 24))
                          return days === 1 ? 'Yesterday' : `${days}d ago`
                        })()}
                      </p>
                      <p className="text-xs mt-0.5" style={{color: '#6B5E55'}}>Beat it →</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Progress Explorer */}
        {(() => {
          const machines = Array.from(new Map(
            allWorkouts.map(w => [w.machine_id, { id: w.machine_id, name: w.machines?.name || 'Unknown', type: w.machines?.type }])
          ).values()).filter(m => m.type !== 'functional').sort((a, b) => a.name.localeCompare(b.name))

          const selectedMachineWorkouts = progressMachineId
            ? allWorkouts.filter(w => w.machine_id === progressMachineId)
            : []

          const exercises = progressMachineId ? Array.from(new Set(
            selectedMachineWorkouts.map(w => w.exercise_name || w.machines?.name).filter(Boolean)
          )) : []

          const pd = progressMachineId && progressExercise ? getProgressData(progressMachineId, progressExercise) : null

          const chartW = 300
          const chartH = 100

          return (
            <div className="rounded-2xl overflow-hidden mb-4" style={{background: '#0D0D12', border: '1px solid #1E1A2E'}}>
              <div className="p-5">
                <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{color: '#9B6DFF'}}>Progress Explorer</p>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs mb-1 block" style={{color: '#6B5E55'}}>Machine</label>
                    <select
                      value={progressMachineId}
                      onChange={e => { setProgressMachineId(e.target.value); setProgressExercise('') }}
                      className="w-full px-4 py-3 rounded-lg text-white focus:outline-none"
                      style={{background: '#080808', border: '1px solid #1E1A2E', color: progressMachineId ? '#E8E0D8' : '#6B5E55'}}
                    >
                      <option value="">Select a machine...</option>
                      {machines.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  {exercises.length > 1 && (
                    <div>
                      <label className="text-xs mb-1 block" style={{color: '#6B5E55'}}>Exercise</label>
                      <select
                        value={progressExercise}
                        onChange={e => setProgressExercise(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg text-white focus:outline-none"
                        style={{background: '#080808', border: '1px solid #1E1A2E', color: progressExercise ? '#E8E0D8' : '#6B5E55'}}
                      >
                        <option value="">Select exercise...</option>
                        {exercises.map(ex => (
                          <option key={ex} value={ex}>{ex}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {exercises.length === 1 && !progressExercise && (() => {
                    setProgressExercise(exercises[0])
                    return null
                  })()}
                </div>

                {progressMachineId && progressExercise && !pd && (
                  <p className="text-sm mt-4" style={{color: '#6B5E55'}}>Not enough data yet — keep logging!</p>
                )}

                {pd && (() => {
                  const values = pd.sessions.map(s => s.value)
                  const minVal = Math.min(...values)
                  const maxVal = Math.max(...values)
                  const range = maxVal - minVal || 1
                  const pts = pd.sessions.map((s, i) => {
                    const x = (i / (pd.sessions.length - 1)) * chartW
                    const y = chartH - ((s.value - minVal) / range) * (chartH - 10) - 5
                    return `${x},${y}`
                  }).join(' ')

                  const n = pd.sessions.length
                  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
                  pd.sessions.forEach((s, i) => {
                    sumX += i; sumY += s.value; sumXY += i * s.value; sumX2 += i * i
                  })
                  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
                  const intercept = (sumY - slope * sumX) / n
                  const trendY1 = chartH - ((intercept - minVal) / range) * (chartH - 10) - 5
                  const trendY2 = chartH - ((slope * (n - 1) + intercept - minVal) / range) * (chartH - 10) - 5

                  return (
                    <div className="mt-4">
                      <div className="flex justify-between items-start mb-3">
                        <p className="text-xs" style={{color: '#6B5E55'}}>{progressExercise}</p>
                        <div className="text-right">
                          <p className="text-3xl font-black" style={{color: '#E8E0D8', letterSpacing: '-1px', lineHeight: 1}}>
                            {pd.delta >= 0 ? '+' : ''}{Math.round(pd.delta)}
                          </p>
                          <p className="text-xs mt-1" style={{color: '#6B5E55'}}>{pd.unit} since you started</p>
                        </div>
                      </div>

                      <svg width="100%" height="120" viewBox={`0 0 ${chartW} ${chartH + 20}`} preserveAspectRatio="xMidYMid meet">
                        <line x1="0" y1={chartH + 2} x2={chartW} y2={chartH + 2} stroke="#1E1A2E" strokeWidth="1"/>
                        <line x1="0" y1={trendY1} x2={chartW} y2={trendY2}
                          stroke="rgba(155,109,255,0.5)" strokeWidth="1.5" strokeDasharray="5 4"/>
                        <polyline points={pts} fill="none" stroke="#9B6DFF" strokeWidth="2.5"
                          strokeLinejoin="round" strokeLinecap="round"/>
                        {pd.sessions.map((s, i) => {
                          const x = (i / (pd.sessions.length - 1)) * chartW
                          const y = chartH - ((s.value - minVal) / range) * (chartH - 10) - 5
                          const isLast = i === pd.sessions.length - 1
                          return isLast
                            ? <circle key={i} cx={x} cy={y} r="5" fill="#9B6DFF"/>
                            : <circle key={i} cx={x} cy={y} r="4" fill="#0D0D12" stroke="#9B6DFF" strokeWidth="2"/>
                        })}
                      </svg>

                      <div className="flex justify-between items-center mt-2">
                        <div>
                          <p className="text-xs font-bold" style={{color: '#3A3A3A'}}>{pd.first} {pd.unit}</p>
                          <p className="text-xs" style={{color: '#2A2A2A'}}>start</p>
                        </div>
                        <p className="text-xs font-semibold" style={{color: '#6B5E55'}}>{pd.trend} {pd.sessions.length} sessions</p>
                        <div className="text-right">
                          <p className="text-xs font-bold" style={{color: '#9B6DFF'}}>{pd.last} {pd.unit}</p>
                          <p className="text-xs" style={{color: '#6B5E55'}}>now</p>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )
        })()}

        {/* PRs — collapsible */}
        <div className="rounded-2xl overflow-hidden mb-6" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
          <button
            onClick={() => setPrsOpen(prev => !prev)}
            className="w-full flex justify-between items-center p-5"
            style={{background: 'transparent', border: 'none', cursor: 'pointer'}}
          >
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold tracking-widest uppercase" style={{color: '#6B5E55'}}>Personal Records</p>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{background: '#1A1A1A', color: '#6B5E55'}}>
                {prs.length}
              </span>
            </div>
            <span style={{
              color: '#6B5E55', fontSize: '18px',
              transform: prsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease', display: 'inline-block', lineHeight: 1
            }}>▾</span>
          </button>

          {prsOpen && (
            <div className="px-5 pb-5">
              {prs.length === 0 ? (
                <p className="text-sm" style={{color: '#6B5E55'}}>No strength workouts logged yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {prs.map((pr, i) => (
                    <div key={i} className="flex justify-between items-center py-3"
                      style={{borderBottom: i < prs.length - 1 ? '1px solid #1A1A1A' : 'none'}}>
                      <div>
                        <p className="font-semibold text-sm" style={{color: '#E8E0D8'}}>{pr.exercise}</p>
                        <p className="text-xs mt-0.5" style={{color: '#6B5E55'}}>{daysSince(pr.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold" style={{fontSize: '22px', color: '#E8E0D8', letterSpacing: '-0.5px', lineHeight: 1}}>
                          {pr.weight}
                        </p>
                        <p className="text-xs" style={{color: '#6B5E55'}}>lbs</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </main>
    <BottomNav />
    </>
  )
}