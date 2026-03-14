'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function ScanPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let animationId: number

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
          scanQR()
        }
      } catch (err) {
        console.error('Camera error:', err)
      }
    }

    async function scanQR() {
      const { BrowserQRCodeReader } = await import('@zxing/browser')
      const codeReader = new BrowserQRCodeReader()
      
      try {
        const result = await codeReader.decodeFromVideoDevice(
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
    <main className="min-h-screen bg-black p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Scan Equipment</h1>
          <a href="/dashboard" className="text-gray-400 hover:text-white text-sm">
            Back
          </a>
        </div>
        <p className="text-gray-400 text-sm text-center mb-6">Point your camera at a QR code on any piece of equipment</p>
        <div className="rounded-xl overflow-hidden bg-gray-900">
          <video ref={videoRef} className="w-full" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </main>
  )
}