export default function Home() {
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">Rep Recall</h1>
        <p className="text-gray-400 text-lg mb-8">Train harder. Recall easier.</p>
        <div className="flex flex-col gap-4">
          <a href="/login" className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200">
            Log In
          </a>
          <a href="/signup" className="border border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-black">
            Sign Up
          </a>
        </div>
      </div>
    </main>
  )
}