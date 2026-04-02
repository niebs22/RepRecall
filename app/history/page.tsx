'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '../../components/BottomNav'

export default function History() {
  const [workouts, setWorkouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('workouts')
        .select('*, machines!workouts_machine_id_fkey(name, type)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)
      if (data) setWorkouts(data)
      setLoading(false)
    }
    load()
  }, [])

  function groupByDay(workouts: any[]) {
    const groups: Record<string, any[]> = {}
    workouts.forEach(w => {
      const dateStr = new Date(w.created_at).toDateString()
      if (!groups[dateStr]) groups[dateStr] = []
      groups[dateStr].push(w)
    })
    return Object.entries(groups).map(([date, items]) => ({ date, items }))
  }

  function formatDayLabel(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  function formatSummary(w: any) {
    if (w.machines?.type === 'cardio') {
      const parts = []
      if (w.duration) parts.push(w.duration + ' min')
      if (w.distance) parts.push(w.distance + ' mi')
      return parts.join(' · ')
    }
    const parts = []
    if (w.sets) parts.push(w.sets + (w.sets === 1 ? ' set' : ' sets'))
    if (w.weight) parts.push(w.weight + ' lbs')
    if (w.superset) parts.push('SS')
    return parts.join(' · ')
  }

  const grouped = groupByDay(workouts)

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{background: '#080808'}}>
      <p style={{color: '#6B5E55'}}>Loading...</p>
    </main>
  )

  return (
    <>
    <main className="min-h-screen p-6 pb-28" style={{background: '#080808'}}>
      <div className="max-w-lg mx-auto">

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl" style={{fontWeight: 300, color: '#E8E0D8'}}>
            scan<span style={{fontWeight: 900, color: '#C23B0A'}}>set</span>
          </h1>
        </div>

        <h2 className="text-3xl font-bold mb-6" style={{color: '#E8E0D8', letterSpacing: '-0.5px'}}>History</h2>

        {grouped.length === 0 ? (
          <p className="text-center py-12" style={{color: '#6B5E55'}}>No workouts yet. Scan a machine to get started.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map((group, gi) => (
              <div key={gi}>
                <p className="text-xs font-bold tracking-widest uppercase mb-3"
                  style={{color: gi === 0 ? '#C23B0A' : '#6B5E55'}}>
                  {formatDayLabel(group.date)}
                </p>
                <div className="flex flex-col gap-2">
                  {group.items.map((w, wi) => (
                    <a key={wi} href={'/machine/' + w.machine_id}
                      className="rounded-xl p-4 flex justify-between items-center"
                      style={{background: '#0F0F0F', border: '1px solid #1A1A1A', borderLeft: '2px solid #C23B0A'}}>
                      <div>
                        <p className="font-semibold text-sm" style={{color: '#E8E0D8'}}>
                          {w.exercise_name || w.machines?.name}
                        </p>
                        <p className="text-xs mt-1" style={{color: '#6B5E55'}}>{formatSummary(w)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold" style={{color: '#C23B0A'}}>{formatTime(w.created_at)}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
    <BottomNav />
    </>
  )
}