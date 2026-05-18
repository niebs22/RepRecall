'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { QRCodeCanvas } from 'qrcode.react'
import jsPDF from 'jspdf'

export default function SuperAdmin() {
  const [gyms, setGyms] = useState<any[]>([])
  const [newGymName, setNewGymName] = useState('')
  const [newGymTimezone, setNewGymTimezone] = useState('America/New_York')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [ownerEmail, setOwnerEmail] = useState<Record<string, string>>({})
  const [setupLinks, setSetupLinks] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<Record<string, boolean>>({})

  // Gym manager state
  const [selectedGymId, setSelectedGymId] = useState('')
  const [gymMachines, setGymMachines] = useState<any[]>([])
  const [bulkNames, setBulkNames] = useState('')
  const [bulkType, setBulkType] = useState('strength')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newMachine, setNewMachine] = useState('')
  const [newType, setNewType] = useState('strength')
  const [machineLoading, setMachineLoading] = useState(false)
  const [expandedMachine, setExpandedMachine] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'super_admin') { router.push('/dashboard'); return }
      fetchGyms()
    }
    load()
  }, [])

  useEffect(() => {
    if (selectedGymId) fetchGymMachines(selectedGymId)
    else setGymMachines([])
  }, [selectedGymId])

  async function fetchGyms() {
    const { data } = await supabase.from('gyms').select('*').order('created_at', { ascending: false })
    if (data) setGyms(data)
  }

  async function fetchGymMachines(gymId: string) {
    const { data } = await supabase.from('machines').select('*').eq('gym_id', gymId).order('name', { ascending: true })
    if (data) setGymMachines(data)
  }

  async function addGym(e: any) {
    e.preventDefault()
    if (!newGymName.trim()) return
    setLoading(true)
    await supabase.from('gyms').insert({ name: newGymName.trim(), timezone: newGymTimezone })
    setNewGymName('')
    setNewGymTimezone('America/New_York')
    fetchGyms()
    setLoading(false)
  }

  async function deleteGym(id: string) {
    await supabase.from('gyms').delete().eq('id', id)
    if (expanded === id) setExpanded(null)
    if (selectedGymId === id) setSelectedGymId('')
    fetchGyms()
  }

  async function generateSetupLink(gymId: string) {
    const email = ownerEmail[gymId]
    if (!email) return
    const token = crypto.randomUUID()
    await supabase.from('gym_owner_invites').delete().eq('gym_id', gymId).eq('used', false)
    const { data, error } = await supabase
      .from('gym_owner_invites')
      .insert({ gym_id: gymId, email, token, used: false })
      .select().single()
    if (error || !data) { alert(`Error generating link: ${error?.message}`); return }
    const link = `https://scanset.app/owner-setup?token=${data.token}`
    setSetupLinks(prev => ({ ...prev, [gymId]: link }))
  }

  async function copyLink(gymId: string) {
    await navigator.clipboard.writeText(setupLinks[gymId])
    setCopied(prev => ({ ...prev, [gymId]: true }))
    setTimeout(() => setCopied(prev => ({ ...prev, [gymId]: false })), 2000)
  }

  async function bulkAddMachines(e: any) {
    e.preventDefault()
    if (!selectedGymId) return
    const names = bulkNames.split('\n').map(n => n.trim()).filter(Boolean)
    if (!names.length) return
    setBulkLoading(true)
    await supabase.from('machines').insert(names.map(name => ({ gym_id: selectedGymId, name, type: bulkType })))
    setBulkNames('')
    fetchGymMachines(selectedGymId)
    setBulkLoading(false)
  }

  async function addSingleMachine(e: any) {
    e.preventDefault()
    if (!newMachine.trim() || !selectedGymId) return
    setMachineLoading(true)
    await supabase.from('machines').insert({ gym_id: selectedGymId, name: newMachine.trim(), type: newType })
    setNewMachine('')
    setNewType('strength')
    fetchGymMachines(selectedGymId)
    setMachineLoading(false)
  }

  async function deleteMachine(id: string) {
    await supabase.from('machines').delete().eq('id', id)
    if (expandedMachine === id) setExpandedMachine(null)
    fetchGymMachines(selectedGymId)
  }

  async function exportAllCards() {
    if (!gymMachines.length) return
    const QRCode = await import('qrcode')
    const selectedGym = gyms.find(g => g.id === selectedGymId)
    const doc = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' })
    const cardW = 2.5, cardH = 2.0, cols = 3, rows = 5
    const cardsPerPage = cols * rows
    const marginX = (8.5 - cols * cardW) / 2
    const marginY = (11 - rows * cardH) / 2
    const cropSize = 0.08

    // Expand machines by quantity
const expandedMachines: any[] = []
gymMachines.forEach(machine => {
  const qty = quantities[machine.id] ?? 1
  for (let q = 0; q < qty; q++) expandedMachines.push(machine)
})

for (let i = 0; i < expandedMachines.length; i++) {
      const machine = expandedMachines[i]
      const posOnPage = i % cardsPerPage
      const col = posOnPage % cols
      const row = Math.floor(posOnPage / cols)
      if (i > 0 && posOnPage === 0) doc.addPage()
      const x = marginX + col * cardW
      const y = marginY + row * cardH

      doc.setFillColor(8, 8, 8)
      doc.rect(x, y, cardW, cardH, 'F')
      doc.setDrawColor(40, 40, 40)
      doc.setLineWidth(0.005)
      doc.rect(x, y, cardW, cardH, 'S')

      doc.setDrawColor(160, 160, 160)
      doc.setLineWidth(0.008)
      doc.line(x - cropSize, y, x - 0.015, y)
      doc.line(x, y - cropSize, x, y - 0.015)
      doc.line(x + cardW + 0.015, y, x + cardW + cropSize, y)
      doc.line(x + cardW, y - cropSize, x + cardW, y - 0.015)
      doc.line(x - cropSize, y + cardH, x - 0.015, y + cardH)
      doc.line(x, y + cardH + 0.015, x, y + cardH + cropSize)
      doc.line(x + cardW + 0.015, y + cardH, x + cardW + cropSize, y + cardH)
      doc.line(x + cardW, y + cardH + 0.015, x + cardW, y + cardH + cropSize)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(232, 224, 216)
      doc.text('scan', x + 0.14, y + 0.26)
      const scanW = doc.getTextWidth('scan')
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(232, 68, 12)
      doc.text('set', x + 0.14 + scanW, y + 0.26)

      const qrDataUrl = await QRCode.toDataURL(
        'https://scanset.app/machine/' + machine.id,
        { width: 300, margin: 1, color: { dark: '#000000', light: '#ffffff' } }
      )
      const qrSize = 1.1
      const qrX = x + (cardW - qrSize) / 2
      doc.addImage(qrDataUrl, 'PNG', qrX, y + 0.35, qrSize, qrSize)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(232, 224, 216)
      doc.text(machine.name, x + cardW / 2, y + 1.58, { align: 'center', maxWidth: cardW - 0.2 })

      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(232, 68, 12)
      doc.text('SCAN. LOG. REPEAT.', x + cardW / 2, y + cardH - 0.1, { align: 'center' })
    }

    doc.save((selectedGym?.name || 'Gym') + '-ScanSet-QR-Cards.pdf')
  }

  function toggleExpand(id: string) {
    setExpanded(expanded === id ? null : id)
  }

  function copyJoinUrl(code: string) {
    navigator.clipboard.writeText(`https://scanset.app/join/${code}`)
    alert('Join URL copied to clipboard')
  }

  const selectedGym = gyms.find(g => g.id === selectedGymId)

  return (
    <main className="min-h-screen p-6" style={{background: '#080808'}}>
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white"><span style={{fontWeight: 300}}>scan</span><span style={{color: '#E8440C', fontWeight: 900}}>set</span></h1>
            <p className="text-xs mt-0.5" style={{color: '#6B5E55'}}>Super Admin</p>
          </div>
          <a href="/dashboard" className="text-sm" style={{color: '#6B5E55'}}>Dashboard</a>
        </div>

        {/* Add gym */}
        <div className="rounded-2xl p-6 mb-8" style={{background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', border: '1px solid #222222'}}>
          <h2 className="text-white font-semibold text-lg mb-4">Add Gym</h2>
          <form onSubmit={addGym} className="flex flex-col gap-3">
            <input type="text" placeholder="Gym name (e.g. ABC Gym)" value={newGymName}
              onChange={e => setNewGymName(e.target.value)}
              className="px-4 py-3 rounded-lg text-white focus:outline-none"
              style={{background: '#080808', border: '1px solid #222222'}}/>
            <select value={newGymTimezone} onChange={e => setNewGymTimezone(e.target.value)}
              className="px-4 py-3 rounded-lg text-white focus:outline-none"
              style={{background: '#080808', border: '1px solid #222222'}}>
              <option value="America/New_York">Eastern (ET)</option>
              <option value="America/Chicago">Central (CT)</option>
              <option value="America/Denver">Mountain (MT)</option>
              <option value="America/Los_Angeles">Pacific (PT)</option>
              <option value="America/Anchorage">Alaska (AKT)</option>
              <option value="Pacific/Honolulu">Hawaii (HT)</option>
            </select>
            <button type="submit" disabled={loading} className="py-3 rounded-full font-semibold text-white" style={{background: '#E8440C'}}>
              {loading ? 'Adding...' : 'Add Gym'}
            </button>
          </form>
        </div>

        {/* ── GYM MANAGER ── */}
        <div className="rounded-2xl p-6 mb-8" style={{background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', border: '1px solid #222222'}}>
          <h2 className="text-white font-semibold text-lg mb-4">Manage Gym</h2>
          <select
            value={selectedGymId}
            onChange={e => setSelectedGymId(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-white focus:outline-none mb-4"
            style={{background: '#080808', border: '1px solid #222222', color: selectedGymId ? '#E8E0D8' : '#6B5E55'}}>
            <option value="">Select a gym...</option>
            {gyms.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          {selectedGymId && (
            <>
              <div className="flex justify-between items-center mb-4">
                <p className="text-xs font-bold tracking-widest uppercase" style={{color: '#6B5E55'}}>
                  {gymMachines.length} machines
                </p>
                {gymMachines.length > 0 && (
                  <button onClick={exportAllCards}
                    className="text-xs px-3 py-1.5 rounded-full font-semibold text-white"
                    style={{background: '#E8440C'}}>
                    Export QR PDF
                  </button>
                )}
              </div>

              {/* Bulk Add */}
              <div className="rounded-xl overflow-hidden mb-3" style={{border: '1px solid #222222'}}>
                <button onClick={() => setBulkOpen(p => !p)}
                  className="w-full flex justify-between items-center px-4 py-3"
                  style={{background: 'transparent', border: 'none', cursor: 'pointer'}}>
                  <p className="text-sm font-semibold text-white">Bulk Add Machines</p>
                  <span style={{color: '#6B5E55', transform: bulkOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s'}}>▾</span>
                </button>
                {bulkOpen && (
                  <div className="px-4 pb-4">
                    <p className="text-xs mb-3" style={{color: '#6B5E55'}}>One machine name per line</p>
                    <form onSubmit={bulkAddMachines} className="flex flex-col gap-3">
                      <textarea
                        placeholder={"Bench Press\nSquat Rack\nLeg Press"}
                        value={bulkNames}
                        onChange={e => setBulkNames(e.target.value)}
                        rows={8}
                        className="px-4 py-3 rounded-lg text-white focus:outline-none resize-none"
                        style={{background: '#080808', border: '1px solid #222222'}}/>
                      <div className="flex rounded-lg overflow-hidden" style={{border: '1px solid #222222'}}>
                        {['strength', 'cardio', 'functional'].map(t => (
                          <button key={t} type="button" onClick={() => setBulkType(t)}
                            className="flex-1 py-3 text-sm font-semibold"
                            style={{background: bulkType === t ? '#E8440C' : '#080808', color: bulkType === t ? '#fff' : '#6B5E55'}}>
                            {t === 'strength' ? '💪 Strength' : t === 'cardio' ? '🏃 Cardio' : '🏋️ Functional'}
                          </button>
                        ))}
                      </div>
                      <button type="submit" disabled={bulkLoading}
                        className="py-3 rounded-full font-semibold text-white"
                        style={{background: '#E8440C'}}>
                        {bulkLoading ? 'Adding...' : `Add ${bulkNames.split('\n').filter(n => n.trim()).length || ''} Machines`}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Single Add */}
              <div className="rounded-xl overflow-hidden mb-4" style={{border: '1px solid #222222'}}>
                <button onClick={() => setAddOpen(p => !p)}
                  className="w-full flex justify-between items-center px-4 py-3"
                  style={{background: 'transparent', border: 'none', cursor: 'pointer'}}>
                  <p className="text-sm font-semibold text-white">Add Single Machine</p>
                  <span style={{color: '#6B5E55', transform: addOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s'}}>▾</span>
                </button>
                {addOpen && (
                  <div className="px-4 pb-4">
                    <form onSubmit={addSingleMachine} className="flex flex-col gap-3">
                      <input type="text" placeholder="Machine name" value={newMachine}
                        onChange={e => setNewMachine(e.target.value)}
                        className="px-4 py-3 rounded-lg text-white focus:outline-none"
                        style={{background: '#080808', border: '1px solid #222222'}}/>
                      <div className="flex rounded-lg overflow-hidden" style={{border: '1px solid #222222'}}>
                        {['strength', 'cardio', 'functional'].map(t => (
                          <button key={t} type="button" onClick={() => setNewType(t)}
                            className="flex-1 py-3 text-sm font-semibold"
                            style={{background: newType === t ? '#E8440C' : '#080808', color: newType === t ? '#fff' : '#6B5E55'}}>
                            {t === 'strength' ? '💪 Strength' : t === 'cardio' ? '🏃 Cardio' : '🏋️ Functional'}
                          </button>
                        ))}
                      </div>
                      <button type="submit" disabled={machineLoading}
                        className="py-3 rounded-full font-semibold text-white"
                        style={{background: '#E8440C'}}>
                        {machineLoading ? 'Adding...' : 'Add Machine'}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Machine list */}
              {gymMachines.length > 0 && (
  <div className="flex flex-col gap-2">
    {gymMachines.map(machine => (
      <div key={machine.id} className="rounded-xl overflow-hidden" style={{background: '#080808', border: '1px solid #222222'}}>
        <div className="w-full px-4 py-3 flex justify-between items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{machine.name}</p>
            <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
              style={{background: 'rgba(232,68,12,0.1)', color: '#E8440C'}}>
              {machine.type}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs" style={{color: '#6B5E55'}}>Qty</span>
            <input
              type="number"
              min="1"
              max="99"
              value={quantities[machine.id] ?? 1}
              onChange={e => setQuantities(prev => ({...prev, [machine.id]: Math.max(1, parseInt(e.target.value) || 1)}))}
              className="w-14 px-2 py-1 rounded-lg text-white text-center focus:outline-none text-sm"
              style={{background: '#1A1A1A', border: '1px solid #333333'}}
            />
            <button onClick={() => setExpandedMachine(expandedMachine === machine.id ? null : machine.id)}
              style={{color: '#6B5E55', background: 'transparent', border: 'none', cursor: 'pointer',
                transform: expandedMachine === machine.id ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s', fontSize: '16px'}}>▾</button>
          </div>
        </div>
        {expandedMachine === machine.id && (
          <div className="px-4 pb-4 pt-2" style={{borderTop: '1px solid #222222'}}>
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg" style={{background: 'white'}}>
                <QRCodeCanvas value={'https://scanset.app/machine/' + machine.id} size={80} level="H"/>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <p className="text-xs" style={{color: '#6B5E55'}}>ID: {machine.id.slice(0, 8)}...</p>
                <button onClick={() => deleteMachine(machine.id)}
                  className="py-2 rounded-full text-sm font-semibold"
                  style={{background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444'}}>
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
            </>
          )}
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
              <div key={gym.id} className="rounded-xl overflow-hidden" style={{background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', border: '1px solid #222222'}}>
                <button onClick={() => toggleExpand(gym.id)}
                  className="w-full px-4 py-3 flex justify-between items-center"
                  style={{background: 'transparent', border: 'none', cursor: 'pointer'}}>
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full" style={{background: gym.owner_id ? '#E8440C' : '#6B5E55'}}></div>
                    <p className="text-white font-medium text-sm">{gym.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                      background: gym.owner_id ? 'rgba(194,59,10,0.1)' : 'rgba(100,116,139,0.1)',
                      color: gym.owner_id ? '#E8440C' : '#6B5E55'
                    }}>
                      {gym.owner_id ? 'Owner set' : 'No owner'}
                    </span>
                  </div>
                  <span style={{color: '#6B5E55', transform: expanded === gym.id ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s'}}>▾</span>
                </button>

                {expanded === gym.id && (
                  <div className="px-4 pb-4 pt-2 flex flex-col gap-4" style={{borderTop: '1px solid #222222'}}>
                    <div>
  <p className="text-xs mb-1" style={{color: '#6B5E55'}}>Member Join URL</p>
  <div className="flex gap-2 mb-3">
    <p className="text-xs flex-1 px-3 py-2 rounded-lg truncate" style={{background: '#080808', color: '#E8440C'}}>
      /join/{gym.code}
    </p>
    <button
      onClick={() => copyJoinUrl(gym.code)}
      className="text-xs px-3 py-2 rounded-lg font-semibold text-white"
      style={{background: '#E8440C'}}>
      Copy
    </button>
  </div>
  <div className="flex items-center gap-4">
    <div className="p-3 rounded-xl" style={{background: 'white'}}>
      <QRCodeCanvas
        value={`https://scanset.app/join/${gym.code}`}
        size={120}
        level="H"
      />
    </div>
    <div className="flex flex-col gap-2 flex-1">
      <p className="text-xs" style={{color: '#6B5E55'}}>Scan to join {gym.name}</p>
      <button
        onClick={async () => {
          const QRCode = await import('qrcode')
          const url = await QRCode.toDataURL(
            `https://scanset.app/join/${gym.code}`,
            { width: 1200, margin: 2, color: { dark: '#000000', light: '#ffffff' } }
          )
          const a = document.createElement('a')
          a.href = url
          a.download = gym.name + '-Join-QR.png'
          a.click()
        }}
        className="text-xs px-3 py-2 rounded-lg font-semibold text-white text-center"
        style={{background: '#E8440C'}}>
        Download QR (High Res)
      </button>
    </div>
  </div>
</div>
                    <div>
                      <p className="text-xs mb-1" style={{color: '#6B5E55'}}>Owner Setup Link</p>
                      <div className="flex gap-2 mb-2">
                        <input type="email" placeholder="Owner email"
                          value={ownerEmail[gym.id] || ''}
                          onChange={e => setOwnerEmail({...ownerEmail, [gym.id]: e.target.value})}
                          className="flex-1 px-3 py-2 rounded-lg text-white text-sm focus:outline-none"
                          style={{background: '#080808', border: '1px solid #222222'}}/>
                        <button onClick={() => generateSetupLink(gym.id)}
                          className="text-xs px-3 py-2 rounded-lg font-semibold text-white whitespace-nowrap"
                          style={{background: '#E8440C'}}>
                          Generate
                        </button>
                      </div>
                      {setupLinks[gym.id] && (
                        <div className="flex gap-2">
                          <p className="text-xs flex-1 px-3 py-2 rounded-lg truncate" style={{background: '#080808', color: '#6B5E55'}}>
                            {setupLinks[gym.id]}
                          </p>
                          <button onClick={() => copyLink(gym.id)}
                            className="text-xs px-3 py-2 rounded-lg font-semibold text-white whitespace-nowrap"
                            style={{background: copied[gym.id] ? '#1A1A1A' : '#E8440C', color: copied[gym.id] ? '#E8440C' : '#fff'}}>
                            {copied[gym.id] ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>
                    <button onClick={() => deleteGym(gym.id)}
                      className="py-2 rounded-full text-sm font-semibold text-center"
                      style={{background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444'}}>
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