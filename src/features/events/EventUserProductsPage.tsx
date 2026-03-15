import { useParams } from 'react-router-dom'

export function EventUserProductsPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">User products</h1>
      <p className="mt-2 text-gray-600">Event id: {id}</p>
    </div>
  )
}
