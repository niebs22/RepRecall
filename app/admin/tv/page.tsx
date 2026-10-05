'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

const TYPE_LABEL: Record<string, string> = {
  pr: 'PR', progress: 'Progress', milestone: 'Milestone', shoutout: 'Shout-out'
}

function short(n: string) {
  const p = (n || '').trim().split(/\s+/)
  return p.length > 1 ? `${p[0]} ${p[1][0].toUpperCase()}.` : p[0] || 'Member'
}

export default function TVStudio() {
  const router = useRouter()
  const [role, setRole] = useState('')
  const [gyms, setGyms] = useState<any[]>([])
  const [gym, setGym] = useState<any>(null)
  const [brandColor, setBrandColor] = useState('#E8440C')
  const [members, setMembers] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [cards, setCards] = useState<any[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [copied, setCopied] = useState(false)
  const [cardType, setCardType] = useState('pr')
  const [memberId, setMemberId] = useState('')
  const [machineId, setMachineId] = useState('')
  const [exercise, setExercise] = useState('')
  const [exerciseOptions, setExerciseOptions] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [duration, setDuration] = useState('')
  const [saving, setSaving] = useState(false)
  const [captionEdits, setCaptionEdits] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!profile || (profile.role !== 'gym_owner' && profile.role !== 'super_admin')) {
        router.push('/dashboard'); return
      }
      setRole(profile.role)
      if (profile.role === 'super_admin') {
        const { data } = await supabase.from('gyms').select('*, gym_branding(primary_color, logo_url)').order('name')
        if (data) {
          setGyms(data)
          const { data: mem } = await supabase.from('gym_members').select('gym_id').eq('user_id', user.id).limit(1)
          const own = data.find((g: any) => g.id === mem?.[0]?.gym_id) || data[0]
          if (own) selectGym(own)
        }
      } else {
        const { data } = await supabase.from('gyms').select('*, gym_branding(primary_color, logo_url)').eq('owner_id', user.id).limit(1)
        if (data?.[0]) selectGym(data[0])
      }
    }
    load()
  }, [])

  useEffect(() => {
    setExercise('')
    setExerciseOptions([])
    if (!memberId || !machineId || (cardType !== 'progress' && cardType !== 'pr')) return
    supabase.from('workouts').select('exercise_name')
      .eq('user_id', memberId).eq('machine_id', machineId).not('exercise_name', 'is', null)
      .then(({ data }) => {
        const names = Array.from(new Set((data || []).map((r: any) => r.exercise_name).filter(Boolean))) as string[]
        setExerciseOptions(names)
        if (names.length === 1) setExercise(names[0])
      })
  }, [memberId, machineId, cardType])

  async function selectGym(g: any) {
    setGym(g)
    const b = Array.isArray(g.gym_branding) ? g.gym_branding[0] : g.gym_branding
    setBrandColor(b?.primary_color || '#E8440C')
    setMemberId(''); setMachineId(''); setExercise(''); setExerciseOptions([]); setCaption('')
    await Promise.all([loadMembers(g.id), loadMachines(g.id), loadCards(g.id), loadCandidates(g.id)])
  }

  async function loadMembers(gymId: string) {
    const { data: gm } = await supabase.from('gym_members').select('user_id').eq('gym_id', gymId)
    const ids = Array.from(new Set((gm || []).map((r: any) => r.user_id)))
    if (!ids.length) { setMembers([]); return }
    const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids)
    setMembers((profs || []).sort((a: any, b: any) => (a.full_name || '').localeCompare(b.full_name || '')))
  }

  async function loadMachines(gymId: string) {
    const { data } = await supabase.from('machines').select('id, name, type').eq('gym_id', gymId).order('name')
    setMachines(data || [])
  }

  async function loadCards(gymId: string) {
    const { data } = await supabase.from('tv_cards').select('*').eq('gym_id', gymId).order('created_at', { ascending: false })
    setCards(data || [])
  }

  async function loadCandidates(gymId: string) {
    const { data } = await supabase.rpc('get_tv_candidates', { p_gym_id: gymId })
    setCandidates(Array.isArray(data) ? data : [])
  }

  async function addCard() {
    if (!gym) return
    const needsMachine = cardType === 'progress' || cardType === 'pr'
    if (cardType !== 'shoutout' && !memberId) { alert('Pick a member'); return }
    if (needsMachine && !machineId) { alert('Pick a machine'); return }
    if (needsMachine && exerciseOptions.length > 1 && !exercise) { alert('Pick an exercise'); return }
    if (cardType === 'shoutout' && !caption.trim()) { alert('Write a message'); return }
    setSaving(true)
    const expires_at = duration ? new Date(Date.now() + Number(duration) * 86400000).toISOString() : null
    const { error } = await supabase.from('tv_cards').insert({
      gym_id: gym.id,
      card_type: cardType,
      user_id: memberId || null,
      machine_id: needsMachine ? machineId : null,
      exercise_name: needsMachine && exercise ? exercise : null,
      headline: caption.trim() || null,
      expires_at
    })
    setSaving(false)
    if (error) { alert('Could not add card: ' + error.message); return }
    setCaption('')
    loadCards(gym.id)
  }

  async function addCandidate(c: any) {
    const expires_at = new Date(Date.now() + 14 * 86400000).toISOString()
    const { error } = await supabase.from('tv_cards').insert({
      gym_id: gym.id, card_type: 'pr', user_id: c.user_id, machine_id: c.machine_id,
      exercise_name: c.exercise_name || null, headline: null, expires_at
    })
    if (error) { alert('Could not add card: ' + error.message); return }
    loadCards(gym.id)
  }

  async function saveCaption(id: string) {
    const value = (captionEdits[id] ?? '').trim()
    await supabase.from('tv_cards').update({ headline: value || null }).eq('id', id)
    setCaptionEdits(prev => { const n = { ...prev }; delete n[id]; return n })
    loadCards(gym.id)
  }

  async function removeCard(id: string) {
    await supabase.from('tv_cards').delete().eq('id', id)
    loadCards(gym.id)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`https://scanset.app/tv/${gym.tv_token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const cardBg = 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)'
  const inputStyle = { background: '#080808', border: '1px solid #222222' }
  const needsMachine = cardType === 'progress' || cardType === 'pr'
  const memberName = (id: string) => short(members.find(m => m.id === id)?.full_name || '')
  const machineName = (id: string) => machines.find(m => m.id === id)?.name || ''

  return (
    <main className="min-h-screen p-6 pb-24" style={{ background: '#080808' }}>
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-8">
          <a href="/admin" className="text-sm" style={{ color: '#6B5E55' }}>← Admin</a>
          <h1 className="text-lg font-bold text-white">TV Studio</h1>
          <div style={{ width: '48px' }}></div>
        </div>

        {role === 'super_admin' && gyms.length > 0 && (
          <select value={gym?.id || ''} onChange={e => { const g = gyms.find(x => x.id === e.target.value); if (g) selectGym(g) }}
            className="w-full px-4 py-3 rounded-lg text-white focus:outline-none mb-6" style={inputStyle}>
            {gyms.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}

        {!gym ? (
          <p className="text-center py-8" style={{ color: '#6B5E55' }}>Loading...</p>
        ) : (
          <>
            {/* TV link */}
            <div className="rounded-2xl p-5 mb-6" style={{ background: cardBg, border: '1px solid #222222' }}>
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: brandColor }}>Your TV link</p>
              <p className="text-xs mb-3" style={{ color: '#6B5E55' }}>Open this on the gym TV once and leave it. New cards appear within a minute.</p>
              <div className="flex gap-2">
                <p className="text-xs flex-1 px-3 py-2 rounded-lg truncate" style={{ background: '#080808', color: '#B0A89F' }}>
                  scanset.app/tv/{gym.tv_token}
                </p>
                <button onClick={copyLink} className="text-xs px-3 py-2 rounded-lg font-semibold"
                  style={{ background: copied ? '#1A1A1A' : brandColor, color: copied ? brandColor : '#fff', border: 'none', cursor: 'pointer' }}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <a href={`/tv/${gym.tv_token}`} target="_blank" rel="noreferrer" className="text-xs px-3 py-2 rounded-lg font-semibold"
                  style={{ background: '#080808', border: `1px solid ${brandColor}`, color: brandColor }}>Open</a>
              </div>
            </div>

            {/* Suggested highlights */}
            <div className="mb-6">
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#6B5E55' }}>Recent highlights (last 14 days)</p>
              {candidates.length === 0 ? (
                <p className="text-sm" style={{ color: '#6B5E55' }}>No new PRs in the last 14 days.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {candidates.map((c, i) => {
                    const already = cards.some(x => x.card_type === 'pr' && x.user_id === c.user_id && x.machine_id === c.machine_id && (x.exercise_name || null) === (c.exercise_name || null))
                    return (
                      <div key={i} className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: cardBg, border: '1px solid #222222' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{c.member}</p>
                          <p className="text-xs truncate" style={{ color: '#6B5E55' }}>
                            {c.machine}{c.exercise_name ? ' - ' + c.exercise_name : ''}: {c.old_best} to {c.new_best} lb (+{c.pct}%)
                          </p>
                        </div>
                        <button onClick={() => addCandidate(c)} disabled={already}
                          className="text-xs px-3 py-2 rounded-lg font-semibold"
                          style={{ background: already ? '#1A1A1A' : brandColor, color: already ? '#6B5E55' : '#fff', border: 'none', cursor: already ? 'default' : 'pointer' }}>
                          {already ? 'On TV' : 'Add to TV'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Build a card */}
            <div className="rounded-2xl p-5 mb-6" style={{ background: cardBg, border: '1px solid #222222' }}>
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#6B5E55' }}>Build a card</p>
              <div className="flex rounded-lg overflow-hidden mb-3" style={{ border: '1px solid #222222' }}>
                {['pr', 'progress', 'milestone', 'shoutout'].map(t => (
                  <button key={t} onClick={() => setCardType(t)} className="flex-1 py-3 text-xs font-semibold"
                    style={{ background: cardType === t ? brandColor : '#080808', color: cardType === t ? '#fff' : '#6B5E55', border: 'none', cursor: 'pointer' }}>
                    {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <select value={memberId} onChange={e => setMemberId(e.target.value)}
                  className="px-4 py-3 rounded-lg text-white focus:outline-none" style={inputStyle}>
                  <option value="">{cardType === 'shoutout' ? 'Member (optional)' : 'Select a member'}</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.full_name || 'Unnamed'}</option>)}
                </select>
                {needsMachine && (
                  <select value={machineId} onChange={e => setMachineId(e.target.value)}
                    className="px-4 py-3 rounded-lg text-white focus:outline-none" style={inputStyle}>
                    <option value="">Select a machine</option>
                    {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                )}
                {needsMachine && exerciseOptions.length > 1 && (
                  <select value={exercise} onChange={e => setExercise(e.target.value)}
                    className="px-4 py-3 rounded-lg text-white focus:outline-none" style={inputStyle}>
                    <option value="">Select an exercise</option>
                    {exerciseOptions.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                )}
                <input type="text" placeholder={cardType === 'shoutout' ? 'Message for the TV' : 'Caption (optional)'}
                  value={caption} onChange={e => setCaption(e.target.value)}
                  className="px-4 py-3 rounded-lg text-white focus:outline-none" style={inputStyle} />
                <select value={duration} onChange={e => setDuration(e.target.value)}
                  className="px-4 py-3 rounded-lg text-white focus:outline-none" style={inputStyle}>
                  <option value="">No end date</option>
                  <option value="7">Show for 7 days</option>
                  <option value="14">Show for 14 days</option>
                  <option value="30">Show for 30 days</option>
                </select>
                <button onClick={addCard} disabled={saving} className="py-3 rounded-full font-semibold text-white"
                  style={{ background: brandColor, border: 'none', cursor: 'pointer' }}>
                  {saving ? 'Adding...' : 'Add to TV'}
                </button>
              </div>
            </div>

            {/* Live cards */}
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#6B5E55' }}>On the TV now ({cards.length})</p>
            {cards.length === 0 ? (
              <p className="text-sm" style={{ color: '#6B5E55' }}>Nothing yet. Only the join QR will show.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {cards.map(c => {
                  const expired = c.expires_at && new Date(c.expires_at) < new Date()
                  return (
                    <div key={c.id} className="rounded-xl p-4" style={{ background: cardBg, border: '1px solid #222222', opacity: expired ? 0.5 : 1 }}>
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            <span className="text-xs px-2 py-0.5 rounded-full mr-2" style={{ background: 'rgba(255,255,255,0.06)', color: brandColor }}>{TYPE_LABEL[c.card_type]}</span>
                            {c.user_id ? memberName(c.user_id) : 'Gym message'}
                          </p>
                          <p className="text-xs mt-1 truncate" style={{ color: '#6B5E55' }}>
                            {[machineName(c.machine_id), c.exercise_name].filter(Boolean).join(' - ')}
                            {c.expires_at ? (expired ? ' (expired)' : ' - ends ' + new Date(c.expires_at).toLocaleDateString()) : ''}
                          </p>
                        </div>
                        <button onClick={() => removeCard(c.id)} className="text-xs px-2 py-1 rounded"
                          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer' }}>Remove</button>
                      </div>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Caption" value={captionEdits[c.id] ?? c.headline ?? ''}
                          onChange={e => setCaptionEdits(prev => ({ ...prev, [c.id]: e.target.value }))}
                          className="flex-1 px-3 py-2 rounded-lg text-white text-sm focus:outline-none" style={inputStyle} />
                        {captionEdits[c.id] !== undefined && captionEdits[c.id] !== (c.headline ?? '') && (
                          <button onClick={() => saveCaption(c.id)} className="text-xs px-3 py-2 rounded-lg font-semibold"
                            style={{ background: brandColor, color: '#fff', border: 'none', cursor: 'pointer' }}>Save</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}