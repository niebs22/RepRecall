'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '../components/BottomNav'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [gymName, setGymName] = useState('')
  const [gymTimezone, setGymTimezone] = useState('America/New_York')
  const [brandColor, setBrandColor] = useState('#E8440C')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
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
  const [challengePool, setChallengePool] = useState<any[]>([])
  const [routines, setRoutines] = useState<any[]>([])
  const [activeRoutine, setActiveRoutine] = useState<any>(null)
  const [routinesOpen, setRoutinesOpen] = useState(true)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isChrome, setIsChrome] = useState(false)
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
        const pendingNext = localStorage.getItem('pending_next_url')
        if (pendingNext) {
          localStorage.removeItem('pending_next_url')
          router.push(pendingNext)
          return
        }
        fetchProfile(user.id)
        fetchUserGym(user.id)
        fetchMachineWorkouts(user.id)
        fetchAllMachines(user.id)
        fetchWeekActivity(user.id)
        fetchLiftStats(user.id)
        fetchFourWeekData(user.id)
        fetchChallengeExercises(user.id)
        fetchRoutines(user.id)
      }
    }
    getUser()



    const savedRoutine = localStorage.getItem('active_routine')
    if (savedRoutine) setActiveRoutine(JSON.parse(savedRoutine))
    // Install banner
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const dismissed = localStorage.getItem('install_banner_dismissed')
    if (!isStandalone && !dismissed) {
      setShowInstallBanner(true)
    }
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
setIsIOS(ios)
const chrome = /android/.test(navigator.userAgent.toLowerCase()) || (!ios && /chrome/.test(navigator.userAgent.toLowerCase()))
setIsChrome(chrome)
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function hexToRgba(hex: string, alpha: number) {
    const clean = hex.replace('#', '')
    const r = parseInt(clean.substring(0, 2), 16)
    const g = parseInt(clean.substring(2, 4), 16)
    const b = parseInt(clean.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

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
      .select('gym_id, gyms(name, timezone, gym_branding(primary_color, logo_url))')
      .eq('user_id', userId)
      .single()
    if (data?.gyms) {
      setGymName((data.gyms as any).name)
      setGymTimezone((data.gyms as any).timezone || 'America/New_York')
      const branding = (data.gyms as any).gym_branding
      const brandingRow = Array.isArray(branding) ? branding[0] : branding
      if (brandingRow?.primary_color) setBrandColor(brandingRow.primary_color)
      if (brandingRow?.logo_url) setLogoUrl(brandingRow.logo_url)
    }
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

  async function fetchRoutines(userId: string) {
  const { data } = await supabase
    .from('routines')
    .select('*, routine_machines(*, machines(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (data) setRoutines(data)
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
    const pool = Object.values(exerciseMap)
      .filter(e => new Date(e.lastDate) < cutoff)
      .sort((a, b) => new Date(a.lastDate).getTime() - new Date(b.lastDate).getTime())
    setChallengePool(pool)
    setChallengeExercises(pool.slice(0, 4))
  }

  function shuffleChallenges() {
    const shuffled = [...challengePool].sort(() => Math.random() - 0.5)
    setChallengeExercises(shuffled.slice(0, 4))
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
    if (isIOS || isChrome) { setShowIOSSteps(true); return }
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
    const past = new Date(date.endsWith('Z') ? date : date + 'Z')
    const diffMs = now.getTime() - past.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffHours < 1) return 'Just now'
    const todayStr = now.toLocaleDateString('en-US', { timeZone: gymTimezone, year: 'numeric', month: '2-digit', day: '2-digit' })
    const pastStr = past.toLocaleDateString('en-US', { timeZone: gymTimezone, year: 'numeric', month: '2-digit', day: '2-digit' })
    if (todayStr === pastStr) return 'Today'
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
    <main className="min-h-screen p-6 pb-32" style={{background: '#080808'}}>
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt={gymName || 'Gym logo'} style={{maxWidth: '220px', maxHeight: '96px', width: 'auto', height: 'auto', objectFit: 'contain'}} />
          ) : (
            <h1 className="text-2xl" style={{fontWeight: 300, color: '#E8E0D8'}}>
              scan<span style={{fontWeight: 900, color: '#E8440C'}}>set</span>
            </h1>
          )}
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
              style={{color: brandColor, textTransform: 'uppercase', letterSpacing: '2px'}}>
              <span style={{width: '5px', height: '5px', borderRadius: '50%', background: brandColor, display: 'inline-block'}}></span>
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
          <div className="rounded-2xl p-4 mb-4" style={{background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', border: '1px solid #FFEA00'}}>
            <div className="flex justify-between items-start mb-2">
              <p className="font-semibold text-sm" style={{color: '#E8E0D8'}}>Add ScanSet to your home screen</p>
              <button onClick={dismissBanner} style={{color: '#6B5E55', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px'}}>✕</button>
            </div>
            <p className="text-xs mb-3" style={{color: '#6B5E55'}}>Skip the browser, use ScanSet as a full app on your home screen</p>
            {!showIOSSteps ? (
  <button
    onClick={handleInstall}
    className="w-full py-2.5 rounded-full font-semibold text-white text-sm"
    style={{background: '#FFEA00', color: '#080808'}}>
     Add to Home Screen
  </button>
) : isChrome ? (
  <div className="flex flex-col gap-2">
    <div className="flex items-start gap-2">
      <span className="text-xs font-bold" style={{color: brandColor, minWidth: '16px'}}>1</span>
      <p className="text-xs text-white">Tap the <span style={{color: brandColor}}>⋮ menu</span> in the top right of Chrome</p>
    </div>
    <div className="flex items-start gap-2">
      <span className="text-xs font-bold" style={{color: brandColor, minWidth: '16px'}}>2</span>
      <p className="text-xs text-white">Tap <span style={{color: brandColor}}>"Add to Home Screen"</span></p>
    </div>
    <div className="flex items-start gap-2">
      <span className="text-xs font-bold" style={{color: brandColor, minWidth: '16px'}}>3</span>
      <p className="text-xs text-white">Tap <span style={{color: brandColor}}>"Add"</span></p>
    </div>
    <button onClick={dismissBanner} className="text-xs mt-1" style={{color: '#6B5E55', background: 'none', border: 'none', cursor: 'pointer'}}>
      Already installed — dismiss
    </button>
  </div>
) : (
  <div className="flex flex-col gap-2">
    <div className="flex items-start gap-2">
      <span className="text-xs font-bold" style={{color: brandColor, minWidth: '16px'}}>1</span>
      <p className="text-xs text-white">Tap the <span style={{color: brandColor}}>Share</span> button at the bottom of Safari</p>
    </div>
    <div className="flex items-start gap-2">
      <span className="text-xs font-bold" style={{color: brandColor, minWidth: '16px'}}>2</span>
      <p className="text-xs text-white">Scroll down and tap <span style={{color: brandColor}}>"Add to Home Screen"</span> — you may need to tap <span style={{color: brandColor}}>"View More"</span> to find it</p>
    </div>
    <div className="flex items-start gap-2">
      <span className="text-xs font-bold" style={{color: brandColor, minWidth: '16px'}}>3</span>
      <p className="text-xs text-white">Tap <span style={{color: brandColor}}>"Add"</span></p>
    </div>
    <button onClick={dismissBanner} className="text-xs mt-1" style={{color: '#6B5E55', background: 'none', border: 'none', cursor: 'pointer'}}>
      Already installed — dismiss
    </button>
  </div>
)}
          </div>
        )}

{/* Active Routine Banner */}
{activeRoutine && (
  <div className="rounded-2xl p-4 mb-4 flex justify-between items-center cursor-pointer"
    style={{background: '#253D5B'}}
    onClick={() => router.push(`/routines/${activeRoutine.id}`)}>
    <div>
      <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{color: 'rgba(255,255,255,0.6)'}}>Active Routine</p>
      <p className="font-bold text-white">{activeRoutine.name}</p>
      <p className="text-xs mt-0.5" style={{color: 'rgba(255,255,255,0.7)'}}>
        {activeRoutine.routine_machines?.length} machines
      </p>
    </div>
    <div className="flex flex-col gap-2 items-end">
      <button
        onClick={() => {
          localStorage.removeItem('active_routine')
          setActiveRoutine(null)
        }}
        className="text-xs px-3 py-1.5 rounded-full font-semibold"
        style={{background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', cursor: 'pointer'}}>
        End Routine
      </button>
    </div>
  </div>
)}
        {/* Scan card */}
        <div className="rounded-2xl p-5 mb-4" style={{background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', border: '1px solid #222222'}}>
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{color: '#6B5E55'}}>Ready to train?</p>
          
            <a
            href="/scan"
            className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg w-full text-center mb-3"
            style={{background: brandColor, color: '#ffffff', boxShadow: `0 6px 20px ${hexToRgba(brandColor, 0.15)}`}}>
            <span style={{fontSize: '20px'}}></span> Scan QR Code
          </a>
          <div className="relative">
            <select
              onChange={handleMachineSelect}
               defaultValue=""
  className="w-full px-4 py-3 rounded-lg appearance-none focus:outline-none"
  style={{background: '#080808', border: '1px solid #222222', color: '#6B5E55'}}>
  <option value="" disabled>Select equipment manually</option>
  {(['strength', 'cardio', 'functional'] as const).map(type => {
    const machines = allMachines.filter(m => m.type === type)
    if (machines.length === 0) return null
    return (
      <optgroup key={type} label={type.charAt(0).toUpperCase() + type.slice(1)}>
        {machines.map(machine => (
          <option key={machine.id} value={machine.id}>{machine.name}</option>
        ))}
      </optgroup>
    )
  })}
</select>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none" style={{color: '#6B5E55'}}>▾</div>
          </div>
        </div>

        {/* Two box row */}
        <div className="grid grid-cols-2 gap-3 mb-4">

          {/* Elephant box */}
<div className="rounded-2xl p-4 flex flex-col justify-between" style={{background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', border: '1px solid #222222'}}>
  <div>
    <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{color: '#6B5E55'}}>Lifetime</p>
    <p style={{fontSize: '32px', fontWeight: 900, color: '#E8E0D8', letterSpacing: '-2px', lineHeight: 1}}>
      {totalWeightLifted.toLocaleString()}
    </p>
    <p className="text-xs mt-1 mb-2" style={{color: '#6B5E55'}}>lbs lifted</p>
    <p className="text-xs font-semibold" style={{color: brandColor}}>
      🐘 {(totalWeightLifted / 9000).toFixed(1)} elephants
    </p>
  </div>
  <div className="mt-3">
    {(() => {
  if (totalWeightLifted === 0) return (
    <p className="text-xs mt-1.5" style={{color: '#6B5E55'}}>Log your first workout to start tracking.</p>
  )
  const nextMilestone = Math.ceil(totalWeightLifted / 50000) * 50000
  const prevMilestone = nextMilestone - 50000
  const progress = ((totalWeightLifted - prevMilestone) / 50000) * 100
  return (
    <>
      <div className="w-full rounded-full overflow-hidden" style={{height: '3px', background: '#222222'}}>
        <div style={{width: `${progress}%`, height: '100%', background: brandColor, borderRadius: '2px'}}></div>
      </div>
      <p className="text-xs mt-1.5" style={{color: '#6B5E55'}}>
        Next: <span style={{color: brandColor, fontWeight: 700}}>{nextMilestone.toLocaleString()} lbs</span>
      </p>
    </>
  )
})()}
  </div>
</div>

          {/* My Stats box */}
          <a href="/my-stats" className="rounded-2xl p-4 flex flex-col justify-between"
            style={{background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', border: '1px solid #222222', borderTop: `2px solid ${brandColor}`}}>
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{color: '#6B5E55'}}>My Stats</p>
              <div className="flex items-center gap-3">
                <div className="relative" style={{width: '56px', height: '56px', flexShrink: 0}}>
                  {(() => {
                    const goal = 4
                    const goalMet = totalThisWeek >= goal
                    const pct = Math.min(totalThisWeek / goal, 1)
                    const r = 24
                    const c = 2 * Math.PI * r
                    const offset = c * (1 - pct)
                    const ringColor = goalMet ? brandColor : '#9B6DFF'
                    const glow = goalMet ? `0 0 8px ${hexToRgba(brandColor, 0.7)}` : '0 0 6px rgba(155,109,255,0.4)'
                    return (
                      <svg viewBox="0 0 56 56" style={{width: '56px', height: '56px', transform: 'rotate(-90deg)', filter: `drop-shadow(${glow})`}}>
                        <circle cx="28" cy="28" r={r} fill="none" stroke="#222222" strokeWidth="5" />
                        <circle cx="28" cy="28" r={r} fill="none" stroke={ringColor} strokeWidth="5"
                          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
                      </svg>
                    )
                  })()}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span style={{fontSize: '11px', fontWeight: 800, color: '#E8E0D8'}}>{totalThisWeek}/4</span>
                  </div>
                </div>
                <div>
                  <p style={{fontSize: '32px', fontWeight: 900, color: '#E8E0D8', letterSpacing: '-2px', lineHeight: 1}}>
                    {totalThisWeek}
                  </p>
                  <p className="text-xs mt-1" style={{color: '#6B5E55'}}>sessions this week</p>
                </div>
              </div>
            </div>
            <p className="text-xs mt-3" style={{color: '#6B5E55'}}>
              <span style={{color: brandColor, fontWeight: 700}}>{totalSessions.toLocaleString()}</span> lifetime sessions
            </p>
          </a>

        </div>

        {/* Challenge box */}
        {challengeExercises.length === 0 ? (
          <div className="rounded-2xl mb-4 p-5" style={{background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', border: '1px solid #222222'}}>
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{color: brandColor}}>Looking for a Challenge?</p>
            <p className="text-sm" style={{color: '#6B5E55'}}>Keep logging sessions — once you've built some history we'll start suggesting exercises to revisit.</p>
          </div>
        ) : (
          <div className="rounded-2xl mb-4 overflow-hidden" style={{background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', border: '1px solid #222222'}}>
            <button
              onClick={() => setChallengeOpen(prev => !prev)}
              className="w-full p-5 text-left"
              style={{background: 'transparent', border: 'none', cursor: 'pointer'}}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-bold tracking-widest uppercase" style={{color: brandColor}}>Looking for a Challenge?</p>
                    {challengePool.length > 4 && (
                      <button
                        onClick={e => { e.stopPropagation(); shuffleChallenges() }}
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{color: '#6B5E55', background: '#222222', lineHeight: 1}}
                        title="Shuffle"
                      >
                        ↻
                      </button>
                    )}
                  </div>
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
                    style={{background: '#080808', border: '1px solid #222222', borderLeft: `2px solid ${brandColor}`}}>
                    <div>
                      <p className="font-semibold text-sm" style={{color: '#E8E0D8'}}>{ex.name}</p>
                      <p className="text-xs mt-0.5" style={{color: '#6B5E55'}}>
                        {ex.lastSets && ex.lastReps ? `Last: ${ex.lastSets}x${ex.lastReps}` : ''}
                        {ex.lastWeight ? ` · ${ex.lastWeight} lbs` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold" style={{color: brandColor}}>
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
        ) }


{/* My Routines */}
{routines.length > 0 && (
  <div className="rounded-2xl overflow-hidden mb-4" style={{background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', border: '1px solid #222222'}}>
    <div className="flex justify-between items-center p-5">
      <button
        onClick={() => setRoutinesOpen(prev => !prev)}
        className="flex items-center gap-2"
        style={{background: 'transparent', border: 'none', cursor: 'pointer'}}>
        <h2 className="font-semibold text-white">My Routines</h2>
        <span style={{color: '#253D5B', fontSize: '18px', transform: routinesOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', display: 'inline-block', lineHeight: 1}}>▾</span>
      </button>
      <a href="/routines/create"
        className="text-xs font-bold px-3 py-1.5 rounded-full"
        style={{color: '#253D5B', background: 'rgba(37,61,91,0.1)', border: '1px solid rgba(37,61,91,0.3)'}}>
        + Create
      </a>
    </div>
    {routinesOpen && (
      <div className="flex flex-col gap-2 px-5 pb-5">
        {routines.map(routine => (
          <div key={routine.id} className="flex justify-between items-center px-4 py-3 rounded-xl"
            style={{background: '#080808', border: '1px solid #222222', borderLeft: '2px solid #253D5B'}}>
            <div>
              <p className="font-semibold text-sm text-white">{routine.name}</p>
              <p className="text-xs mt-0.5" style={{color: '#6B5E55'}}>
                {routine.routine_machines?.slice(0,3).map((rm: any) => rm.machines?.name).join(' · ')}
                {routine.routine_machines?.length > 3 ? ` +${routine.routine_machines.length - 3} more` : ''}
              </p>
            </div>
            <div className="flex gap-2">
  <a href={`/routines/${routine.id}?view=true`}
    className="text-xs font-bold px-3 py-1.5 rounded-full"
    style={{color: '#253D5B', background: 'rgba(37,61,91,0.15)', border: '1px solid rgba(37,61,91,0.4)'}}>
    View
  </a>
  <button
    onClick={() => {
      const sorted = [...routine.routine_machines].sort((a, b) => a.order_index - b.order_index)
      const full = { ...routine, routine_machines: sorted }
      localStorage.setItem('active_routine', JSON.stringify(full))
      localStorage.setItem('routine_started_at', new Date().toISOString())
      setActiveRoutine(full)
      router.push(`/routines/${routine.id}`)
    }}
    className="text-xs font-bold px-3 py-1.5 rounded-full text-white"
    style={{background: '#253D5B', border: 'none', cursor: 'pointer'}}>
    Start
  </button>
</div>
          </div>
        ))}
      </div>
    )}
  </div>
)}

{/* Create first routine prompt */}
{routines.length === 0 && (
  <div className="rounded-2xl p-5 mb-4" style={{background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', border: '1px solid #222222'}}>
    <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{color: '#253D5B'}}>My Routines</p>
    <p className="text-sm mb-3" style={{color: '#6B5E55'}}>Save your go-to workouts and start them with one tap.</p>
    <a href="/routines/create"
      className="inline-block text-sm font-bold px-4 py-2 rounded-full"
      style={{color: '#253D5B', background: 'rgba(37,61,91,0.1)', border: '1px solid rgba(37,61,91,0.3)'}}>
      + Create your first routine
    </a>
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
                style={{background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', border: '1px solid #222222', borderLeft: `2px solid ${brandColor}`}}>
                <div>
                  <p className="font-semibold" style={{color: '#E8E0D8'}}>{workout.exercise_name || workout.machines?.name}</p>
                  <p className="text-sm mt-1" style={{color: '#6B5E55'}}>{formatWorkoutSummary(workout)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold" style={{color: brandColor}}>{daysSince(workout.created_at)}</p>
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