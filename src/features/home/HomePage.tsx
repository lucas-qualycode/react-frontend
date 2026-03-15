export function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col items-center gap-4 pb-8">
        <img
          src="/partiiu-logo.png"
          alt="Partiiu!"
          className="h-24 w-24 rounded-xl object-contain md:h-32 md:w-32"
        />
        <h1 className="text-2xl font-semibold text-gray-900">Home</h1>
        <p className="mt-2 text-gray-600">Partiiu! home.</p>
      </div>
    </div>
  )
}
