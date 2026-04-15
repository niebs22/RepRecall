'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '../components/BottomNav'

export default function History() {
  const [workouts, setWorkouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timezone, setTimezone] = useState('America/New_York')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: memberData } = await supabase
        .from('gym_members')
        .select('gym_id, gyms(timezone)')
        .eq('user_id', user.id)
        .single()
      if (memberData?.gyms) {
        const tz = (memberData.gyms as any).timezone || 'America/New_York'
        console.log('Setting timezone to:', tz)
        setTimezone(tz)
      } else {
        console.log('No gym timezone found, memberData:', memberData)
      }

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
      const dateStr = new Date(w.created_at).toLocaleDateString('en-US', {
        timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
      })
      if (!groups[dateStr]) groups[dateStr] = []
      groups[dateStr].push(w)
    })
    return Object.entries(groups).map(([date, items]) => ({ date, items }))
  }

  function formatDayLabel(dateStr: string) {
    const todayStr = new Date().toLocaleDateString('en-US', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
    })
    const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('en-US', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
    })
    if (dateStr === todayStr) return 'Today'
    if (dateStr === yesterdayStr) return 'Yesterday'
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric'
    })
  }

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone })
  }

  function groupSets(items: any[]) {
    const groups: Record<string, any[]> = {}
    items.forEach(w => {
      const key = (w.exercise_name || w.machines?.name) + '|' + new Date(w.created_at).toISOString().slice(0, 16)
      if (!groups[key]) groups[key] = []
      groups[key].push(w)
    })
    return Object.values(groups).map(sets => {
      const first = sets[0]
      const weights = sets.map(s => s.weight).filter(Boolean)
      const minW = Math.min(...weights)
      const maxW = Math.max(...weights)
      const totalSets = sets.length
      return { ...first, _groupedSets: totalSets, _minWeight: minW, _maxWeight: maxW, _allSets: sets }
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  function formatSummary(w: any) {
    if (w.machines?.type === 'cardio') {
      const parts = []
      if (w.duration) parts.push(w.duration + ' min')
      if (w.distance) parts.push(w.distance + ' mi')
      return parts.join(' · ')
    }
    const parts = []
    const sets = w._groupedSets || w.sets
    if (sets) parts.push(sets + (sets === 1 ? ' set' : ' sets'))
    if (w._minWeight && w._maxWeight) {
      if (w._minWeight === w._maxWeight) {
        parts.push(w._minWeight + ' lbs')
      } else {
        parts.push(w._minWeight + '-' + w._maxWeight + ' lbs')
      }
    } else if (w.weight) {
      parts.push(w.weight + ' lbs')
    }
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
                  {groupSets(group.items).map((w, wi) => (
                    <a key={wi} href={'/machine/' + w.machine_id + '?from=history' + (w.exercise_name ? '&exercise=' + encodeURIComponent(w.exercise_name) : '')}
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