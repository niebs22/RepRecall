'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [machineWorkouts, setMachineWorkouts] = useState<any[]>([])
  const [allMachines, setAllMachines] = useState<any[]>([])
  const [weekActivity, setWeekActivity] = useState<boolean[]>([false, false, false, false, false, false, false])
  const [totalThisWeek, setTotalThisWeek] = useState(0)
  const router = useRouter()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        fetchMachineWorkouts(user.id)
        fetchAllMachines()
        fetchWeekActivity(user.id)
      }
    }
    getUser()
  }, [])

  async function fetchMachineWorkouts(userId: string) {
    const { data } = await supabase
      .from('workouts')
      .select('*, machines(name)')
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

    const { data } = await supabase
      .from('workouts')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', monday.toISOString())

    if (data) {
      const activeDays = new Set<number>()
      data.forEach(w => {
        const day = new Date(w.created_at).getDay()
        const adjusted = day === 0 ? 6 : day - 1
        activeDays.add(adjusted)
      })
      const week = [0,1,2,3,4,5,6].map(d => activeDays.has(d))
      setWeekActivity(week)
      setTotalThisWeek(activeDays.size)
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
    const diffMs = new Date().getTime() - new Date(date).getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    const diffDays = Math.floor(diffHours / 24)
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return diffDays + ' days ago'
  }

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const today = new Date().getDay()
  const todayIndex = today === 0 ? 6 : today - 1

  return (
    <main className="min-h-screen p-6" style={{background: '#0A1628'}}>
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Rep<span style={{color: '#2563EB'}}>Recall</span></h1>
          <button onClick={handleLogout} className="text-sm" style={{color: '#64748B'}}>
            Log Out
          </button>
        </div>

        {/* Week activity graph */}
        <div className="rounded-2xl p-5 mb-4" style={{background: '#0F2040'}}>
          <div className="flex justify-between items-center mb-4">
            <p className="text-white font-semibold">This Week</p>
            <p className="text-sm font-medium" style={{color: '#3B82F6'}}>
              {totalThisWeek} {totalThisWeek === 1 ? 'day' : 'days'} active
            </p>
          </div>
          <div className="flex gap-2 items-end justify-between">
            {dayLabels.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <div
                  className="w-full rounded-md transition-all"
                  style={{
                    height: '40px',
                    background: weekActivity[i] ? '#2563EB' : '#0A1628',
                    border: i === todayIndex ? '1px solid #2563EB' : '1px solid transparent',
                    opacity: i > todayIndex ? 0.4 : 1
                  }}
                />
                <p className="text-xs" style={{color: i === todayIndex ? '#3B82F6' : '#64748B'}}>{day}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scan card */}
        <div className="rounded-2xl p-5 mb-6" style={{background: '#0F2040'}}>
          <p className="text-white font-semibold text-lg mb-1">Ready to train?</p>
          <p className="text-sm mb-4" style={{color: '#64748B'}}>Scan a QR code or select equipment below</p>
          <a href="/scan" className="px-8 py-3 rounded-full font-semibold text-white inline-block mb-3 w-full text-center" style={{background: '#2563EB'}}>
            Scan Equipment
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
                <option key={machine.id} value={machine.id}>
                  {machine.name}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none" style={{color: '#64748B'}}>
              ▾
            </div>
          </div>
        </div>

        <h2 className="font-semibold text-lg mb-4 text-white">My Equipment</h2>

        {machineWorkouts.length === 0 ? (
          <p className="text-center py-8" style={{color: '#64748B'}}>No workouts yet. Scan a machine to get started.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {machineWorkouts.map(workout => (
              
             <a href={'/machine/' + workout.machine_id}
                key={workout.machine_id}
                className="rounded-xl p-4 block"
                style={{background: '#0F2040', borderLeft: '3px solid #2563EB'}}
              >
                <div className="flex justify-between items-center mb-3">
                  <p className="text-white font-semibold">{workout.machines?.name}</p>
                  <p className="text-xs font-medium" style={{color: '#3B82F6'}}>{daysSince(workout.created_at)}</p>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-white font-bold text-lg">{workout.sets}</p>
                    <p className="text-xs" style={{color: '#64748B'}}>Sets</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{workout.reps}</p>
                    <p className="text-xs" style={{color: '#64748B'}}>Reps</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{workout.weight}</p>
                    <p className="text-xs" style={{color: '#64748B'}}>Lbs</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}