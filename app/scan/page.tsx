'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ScanPage() {
  const router = useRouter()

  useEffect(() => {
    let scanner: any = null

    async function startScanner() {
      const { Html5QrcodeScanner } = await import('html5-qrcode')
      
      scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: 250 },
        false
      )

      scanner.render(
        (decodedText: string) => {
          scanner.clear()
          // Extract the path from the URL and navigate
          try {
            const url = new URL(decodedText)
            router.push(url.pathname)
          } catch {
            router.push(decodedText)
          }
        },
        (error: string) => {
          // Scanning in progress, ignore errors
        }
      )
    }

    startScanner()

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {})
      }
    }
  }, [])

  return (
    <main className="min-h-screen bg-black p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Scan Equipment</h1>
          <a href="/dashboard" className="text-gray-400 hover:text-white text-sm">
            ← Back
          </a>
        </div>
        <p className="text-gray-400 text-sm text-center mb-6">Point your camera at a QR code on any piece of equipment</p>
        <div id="qr-reader" className="rounded-xl overflow-hidden"></div>
      </div>
    </main>
  )
}