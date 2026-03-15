import { useLocation } from 'react-router-dom'

export function PlaceholderPage({ title }: { title?: string }) {
  const location = useLocation()
  const name = title ?? (location.pathname || 'Page')
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">{name}</h1>
      <p className="mt-2 text-gray-600">Placeholder for this route.</p>
    </div>
  )
}
