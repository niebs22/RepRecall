'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

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
      if (!user) {
        router.push('/login')
        return
      }
      const { data: gym } = await supabase
        .from('gyms')
        .select('*')
        .limit(1)
        .single()
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
      .from('machines')
      .select('*')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false })
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

  return (
    <main className="min-h-screen bg-black p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            {gymName && <p className="text-gray-400 text-sm">{gymName}</p>}
          </div>
          <a href="/dashboard" className="text-gray-400 hover:text-white text-sm">
            ← Dashboard
          </a>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 mb-8">
          <h2 className="text-white font-semibold text-lg mb-4">Add Machine</h2>
          <form onSubmit={addMachine} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Machine name (e.g. Bench Press)"
              value={newMachine}
              onChange={e => setNewMachine(e.target.value)}
              className="bg-black text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-white"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              className="bg-black text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200"
            >
              {loading ? 'Adding...' : 'Add Machine'}
            </button>
          </form>
        </div>

        <h2 className="text-white font-semibold text-lg mb-4">Your Machines</h2>

        {machines.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No machines yet. Add one above.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {machines.map(machine => (
              <div key={machine.id} className="bg-gray-900 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-white font-semibold">{machine.name}</p>
                    {machine.description && (
                      <p className="text-gray-400 text-sm">{machine.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteMachine(machine.id)}
                    className="text-red-400 hover:text-red-300 text-sm ml-4"
                  >
                    Delete
                  </button>
                </div>
                <div className="bg-black rounded-lg p-3 mt-2">
                  <p className="text-gray-400 text-xs mb-1">QR Code URL</p>
                  <p className="text-green-400 text-xs break-all">
                    https://rep-recall.vercel.app/machine/{machine.id}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}