'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [gymId, setGymId] = useState<any>(null)
  const [totalMembers, setTotalMembers] = useState(0)
  const [activeThisWeek, setActiveThisWeek] = useState(0)
  const [totalWorkoutsThisWeek, setTotalWorkoutsThisWeek] = useState(0)
  const [mostUsed, setMostUsed] = useState<any>(null)
  const [leastUsed, setLeastUsed] = useState<any>(null)
  const [machineStats, setMachineStats] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: gym } = await supabase
        .from('gyms').select('*').limit(1).single()
      if (!gym) return
      setGymId(gym.id)

      const now = new Date()
      const monday = new Date(now)
      const dayOfWeek = now.getDay()
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      monday.setHours(0, 0, 0, 0)

      // Get all machines for this gym
      const { data: machines } = await supabase
        .from('machines')
        .select('*')
        .eq('gym_id', gym.id)

      // Get all workouts this week
      const { data: weekWorkouts } = await supabase
        .from('workouts')
        .select('*, machines(name)')
        .gte('created_at', monday.toISOString())

      // Get all workouts ever
      const { data: allWorkouts } = await supabase
        .from('workouts')
        .select('user_id, machine_id, created_at, machines(name)')

      // Get total members
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, created_at')

      setTotalMembers(profiles?.length || 0)

      // Active this week
      const activeUserIds = new Set(weekWorkouts?.map(w => w.user_id))
      setActiveThisWeek(activeUserIds.size)

      // Total workouts this week
      setTotalWorkoutsThisWeek(weekWorkouts?.length || 0)

      // Machine usage stats
      const usageMap: Record<string, { name: string, count: number, lastUsed: string | null }> = {}

      machines?.forEach(m => {
        usageMap[m.id] = { name: m.name, count: 0, lastUsed: null }
      })

      allWorkouts?.forEach(w => {
        if (usageMap[w.machine_id]) {
          usageMap[w.machine_id].count++
          if (!usageMap[w.machine_id].lastUsed || w.created_at > usageMap[w.machine_id].lastUsed!) {
            usageMap[w.machine_id].lastUsed = w.created_at
          }
        }
      })

      const stats = Object.values(usageMap).sort((a, b) => b.count - a.count)
      setMachineStats(stats)
      setMostUsed(stats[0] || null)
      setLeastUsed(stats[stats.length - 1] || null)
      setLoading(false)
    }
    load()
  }, [])

  function daysSince(date: string | null) {
    if (!date) return 'Never'
    const diffMs = new Date().getTime() - new Date(date).getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    const diffDays = Math.floor(diffHours / 24)
    if (diffHours < 24) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return diffDays + ' days ago'
  }

  const maxCount = machineStats[0]?.count || 1

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{background: '#0A1628'}}>
      <p style={{color: '#64748B'}}>Loading analytics...</p>
    </main>
  )

  return (
    <main className="min-h-screen p-6" style={{background: '#0A1628'}}>
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Rep<span style={{color: '#2563EB'}}>Recall</span></h1>
            <p className="text-xs mt-0.5" style={{color: '#64748B'}}>Gym Analytics</p>
          </div>
          <a href="/admin" className="text-sm" style={{color: '#64748B'}}>
            Admin
          </a>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-2xl p-4" style={{background: '#0F2040'}}>
            <p className="text-xs mb-1 uppercase tracking-widest" style={{color: '#64748B'}}>Total Members</p>
            <p className="text-3xl font-bold text-white">{totalMembers}</p>
          </div>
          <div className="rounded-2xl p-4" style={{background: '#0F2040'}}>
            <p className="text-xs mb-1 uppercase tracking-widest" style={{color: '#64748B'}}>Active This Week</p>
            <p className="text-3xl font-bold" style={{color: '#22C55E'}}>{activeThisWeek}</p>
          </div>
          <div className="rounded-2xl p-4" style={{background: '#0F2040'}}>
            <p className="text-xs mb-1 uppercase tracking-widest" style={{color: '#64748B'}}>Workouts This Week</p>
            <p className="text-3xl font-bold" style={{color: '#2563EB'}}>{totalWorkoutsThisWeek}</p>
          </div>
          <div className="rounded-2xl p-4" style={{background: '#0F2040'}}>
            <p className="text-xs mb-1 uppercase tracking-widest" style={{color: '#64748B'}}>Total Machines</p>
            <p className="text-3xl font-bold text-white">{machineStats.length}</p>
          </div>
        </div>

        {/* Most and least used */}
        {mostUsed && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-2xl p-4" style={{background: '#0F2040', borderLeft: '3px solid #22C55E'}}>
              <p className="text-xs mb-1 uppercase tracking-widest" style={{color: '#64748B'}}>Most Used</p>
              <p className="text-white font-semibold">{mostUsed.name}</p>
              <p className="text-xs mt-1" style={{color: '#22C55E'}}>{mostUsed.count} sessions</p>
            </div>
            <div className="rounded-2xl p-4" style={{background: '#0F2040', borderLeft: '3px solid #EF4444'}}>
              <p className="text-xs mb-1 uppercase tracking-widest" style={{color: '#64748B'}}>Least Used</p>
              <p className="text-white font-semibold">{leastUsed?.name}</p>
              <p className="text-xs mt-1" style={{color: '#EF4444'}}>{leastUsed?.count} sessions</p>
            </div>
          </div>
        )}

        {/* Equipment usage bars */}
        <h2 className="font-semibold text-lg mb-4 text-white">Equipment Usage</h2>
        <div className="flex flex-col gap-3">
          {machineStats.map((machine, i) => (
            <div key={i} className="rounded-xl p-4" style={{background: '#0F2040'}}>
              <div className="flex justify-between items-center mb-2">
                <p className="text-white text-sm font-medium">{machine.name}</p>
                <div className="text-right">
                  <p className="text-xs font-semibold" style={{color: '#2563EB'}}>{machine.count} sessions</p>
                  <p className="text-xs" style={{color: '#64748B'}}>{daysSince(machine.lastUsed)}</p>
                </div>
              </div>
              <div className="w-full rounded-full h-1.5" style={{background: '#0A1628'}}>
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: machine.count === 0 ? '2%' : (machine.count / maxCount * 100) + '%',
                    background: machine.count === 0 ? '#1E3A5F' : 'linear-gradient(90deg, #2563EB, #3B82F6)'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}