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

  // Equipment not used in 21+ days (recommendations)
  function getRecommendations() {
    const lastUsed: Record<string, { name: string; date: string }> = {}
    allWorkouts.forEach(w => {
      const key = w.machine_id
      const name = w.machines?.name || 'Unknown'
      if (!lastUsed[key]) lastUsed[key] = { name, date: w.created_at }
    })
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 21)
    return Object.values(lastUsed)
      .filter(m => new Date(m.date) < cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 4)
  }

  const totalSessions = allWorkouts.length
  const totalWeight = allWorkouts.reduce((sum, w) => {
    if (w.weight && w.reps) return sum + w.weight * w.reps
    if (w.weight) return sum + w.weight
    return sum
  }, 0)

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
  const recommendations = getRecommendations()
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
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-2xl p-4" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
            <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{color: '#6B5E55'}}>Sessions</p>
            <p className="font-bold" style={{fontSize: '28px', color: '#E8E0D8', letterSpacing: '-1px', lineHeight: 1}}>{totalSessions}</p>
          </div>
          <div className="rounded-2xl p-4" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
            <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{color: '#6B5E55'}}>Lifted</p>
            <p className="font-bold" style={{fontSize: '28px', color: '#E8E0D8', letterSpacing: '-1px', lineHeight: 1}}>
              {Math.round(totalWeight / 1000)}k<sup style={{fontSize: '11px', color: '#6B5E55'}}>lbs</sup>
            </p>
          </div>
          <div className="rounded-2xl p-4" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
            <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{color: '#6B5E55'}}>Active</p>
            <p className="font-bold" style={{fontSize: '28px', color: '#E8E0D8', letterSpacing: '-1px', lineHeight: 1}}>
              {activeWeeks}<sup style={{fontSize: '11px', color: '#6B5E55'}}>/8 wks</sup>
            </p>
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
                      ? i === 3 ? 'linear-gradient(180deg, #D44A18 0%, #8C2A06 100%)' : 'linear-gradient(180deg, #8C2A06 0%, #5A1A04 100%)'
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

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="rounded-2xl p-5 mb-4" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{color: '#6B5E55'}}>Worth Revisiting</p>
            <p className="text-xs mb-4" style={{color: '#6B5E55'}}>Equipment you haven't hit in 3+ weeks</p>
            <div className="flex flex-col gap-3">
              {recommendations.map((r, i) => (
                <div key={i} className="flex justify-between items-center py-2"
                  style={{borderBottom: i < recommendations.length - 1 ? '1px solid #1A1A1A' : 'none'}}>
                  <p className="font-semibold text-sm" style={{color: '#E8E0D8'}}>{r.name}</p>
                  <p className="text-xs font-semibold" style={{color: '#C23B0A'}}>{daysSince(r.date)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

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