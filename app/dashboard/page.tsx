'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [machineWorkouts, setMachineWorkouts] = useState<any[]>([])
  const [allMachines, setAllMachines] = useState<any[]>([])
  const [weekActivity, setWeekActivity] = useState<boolean[]>([false, false, false, false, false, false, false])
  const [totalThisWeek, setTotalThisWeek] = useState(0)
  const [lastWeekTotal, setLastWeekTotal] = useState(0)
  const router = useRouter()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        fetchProfile(user.id)
        fetchMachineWorkouts(user.id)
        fetchAllMachines()
        fetchWeekActivity(user.id)
      }
    }
    getUser()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data)
  }

  async function fetchMachineWorkouts(userId: string) {
    const { data } = await supabase
      .from('workouts')
      .select('*, machines(name, type)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) {
      const seen = new Set()
      const grouped = data.filter(workout => {
        if (seen.has(workout.machine_id)) return false
        seen.add(workout.machine_id)
        return true
      })
      setMachineWorkouts(grouped)
    }
  }

  async function fetchAllMachines() {
    const { data } = await supabase
      .from('machines')
      .select('*')
      .order('name', { ascending: true })
    if (data) setAllMachines(data)
  }

  async function fetchWeekActivity(userId: string) {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)

    const lastMonday = new Date(monday)
    lastMonday.setDate(monday.getDate() - 7)

    const { data } = await supabase
      .from('workouts')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', lastMonday.toISOString())

    if (data) {
      const thisWeek = data.filter(w => new Date(w.created_at) >= monday)
      const lastWeek = data.filter(w => new Date(w.created_at) < monday)

      const activeDays = new Set<number>()
      thisWeek.forEach(w => {
        const day = new Date(w.created_at).getDay()
        const adjusted = day === 0 ? 6 : day - 1
        activeDays.add(adjusted)
      })
      const lastWeekDays = new Set<number>()
      lastWeek.forEach(w => {
        const day = new Date(w.created_at).getDay()
        const adjusted = day === 0 ? 6 : day - 1
        lastWeekDays.add(adjusted)
      })

      const week = [0,1,2,3,4,5,6].map(d => activeDays.has(d))
      setWeekActivity(week)
      setTotalThisWeek(activeDays.size)
      setLastWeekTotal(lastWeekDays.size)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function handleMachineSelect(e: any) {
    const id = e.target.value
    if (id) router.push('/machine/' + id)
  }

  function daysSince(date: string) {
    const now = new Date()
    const past = new Date(date)
    const diffMs = now.getTime() - past.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return diffDays + ' days ago'
  }

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  function getFirstName() {
    const fullName = profile?.full_name || user?.user_metadata?.full_name || ''
    return fullName.split(' ')[0] || 'there'
  }

  function formatWorkoutSummary(workout: any) {
    const type = workout.machines?.type
    if (type === 'cardio') {
      const parts = []
      if (workout.duration) parts.push(workout.duration + ' min')
      if (workout.distance) parts.push(workout.distance + ' mi')
      return parts.join(' · ')
    }
    const parts = []
    if (workout.sets) parts.push(workout.sets + ' sets')
    if (workout.weight) parts.push(workout.weight + ' lbs')
    return parts.join(' · ')
  }

  function getWeekTrend() {
    if (lastWeekTotal === 0 && totalThisWeek === 0) return null
    if (lastWeekTotal === 0) return { label: 'New this week', color: '#22C55E' }
    const diff = totalThisWeek - lastWeekTotal
    if (diff > 0) return { label: `↑ ${diff} day${diff > 1 ? 's' : ''} vs last week`, color: '#22C55E' }
    if (diff < 0) return { label: `↓ ${Math.abs(diff)} day${Math.abs(diff) > 1 ? 's' : ''} vs last week`, color: '#EF4444' }
    return { label: 'Same as last week', color: '#64748B' }
  }

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const today = new Date().getDay()
  const todayIndex = today === 0 ? 6 : today - 1
  const trend = getWeekTrend()

  return (
    <main className="min-h-screen p-6" style={{background: '#0A1628'}}>
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Rep<span style={{color: '#2563EB'}}>Recall</span></h1>
          <div className="flex items-center gap-4">
            <a href="/admin" className="text-sm" style={{color: '#64748B'}}>Admin</a>
            <button onClick={handleLogout} className="text-sm" style={{color: '#64748B'}}>Log Out</button>
          </div>
        </div>

        {/* Welcome */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">{getGreeting()}, {getFirstName()} 👋</h2>
          <p className="text-sm mt-1" style={{color: '#64748B'}}>
            {totalThisWeek === 0
              ? "You haven't trained yet this week."
              : `You've trained ${totalThisWeek} day${totalThisWeek > 1 ? 's' : ''} this week.`}
          </p>
        </div>

        {/* Scan card */}
        <div className="rounded-2xl p-5 mb-6" style={{background: '#0F2040'}}>
          <p className="text-white font-semibold text-lg mb-1">Ready to train?</p>
          <p className="text-sm mb-4" style={{color: '#64748B'}}>Scan a QR code or select equipment below</p>
          
            <a
            href="/scan"
            className="flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white text-lg w-full text-center mb-3"
            style={{background: 'linear-gradient(135deg, #2563EB, #3B82F6)', boxShadow: '0 0 24px rgba(37, 99, 235, 0.4)'}}
          >
            <span style={{fontSize: '22px'}}>📷</span> Scan Equipment
          </a>
            
          <div className="relative">
            <select
              onChange={handleMachineSelect}
              defaultValue=""
              className="w-full px-4 py-3 rounded-lg text-white appearance-none focus:outline-none"
              style={{background: '#0A1628', border: '1px solid #1E3A5F'}}
            >
              <option value="" disabled>Select equipment manually</option>
              {allMachines.map(machine => (
                <option key={machine.id} value={machine.id}>{machine.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none" style={{color: '#64748B'}}>▾</div>
          </div>
        </div>

        {/* Weekly activity */}
        <div className="rounded-2xl p-5 mb-6" style={{background: '#0F2040'}}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-white font-semibold text-sm">Weekly Activity</p>
              <p className="text-xs mt-0.5" style={{color: '#64748B'}}>Your training this week</p>
            </div>
            <div className="text-right">
              <div className="px-3 py-1 rounded-full text-xs font-bold" style={{background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E'}}>
                {totalThisWeek}/7 days
              </div>
              {trend && (
                <p className="text-xs mt-1" style={{color: trend.color}}>{trend.label}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 items-end justify-between">
            {dayLabels.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className="w-full rounded"
                  style={{
                    height: '24px',
                    background: weekActivity[i]
                      ? 'linear-gradient(180deg, #4ADE80 0%, #22C55E 100%)'
                      : '#0A1628',
                    border: i === todayIndex
                      ? '1px solid #22C55E'
                      : weekActivity[i]
                      ? 'none'
                      : '1px solid #1E3A5F',
                    opacity: i > todayIndex ? 0.35 : 1,
                    boxShadow: weekActivity[i] ? '0 0 8px rgba(34, 197, 94, 0.4)' : 'none'
                  }}
                />
                <p className="text-xs" style={{
                  color: i === todayIndex ? '#22C55E' : '#64748B',
                  fontWeight: i === todayIndex ? 700 : 400
                }}>{day}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Last Sessions */}
        <h2 className="font-semibold text-lg mb-4 text-white">Last Sessions</h2>
        {machineWorkouts.length === 0 ? (
          <p className="text-center py-8" style={{color: '#64748B'}}>No workouts yet. Scan a machine to get started.</p>
        ) : (
          <div className="flex flex-col gap-3 mb-6">
            {machineWorkouts.map(workout => (
              
                <a
                key={workout.machine_id}
                href={'/machine/' + workout.machine_id}
                className="rounded-xl p-4 flex justify-between items-center"
                style={{background: '#0F2040', borderLeft: '3px solid #2563EB'}}
              >
                <div>
                  <p className="text-white font-semibold">{workout.exercise_name || workout.machines?.name}</p>
                  <p className="text-sm mt-1" style={{color: '#64748B'}}>{formatWorkoutSummary(workout)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium" style={{color: '#3B82F6'}}>{daysSince(workout.created_at)}</p>
                  <p className="text-xs mt-0.5" style={{color: '#64748B'}}>{new Date(workout.created_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</p>
                </div>
              </a>
            ))}
          </div>
        )}

      </div>
    </main>
  )
}