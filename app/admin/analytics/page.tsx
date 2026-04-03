'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [gyms, setGyms] = useState<any[]>([])
  const [selectedGymId, setSelectedGymId] = useState<string>('')
  const [gymName, setGymName] = useState('')
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
  const [atRiskMembers, setAtRiskMembers] = useState<any[]>([])
  const [returnRate, setReturnRate] = useState<number | null>(null)
  const [atRiskOpen, setAtRiskOpen] = useState(true)
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

      let ownedGyms: any[] = []

      if (profile.role === 'super_admin') {
        const { data: memberData } = await supabase
          .from('gym_members')
          .select('gym_id')
          .eq('user_id', user.id)
        if (memberData) {
          const gymIds = memberData.map(m => m.gym_id)
          const { data } = await supabase
            .from('gyms').select('*').in('id', gymIds)
          ownedGyms = data || []
        }
      } else if (profile.role === 'gym_owner') {
        const { data } = await supabase
          .from('gyms').select('*').eq('owner_id', user.id)
        ownedGyms = data || []
      } else {
        router.push('/dashboard')
        return
      }

      if (ownedGyms.length === 0) return
      setGyms(ownedGyms)
      setSelectedGymId(ownedGyms[0].id)
      setGymName(ownedGyms[0].name)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedGymId) return
    loadAnalytics(selectedGymId)
  }, [selectedGymId])

  async function loadAnalytics(gymId: string) {
    setLoading(true)

    const now = new Date()
    const monday = new Date(now)
    const dayOfWeek = now.getDay()
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)

    const { data: machines } = await supabase
      .from('machines').select('*').eq('gym_id', gymId)
    console.log('machines fetch:', machines?.map(m => ({ name: m.name, price: m.purchase_price })))

    const machineIds = machines?.map(m => m.id) || []

    const { data: weekWorkouts } = await supabase
      .from('workouts')
      .select('*, machines!workouts_machine_id_fkey(name)')
      .in('machine_id', machineIds)
      .gte('created_at', monday.toISOString())

    const { data: allWorkouts } = await supabase
      .from('workouts')
      .select('user_id, machine_id, created_at, machines!workouts_machine_id_fkey(name)')
      .in('machine_id', machineIds)

    const { data: gymMembersData } = await supabase
      .from('gym_members')
      .select('user_id, created_at')
      .eq('gym_id', gymId)
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

    setTotalMembers(gymMembersData?.length || 0)

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
    const stats = Object.entries(usageMap).map(([machineId, stat]) => {
      const machine = machines?.find(m => m.id === machineId)
      return { ...stat, purchase_price: machine?.purchase_price || null }
    }).sort((a, b) => b.count - a.count)
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
    // At-risk members — no workout in 14+ days
    if (gymMembersData && allWorkouts) {
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
      const lastWorkoutByUser: Record<string, string> = {}
      allWorkouts.forEach(w => {
        if (!lastWorkoutByUser[w.user_id] || w.created_at > lastWorkoutByUser[w.user_id]) {
          lastWorkoutByUser[w.user_id] = w.created_at
        }
      })
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', gymMembersData.map(m => m.user_id))
      const atRisk = gymMembersData.filter(m => {
        const last = lastWorkoutByUser[m.user_id]
        if (!last) return true
        return new Date(last) < fourteenDaysAgo
      }).map(m => ({
        ...m,
        full_name: profilesData?.find(p => p.id === m.user_id)?.full_name || 'Unknown',
        email: profilesData?.find(p => p.id === m.user_id)?.email || '',
        lastWorkout: lastWorkoutByUser[m.user_id] || null
      })).sort((a, b) => {
        if (!a.lastWorkout) return -1
        if (!b.lastWorkout) return 1
        return new Date(a.lastWorkout).getTime() - new Date(b.lastWorkout).getTime()
      })
      setAtRiskMembers(atRisk)

      // New member return rate — members who logged at least 2 sessions
      const sessionCountByUser: Record<string, number> = {}
      allWorkouts.forEach(w => {
        sessionCountByUser[w.user_id] = (sessionCountByUser[w.user_id] || 0) + 1
      })
      const totalMembers = gymMembersData.length
      const returned = gymMembersData.filter(m => (sessionCountByUser[m.user_id] || 0) >= 2).length
      setReturnRate(totalMembers > 0 ? Math.round((returned / totalMembers) * 100) : null)
    }

    setLoading(false)
  }

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
    <main className="min-h-screen flex items-center justify-center" style={{background: '#080808'}}>
      <p style={{color: '#6B5E55'}}>Loading analytics...</p>
    </main>
  )

  return (
    <main className="min-h-screen p-6" style={{background: '#080808'}}>
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <a href="/dashboard"><h1 className="text-2xl font-bold text-white"><span style={{fontWeight: 300}}>scan</span><span style={{color: '#C23B0A', fontWeight: 900}}>set</span></h1></a>
            <p className="text-xs mt-0.5" style={{color: '#6B5E55'}}>Gym Analytics</p>
          </div>
          <a href="/admin" className="text-sm" style={{color: '#6B5E55'}}>Admin</a>
        </div>

        {gyms.length > 1 && (
          <div className="mb-6">
            <label className="text-xs mb-2 block font-semibold tracking-widest uppercase" style={{color: '#6B5E55'}}>Viewing</label>
            <select
              value={selectedGymId}
              onChange={e => {
                setSelectedGymId(e.target.value)
                setGymName(gyms.find(g => g.id === e.target.value)?.name || '')
              }}
              className="w-full px-4 py-3 rounded-lg text-white focus:outline-none"
              style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}
            >
              {gyms.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-2xl p-4" style={{background: '#0F0F0F'}}>
            <p className="text-xs mb-1 uppercase tracking-widest" style={{color: '#6B5E55'}}>Total Members</p>
            <p className="text-3xl font-bold text-white">{totalMembers}</p>
          </div>
          <div className="rounded-2xl p-4" style={{background: '#0F0F0F'}}>
            <p className="text-xs mb-1 uppercase tracking-widest" style={{color: '#6B5E55'}}>Active This Week</p>
            <p className="text-3xl font-bold" style={{color: '#C23B0A'}}>{activeThisWeek}</p>
          </div>
          <div className="rounded-2xl p-4" style={{background: '#0F0F0F'}}>
            <p className="text-xs mb-1 uppercase tracking-widest" style={{color: '#6B5E55'}}>Workouts This Week</p>
            <p className="text-3xl font-bold" style={{color: '#C23B0A'}}>{totalWorkoutsThisWeek}</p>
          </div>
          <div className="rounded-2xl p-4" style={{background: '#0F0F0F'}}>
            <p className="text-xs mb-1 uppercase tracking-widest" style={{color: '#6B5E55'}}>Total Machines</p>
            <p className="text-3xl font-bold text-white">{machineStats.length}</p>
          </div>
        </div>

        {machineStats.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-2xl p-4" style={{background: '#0F0F0F', borderLeft: '3px solid #C23B0A'}}>
              <p className="text-xs mb-3 uppercase tracking-widest" style={{color: '#C23B0A'}}>Most Used</p>
              <div className="flex flex-col gap-3">
                {machineStats.slice(0, 3).map((m, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold w-4" style={{color: '#C23B0A'}}>#{i + 1}</span>
                      <p className="text-white text-sm font-medium">{m.name}</p>
                    </div>
                    <p className="text-xs font-semibold" style={{color: '#C23B0A'}}>{m.count}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl p-4" style={{background: '#0F0F0F', borderLeft: '3px solid #EF4444'}}>
              <p className="text-xs mb-3 uppercase tracking-widest" style={{color: '#EF4444'}}>Least Used</p>
              <div className="flex flex-col gap-3">
                {[...machineStats].reverse().slice(0, 3).map((m, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold w-4" style={{color: '#EF4444'}}>#{i + 1}</span>
                      <p className="text-white text-sm font-medium">{m.name}</p>
                    </div>
                    <p className="text-xs font-semibold" style={{color: '#EF4444'}}>{m.count}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl p-5 mb-4" style={{background: '#0F0F0F'}}>
          <p className="text-white font-semibold mb-4">Busiest Days</p>
          <div className="flex gap-1.5 items-end justify-between">
            {dayLabels.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                <p className="text-xs" style={{color: '#6B5E55'}}>{dayStats[i]}</p>
                <div
                  className="w-full rounded"
                  style={{
                    height: dayStats[i] === 0 ? '4px' : Math.max(4, dayStats[i] / maxDayCount * 60) + 'px',
                    background: i === todayIndex
                      ? '#C23B0A'
                      : dayStats[i] === Math.max(...dayStats)
                      ? '#C23B0A'
                      : '#1A1A1A'
                  }}
                />
                <p className="text-xs" style={{color: i === todayIndex ? '#C23B0A' : '#6B5E55'}}>{day}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-5 mb-6" style={{background: '#0F0F0F'}}>
          <p className="text-white font-semibold mb-4">Busiest Times</p>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Morning', sublabel: '5am – 11am', count: timeStats.morning, color: '#F59E0B' },
              { label: 'Afternoon', sublabel: '11am – 5pm', count: timeStats.afternoon, color: '#C23B0A' },
              { label: 'Evening', sublabel: '5pm – 10pm', count: timeStats.evening, color: '#8B5CF6' }
            ].map((slot, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-1">
                  <div>
                    <span className="text-white text-sm font-medium">{slot.label}</span>
                    <span className="text-xs ml-2" style={{color: '#6B5E55'}}>{slot.sublabel}</span>
                  </div>
                  <p className="text-xs font-semibold" style={{color: slot.color}}>{slot.count} sessions</p>
                </div>
                <div className="w-full rounded-full h-2" style={{background: '#080808'}}>
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

        {/* New Member Return Rate */}
        {returnRate !== null && (
          <div className="rounded-2xl p-5 mb-4" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{color: '#6B5E55'}}>Member Return Rate</p>
            <div className="flex justify-between items-end mb-3">
              <div>
                <p style={{fontSize: '36px', fontWeight: 800, color: '#E8E0D8', letterSpacing: '-2px', lineHeight: 1}}>
                  {returnRate}<span style={{fontSize: '20px', color: '#6B5E55'}}>%</span>
                </p>
                <p className="text-xs mt-1" style={{color: '#6B5E55'}}>of members logged 2+ sessions</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold" style={{color: returnRate >= 70 ? '#22C55E' : returnRate >= 40 ? '#F59E0B' : '#EF4444'}}>
                  {returnRate >= 70 ? '↑ Strong' : returnRate >= 40 ? '→ Average' : '↓ At risk'}
                </p>
              </div>
            </div>
            <div className="w-full rounded-full h-2" style={{background: '#1A1A1A'}}>
              <div className="h-2 rounded-full" style={{
                width: returnRate + '%',
                background: returnRate >= 70 ? '#22C55E' : returnRate >= 40 ? '#F59E0B' : '#EF4444'
              }}/>
            </div>
          </div>
        )}

        {/* At-Risk Members */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{background: '#0F0F0F'}}>
          <button
            onClick={() => setAtRiskOpen(prev => !prev)}
            className="w-full flex justify-between items-center p-5"
            style={{background: 'transparent', border: 'none', cursor: 'pointer'}}
          >
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg text-white">At-Risk Members</h2>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{background: atRiskMembers.length > 0 ? 'rgba(239,68,68,0.15)' : '#1A1A1A',
                  color: atRiskMembers.length > 0 ? '#EF4444' : '#6B5E55'}}>
                {atRiskMembers.length}
              </span>
            </div>
            <span style={{
              color: '#6B5E55', fontSize: '18px',
              transform: atRiskOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease', display: 'inline-block', lineHeight: 1
            }}>▾</span>
          </button>

          {atRiskOpen && (
            <div className="flex flex-col gap-2 px-5 pb-5">
              {atRiskMembers.length === 0 ? (
                <p className="text-sm py-2" style={{color: '#6B5E55'}}>All members active in the last 14 days. 🎉</p>
              ) : (
                <>
                  <p className="text-xs mb-2" style={{color: '#6B5E55'}}>No workout logged in 14+ days</p>
                  {atRiskMembers.map((m, i) => (
                    <div key={i} className="flex justify-between items-center px-4 py-3 rounded-xl"
                      style={{background: '#080808', borderLeft: '2px solid #EF4444'}}>
                      <div>
                        <p className="text-white text-sm font-semibold">{m.full_name}</p>
                        <p className="text-xs" style={{color: '#6B5E55'}}>{m.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold" style={{color: '#EF4444'}}>
                          {m.lastWorkout ? daysSince(m.lastWorkout) : 'Never logged'}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl overflow-hidden mb-6" style={{background: '#0F0F0F'}}>
          <button
            onClick={() => setMembersOpen(prev => !prev)}
            className="w-full flex justify-between items-center p-5"
            style={{background: 'transparent', border: 'none', cursor: 'pointer'}}
          >
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg text-white">Equipment Usage</h2>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{background: '#1A1A1A', color: '#6B5E55'}}>
                {machineStats.length}
              </span>
            </div>
            <span style={{
              color: '#6B5E55',
              fontSize: '18px',
              transform: equipmentOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              display: 'inline-block',
              lineHeight: 1
            }}>▾</span>
          </button>

          {equipmentOpen && (
            <div className="flex flex-col gap-3 px-5 pb-5">
              {machineStats.map((machine, i) => {
                  const daysSinceUse = machine.lastUsed
                    ? Math.floor((new Date().getTime() - new Date(machine.lastUsed).getTime()) / (1000 * 60 * 60 * 24))
                    : 999
                  const isUnused = daysSinceUse >= 30
                  console.log(machine.name, 'purchase_price:', machine.purchase_price, 'count:', machine.count)
                  const costPerUse = machine.purchase_price && machine.count > 0
                    ? (machine.purchase_price / machine.count).toFixed(2)
                    : null
                  return (
                    <div key={i} className="rounded-xl p-4" style={{
                      background: '#080808',
                      border: isUnused ? '1px solid rgba(239,68,68,0.3)' : 'none'
                    }}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <p className="text-white text-sm font-medium">{machine.name}</p>
                          {isUnused && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                              style={{background: 'rgba(239,68,68,0.15)', color: '#EF4444'}}>
                              Unused 30d+
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold" style={{color: isUnused ? '#EF4444' : '#C23B0A'}}>{machine.count} sessions</p>
                          <p className="text-xs" style={{color: '#6B5E55'}}>{daysSince(machine.lastUsed)}</p>
                        </div>
                      </div>
                      <div className="w-full rounded-full h-1.5 mb-2" style={{background: '#1A1A1A'}}>
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: machine.count === 0 ? '2%' : (machine.count / maxCount * 100) + '%',
                            background: isUnused ? '#EF4444' : 'linear-gradient(90deg, #C23B0A, #C23B0A)'
                          }}
                        />
                      </div>
                      {costPerUse && (
                        <p className="text-xs" style={{color: '#6B5E55'}}>
                          Cost per session: <span style={{color: '#E8E0D8', fontWeight: 600}}>${costPerUse}</span>
                          <span style={{color: '#6B5E55'}}> (${machine.purchase_price?.toLocaleString()} purchase)</span>
                        </p>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </div>
        <div className="rounded-2xl overflow-hidden mb-6" style={{background: '#0F0F0F'}}>
          <button
            onClick={() => setMembersOpen(prev => !prev)}
            className="w-full flex justify-between items-center p-5"
            style={{background: 'transparent', border: 'none', cursor: 'pointer'}}
          >
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg text-white">Members</h2>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{background: '#1A1A1A', color: '#6B5E55'}}>
                {members.length}
              </span>
            </div>
            <span style={{
              color: '#6B5E55',
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
                <p className="text-center py-4" style={{color: '#6B5E55'}}>No members yet.</p>
              ) : (
                members.map((m, i) => (
                  <div key={i} className="flex justify-between items-center px-4 py-3 rounded-xl" style={{background: '#080808'}}>
                    <div>
                      <p className="text-white text-sm font-semibold">{m.full_name}</p>
                      <p className="text-xs" style={{color: '#6B5E55'}}>{m.email}</p>
                    </div>
                    <p className="text-xs" style={{color: '#6B5E55'}}>
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