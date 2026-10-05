'use client'
import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { QRCodeCanvas } from 'qrcode.react'

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function ProgressChart({ series, color }: { series: { d: string; w: number }[]; color: string }) {
  if (!series || series.length < 2) {
    return <p style={{ color: '#6B5E55', fontSize: 'clamp(18px, 2vw, 32px)' }}>Not enough data yet</p>
  }
  const W = 1000, H = 420, padL = 90, padR = 30, padT = 30, padB = 50
  const times = series.map(s => new Date(s.d).getTime())
  const t0 = Math.min(...times), t1 = Math.max(...times)
  const ws = series.map(s => Number(s.w))
  const minW = Math.min(...ws), maxW = Math.max(...ws)
  const spread = maxW - minW || 1
  const lo = Math.floor(Math.max(0, minW - spread * 0.15) / 5) * 5
  const hi = Math.ceil((maxW + spread * 0.15) / 5) * 5
  const x = (t: number) => padL + ((t - t0) / (t1 - t0 || 1)) * (W - padL - padR)
  const y = (w: number) => padT + (1 - (w - lo) / (hi - lo)) * (H - padT - padB)
  const pts = series.map((s, i) => ({ x: x(times[i]), y: y(Number(s.w)) }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${H - padB} L${pts[0].x.toFixed(1)},${H - padB} Z`
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxHeight: '60vh' }}>
      <defs>
        <linearGradient id="tvarea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={padL} y1={padT} x2={W - padR} y2={padT} stroke="#222" />
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#222" />
      <text x={padL - 12} y={padT + 6} fill="#6B5E55" fontSize="22" textAnchor="end">{Math.round(hi)}</text>
      <text x={padL - 12} y={H - padB + 6} fill="#6B5E55" fontSize="22" textAnchor="end">{Math.round(lo)}</text>
      <text x={padL} y={H - 14} fill="#6B5E55" fontSize="22" textAnchor="start">{fmtDate(series[0].d)}</text>
      <text x={W - padR} y={H - 14} fill="#6B5E55" fontSize="22" textAnchor="end">{fmtDate(series[series.length - 1].d)}</text>
      <path d={area} fill="url(#tvarea)" />
      <path d={line} fill="none" stroke={color} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="6" fill="#080808" stroke={color} strokeWidth="3" />)}
      <circle cx={last.x} cy={last.y} r="11" fill={color} />
    </svg>
  )
}

function CardSlide({ card, brand }: { card: any; brand: string }) {
  const label = card.type === 'pr' ? 'Personal record'
    : card.type === 'progress' ? 'Progress'
    : card.type === 'milestone' ? 'Consistency' : 'Shout-out'
  const machineLine = [card.machine, card.exercise].filter(Boolean).join(' - ')
  const d = card.data || {}
  const series: { d: string; w: number }[] = d.series || []
  const first = series.length ? Number(series[0].w) : 0
  const latest = series.length ? Number(series[series.length - 1].w) : 0

  return (
    <div style={{ width: '100%', padding: '3vw 5vw', display: 'flex', flexDirection: card.type === 'progress' ? 'row' : 'column', alignItems: card.type === 'progress' ? 'center' : 'stretch', justifyContent: 'center', gap: card.type === 'progress' ? '4vw' : '2vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2vh', flex: card.type === 'progress' ? '0 0 32%' : 'none' }}>
      <p style={{ color: brand, fontSize: 'clamp(16px, 1.8vw, 30px)', fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase' }}>{label}</p>
      {card.member && (
        <h1 style={{ color: '#F0EBE6', fontSize: 'clamp(40px, 7vw, 120px)', fontWeight: 900, lineHeight: 1.05 }}>{card.member}</h1>
      )}
      {card.headline && (
        <p style={{ color: '#E8E0D8', fontSize: 'clamp(24px, 3.4vw, 56px)', fontWeight: 600, lineHeight: 1.2 }}>{card.headline}</p>
      )}
      {machineLine && card.type !== 'shoutout' && (
        <p style={{ color: '#B0A89F', fontSize: 'clamp(18px, 2.2vw, 36px)' }}>{machineLine}</p>
      )}
      </div>

      {card.type === 'progress' && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <ProgressChart series={series} color={brand} />
          {series.length >= 2 && (
            <p style={{ color: '#B0A89F', fontSize: 'clamp(18px, 2.2vw, 36px)', marginTop: '1vh' }}>
              {first} lb to {latest} lb
              {latest > first && <span style={{ color: brand, fontWeight: 800 }}>{'  '}+{Math.round((latest - first) * 10) / 10} lb</span>}
            </p>
          )}
        </div>
      )}

      {card.type === 'pr' && (
        <div style={{ marginTop: '2vh' }}>
          <p style={{ color: brand, fontSize: 'clamp(64px, 14vw, 240px)', fontWeight: 900, lineHeight: 1 }}>
            {d.weight} <span style={{ fontSize: '0.35em', color: '#F0EBE6' }}>lb{d.reps ? ` x ${d.reps}` : ''}</span>
          </p>
          {d.previous_best != null && Number(d.weight) > Number(d.previous_best) && (
            <p style={{ color: '#E8E0D8', fontSize: 'clamp(20px, 2.6vw, 44px)', marginTop: '2vh' }}>
              +{Math.round((Number(d.weight) - Number(d.previous_best)) * 10) / 10} lb over previous best of {d.previous_best} lb
            </p>
          )}
          {d.date && <p style={{ color: '#6B5E55', fontSize: 'clamp(16px, 1.8vw, 30px)', marginTop: '1vh' }}>{fmtDate(d.date)}</p>}
        </div>
      )}

      {card.type === 'milestone' && (
        <div style={{ marginTop: '2vh' }}>
          <p style={{ color: brand, fontSize: 'clamp(64px, 14vw, 240px)', fontWeight: 900, lineHeight: 1 }}>
            {d.sessions_total} <span style={{ fontSize: '0.3em', color: '#F0EBE6' }}>sessions logged</span>
          </p>
          {d.sessions_30d > 0 && (
            <p style={{ color: '#E8E0D8', fontSize: 'clamp(20px, 2.6vw, 44px)', marginTop: '2vh' }}>
              {d.sessions_30d} in the last 30 days
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function JoinSlide({ gym, brand }: { gym: any; brand: string }) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3vh', padding: '4vw' }}>
      <p style={{ color: brand, fontSize: 'clamp(16px, 1.8vw, 30px)', fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase' }}>Join</p>
      <h1 style={{ color: '#F0EBE6', fontSize: 'clamp(36px, 6vw, 100px)', fontWeight: 900, textAlign: 'center', lineHeight: 1.1 }}>
        Scan to join {gym.name}
      </h1>
      <div style={{ background: 'white', padding: '2vh', borderRadius: '24px', boxShadow: `0 0 80px ${hexToRgba(brand, 0.35)}` }}>
        <QRCodeCanvas value={`https://scanset.app/join/${gym.code}`} size={340} level="H" />
      </div>
      <p style={{ color: '#B0A89F', fontSize: 'clamp(18px, 2.2vw, 36px)' }}>Scan. Log. Repeat.</p>
    </div>
  )
}

export default function TVPage() {
  const params = useParams()
  const token = params?.token as string
  const [feed, setFeed] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    async function load() {
      const { data } = await supabase.rpc('get_tv_feed', { p_token: token })
      if (!cancelled) {
        setFeed(data || null)
        setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 60000)
    return () => { cancelled = true; clearInterval(t) }
  }, [token])

  const slides = useMemo(() => {
    const cards: any[] = feed?.cards || []
    const out: any[] = []
    cards.forEach((c, i) => {
      out.push({ kind: 'card', card: c })
      if ((i + 1) % 2 === 0) out.push({ kind: 'join' })
    })
    if (cards.length % 2 !== 0 || cards.length === 0) out.push({ kind: 'join' })
    return out
  }, [feed])

  useEffect(() => {
    if (slides.length < 2) return
    const t = setInterval(() => setIdx(i => (i + 1) % slides.length), 12000)
    return () => clearInterval(t)
  }, [slides.length])

  if (loading) return <main style={{ background: '#080808', minHeight: '100vh' }} />
  if (!feed) return (
    <main style={{ background: '#080808', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B5E55', fontSize: '24px' }}>This TV link is not valid.</p>
    </main>
  )

  const gym = feed.gym
  const brand = gym.primary_color || '#E8440C'
  const safeIdx = slides.length ? idx % slides.length : 0
  const slide = slides[safeIdx]

  return (
    <main style={{ background: '#080808', minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <style>{`@keyframes tvfade { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }`}</style>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 20% 0%, ${hexToRgba(brand, 0.18)} 0%, transparent 60%)`, pointerEvents: 'none' }} />
      <div key={safeIdx} style={{ flex: 1, display: 'flex', alignItems: 'center', animation: 'tvfade 0.6s ease', position: 'relative' }}>
        {slide?.kind === 'join'
          ? <JoinSlide gym={gym} brand={brand} />
          : slide ? <CardSlide card={slide.card} brand={brand} /> : null}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2vh 5vw', position: 'relative' }}>
        {gym.logo_url
          ? <img src={gym.logo_url} alt={gym.name} style={{ maxWidth: '220px', maxHeight: '56px', width: 'auto', height: 'auto', objectFit: 'contain' }} />
          : <p style={{ color: '#F0EBE6', fontWeight: 800, fontSize: '22px' }}>{gym.name}</p>}
        <div style={{ display: 'flex', gap: '8px' }}>
          {slides.map((_: any, i: number) => (
            <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: i === safeIdx ? brand : '#222' }} />
          ))}
        </div>
        <p style={{ color: '#6B5E55', fontSize: '16px' }}><span style={{ fontWeight: 300 }}>scan</span><span style={{ fontWeight: 900 }}>set</span></p>
      </div>
    </main>
  )
}