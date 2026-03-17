'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function SuperAdmin() {
  const [gyms, setGyms] = useState<any[]>([])
  const [newGymName, setNewGymName] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [ownerEmail, setOwnerEmail] = useState<Record<string, string>>({})
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

      if (profile?.role !== 'super_admin') {
        router.push('/dashboard')
        return
      }

      fetchGyms()
    }
    load()
  }, [])

  async function fetchGyms() {
    const { data } = await supabase
      .from('gyms')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setGyms(data)
  }

  async function addGym(e: any) {
    e.preventDefault()
    if (!newGymName.trim()) return
    setLoading(true)
    await supabase.from('gyms').insert({
      name: newGymName.trim()
    })
    setNewGymName('')
    fetchGyms()
    setLoading(false)
  }

  async function deleteGym(id: string) {
    await supabase.from('gyms').delete().eq('id', id)
    if (expanded === id) setExpanded(null)
    fetchGyms()
  }

  async function assignOwner(gymId: string) {
    const email = ownerEmail[gymId]
    if (!email) return

    // Find user by email in profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (!profile) {
      alert('User not found. Make sure they have signed up first.')
      return
    }

    // Set as gym owner
    await supabase.from('profiles').update({ role: 'gym_owner' }).eq('id', profile.id)
    await supabase.from('gyms').update({ owner_id: profile.id }).eq('id', gymId)
    await supabase.from('gym_members').upsert({ user_id: profile.id, gym_id: gymId }, { onConflict: 'user_id,gym_id' })

    alert('Owner assigned successfully.')
    fetchGyms()
  }

  function toggleExpand(id: string) {
    setExpanded(expanded === id ? null : id)
  }

  function getJoinUrl(code: string) {
    return `https://rep-recall.vercel.app/join/${code}`
}

  function copyJoinUrl(code: string) {
    navigator.clipboard.writeText(getJoinUrl(code))
    alert('Join URL copied to clipboard')
  }

  return (
    <main className="min-h-screen p-6" style={{background: '#0A1628'}}>
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white"><span style={{fontWeight: 300}}>scan</span><span style={{color: '#2563EB', fontWeight: 900}}>set</span></h1>
            <p className="text-xs mt-0.5" style={{color: '#64748B'}}>Super Admin</p>
          </div>
          <a href="/dashboard" className="text-sm" style={{color: '#64748B'}}>Dashboard</a>
        </div>

        {/* Add gym */}
        <div className="rounded-2xl p-6 mb-8" style={{background: '#0F2040'}}>
          <h2 className="text-white font-semibold text-lg mb-4">Add Gym</h2>
          <form onSubmit={addGym} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Gym name (e.g. ABC Gym)"
              value={newGymName}
              onChange={e => setNewGymName(e.target.value)}
              className="px-4 py-3 rounded-lg text-white focus:outline-none"
              style={{background: '#0A1628', border: '1px solid #1E3A5F'}}
            />
            <button
              type="submit"
              disabled={loading}
              className="py-3 rounded-full font-semibold text-white"
              style={{background: '#2563EB'}}
            >
              {loading ? 'Adding...' : 'Add Gym'}
            </button>
          </form>
        </div>

        {/* Gym list */}
        <h2 className="font-semibold text-lg mb-4 text-white">
          All Gyms <span className="text-sm font-normal" style={{color: '#64748B'}}>({gyms.length})</span>
        </h2>

        {gyms.length === 0 ? (
          <p className="text-center py-8" style={{color: '#64748B'}}>No gyms yet. Add one above.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {gyms.map(gym => (
              <div key={gym.id} className="rounded-xl overflow-hidden" style={{background: '#0F2040', border: '1px solid #1E3A5F'}}>
                <button
                  onClick={() => toggleExpand(gym.id)}
                  className="w-full px-4 py-3 flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full" style={{background: gym.owner_id ? '#22C55E' : '#64748B'}}></div>
                    <p className="text-white font-medium text-sm">{gym.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                      background: gym.owner_id ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)',
                      color: gym.owner_id ? '#22C55E' : '#64748B'
                    }}>
                      {gym.owner_id ? 'Owner set' : 'No owner'}
                    </span>
                  </div>
                  <span style={{color: '#64748B', transform: expanded === gym.id ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s'}}>
                    ▾
                  </span>
                </button>

                {expanded === gym.id && (
                  <div className="px-4 pb-4 pt-2 flex flex-col gap-3" style={{borderTop: '1px solid #1E3A5F'}}>

                    {/* Join URL */}
                    <div>
                      <p className="text-xs mb-1" style={{color: '#64748B'}}>Member Join URL</p>
                      <div className="flex gap-2">
                        <p className="text-xs flex-1 px-3 py-2 rounded-lg truncate" style={{background: '#0A1628', color: '#3B82F6'}}>
                          /join/{gym.code}
                        </p>
                        <button
                          onClick={() => copyJoinUrl(gym.code)}
                          className="text-xs px-3 py-2 rounded-lg font-semibold text-white"
                          style={{background: '#2563EB'}}
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    {/* Assign owner */}
                    <div>
                      <p className="text-xs mb-1" style={{color: '#64748B'}}>Assign Gym Owner</p>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="Owner email"
                          value={ownerEmail[gym.id] || ''}
                          onChange={e => setOwnerEmail({...ownerEmail, [gym.id]: e.target.value})}
                          className="flex-1 px-3 py-2 rounded-lg text-white text-sm focus:outline-none"
                          style={{background: '#0A1628', border: '1px solid #1E3A5F'}}
                        />
                        <button
                          onClick={() => assignOwner(gym.id)}
                          className="text-xs px-3 py-2 rounded-lg font-semibold text-white"
                          style={{background: '#2563EB'}}
                        >
                          Assign
                        </button>
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteGym(gym.id)}
                      className="py-2 rounded-full text-sm font-semibold text-center"
                      style={{background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444'}}
                    >
                      Delete Gym
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}