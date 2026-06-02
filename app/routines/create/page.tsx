'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function CreateRoutine() {
  const [user, setUser] = useState<any>(null)
  const [gymId, setGymId] = useState<string>('')
  const [machines, setMachines] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any[]>([])
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: memberData } = await supabase
        .from('gym_members')
        .select('gym_id')
        .eq('user_id', user.id)
        .single()
      if (!memberData) return
      setGymId(memberData.gym_id)
      const { data: machineData } = await supabase
        .from('machines')
        .select('*')
        .eq('gym_id', memberData.gym_id)
        .order('name', { ascending: true })
      if (machineData) setMachines(machineData)
    }
    load()
  }, [])

  function toggleMachine(machine: any) {
    if (selected.find(m => m.id === machine.id)) {
      setSelected(selected.filter(m => m.id !== machine.id))
    } else {
      setSelected([...selected, machine])
    }
  }

  function moveUp(index: number) {
    if (index === 0) return
    const updated = [...selected]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    setSelected(updated)
  }

  function moveDown(index: number) {
    if (index === selected.length - 1) return
    const updated = [...selected]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    setSelected(updated)
  }

  async function handleSave() {
    if (!name.trim() || selected.length === 0) return
    setSaving(true)
    const { data: routine } = await supabase
      .from('routines')
      .insert({ user_id: user.id, name: name.trim() })
      .select()
      .single()
    if (routine) {
      await supabase.from('routine_machines').insert(
        selected.map((m, i) => ({
          routine_id: routine.id,
          machine_id: m.id,
          order_index: i
        }))
      )
    }
    setSaving(false)
    router.push('/dashboard')
  }

  const filtered = machines.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  const TEAL = '#3D8B7A'
  const TEAL_BG = 'rgba(61,139,122,0.1)'
  const TEAL_BORDER = 'rgba(61,139,122,0.3)'

  return (
    <main className="min-h-screen p-6 pb-24" style={{background: '#080808'}}>
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-8">
          <a href="/dashboard" className="text-sm" style={{color: '#6B5E55'}}>← Back</a>
          <h1 className="text-lg font-bold text-white">Create Routine</h1>
          <div style={{width: '48px'}}></div>
        </div>

        {/* Routine name */}
        <div className="mb-6">
          <label className="text-xs font-bold tracking-widest uppercase mb-2 block" style={{color: TEAL}}>Routine Name</label>
          <input
            type="text"
            placeholder="e.g. Push Day, Leg Day"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-white focus:outline-none"
            style={{background: '#0F0F0F', border: `1px solid ${TEAL_BORDER}`}}
          />
        </div>

        {/* Selected machines */}
        {selected.length > 0 && (
          <div className="mb-6">
            <label className="text-xs font-bold tracking-widest uppercase mb-2 block" style={{color: TEAL}}>Your Routine ({selected.length} machines)</label>
            <div className="flex flex-col gap-2">
              {selected.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{background: TEAL_BG, border: `1px solid ${TEAL_BORDER}`, borderLeft: `2px solid ${TEAL}`}}>
                  <span className="text-xs font-bold w-4" style={{color: TEAL}}>{i + 1}</span>
                  <p className="flex-1 text-sm font-semibold text-white">{m.name}</p>
                  <div className="flex gap-1">
                    <button onClick={() => moveUp(i)}
                      className="text-xs px-2 py-1 rounded"
                      style={{color: TEAL, background: 'transparent', border: 'none', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 1}}>↑</button>
                    <button onClick={() => moveDown(i)}
                      className="text-xs px-2 py-1 rounded"
                      style={{color: TEAL, background: 'transparent', border: 'none', cursor: i === selected.length - 1 ? 'default' : 'pointer', opacity: i === selected.length - 1 ? 0.3 : 1}}>↓</button>
                    <button onClick={() => toggleMachine(m)}
                      className="text-xs px-2 py-1 rounded"
                      style={{color: '#EF4444', background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer'}}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Machine search */}
        <div className="mb-4">
          <label className="text-xs font-bold tracking-widest uppercase mb-2 block" style={{color: '#6B5E55'}}>Add Machines</label>
          <input
            type="text"
            placeholder="Search machines..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-white focus:outline-none mb-3"
            style={{background: '#0F0F0F', border: '1px solid #222222'}}
          />
          <div className="flex flex-col gap-2">
            {filtered.map(machine => {
              const isSelected = !!selected.find(m => m.id === machine.id)
              return (
                <button
                  key={machine.id}
                  onClick={() => toggleMachine(machine)}
                  className="flex justify-between items-center px-4 py-3 rounded-xl w-full text-left"
                  style={{
                    background: isSelected ? TEAL_BG : '#0F0F0F',
                    border: isSelected ? `1px solid ${TEAL}` : '1px solid #222222',
                    cursor: 'pointer'
                  }}>
                  <p className="text-sm font-medium text-white">{machine.name}</p>
                  {isSelected
                    ? <span className="text-xs font-bold" style={{color: TEAL}}>✓ Added</span>
                    : <span className="text-xs" style={{color: '#6B5E55'}}>+ Add</span>
                  }
                </button>
              )
            })}
          </div>
        </div>

        {/* Save button */}
        {selected.length > 0 && name.trim() && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-full font-semibold text-white fixed bottom-6 left-6 right-6 max-w-lg mx-auto"
            style={{background: TEAL, maxWidth: 'calc(100% - 48px)'}}>
            {saving ? 'Saving...' : `Save "${name}" Routine`}
          </button>
        )}
      </div>
    </main>
  )
}