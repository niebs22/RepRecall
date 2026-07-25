'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function AnalyticsV2() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'equipment'>('overview')
  const [gyms, setGyms] = useState<any[]>([])
  const [selectedGymId, setSelectedGymId] = useState<string>('')
  const [gymName, setGymName] = useState('')
  const [totalMembers, setTotalMembers] = useState(0)
  const [activeThisWeek, setActiveThisWeek] = useState(0)
  const [totalWorkoutsThisWeek, setTotalWorkoutsThisWeek] = useState(0)
  const [totalWorkoutsAllTime, setTotalWorkoutsAllTime] = useState(0)
  const [daysLive, setDaysLive] = useState(0)
  const [machineStats, setMachineStats] = useState<any[]>([])
  const [dayStats, setDayStats] = useState<number[]>([0,0,0,0,0,0,0])
  const [timeStats, setTimeStats] = useState({morning: 0, afternoon: 0, evening: 0})
  const [members, setMembers] = useState<any[]>([])
  const [atRiskMembers, setAtRiskMembers] = useState<any[]>([])
 const [fourWeekTrend, setFourWeekTrend] = useState<{label: string, count: number}[]>([])
  const [champions, setChampions] = useState<any[]>([])
  const [spotlight, setSpotlight] = useState<{name: string, count: number, distinctUsers: number} | null>(null)
  const [newMemberGrowth, setNewMemberGrowth] = useState<{label: string, count: number}[]>([])
  const [activationFunnel, setActivationFunnel] = useState<{label: string, count: number, color: string}[]>([])
  const [returnRate, setReturnRate] = useState<number | null>(null)
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
        const { data } = await supabase
          .from('gyms').select('*').order('name', { ascending: true })
        ownedGyms = data || []
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
    setTotalWorkoutsAllTime(allWorkouts?.length || 0)

    const spotlightMap: Record<string, { name: string, count: number, userIds: Set<string> }> = {}
    weekWorkouts?.forEach((w: any) => {
      const name = w.machines?.name || 'Unknown'
      if (!spotlightMap[w.machine_id]) spotlightMap[w.machine_id] = { name, count: 0, userIds: new Set() }
      spotlightMap[w.machine_id].count++
      spotlightMap[w.machine_id].userIds.add(w.user_id)
    })
    const spotlightEntries = Object.values(spotlightMap).sort((a, b) => b.count - a.count)
    setSpotlight(spotlightEntries[0]
      ? { name: spotlightEntries[0].name, count: spotlightEntries[0].count, distinctUsers: spotlightEntries[0].userIds.size }
      : null)

    const gymRecord = gyms.find(g => g.id === gymId)
    if (gymRecord?.created_at) {
      const diffMs = now.getTime() - new Date(gymRecord.created_at).getTime()
      setDaysLive(Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    }

    const trendWeeks = [3, 2, 1, 0].map(w => {
      const start = new Date(monday)
      start.setDate(monday.getDate() - w * 7)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      const label = w === 0 ? 'This week' : w === 1 ? 'Last week' : `${w + 1} wks ago`
      const count = allWorkouts?.filter(wo => {
        const d = new Date(wo.created_at)
        return d >= start && d <= end
      }).length || 0
      return { label, count }
    })
    setFourWeekTrend(trendWeeks)

    const usageMap: Record<string, { name: string, count: number, lastUsed: string | null, userIds: Set<string> }> = {}
    machines?.forEach(m => {
      usageMap[m.id] = { name: m.name, count: 0, lastUsed: null, userIds: new Set() }
    })
    allWorkouts?.forEach(w => {
      if (usageMap[w.machine_id]) {
        usageMap[w.machine_id].count++
        usageMap[w.machine_id].userIds.add(w.user_id)
        if (!usageMap[w.machine_id].lastUsed || w.created_at > usageMap[w.machine_id].lastUsed!) {
          usageMap[w.machine_id].lastUsed = w.created_at
        }
      }
    })
    const totalMembersForUtilization = gymMembersData?.length || 0
    const stats = Object.entries(usageMap).map(([machineId, stat]) => {
      const machine = machines?.find(m => m.id === machineId)
      const utilizationPct = totalMembersForUtilization > 0
        ? Math.round((stat.userIds.size / totalMembersForUtilization) * 100)
        : 0
      return { name: stat.name, count: stat.count, lastUsed: stat.lastUsed, purchase_price: machine?.purchase_price || null, utilizationPct }
    }).sort((a, b) => b.count - a.count)
    setMachineStats(stats)

    const gymTimezone = gyms.find(g => g.id === gymId)?.timezone || 'America/New_York'

    const days = [0,0,0,0,0,0,0]
    allWorkouts?.forEach(w => {
      const localDay = new Date(w.created_at.endsWith('Z') ? w.created_at : w.created_at + 'Z').toLocaleDateString('en-US', {
        weekday: 'short', timeZone: gymTimezone
      })
      const dayMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
      const adjusted = dayMap[localDay]
      if (adjusted !== undefined) days[adjusted]++
    })
    setDayStats(days)

    const times = { morning: 0, afternoon: 0, evening: 0 }
    allWorkouts?.forEach(w => {
      const hour = parseInt(new Date(w.created_at.endsWith('Z') ? w.created_at : w.created_at + 'Z').toLocaleTimeString('en-US', {
        hour: 'numeric', hour12: false, timeZone: gymTimezone
      }))
      if (hour >= 5 && hour < 11) times.morning++
      else if (hour >= 11 && hour < 17) times.afternoon++
      else if (hour >= 17 && hour < 22) times.evening++
    })
    setTimeStats(times)

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

      const sessionCountByUser: Record<string, number> = {}
      allWorkouts.forEach(w => {
        sessionCountByUser[w.user_id] = (sessionCountByUser[w.user_id] || 0) + 1
      })
      const totalMembersCount = gymMembersData.length
      const returned = gymMembersData.filter(m => (sessionCountByUser[m.user_id] || 0) >= 2).length
      setReturnRate(totalMembersCount > 0 ? Math.round((returned / totalMembersCount) * 100) : null)

      const championsList = gymMembersData
        .map(m => ({
          user_id: m.user_id,
          full_name: profilesData?.find(p => p.id === m.user_id)?.full_name || 'Unknown',
          count: sessionCountByUser[m.user_id] || 0,
          lastDate: lastWorkoutByUser[m.user_id] || null
        }))
        .filter(c => c.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
      setChampions(championsList)

      const championCount = gymMembersData.filter(m => (sessionCountByUser[m.user_id] || 0) >= 5).length
      const returningCount = gymMembersData.filter(m => {
        const c = sessionCountByUser[m.user_id] || 0
        return c >= 2 && c < 5
      }).length
      const triedOnceCount = gymMembersData.filter(m => (sessionCountByUser[m.user_id] || 0) === 1).length
      const readyCount = gymMembersData.filter(m => (sessionCountByUser[m.user_id] || 0) === 0).length
      setActivationFunnel([
        { label: 'Champions', count: championCount, color: colors.teal },
        { label: 'Returning', count: returningCount, color: colors.purple },
        { label: 'Tried Once', count: triedOnceCount, color: colors.ember },
        { label: 'Ready to Start', count: readyCount, color: colors.muted },
      ])

      const growthWeeks = [3, 2, 1, 0].map(w => {
        const start = new Date(monday)
        start.setDate(monday.getDate() - w * 7)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        const label = w === 0 ? 'This week' : w === 1 ? 'Last week' : `${w + 1} wks ago`
        const count = gymMembersData.filter(m => {
          const d = new Date(m.created_at)
          return d >= start && d <= end
        }).length
        return { label, count }
      })
      setNewMemberGrowth(growthWeeks)
    }

    setLoading(false)
  }

  function daysSince(date: string | null) {
    if (!date) return 'Never'
    const diffMs = new Date().getTime() - new Date(date.endsWith('Z') ? date : date + 'Z').getTime()
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
  const neverScanned = machineStats.filter(m => m.count === 0)

  const colors = {
    bg: '#080808', card: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)',
    border: '#222222', ember: '#E8440C', purple: '#9B6DFF', teal: '#00C4B4',
    text: '#F0EBE6', secondary: '#B0A89F', muted: '#6B5E55'
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{background: colors.bg}}>
      <p style={{color: colors.muted}}>Loading analytics...</p>
    </main>
  )

  return (
    <main className="min-h-screen p-6" style={{background: colors.bg, color: colors.text, fontFamily: "'DM Sans', sans-serif"}}>
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <a href="/dashboard"><h1 className="text-2xl font-bold"><span style={{fontWeight: 300}}>scan</span><span style={{color: colors.ember, fontWeight: 900}}>set</span></h1></a>
            <p className="text-xs mt-0.5" style={{color: colors.muted}}>Gym Analytics{gymName ? ' — ' + gymName : ''}</p>
          </div>
          <a href="/admin" className="text-sm" style={{color: colors.muted}}>Admin</a>
        </div>

        {gyms.length > 1 && (
          <div className="mb-6">
            <select
              value={selectedGymId}
              onChange={e => {
                setSelectedGymId(e.target.value)
                setGymName(gyms.find(g => g.id === e.target.value)?.name || '')
              }}
              className="w-full px-4 py-3 rounded-lg focus:outline-none"
              style={{background: colors.card, border: `1px solid ${colors.border}`, color: colors.text}}
            >
              {gyms.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* TAB BAR */}
        <div className="flex gap-1.5 p-1 rounded-full mb-6" style={{background: '#111111', border: `1px solid ${colors.border}`}}>
          {(['overview', 'members', 'equipment'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 rounded-full text-xs font-bold capitalize transition-colors"
              style={{
                background: activeTab === tab ? colors.card : 'transparent',
                color: activeTab === tab ? (tab === 'members' ? colors.purple : tab === 'equipment' ? colors.teal : colors.text) : colors.muted,
                border: activeTab === tab ? `1px solid ${colors.border}` : '1px solid transparent'
              }}>
              {tab}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl p-5 relative overflow-hidden" style={{background: 'linear-gradient(180deg, #0E0E14 0%, #080810 100%)', border: `1px solid ${colors.border}`}}>
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{color: colors.muted, letterSpacing: '2px'}}>Gym Snapshot</p>
              <p style={{fontSize: '15px', fontWeight: 700, color: colors.text}}>
                {totalWorkoutsAllTime} workouts logged{daysLive > 0 ? ` in ${daysLive} days` : ''}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {fourWeekTrend.map((week, i) => {
                  const max = Math.max(...fourWeekTrend.map(w => w.count), 1)
                  const isCurrent = i === fourWeekTrend.length - 1
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-medium" style={{color: isCurrent ? colors.ember : colors.secondary, minWidth: '64px', fontWeight: isCurrent ? 700 : 500}}>{week.label}</span>
                      <div className="flex-1 rounded-full h-2" style={{background: '#111'}}>
                        <div className="h-2 rounded-full" style={{
                          width: (week.count === 0 ? 2 : (week.count / max) * 100) + '%',
                          background: isCurrent ? `linear-gradient(90deg, ${colors.ember}, ${colors.purple})` : colors.border
                        }} />
                      </div>
                      <span className="text-xs font-bold" style={{color: isCurrent ? colors.ember : colors.secondary, minWidth: '28px', textAlign: 'right'}}>{week.count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{color: colors.muted, letterSpacing: '2.5px'}}>Key Numbers</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: totalWorkoutsAllTime, label: 'Total Workouts', accent: colors.ember, sub: `${totalWorkoutsThisWeek} this week` },
                  { val: totalMembers, label: 'Total Members', accent: colors.teal, sub: `${activeThisWeek} active this week` },
                  { val: activeThisWeek, label: 'Active This Week', accent: colors.purple, sub: 'of ' + totalMembers + ' members' },
                  { val: daysLive, label: 'Days Live', accent: colors.ember, sub: gymName || '' },
                ].map((tile, i) => (
                  <div key={i} className="rounded-2xl p-4 relative overflow-hidden" style={{background: colors.card, border: `1px solid ${colors.border}`}}>
                    <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${tile.accent}, transparent)`}} />
                    <p style={{fontSize: '30px', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1, color: tile.accent, marginTop: '4px'}}>{tile.val}</p>
                    <p className="text-[10px] font-semibold uppercase mt-2" style={{color: colors.secondary, letterSpacing: '1.5px'}}>{tile.label}</p>
                    <p className="text-xs mt-1.5" style={{color: colors.muted}}>{tile.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {spotlight && (
              <div className="rounded-2xl p-5 flex items-center justify-between" style={{background: colors.card, border: `1px solid ${colors.border}`}}>
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{color: colors.muted}}>This Week's Spotlight</p>
                  <p className="font-black" style={{fontSize: '20px'}}>{spotlight.name}</p>
                  <p className="text-xs mt-1" style={{color: colors.secondary}}>
                    Scanned by {spotlight.distinctUsers} different member{spotlight.distinctUsers === 1 ? '' : 's'} this week
                  </p>
                </div>
                <div className="text-right">
                  <p style={{fontSize: '40px', fontWeight: 900, color: colors.ember, letterSpacing: '-2px', lineHeight: 1}}>{spotlight.count}</p>
                  <p className="text-xs mt-1" style={{color: colors.muted}}>times this week</p>
                </div>
              </div>
            )}

            <div className="rounded-2xl p-5" style={{background: 'linear-gradient(180deg, #0A0E12 0%, #060A0F 100%)', border: '1px solid rgba(0,196,180,0.15)'}}>
              <div className="flex justify-between items-center mb-3">
                <p className="font-bold text-sm">Your Champions</p>
                <span className="text-xs font-semibold" style={{color: colors.teal}}>Most Loyal Members</span>
              </div>
              {champions.length === 0 ? (
                <p className="text-sm" style={{color: colors.muted}}>No sessions logged yet.</p>
              ) : (
                champions.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl p-3 mb-2" style={{background: 'rgba(0,196,180,0.04)', border: '1px solid rgba(0,196,180,0.08)'}}>
                    <span className="text-xs font-black" style={{color: colors.teal, minWidth: '20px'}}>{String(i + 1).padStart(2, '0')}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{c.full_name}</p>
                      <p className="text-xs mt-0.5" style={{color: colors.muted}}>{daysSince(c.lastDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" style={{fontSize: '20px', color: colors.teal, lineHeight: 1}}>{c.count}</p>
                      <p className="text-[9px] uppercase font-semibold" style={{color: colors.muted, letterSpacing: '1px'}}>Sessions</p>
                    </div>
                  </div>
                ))
              )}
              {champions.length > 3 && (
                <div className="text-center mt-2">
                  <button onClick={() => setActiveTab('members')} className="text-xs font-bold" style={{color: colors.teal, background: 'none', border: 'none', cursor: 'pointer'}}>
                    View all champions →
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl p-5 relative overflow-hidden" style={{background: 'linear-gradient(180deg, #0E0E14 0%, #080810 100%)', border: '1px solid rgba(155,109,255,0.2)'}}>
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{color: colors.muted}}>Equipment Intelligence</p>
              {neverScanned.length > 0 && (
                <div className="flex justify-between items-center rounded-xl p-3 mb-3" style={{background: 'rgba(232,68,12,0.08)', border: '1px solid rgba(232,68,12,0.2)'}}>
                  <div>
                    <p style={{fontSize: '28px', fontWeight: 900, color: colors.ember, lineHeight: 1}}>{neverScanned.length}</p>
                    <p className="text-xs mt-1" style={{color: colors.secondary}}>machines never scanned</p>
                  </div>
                </div>
              )}
              {machineStats.slice(0, 1).map((m, i) => {
                const costPerUse = m.purchase_price && m.count > 0 ? (m.purchase_price / m.count).toFixed(2) : null
                return (
                  <div key={i} className="rounded-xl p-3" style={{background: '#0A0A0C', border: `1px solid ${colors.border}`}}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm">{m.name}</p>
                        <p className="text-xs mt-0.5" style={{color: colors.muted}}>{daysSince(m.lastUsed)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold" style={{color: colors.ember}}>{m.count} sessions</p>
                        {costPerUse && <p className="text-xs font-semibold" style={{color: colors.teal}}>${costPerUse} / session</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="text-center mt-3">
                <button onClick={() => setActiveTab('equipment')} className="text-xs font-bold" style={{color: colors.purple, background: 'none', border: 'none', cursor: 'pointer'}}>
                  View all {machineStats.length} machines →
                </button>
              </div>
            </div>

            <div className="rounded-2xl p-5" style={{background: 'linear-gradient(180deg, #08100E 0%, #050B0A 100%)', border: '1px solid rgba(0,196,180,0.15)'}}>
              <div className="flex justify-between items-center mb-3">
                <p className="font-bold text-sm">Ready to Engage</p>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{background: 'rgba(0,196,180,0.08)', border: '1px solid rgba(0,196,180,0.2)', color: colors.teal}}>
                  {atRiskMembers.length} members
                </span>
              </div>
              {atRiskMembers.slice(0, 3).map((m, i) => (
                <div key={i} className="flex justify-between items-center rounded-xl p-3 mb-2" style={{background: 'rgba(0,196,180,0.04)', border: '1px solid rgba(0,196,180,0.08)'}}>
                  <div>
                    <p className="text-sm font-semibold">{m.full_name}</p>
                    <p className="text-xs mt-0.5" style={{color: colors.muted}}>{m.lastWorkout ? 'Last active ' + daysSince(m.lastWorkout) : 'Never scanned a machine'}</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{color: colors.teal, background: 'rgba(0,196,180,0.08)', border: '1px solid rgba(0,196,180,0.2)'}}>
                    {m.lastWorkout ? 'Re-engage' : 'Nudge'}
                  </span>
                </div>
              ))}
              {atRiskMembers.length > 3 && (
                <div className="text-center mt-2">
                  <button onClick={() => setActiveTab('members')} className="text-xs font-bold" style={{color: colors.teal, background: 'none', border: 'none', cursor: 'pointer'}}>
                    View all {atRiskMembers.length} →
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl p-5" style={{background: colors.card, border: `1px solid ${colors.border}`}}>
              <p className="font-bold text-sm mb-4">Busiest Days</p>
              <div className="flex gap-1.5 items-end justify-between" style={{height: '80px'}}>
                {dayLabels.map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                    <p className="text-xs" style={{color: colors.muted}}>{dayStats[i]}</p>
                    <div className="w-full rounded" style={{
                      height: dayStats[i] === 0 ? '4px' : Math.max(4, (dayStats[i] / maxDayCount) * 56) + 'px',
                      background: (i === todayIndex || dayStats[i] === Math.max(...dayStats)) ? colors.ember : colors.border
                    }} />
                    <p className="text-xs" style={{color: i === todayIndex ? colors.ember : colors.muted}}>{day}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-5" style={{background: colors.card, border: `1px solid ${colors.border}`}}>
              <p className="font-bold text-sm mb-4">When Members Train</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Morning', sub: '5am – 11am', count: timeStats.morning, color: colors.ember },
                  { label: 'Afternoon', sub: '11am – 5pm', count: timeStats.afternoon, color: colors.purple },
                  { label: 'Evening', sub: '5pm – 10pm', count: timeStats.evening, color: colors.teal }
                ].map((slot, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <span className="text-sm font-medium">{slot.label}</span>
                        <span className="text-xs ml-2" style={{color: colors.muted}}>{slot.sub}</span>
                      </div>
                      <p className="text-xs font-semibold" style={{color: slot.color}}>{slot.count} sessions</p>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{background: colors.bg}}>
                      <div className="h-1.5 rounded-full" style={{
                        width: (slot.count === 0 ? 2 : (slot.count / maxTimeCount) * 100) + '%',
                        background: slot.color
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl p-5" style={{background: 'linear-gradient(180deg, #0A0E12 0%, #060A0F 100%)', border: '1px solid rgba(0,196,180,0.15)'}}>
              <div className="flex justify-between items-center mb-3">
                <p className="font-bold text-sm">Your Champions</p>
                <span className="text-xs font-semibold" style={{color: colors.teal}}>Most Loyal Members</span>
              </div>
              {champions.length === 0 ? (
                <p className="text-sm" style={{color: colors.muted}}>No sessions logged yet.</p>
              ) : (
                champions.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl p-3 mb-2" style={{background: 'rgba(0,196,180,0.04)', border: '1px solid rgba(0,196,180,0.08)'}}>
                    <span className="text-xs font-black" style={{color: colors.teal, minWidth: '20px'}}>{String(i + 1).padStart(2, '0')}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{c.full_name}</p>
                      <p className="text-xs mt-0.5" style={{color: colors.muted}}>{daysSince(c.lastDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" style={{fontSize: '20px', color: colors.teal, lineHeight: 1}}>{c.count}</p>
                      <p className="text-[9px] uppercase font-semibold" style={{color: colors.muted, letterSpacing: '1px'}}>Sessions</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {newMemberGrowth.some(w => w.count > 0) && (
              <div className="rounded-2xl p-5" style={{background: colors.card, border: `1px solid ${colors.border}`}}>
                <p className="font-bold text-sm mb-4">New Member Growth</p>
                <div className="flex gap-1.5 items-end justify-between" style={{height: '70px'}}>
                  {newMemberGrowth.map((week, i) => {
                    const max = Math.max(...newMemberGrowth.map(w => w.count), 1)
                    const isCurrent = i === newMemberGrowth.length - 1
                    return (
                      <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                        <p className="text-xs font-bold" style={{color: isCurrent ? colors.teal : colors.muted}}>{week.count}</p>
                        <div className="w-full rounded" style={{
                          height: week.count === 0 ? '4px' : Math.max(4, (week.count / max) * 40) + 'px',
                          background: isCurrent ? colors.teal : colors.border
                        }} />
                        <p className="text-center" style={{color: isCurrent ? colors.teal : colors.muted, fontSize: '9px', lineHeight: 1.2}}>{week.label}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activationFunnel.length > 0 && (
              <div className="rounded-2xl p-5" style={{background: colors.card, border: `1px solid ${colors.border}`}}>
                <p className="font-bold text-sm mb-4">Member Activation</p>
                <div className="flex flex-col gap-3">
                  {activationFunnel.map((seg, i) => {
                    const max = Math.max(...activationFunnel.map(s => s.count), 1)
                    return (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">{seg.label}</span>
                          <p className="text-xs font-semibold" style={{color: seg.color}}>{seg.count} member{seg.count === 1 ? '' : 's'}</p>
                        </div>
                        <div className="w-full rounded-full h-1.5" style={{background: colors.bg}}>
                          <div className="h-1.5 rounded-full" style={{
                            width: (seg.count === 0 ? 2 : (seg.count / max) * 100) + '%',
                            background: seg.color
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {returnRate !== null && (
              <div className="rounded-2xl p-5" style={{background: colors.card, border: `1px solid ${colors.border}`}}>
                <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{color: colors.muted}}>Member Return Rate</p>
                <p style={{fontSize: '36px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1}}>
                  {returnRate}<span style={{fontSize: '18px', color: colors.muted}}>%</span>
                </p>
                <p className="text-xs mt-1.5" style={{color: colors.muted}}>of members logged 2+ sessions</p>
                <div className="w-full rounded-full h-1.5 mt-3" style={{background: colors.border}}>
                  <div className="h-1.5 rounded-full" style={{width: returnRate + '%', background: colors.purple}} />
                </div>
              </div>
            )}

            <div className="rounded-2xl p-5" style={{background: 'linear-gradient(180deg, #08100E 0%, #050B0A 100%)', border: '1px solid rgba(0,196,180,0.15)'}}>
              <div className="flex justify-between items-center mb-3">
                <p className="font-bold text-sm">Ready to Engage</p>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{background: 'rgba(0,196,180,0.08)', border: '1px solid rgba(0,196,180,0.2)', color: colors.teal}}>
                  {atRiskMembers.length} members
                </span>
              </div>
              {atRiskMembers.length === 0 ? (
                <p className="text-sm" style={{color: colors.muted}}>All members active in the last 14 days.</p>
              ) : (
                atRiskMembers.map((m, i) => (
                  <div key={i} className="flex justify-between items-center rounded-xl p-3 mb-2" style={{background: 'rgba(0,196,180,0.04)', border: '1px solid rgba(0,196,180,0.08)'}}>
                    <div>
                      <p className="text-sm font-semibold">{m.full_name}</p>
                      <p className="text-xs mt-0.5" style={{color: colors.muted}}>{m.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold" style={{color: colors.teal}}>
                        {m.lastWorkout ? daysSince(m.lastWorkout) : 'Never logged'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-2xl p-5" style={{background: colors.card, border: `1px solid ${colors.border}`}}>
              <div className="flex justify-between items-center mb-3">
                <p className="font-bold text-sm">All Members</p>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{background: colors.border, color: colors.muted}}>{members.length}</span>
              </div>
              {members.map((m, i) => (
                <div key={i} className="flex justify-between items-center py-2.5" style={{borderBottom: i < members.length - 1 ? `1px solid ${colors.border}` : 'none'}}>
                  <div>
                    <p className="text-sm font-semibold">{m.full_name}</p>
                    <p className="text-xs" style={{color: colors.muted}}>{m.email}</p>
                  </div>
                  <p className="text-xs" style={{color: colors.muted}}>
                    {new Date(m.created_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EQUIPMENT TAB */}
        {activeTab === 'equipment' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl p-5" style={{background: 'linear-gradient(180deg, #0E0E14 0%, #080810 100%)', border: '1px solid rgba(155,109,255,0.2)'}}>
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{color: colors.muted}}>Equipment Intelligence</p>
              {neverScanned.length > 0 && (
                <div className="flex justify-between items-center rounded-xl p-3 mb-3" style={{background: 'rgba(232,68,12,0.08)', border: '1px solid rgba(232,68,12,0.2)'}}>
                  <div>
                    <p style={{fontSize: '28px', fontWeight: 900, color: colors.ember, lineHeight: 1}}>{neverScanned.length}</p>
                    <p className="text-xs mt-1" style={{color: colors.secondary}}>machines never scanned</p>
                  </div>
                  <p className="text-xs font-semibold text-right" style={{color: colors.ember, maxWidth: '140px'}}>Consider signage or promoting these to members.</p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {machineStats.map((m, i) => {
                  const costPerUse = m.purchase_price && m.count > 0 ? (m.purchase_price / m.count).toFixed(2) : null
                  const isUnused = m.count === 0
                  return (
                    <div key={i} className="rounded-xl p-3" style={{background: '#0A0A0C', border: isUnused ? '1px solid rgba(232,68,12,0.1)' : `1px solid ${colors.border}`}}>
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="font-bold text-sm">{m.name}</p>
                          <p className="text-xs mt-0.5" style={{color: colors.muted}}>{daysSince(m.lastUsed)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{color: isUnused ? colors.secondary : colors.ember}}>{m.count} sessions</p>
                          {costPerUse && <p className="text-xs font-semibold" style={{color: colors.teal}}>${costPerUse} / session</p>}
                        </div>
                      </div>
                      <div className="w-full rounded-full h-1" style={{background: '#111'}}>
                        <div className="h-1 rounded-full" style={{
                          width: (m.count === 0 ? 2 : (m.count / maxCount) * 100) + '%',
                          background: isUnused ? 'rgba(232,68,12,0.3)' : colors.ember
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl p-5" style={{background: colors.card, border: `1px solid ${colors.border}`}}>
              <p className="font-bold text-sm mb-4">Busiest Days</p>
              <div className="flex gap-1.5 items-end justify-between" style={{height: '80px'}}>
                {dayLabels.map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                    <p className="text-xs" style={{color: colors.muted}}>{dayStats[i]}</p>
                    <div className="w-full rounded" style={{
                      height: dayStats[i] === 0 ? '4px' : Math.max(4, (dayStats[i] / maxDayCount) * 56) + 'px',
                      background: (i === todayIndex || dayStats[i] === Math.max(...dayStats)) ? colors.ember : colors.border
                    }} />
                    <p className="text-xs" style={{color: i === todayIndex ? colors.ember : colors.muted}}>{day}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-5" style={{background: colors.card, border: `1px solid ${colors.border}`}}>
              <p className="font-bold text-sm mb-4">When Members Train</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Morning', sub: '5am – 11am', count: timeStats.morning, color: colors.ember },
                  { label: 'Afternoon', sub: '11am – 5pm', count: timeStats.afternoon, color: colors.purple },
                  { label: 'Evening', sub: '5pm – 10pm', count: timeStats.evening, color: colors.teal }
                ].map((slot, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <span className="text-sm font-medium">{slot.label}</span>
                        <span className="text-xs ml-2" style={{color: colors.muted}}>{slot.sub}</span>
                      </div>
                      <p className="text-xs font-semibold" style={{color: slot.color}}>{slot.count} sessions</p>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{background: colors.bg}}>
                      <div className="h-1.5 rounded-full" style={{
                        width: (slot.count === 0 ? 2 : (slot.count / maxTimeCount) * 100) + '%',
                        background: slot.color
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}