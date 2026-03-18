'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { QRCodeCanvas } from 'qrcode.react'

export default function Admin() {
  const [machines, setMachines] = useState<any[]>([])
  const [newMachine, setNewMachine] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newType, setNewType] = useState('strength')
  const [gymId, setGymId] = useState<any>(null)
  const [gymName, setGymName] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [role, setRole] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile) { router.push('/dashboard'); return }
      setRole(profile.role)

      let gym = null

      if (profile.role === 'super_admin') {
        // Super admin sees first gym for now
        const { data } = await supabase
          .from('gyms').select('*').limit(1).single()
        gym = data
      } else if (profile.role === 'gym_owner') {
        // Gym owner sees their own gym
        const { data } = await supabase
          .from('gyms').select('*').eq('owner_id', user.id).single()
        gym = data
      } else {
        // Regular members don't get admin access
        router.push('/dashboard')
        return
      }

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
      description: newDescription,
      type: newType
    })
    setNewMachine('')
    setNewDescription('')
    setNewType('strength')
    fetchMachines(gymId)
    setLoading(false)
  }

  async function deleteMachine(id: string) {
    await supabase.from('machines').delete().eq('id', id)
    if (expanded === id) setExpanded(null)
    fetchMachines(gymId)
  }

  async function downloadQR(machineId: string, machineName: string) {
  const QRCode = await import('qrcode')

  const qrDataUrl = await QRCode.toDataURL(
    'https://rep-recall.vercel.app/machine/' + machineId,
    { width: 300, margin: 1, color: { dark: '#000000', light: '#ffffff' } }
  )

  const qrImage = new Image()
  qrImage.src = qrDataUrl

  qrImage.onload = () => {
    const cardWidth = 340
    const cardHeight = 500
    const canvas = document.createElement('canvas')
    canvas.width = cardWidth
    canvas.height = cardHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = '#0A1628'
    ctx.fillRect(0, 0, cardWidth, cardHeight)

    // --- LOGO MARK ---
    const cx = cardWidth / 2
    const cy = 80
    const sq = 24
    const inner = 14
    const gap = 5
    const spread = 28

    function drawCorner(x: number, y: number) {
      ctx.strokeStyle = '#2563EB'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.roundRect(x, y, sq, sq, 3)
      ctx.stroke()
      ctx.fillStyle = '#2563EB'
      ctx.beginPath()
      ctx.roundRect(x + gap, y + gap, inner, inner, 1)
      ctx.fill()
    }

    drawCorner(cx - spread - sq, cy - spread - sq)
    drawCorner(cx + spread, cy - spread - sq)
    drawCorner(cx - spread - sq, cy + spread)
    drawCorner(cx + spread, cy + spread)

    // SS center
    ctx.font = '900 42px Helvetica'
    ctx.fillStyle = '#2563EB'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('SS', cx, cy)

    // --- WORDMARK ---
    const wordmarkY = cy + spread + sq + 24
    ctx.textBaseline = 'alphabetic'
    ctx.font = '300 20px Helvetica'
    ctx.fillStyle = '#ffffff'
    const scanWidth = ctx.measureText('scan').width
    ctx.font = '900 20px Helvetica'
    const setWidth = ctx.measureText('set').width
    const totalWidth = scanWidth + setWidth
    const startX = cx - totalWidth / 2

    ctx.font = '300 20px Helvetica'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    ctx.fillText('scan', startX, wordmarkY)
    ctx.font = '900 20px Helvetica'
    ctx.fillStyle = '#2563EB'
    ctx.fillText('set', startX + scanWidth, wordmarkY)

    // Divider
    ctx.strokeStyle = '#1E3A5F'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(30, wordmarkY + 14)
    ctx.lineTo(cardWidth - 30, wordmarkY + 14)
    ctx.stroke()

    // QR code
    const qrSize = 220
    const qrX = (cardWidth - qrSize) / 2
    const qrY = wordmarkY + 26
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize)

    // Machine name
    ctx.font = '13px Helvetica'
    ctx.fillStyle = '#64748B'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(machineName, cardWidth / 2, qrY + qrSize + 22)

    // Divider
    ctx.strokeStyle = '#1E3A5F'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(30, qrY + qrSize + 34)
    ctx.lineTo(cardWidth - 30, qrY + qrSize + 34)
    ctx.stroke()

    // Tagline
    ctx.font = '10px Helvetica'
    ctx.fillStyle = '#2563EB'
    ctx.textAlign = 'center'
    ctx.fillText('SCAN. LOG. REPEAT.', cardWidth / 2, qrY + qrSize + 52)

    // Download
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = machineName + '-ScanSet-QR.png'
    a.click()
  }
  }

  function toggleExpand(id: string) {
    setExpanded(expanded === id ? null : id)
  }

  return (
    <main className="min-h-screen p-6" style={{background: '#0A1628'}}>
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white"><span style={{fontWeight: 300}}>scan</span><span style={{color: '#2563EB', fontWeight: 900}}>set</span></h1>
            <p className="text-xs mt-0.5" style={{color: '#64748B'}}>Admin Panel {gymName ? '— ' + gymName : ''}</p>
          </div>
          <div className="flex gap-4">
            <a href="/admin/analytics" className="text-sm" style={{color: '#3B82F6'}}>Analytics</a>
            {role === 'super_admin' && (
              <a href="/superadmin" className="text-sm" style={{color: '#64748B'}}>Super Admin</a>
            )}
            <a href="/dashboard" className="text-sm" style={{color: '#64748B'}}>Dashboard</a>
          </div>
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
            <div className="flex rounded-lg overflow-hidden" style={{border: '1px solid #1E3A5F'}}>
              <button
                type="button"
                onClick={() => setNewType('strength')}
                className="flex-1 py-3 text-sm font-semibold transition-colors"
                style={{
                  background: newType === 'strength' ? '#2563EB' : '#0A1628',
                  color: newType === 'strength' ? '#fff' : '#64748B'
                }}
              >
                💪 Strength
              </button>
              <button
                type="button"
                onClick={() => setNewType('cardio')}
                className="flex-1 py-3 text-sm font-semibold transition-colors"
                style={{
                  background: newType === 'cardio' ? '#2563EB' : '#0A1628',
                  color: newType === 'cardio' ? '#fff' : '#64748B'
                }}
              >
                🏃 Cardio
              </button>
            </div>
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
          <div className="flex flex-col gap-2">
            {machines.map(machine => (
              <div key={machine.id} className="rounded-xl overflow-hidden" style={{background: '#0F2040', border: '1px solid #1E3A5F'}}>
                <button
                  onClick={() => toggleExpand(machine.id)}
                  className="w-full px-4 py-3 flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full" style={{background: machine.type === 'cardio' ? '#22C55E' : '#2563EB'}}></div>
                    <p className="text-white font-medium text-sm">{machine.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                      background: machine.type === 'cardio' ? 'rgba(34,197,94,0.1)' : 'rgba(37,99,235,0.1)',
                      color: machine.type === 'cardio' ? '#22C55E' : '#3B82F6'
                    }}>
                      {machine.type === 'cardio' ? 'Cardio' : 'Strength'}
                    </span>
                  </div>
                  <span style={{color: '#64748B', transform: expanded === machine.id ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s'}}>
                    ▾
                  </span>
                </button>

                {expanded === machine.id && (
                  <div className="px-4 pb-4 pt-2" style={{borderTop: '1px solid #1E3A5F'}}>
                    {machine.description && (
                      <p className="text-xs mb-4" style={{color: '#64748B'}}>{machine.description}</p>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg" style={{background: 'white'}}>
                        <QRCodeCanvas
                          id={'qr-' + machine.id}
                          value={'https://rep-recall.vercel.app/machine/' + machine.id}
                          size={90}
                          level="H"
                        />
                      </div>
                      <div className="flex flex-col gap-2 flex-1">
                        <button
                          onClick={() => downloadQR(machine.id, machine.name)}
                          className="py-2 rounded-full text-sm font-semibold text-white text-center"
                          style={{background: '#2563EB'}}
                        >
                          Download QR
                        </button>
                        <button
                          onClick={() => deleteMachine(machine.id)}
                          className="py-2 rounded-full text-sm font-semibold text-center"
                          style={{background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444'}}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
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