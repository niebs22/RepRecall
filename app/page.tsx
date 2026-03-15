export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6" style={{background: '#0A1628'}}>
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-1">Rep<span style={{color: '#2563EB'}}>Recall</span></h1>
          <p className="text-sm font-semibold tracking-widest uppercase" style={{color: '#2563EB'}}>Train Harder. Recall Easier.</p>
        </div>
        <p className="mb-10 max-w-xs mx-auto" style={{color: '#64748B'}}>Simplifying the way gym-goers log and track their workouts</p>
        <div className="flex flex-col gap-4">
          <a href="/login" className="px-8 py-3 rounded-full font-semibold text-white" style={{background: '#2563EB'}}>
            Log In
          </a>
          <a href="/signup" className="px-8 py-3 rounded-full font-semibold border text-white" style={{borderColor: '#2563EB', color: '#2563EB'}}>
            Sign Up
          </a>
        </div>
      </div>
    </main>
  )
}