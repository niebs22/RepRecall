'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [totalMembers, setTotalMembers] = useState(0)
  const [activeThisWeek, setActiveThisWeek] = useState(0)
  const [totalWorkoutsThisWeek, setTotalWorkoutsThisWeek] = useState(0)
  const [mostUsed, setMostUsed] = useState<any>(null)
  const [leastUsed, setLeastUsed] = useState<any>(null)
  const [machineStats, setMachineStats] = useState<any[]>([])
  const [dayStats, setDayStats] = useState<number[]>([0,0,0,0,0,0,0])
  const [timeStats, setTimeStats] = useState({morning: 0, afternoon: 0, evening: 0})
  const [equipmentOpen, setEquipmentOpen] = useState(true)
  const [members, setMembers] = useState<any[]>([])
  const [membersOpen, setMembersOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile) { router.push('/dashboard'); return }

      let gym = null

      if (profile.role === 'super_admin') {
        const { data } = await supabase
          .from('gyms').select('*').limit(1).single()
        gym = data
      } else if (profile.role === 'gym_owner') {
        const { data } = await supabase
          .from('gyms').select('*').eq('owner_id', user.id).single()
        gym = data
      } else {
        router.push('/dashboard')
        return
      }

      if (!gym) return

      const now = new Date()
      const monday = new Date(now)
      const dayOfWeek = now.getDay()
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      monday.setHours(0, 0, 0, 0)

      const { data: machines } = await supabase
        .from('machines').select('*').eq('gym_id', gym.id)

      const machineIds = machines?.map(m => m.id) || []

      const { data: weekWorkouts } = await supabase
        .from('workouts').select('*, machines(name)')
        .in('machine_id', machineIds)
        .gte('created_at', monday.toISOString())

      const { data: allWorkouts } = await supabase
        .from('workouts').select('user_id, machine_id, created_at, machines(name)')
        .in('machine_id', machineIds)

      const { data: gymMembersData } = await supabase
  .from('gym_members')
  .select('user_id, created_at')
  .eq('gym_id', gym.id)
  .order('created_at', { ascending: false })

