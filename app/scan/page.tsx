'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ScanPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    const fallbackTimer = setTimeout(() => {
      setShowFallback(true)
    }, 3000)

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
          setCameraReady(true)
          clearTimeout(fallbackTimer)
          startScanning()
        }
      } catch (err) {
        console.error('Camera error:', err)
        setShowFallback(true)
        clearTimeout(fallbackTimer)
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
        setShowFallback(true)
      }
    }

    startCamera()

    return () => {
      clearTimeout(fallbackTimer)
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return (
    <main className="min-h-screen p-6" style={{background: '#080808'}}>
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Rep<span style={{color: '#C23B0A'}}>Recall</span></h1>
          <a href="/dashboard" className="text-sm" style={{color: '#6B5E55'}}>
            Back
          </a>
        </div>

        <p className="text-sm text-center mb-4" style={{color: '#6B5E55'}}>
          Point your camera at a QR code on any piece of equipment
        </p>

        <div className="rounded-2xl overflow-hidden mb-4" style={{background: '#0F0F0F', minHeight: '200px'}}>
          <video
            ref={videoRef}
            className="w-full"
            playsInline
            muted
            autoPlay
          />
        </div>

        {showFallback && (
          <div className="rounded-2xl p-5 text-center" style={{background: '#0F0F0F', border: '1px solid #1A1A1A'}}>
            <p className="text-white font-semibold mb-2">Camera not loading?</p>
            <p className="text-sm mb-4" style={{color: '#6B5E55'}}>
              No problem — just open your phone camera app and point it at the QR code on any machine. It works exactly the same way.
            </p>
            <p className="text-sm py-2 font-semibold" style={{color: '#C23B0A'}}>
              Swipe out of this app and open your Camera app
            </p>
            <a href="/dashboard" className="block mt-3 py-3 rounded-full font-semibold text-center" style={{border: '1px solid #1A1A1A', color: '#6B5E55'}}>
              Back to Dashboard
            </a>
          </div>
        )}

        {!showFallback && (
          <p className="text-xs text-center mt-2" style={{color: '#6B5E55'}}>
            Make sure to allow camera access when prompted
          </p>
        )}
      </div>
    </main>
  )
}