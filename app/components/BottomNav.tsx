'use client'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50"
      style={{background: '#080808', borderTop: '1px solid #1A1A1A', height: '80px'}}>
      <div className="max-w-lg mx-auto h-full flex items-center justify-around px-4 pb-2">

        {/* Home */}
        <a href="/dashboard" className="flex flex-col items-center gap-1 flex-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z"
              stroke={pathname === '/dashboard' ? '#C23B0A' : '#6B5E55'}
              strokeWidth="2" strokeLinejoin="round"/>
          </svg>
          <span className="text-xs font-semibold"
            style={{color: pathname === '/dashboard' ? '#C23B0A' : '#6B5E55'}}>
            Home
          </span>
        </a>

        {/* Scan — center floating */}
        <a href="/scan" className="flex flex-col items-center gap-1 flex-1"
          style={{position: 'relative', top: '-14px'}}>
          <div className="flex items-center justify-center rounded-full"
            style={{
              width: '58px', height: '58px',
              background: '#D44010',
              boxShadow: '0 4px 20px rgba(212,64,16,0.4)',
              border: '3px solid #080808'
            }}>
            <img src="/icon-192.png" width="32" height="32" style={{borderRadius: '6px'}} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wide"
            style={{color: '#C23B0A', letterSpacing: '0.5px'}}>
            Scan
          </span>
        </a>

        {/* History */}
        <a href="/history" className="flex flex-col items-center gap-1 flex-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="3" width="14" height="18" rx="2"
              stroke={pathname === '/history' ? '#C23B0A' : '#6B5E55'}
              strokeWidth="2"/>
            <line x1="8" y1="8" x2="16" y2="8"
              stroke={pathname === '/history' ? '#C23B0A' : '#6B5E55'}
              strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="8" y1="12" x2="16" y2="12"
              stroke={pathname === '/history' ? '#C23B0A' : '#6B5E55'}
              strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="8" y1="16" x2="12" y2="16"
              stroke={pathname === '/history' ? '#C23B0A' : '#6B5E55'}
              strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="text-xs font-semibold"
            style={{color: pathname === '/history' ? '#C23B0A' : '#6B5E55'}}>
            History
          </span>
        </a>

      </div>
    </nav>
  )
}