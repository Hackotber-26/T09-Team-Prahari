import { FileText, Flame, AlertTriangle, Calendar } from 'lucide-react'

const icons = { FileText, Flame, AlertTriangle, Calendar }
const tones = { blue: '#38BDF8', orange: '#F59E0B', red: '#EF4444' }

export default function StatCard({ label, value, icon, tone }) {
  const Icon = icons[icon]
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ color: tones[tone] }}>
        <Icon size={22} />
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}
