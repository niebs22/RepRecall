'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { QRCodeCanvas } from 'qrcode.react'

export default function Admin() {
  const [machines, setMachines] = useState<any[]>([])
  const [newMachine, setNewMachine] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [gymId, setGymId] = useState<any>(null)
  const [gymName, setGymName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: gym } = await supabase
        .from('gyms').select('*').limit(1).single()
      if (gym) {
        setGymId(gym.id)
        setGymName(gym.name)
        fetchMachines(gym.id)
      }
    }
    load()
  }, [])

  async function fetchMachines(gymId: string) {
    const { data } = await supabase
      .from('machines').select('*').eq('gym_id', gymId)
      .order('name', { ascending: true })
    if (data) setMachines(data)
  }

  async function addMachine(e: any) {
    e.preventDefault()
    if (!newMachine.trim()) return
    setLoading(true)
    await supabase.from('machines').insert({
      gym_id: gymId,
      name: newMachine,
      description: newDescription
    })
    setNewMachine('')
    setNewDescription('')
    fetchMachines(gymId)
    setLoading(false)
  }

  async function deleteMachine(id: string) {
    await supabase.from('machines').delete().eq('id', id)
    fetchMachines(gymId)
  }

  function downloadQR(machineId: string, machineName: string) {
    const canvas = document.getElementById('qr-' + machineId) as HTMLCanvasElement
    if (canvas) {
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = machineName + '-QR.png'
      a.click()
    }
  }

  return (
    <main className="min-h-screen p-6" style={{background: '#0A1628'}}>
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Rep<span style={{color: '#2563EB'}}>Recall</span></h1>
            <p className="text-xs mt-0.5" style={{color: '#64748B'}}>Admin Panel {gymName ? '— ' + gymName : ''}</p>
          </div>
          <a href="/dashboard" className="text-sm" style={{color: '#64748B'}}>
            Dashboard
          </a>
        </div>

        {/* Add machine form */}
        <div className="rounded-2xl p-6 mb-8" style={{background: '#0F2040'}}>
          <h2 className="text-white font-semibold text-lg mb-4">Add Machine</h2>
          <form onSubmit={addMachine} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Machine name (e.g. Bench Press)"
              value={newMachine}
              onChange={e => setNewMachine(e.target.value)}
              className="px-4 py-3 rounded-lg text-white focus:outline-none"
              style={{background: '#0A1628', border: '1px solid #1E3A5F'}}
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              className="px-4 py-3 rounded-lg text-white focus:outline-none"
              style={{background: '#0A1628', border: '1px solid #1E3A5F'}}
            />
            <button
              type="submit"
              disabled={loading}
              className="py-3 rounded-full font-semibold text-white"
              style={{background: '#2563EB'}}
            >
              {loading ? 'Adding...' : 'Add Machine'}
            </button>
          </form>
        </div>

        <h2 className="font-semibold text-lg mb-4 text-white">
          Your Machines <span className="text-sm font-normal" style={{color: '#64748B'}}>({machines.length})</span>
        </h2>

        {machines.length === 0 ? (
          <p className="text-center py-8" style={{color: '#64748B'}}>No machines yet. Add one above.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {machines.map(machine => (
              <div key={machine.id} className="rounded-xl p-4" style={{background: '#0F2040', borderLeft: '3px solid #2563EB'}}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-white font-semibold">{machine.name}</p>
                    {machine.description && (
                      <p className="text-xs mt-0.5" style={{color: '#64748B'}}>{machine.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteMachine(machine.id)}
                    className="text-xs px-3 py-1 rounded-full ml-4"
                    style={{background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)'}}
                  >
                    Delete
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg" style={{background: 'white'}}>
                    <QRCodeCanvas
                      id={'qr-' + machine.id}
                      value={'https://rep-recall.vercel.app/machine/' + machine.id}
                      size={90}
                      level="H"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs mb-3 break-all" style={{color: '#64748B'}}>
                      rep-recall.vercel.app/machine/{machine.id.slice(0, 8)}...
                    </p>
                    <button
                      onClick={() => downloadQR(machine.id, machine.name)}
                      className="px-4 py-2 rounded-full text-sm font-semibold text-white"
                      style={{background: '#2563EB'}}
                    >
                      Download QR
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}