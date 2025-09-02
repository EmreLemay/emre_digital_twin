import { cn } from '@/lib/utils'
import Card from '../layout/Card'

interface ViewerStatsProps {
  vertices?: number
  triangles?: number
  materials?: number
  animations?: number
  scenes?: number
  fileSize?: string
  renderTime?: number
  className?: string
  title?: string
}

export default function ViewerStats({
  vertices,
  triangles,
  materials,
  animations,
  scenes,
  fileSize,
  renderTime,
  className,
  title = "Model Statistics"
}: ViewerStatsProps) {
  const stats = [
    { label: 'Vertices', value: vertices?.toLocaleString() },
    { label: 'Triangles', value: triangles?.toLocaleString() },
    { label: 'Materials', value: materials },
    { label: 'Animations', value: animations },
    { label: 'Scenes', value: scenes },
    { label: 'File Size', value: fileSize },
    { label: 'Render Time', value: renderTime ? `${renderTime}ms` : undefined }
  ].filter(stat => stat.value !== undefined && stat.value !== null)

  if (stats.length === 0) {
    return (
      <Card title={title} className={className}>
        <p className="text-gray-400 text-sm">No model data available</p>
      </Card>
    )
  }

  return (
    <Card title={title} className={className}>
      <div className="space-y-3">
        {stats.map((stat, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">{stat.label}:</span>
            <span className="text-white font-medium">{stat.value}</span>
          </div>
        ))}
      </div>

      {renderTime && renderTime > 1000 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center text-yellow-400 text-xs">
            <span className="mr-1">⚠️</span>
            Slow render time detected
          </div>
        </div>
      )}
    </Card>
  )
}