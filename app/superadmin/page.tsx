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
  const [setupLinks, setSetupLinks] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<Record<string, boolean>>({})
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
    await supabase.from('gyms').insert({ name: newGymName.trim() })
    setNewGymName('')
    fetchGyms()
    setLoading(false)
  }

  async function deleteGym(id: string) {
    await supabase.from('gyms').delete().eq('id', id)
    if (expanded === id) setExpanded(null)
    fetchGyms()
  }

  async function generateSetupLink(gymId: string) {
    const email = ownerEmail[gymId]
    if (!email) return

    // Delete any existing unused invite for this gym
    await supabase
      .from('gym_owner_invites')
      .delete()
      .eq('gym_id', gymId)
      .eq('used', false)

    // Create new invite
    const { data, error } = await supabase
      .from('gym_owner_invites')
      .insert({ gym_id: gymId, email })
      .select()
      .single()

    if (error || !data) {
      alert('Error generating link. Check Supabase.')
      return
    }

    const link = `https://scanset.app/owner-setup?token=${data.token}`
    setSetupLinks(prev => ({ ...prev, [gymId]: link }))
  }

  async function copyLink(gymId: string) {
    await navigator.clipboard.writeText(setupLinks[gymId])
    setCopied(prev => ({ ...prev, [gymId]: true }))
    setTimeout(() => setCopied(prev => ({ ...prev, [gymId]: false })), 2000)
  }

  function toggleExpand(id: string) {
    setExpanded(expanded === id ? null : id)
  }

  function copyJoinUrl(code: string) {
    navigator.clipboard.writeText(`https://scanset.app/join/${code}`)
    alert('Join URL copied to clipboard')
  }

  return (
    <main className="min-h-screen p-6" style={{background: '#080808'}}>
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white"><span style={{fontWeight: 300}}>scan</span><span style={{color: '#C23B0A', fontWeight: 900}}>set</span></h1>
            <p className="text-xs mt-0.5" style={{color: '#6B5E55'}}>Super Admin</p>
          </div>
          <a href="/dashboard" className="text-sm" style={{color: '#6B5E55'}}>Dashboard</a>
        </div>

        {/* Add gym */}
        <div className="rounded-2xl p-6 mb-8" style={{background: '#0F0F0F'}}>
          <h2 className="text-white font-semibold text-lg mb-4">Add Gym</h2>
          <form onSubmit={addGym} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Gym name (e.g. ABC Gym)"
              value={newGymName}
              onChange={e => setNewGymName(e.target.value)}
              className="px-4 py-3 rounded-lg text-white focus:outline-none"
              style={{background: '#080808', border: '1px solid #1A1A1A'}}
            />
            <button
              type="submit"
              disabled={loading}
              className="py-3 rounded-full font-semibold text-white"
              style={{background: '#C23B0A'}}
            >
              {loading ? 'Adding...' : 'Add Gym'}
            </button>
          </form>
        </div>

        {/* Gym list */}
        <h2 className="font-semibold text-lg mb-4 text-white">
          All Gyms <span className="text-sm font-normal" style={{color: '#6B5E55'}}>({gyms.length})</span>
        </h2>

        {gyms.length === 0 ? (
          <p className="text-center py-8" style={{color: '#6B5E55'}}>No gyms yet. Add one above.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {gyms.map(gym => (
              <div key={gym.id} className="rounded-xl overflow-hidden" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
                <button
                  onClick={() => toggleExpand(gym.id)}
                  className="w-full px-4 py-3 flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full" style={{background: gym.owner_id ? '#C23B0A' : '#6B5E55'}}></div>
                    <p className="text-white font-medium text-sm">{gym.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                      background: gym.owner_id ? 'rgba(194,59,10,0.1)' : 'rgba(100,116,139,0.1)',
                      color: gym.owner_id ? '#C23B0A' : '#6B5E55'
                    }}>
                      {gym.owner_id ? 'Owner set' : 'No owner'}
                    </span>
                  </div>
                  <span style={{color: '#6B5E55', transform: expanded === gym.id ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s'}}>
                    ▾
                  </span>
                </button>

                {expanded === gym.id && (
                  <div className="px-4 pb-4 pt-2 flex flex-col gap-4" style={{borderTop: '1px solid #1A1A1A'}}>

                    {/* Member join URL */}
                    <div>
                      <p className="text-xs mb-1" style={{color: '#6B5E55'}}>Member Join URL</p>
                      <div className="flex gap-2">
                        <p className="text-xs flex-1 px-3 py-2 rounded-lg truncate" style={{background: '#080808', color: '#C23B0A'}}>
                          /join/{gym.code}
                        </p>
                        <button
                          onClick={() => copyJoinUrl(gym.code)}
                          className="text-xs px-3 py-2 rounded-lg font-semibold text-white"
                          style={{background: '#C23B0A'}}
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    {/* Generate owner setup link */}
                    <div>
                      <p className="text-xs mb-1" style={{color: '#6B5E55'}}>Owner Setup Link</p>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="email"
                          placeholder="Owner email"
                          value={ownerEmail[gym.id] || ''}
                          onChange={e => setOwnerEmail({...ownerEmail, [gym.id]: e.target.value})}
                          className="flex-1 px-3 py-2 rounded-lg text-white text-sm focus:outline-none"
                          style={{background: '#080808', border: '1px solid #1A1A1A'}}
                        />
                        <button
                          onClick={() => generateSetupLink(gym.id)}
                          className="text-xs px-3 py-2 rounded-lg font-semibold text-white whitespace-nowrap"
                          style={{background: '#C23B0A'}}
                        >
                          Generate
                        </button>
                      </div>
                      {setupLinks[gym.id] && (
                        <div className="flex gap-2">
                          <p className="text-xs flex-1 px-3 py-2 rounded-lg truncate" style={{background: '#080808', color: '#6B5E55'}}>
                            {setupLinks[gym.id]}
                          </p>
                          <button
                            onClick={() => copyLink(gym.id)}
                            className="text-xs px-3 py-2 rounded-lg font-semibold text-white whitespace-nowrap"
                            style={{background: copied[gym.id] ? '#1A1A1A' : '#C23B0A', color: copied[gym.id] ? '#C23B0A' : '#fff'}}
                          >
                            {copied[gym.id] ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      )}
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