if (gymMembersData) {
  const memberIds = gymMembersData.map(m => m.user_id)
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', memberIds)

  const merged = gymMembersData.map(m => ({
    ...m,
    full_name: profilesData?.find(p => p.id === m.user_id)?.full_name || 'Unknown',
    email: profilesData?.find(p => p.id === m.user_id)?.email || ''
  }))
  setMembers(merged)
}
      setTotalMembers(gymMembers?.length || 0)

      const activeUserIds = new Set(weekWorkouts?.map(w => w.user_id))
      setActiveThisWeek(activeUserIds.size)
      setTotalWorkoutsThisWeek(weekWorkouts?.length || 0)

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

      const days = [0,0,0,0,0,0,0]
      allWorkouts?.forEach(w => {
        const day = new Date(w.created_at).getDay()
        const adjusted = day === 0 ? 6 : day - 1
        days[adjusted]++
      })
      setDayStats(days)

      const times = { morning: 0, afternoon: 0, evening: 0 }
      allWorkouts?.forEach(w => {
        const hour = new Date(w.created_at).getHours()
        if (hour >= 5 && hour < 11) times.morning++
        else if (hour >= 11 && hour < 17) times.afternoon++
        else if (hour >= 17 && hour < 22) times.evening++
      })
      setTimeStats(times)

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
  const maxDayCount = Math.max(...dayStats) || 1
  const maxTimeCount = Math.max(timeStats.morning, timeStats.afternoon, timeStats.evening) || 1
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

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
            <h1 className="text-2xl font-bold text-white"><span style={{fontWeight: 300}}>scan</span><span style={{color: '#2563EB', fontWeight: 900}}>set</span></h1>
            <p className="text-xs mt-0.5" style={{color: '#64748B'}}>Gym Analytics</p>
          </div>
          <a href="/admin" className="text-sm" style={{color: '#64748B'}}>Admin</a>
        </div>

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

        <div className="rounded-2xl p-5 mb-4" style={{background: '#0F2040'}}>
          <p className="text-white font-semibold mb-4">Busiest Days</p>
          <div className="flex gap-1.5 items-end justify-between">
            {dayLabels.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                <p className="text-xs" style={{color: '#64748B'}}>{dayStats[i]}</p>
                <div
                  className="w-full rounded"
                  style={{
                    height: dayStats[i] === 0 ? '4px' : Math.max(4, dayStats[i] / maxDayCount * 60) + 'px',
                    background: i === todayIndex
                      ? '#3B82F6'
                      : dayStats[i] === Math.max(...dayStats)
                      ? '#22C55E'
                      : '#1E3A5F'
                  }}
                />
                <p className="text-xs" style={{color: i === todayIndex ? '#3B82F6' : '#64748B'}}>{day}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-5 mb-6" style={{background: '#0F2040'}}>
          <p className="text-white font-semibold mb-4">Busiest Times</p>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Morning', sublabel: '5am – 11am', count: timeStats.morning, color: '#F59E0B' },
              { label: 'Afternoon', sublabel: '11am – 5pm', count: timeStats.afternoon, color: '#2563EB' },
              { label: 'Evening', sublabel: '5pm – 10pm', count: timeStats.evening, color: '#8B5CF6' }
            ].map((slot, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-1">
                  <div>
                    <span className="text-white text-sm font-medium">{slot.label}</span>
                    <span className="text-xs ml-2" style={{color: '#64748B'}}>{slot.sublabel}</span>
                  </div>
                  <p className="text-xs font-semibold" style={{color: slot.color}}>{slot.count} sessions</p>
                </div>
                <div className="w-full rounded-full h-2" style={{background: '#0A1628'}}>
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: slot.count === 0 ? '2%' : (slot.count / maxTimeCount * 100) + '%',
                      background: slot.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Equipment usage */}
        <div className="rounded-2xl overflow-hidden mb-6" style={{background: '#0F2040'}}>
          <button
            onClick={() => setEquipmentOpen(prev => !prev)}
            className="w-full flex justify-between items-center p-5"
            style={{background: 'transparent', border: 'none', cursor: 'pointer'}}
          >
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg text-white">Equipment Usage</h2>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{background: '#1E3A5F', color: '#64748B'}}>
                {machineStats.length}
              </span>
            </div>
            <span style={{
              color: '#64748B',
              fontSize: '18px',
              transform: equipmentOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              display: 'inline-block',
              lineHeight: 1
            }}>▾</span>
          </button>

          {equipmentOpen && (
            <div className="flex flex-col gap-3 px-5 pb-5">
              {machineStats.map((machine, i) => (
                <div key={i} className="rounded-xl p-4" style={{background: '#0A1628'}}>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-white text-sm font-medium">{machine.name}</p>
                    <div className="text-right">
                      <p className="text-xs font-semibold" style={{color: '#2563EB'}}>{machine.count} sessions</p>
                      <p className="text-xs" style={{color: '#64748B'}}>{daysSince(machine.lastUsed)}</p>
                    </div>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{background: '#1E3A5F'}}>
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
          )}
        </div>

        {/* Member list */}
        <div className="rounded-2xl overflow-hidden mb-6" style={{background: '#0F2040'}}>
          <button
            onClick={() => setMembersOpen(prev => !prev)}
            className="w-full flex justify-between items-center p-5"
            style={{background: 'transparent', border: 'none', cursor: 'pointer'}}
          >
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg text-white">Members</h2>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{background: '#1E3A5F', color: '#64748B'}}>
                {members.length}
              </span>
            </div>
            <span style={{
              color: '#64748B',
              fontSize: '18px',
              transform: membersOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              display: 'inline-block',
              lineHeight: 1
            }}>▾</span>
          </button>

          {membersOpen && (
            <div className="flex flex-col gap-2 px-5 pb-5">
              {members.length === 0 ? (
                <p className="text-center py-4" style={{color: '#64748B'}}>No members yet.</p>
              ) : (
                members.map((m, i) => (
                  <div key={i} className="flex justify-between items-center px-4 py-3 rounded-xl" style={{background: '#0A1628'}}>
                    <div>
                      <p className="text-white text-sm font-semibold">{m.full_name}</p>
                      <p className="text-xs" style={{color: '#64748B'}}>{m.email}</p>
                    </div>
                    <p className="text-xs" style={{color: '#64748B'}}>
                      {new Date(m.created_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}