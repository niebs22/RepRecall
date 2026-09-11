'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Feedback() {
  const [user, setUser] = useState<any>(null)
  const [gymId, setGymId] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState('#E8440C')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [category, setCategory] = useState<'bug' | 'idea' | 'other'>('bug')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data } = await supabase
        .from('gym_members')
        .select('gym_id, gyms(gym_branding(primary_color, logo_url))')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setGymId(data.gym_id)
        const branding = (data.gyms as any)?.gym_branding
        const brandingRow = Array.isArray(branding) ? branding[0] : branding
        if (brandingRow?.primary_color) setBrandColor(brandingRow.primary_color)
        if (brandingRow?.logo_url) setLogoUrl(brandingRow.logo_url)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e: any) {
    e.preventDefault()
    if (!message.trim()) { setError('Please add a few words before sending.'); return }
    setSubmitting(true)
    setError('')

    const { error } = await supabase.from('feedback').insert({
      user_id: user.id,
      gym_id: gymId,
      category,
      message: message.trim(),
      page_context: typeof document !== 'undefined' ? document.referrer : null
    })

    setSubmitting(false)
    if (error) {
      setError('Something went wrong sending that. Please try again.')
      return
    }
    setSubmitted(true)
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{background: '#080808'}}>
      <p style={{color: '#6B5E55'}}>Loading...</p>
    </main>
  )

  if (submitted) return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 pb-28" style={{background: '#080808'}}>
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background: brandColor}}>
          <span className="text-2xl text-white">✓</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Thanks for the feedback!</h2>
        <p className="text-sm mb-6" style={{color: '#6B5E55'}}>We read every submission — this genuinely helps us make the app better.</p>
        <a href="/dashboard" className="inline-block py-3 px-8 rounded-full font-semibold text-white text-center" style={{background: brandColor}}>
          Back to Dashboard
        </a>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen p-6 pb-28" style={{background: '#080808'}}>
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt="Gym logo" style={{maxWidth: '160px', maxHeight: '72px', width: 'auto', height: 'auto', objectFit: 'contain'}} />
          ) : (
            <h1 className="text-2xl" style={{fontWeight: 300, color: '#E8E0D8'}}>
              scan<span style={{fontWeight: 900, color: '#E8440C'}}>set</span>
            </h1>
          )}
          <a href="/dashboard" className="text-sm" style={{color: '#6B5E55'}}>← Dashboard</a>
        </div>

        <h2 className="text-3xl font-bold mb-2" style={{color: '#E8E0D8', letterSpacing: '-0.5px'}}>Got Feedback?</h2>
        <p className="text-sm mb-8" style={{color: '#6B5E55'}}>Found a bug, have an idea, or just want to tell us something? We actually read these.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs mb-2 block font-semibold tracking-widest uppercase" style={{color: '#6B5E55'}}>What kind of feedback?</label>
            <div className="grid grid-cols-3 gap-2">
              {(['bug', 'idea', 'other'] as const).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className="py-3 rounded-xl text-sm font-semibold capitalize"
                  style={{
                    background: category === c ? brandColor : 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)',
                    color: category === c ? '#ffffff' : '#6B5E55',
                    border: category === c ? 'none' : '1px solid #222222'
                  }}>
                  {c === 'bug' ? '🐛 Bug' : c === 'idea' ? '💡 Idea' : '💬 Other'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs mb-2 block font-semibold tracking-widest uppercase" style={{color: '#6B5E55'}}>Tell us more</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={category === 'bug' ? "What happened? What did you expect instead?" : category === 'idea' ? "What would make this app better for you?" : "We're listening..."}
              rows={6}
              className="w-full px-4 py-3 rounded-lg text-white focus:outline-none resize-none"
              style={{background: '#0F0F0F', border: '1px solid #222222'}}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="py-3 rounded-full font-semibold text-white"
            style={{background: brandColor, opacity: submitting ? 0.6 : 1}}>
            {submitting ? 'Sending...' : 'Send Feedback'}
          </button>
        </form>
      </div>
    </main>
  )
}