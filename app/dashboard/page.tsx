'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '../components/BottomNav'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [gymName, setGymName] = useState('')
  const [machineWorkouts, setMachineWorkouts] = useState<any[]>([])
  const [allMachines, setAllMachines] = useState<any[]>([])
  const [weekActivity, setWeekActivity] = useState<boolean[]>([false, false, false, false, false, false, false])
  const [totalThisWeek, setTotalThisWeek] = useState(0)
  const [totalSessions, setTotalSessions] = useState(0)
  const router = useRouter()
  const [totalWeightLifted, setTotalWeightLifted] = useState(0)
  const [loyalMachine, setLoyalMachine] = useState<string | null>(null)
  const [fourWeekData, setFourWeekData] = useState<number[]>([0, 0, 0, 0])
  const [challengeOpen, setChallengeOpen] = useState(false)
  const [challengeExercises, setChallengeExercises] = useState<any[]>([])
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSSteps, setShowIOSSteps] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        await checkPendingGym(user.id)
        fetchProfile(user.id)
        fetchUserGym(user.id)
        fetchMachineWorkouts(user.id)
        fetchAllMachines(user.id)
        fetchWeekActivity(user.id)
        fetchLiftStats(user.id)
        fetchFourWeekData(user.id)
        fetchChallengeExercises(user.id)
      }
    }
    getUser()

    // Install banner
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const dismissed = localStorage.getItem('install_banner_dismissed')
    if (!isStandalone && !dismissed) {
      setShowInstallBanner(true)
    }
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    setIsIOS(ios)
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function checkPendingGym(userId: string) {
    let pendingCode = localStorage.getItem('pending_gym_code')
    if (!pendingCode) {
      const { data: { user } } = await supabase.auth.getUser()
      pendingCode = user?.user_metadata?.pending_gym_code || null
    }
    if (!pendingCode) return
    const { data: gym } = await supabase
      .from('gyms')
      .select('id')
      .eq('code', pendingCode)
      .single()
    if (gym) {
      await supabase
        .from('gym_members')
        .upsert({ user_id: userId, gym_id: gym.id }, { onConflict: 'user_id,gym_id' })
      await supabase.auth.updateUser({ data: { pending_gym_code: null } })
    }
    localStorage.removeItem('pending_gym_code')
  }

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data)
  }

  async function fetchUserGym(userId: string) {
    const { data } = await supabase
      .from('gym_members')
      .select('gym_id, gyms(name)')
      .eq('user_id', userId)
      .single()
    if (data?.gyms) setGymName((data.gyms as any).name)
  }

  async function fetchMachineWorkouts(userId: string) {
    const { data } = await supabase
      .from('workouts')
      .select('*, machines!workouts_machine_id_fkey(name, type)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) {
      const seen = new Set()
      const countMap: Record<string, number> = {}
      data.forEach(w => {
        countMap[w.machine_id] = (countMap[w.machine_id] || 0) + 1
      })
      const grouped = data.filter(workout => {
        if (seen.has(workout.machine_id)) return false
        seen.add(workout.machine_id)
        return true
      })
      grouped.sort((a, b) => (countMap[b.machine_id] || 0) - (countMap[a.machine_id] || 0))
      setMachineWorkouts(grouped)
      setTotalSessions(data.length)
    }
  }

  async function fetchAllMachines(userId: string) {
    const { data: memberData } = await supabase
      .from('gym_members')
      .select('gym_id')
      .eq('user_id', userId)
      .single()
    if (!memberData) return
    const { data } = await supabase
      .from('machines')
      .select('*')
      .eq('gym_id', memberData.gym_id)
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

  async function fetchFourWeekData(userId: string) {
    const { data } = await supabase
      .from('workouts')
      .select('created_at')
      .eq('user_id', userId)
    if (!data) return
    const now = new Date()
    const dayOfWeek = now.getDay()
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    thisMonday.setHours(0, 0, 0, 0)
    const weeks = [0, 1, 2, 3].map(w => {
      const start = new Date(thisMonday)
      start.setDate(thisMonday.getDate() - w * 7)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      const days = new Set(
        data.filter(wo => {
          const d = new Date(wo.created_at)
          return d >= start && d <= end
        }).map(wo => new Date(wo.created_at).toDateString())
      )
      return days.size
    }).reverse()
    setFourWeekData(weeks)
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
    const challenges = Object.values(exerciseMap)
      .filter(e => new Date(e.lastDate) < cutoff)
      .sort((a, b) => new Date(a.lastDate).getTime() - new Date(b.lastDate).getTime())
      .slice(0, 4)
    setChallengeExercises(challenges)
  }

  async function fetchLiftStats(userId: string) {
    const { data } = await supabase
      .from('workouts')
      .select('weight, reps, machine_id, machines!workouts_machine_id_fkey(name)')
      .eq('user_id', userId)
    if (data) {
      let total = 0
      const machineCount: Record<string, { name: string; count: number }> = {}
      data.forEach((w: any) => {
        if (w.weight && w.reps) total += w.weight * w.reps
        else if (w.weight) total += w.weight
        if (w.machine_id) {
          if (!machineCount[w.machine_id]) machineCount[w.machine_id] = { name: w.machines?.name || '', count: 0 }
          machineCount[w.machine_id].count++
        }
      })
      setTotalWeightLifted(Math.round(total))
      const top = Object.values(machineCount).sort((a, b) => b.count - a.count)[0]
      if (top) setLoyalMachine(top.name)
    }
  }

  async function handleInstall() {
    if (isIOS) { setShowIOSSteps(true); return }
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setShowInstallBanner(false)
      setDeferredPrompt(null)
    }
  }

  function dismissBanner() {
    localStorage.setItem('install_banner_dismissed', 'true')
    setShowInstallBanner(false)
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
    if (workout.sets) parts.push(workout.sets + (workout.sets === 1 ? ' set' : ' sets'))
    if (workout.weight) parts.push(workout.weight + ' lbs')
    return parts.join(' · ')
  }

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const today = new Date().getDay()
  const todayIndex = today === 0 ? 6 : today - 1

  // Bar heights based on session volume per day would go here — for now proportional placeholder
  const barHeights = [40, 28, 48, 20, 36, 8, 8]

  return (
    <>
    <main className="min-h-screen p-6 pb-28" style={{background: '#080808'}}>
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl" style={{fontWeight: 300, color: '#E8E0D8'}}>
            scan<span style={{fontWeight: 900, color: '#C23B0A'}}>set</span>
          </h1>
          <div className="flex items-center gap-4">
            {profile?.role && profile.role !== 'member' && (
              <a href="/admin" className="text-sm" style={{color: '#6B5E55'}}>Admin</a>
            )}
            <button onClick={handleLogout} className="text-sm" style={{color: '#6B5E55'}}>Log Out</button>
          </div>
        </div>

        {/* Welcome */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold" style={{color: '#E8E0D8', letterSpacing: '-0.5px'}}>
            {getGreeting()}, {getFirstName()}
          </h2>
          {gymName && (
            <p className="text-xs font-bold tracking-widest mt-1 mb-1 flex items-center gap-1.5"
              style={{color: '#C23B0A', textTransform: 'uppercase', letterSpacing: '2px'}}>
              <span style={{width: '5px', height: '5px', borderRadius: '50%', background: '#C23B0A', display: 'inline-block'}}></span>
              {gymName}
            </p>
          )}
          <p className="text-sm mt-1" style={{color: '#6B5E55'}}>
            {totalThisWeek === 0
              ? "You haven't trained yet this week."
              : `You've trained ${totalThisWeek} day${totalThisWeek > 1 ? 's' : ''} this week.`}
          </p>
        </div>

        {/* Install banner */}
        {showInstallBanner && (
          <div className="rounded-2xl p-4 mb-4" style={{background: '#0F0F0F', border: '1px solid #D4A017'}}>
            <div className="flex justify-between items-start mb-2">
              <p className="font-semibold text-sm" style={{color: '#E8E0D8'}}>Add ScanSet to your home screen</p>
              <button onClick={dismissBanner} style={{color: '#6B5E55', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px'}}>✕</button>
            </div>
            <p className="text-xs mb-3" style={{color: '#6B5E55'}}>Get the full app experience — faster access, works offline</p>
            {!showIOSSteps ? (
              <button
                onClick={handleInstall}
                className="w-full py-2.5 rounded-full font-semibold text-white text-sm"
                style={{background: '#D4A017'}}>
                Add to Home Screen
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold" style={{color: '#C23B0A', minWidth: '16px'}}>1</span>
                  <p className="text-xs text-white">Tap the <span style={{color: '#C23B0A'}}>Share</span> button at the bottom of Safari</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold" style={{color: '#C23B0A', minWidth: '16px'}}>2</span>
                  <p className="text-xs text-white">Tap <span style={{color: '#C23B0A'}}>"Add to Home Screen"</span></p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold" style={{color: '#C23B0A', minWidth: '16px'}}>3</span>
                  <p className="text-xs text-white">Tap <span style={{color: '#C23B0A'}}>"Add"</span></p>
                </div>
                <button onClick={dismissBanner} className="text-xs mt-1" style={{color: '#6B5E55', background: 'none', border: 'none', cursor: 'pointer'}}>
                  Already installed — dismiss
                </button>
              </div>
            )}
          </div>
        )}

        {/* Scan card */}
        <div className="rounded-2xl p-5 mb-4" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{color: '#6B5E55'}}>Ready to train?</p>
          
            <a
            href="/scan"
            className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg w-full text-center mb-3"
            style={{background: '#D44010', color: '#080808', boxShadow: '0 6px 20px rgba(194,59,10,0.15)'}}>
            <span style={{fontSize: '20px'}}></span> Scan Equipment
          </a>
          <div className="relative">
            <select
              onChange={handleMachineSelect}
              defaultValue=""
              className="w-full px-4 py-3 rounded-lg appearance-none focus:outline-none"
              style={{background: '#080808', border: '1px solid #1A1A1A', color: '#6B5E55'}}>
              <option value="" disabled>Select equipment manually</option>
              {allMachines.map(machine => (
                <option key={machine.id} value={machine.id}>{machine.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none" style={{color: '#6B5E55'}}>▾</div>
          </div>
        </div>

        {/* Two box row */}
        <div className="grid grid-cols-2 gap-3 mb-4">

          {/* Elephant box */}
          <div className="rounded-2xl p-4" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{color: '#6B5E55'}}>Lifetime</p>
            <p style={{fontSize: '26px', fontWeight: 800, color: '#E8E0D8', letterSpacing: '-1px', lineHeight: 1}}>
              {totalWeightLifted.toLocaleString()}
            </p>
            <p className="text-xs mt-1" style={{color: '#6B5E55'}}>lbs lifted</p>
            <p className="text-xs mt-2 font-semibold" style={{color: '#C23B0A'}}>
              🐘 {(totalWeightLifted / 9000).toFixed(1)} elephants
            </p>
          </div>

          {/* My Stats box with sparkline */}
          <a href="/my-stats" className="rounded-2xl p-4 flex flex-col justify-between"
            style={{background: '#0F0F0F', border: '1px solid #1A1A1A', borderTop: '2px solid #C23B0A'}}>
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{color: '#6B5E55'}}>My Stats</p>
              <p className="text-sm font-semibold" style={{color: '#E8E0D8'}}>PRs & trends</p>
            </div>
            {/* Sparkline */}
            <div className="mt-3">
              {(() => {
                const max = Math.max(...fourWeekData, 1)
                const w = 100
                const h = 32
                const points = fourWeekData.map((v, i) => {
                  const x = (i / (fourWeekData.length - 1)) * w
                  const y = h - (v / max) * (h - 4)
                  return `${x},${y}`
                }).join(' ')
                return (
                  <svg viewBox={`0 0 ${w} ${h}`} style={{width: '100%', height: '32px', overflow: 'visible'}}>
                    <defs>
                      <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9B6DFF" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#9B6DFF" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <path
                      d={`M ${fourWeekData.map((v, i) => {
                        const x = (i / (fourWeekData.length - 1)) * w
                        const y = h - (v / max) * (h - 4)
                        return `${x},${y}`
                      }).join(' L ')} L ${w},${h} L 0,${h} Z`}
                      fill="url(#sparkGrad)"
                    />
                    <polyline
                      points={points}
                      fill="none"
                      stroke="#9B6DFF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {fourWeekData.map((v, i) => {
                      const x = (i / (fourWeekData.length - 1)) * w
                      const y = h - (v / max) * (h - 4)
                      return <circle key={i} cx={x} cy={y} r="2.5" fill="#9B6DFF" />
                    })}
                  </svg>
                )
              })()}
              <p className="text-xs mt-1" style={{color: '#6B5E55'}}>4-week activity</p>
            </div>
          </a>

        </div>

        {/* Challenge box */}
        {challengeExercises.length > 0 && (
          <div className="rounded-2xl mb-4 overflow-hidden" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
            <button
              onClick={() => setChallengeOpen(prev => !prev)}
              className="w-full p-5 text-left"
              style={{background: 'transparent', border: 'none', cursor: 'pointer'}}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{color: '#C23B0A'}}>Looking for a Challenge?</p>
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

        {/* Frequently Used */}
        <h2 className="font-bold text-lg mb-3" style={{color: '#E8E0D8'}}>Frequently Used</h2>

        {machineWorkouts.length === 0 ? (
          <p className="text-center py-8" style={{color: '#6B5E55'}}>No workouts yet. Scan a machine to get started.</p>
        ) : (
          <div className="flex flex-col gap-2 mb-6">
            {machineWorkouts.slice(0, 8).map(workout => (
              
                <a
                key={workout.machine_id}
                href={'/machine/' + workout.machine_id}
                className="rounded-xl p-4 flex justify-between items-center"
                style={{background: '#0F0F0F', border: '1px solid #1A1A1A', borderLeft: '2px solid #C23B0A'}}>
                <div>
                  <p className="font-semibold" style={{color: '#E8E0D8'}}>{workout.exercise_name || workout.machines?.name}</p>
                  <p className="text-sm mt-1" style={{color: '#6B5E55'}}>{formatWorkoutSummary(workout)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold" style={{color: '#C23B0A'}}>{daysSince(workout.created_at)}</p>
                  <p className="text-xs mt-0.5" style={{color: '#6B5E55'}}>{new Date(workout.created_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</p>
                </div>
              </a>
            ))}
          </div>
        )}

      </div>
    </main>
    <BottomNav />
    </>
  )
}