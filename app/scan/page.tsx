'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function ScanPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    let stream: MediaStream | null = null

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute('playsinline', 'true')
          await videoRef.current.play()
          startScanning()
        }
      } catch (err) {
        console.error('Camera error:', err)
      }
    }

    async function startScanning() {
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser')
        const codeReader = new BrowserQRCodeReader()
        await codeReader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (result) {
              const text = result.getText()
              try {
                const url = new URL(text)
                router.push(url.pathname)
              } catch {
                router.push(text)
              }
            }
          }
        )
      } catch (err) {
        console.error('QR scan error:', err)
      }
    }

    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return (
    <main className="min-h-screen p-6" style={{background: '#0A1628'}}>
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Rep<span style={{color: '#2563EB'}}>Recall</span></h1>
          <a href="/dashboard" className="text-sm" style={{color: '#64748B'}}>
            Back
          </a>
        </div>
        <p className="text-sm text-center mb-6" style={{color: '#64748B'}}>
          Point your camera at a QR code on any piece of equipment
        </p>
        <div className="rounded-2xl overflow-hidden" style={{background: '#0F2040'}}>
          <video
            ref={videoRef}
            className="w-full"
            playsInline
            muted
            autoPlay
          />
        </div>
        <p className="text-xs text-center mt-4" style={{color: '#64748B'}}>
          Make sure to allow camera access when prompted
        </p>
      </div>
    </main>
  )
}