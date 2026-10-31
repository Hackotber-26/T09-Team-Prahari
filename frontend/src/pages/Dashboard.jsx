import StatCard from '../components/StatCard'
import MapView from '../components/MapView'
import RecentReports from '../components/RecentReports'
import HotspotOverview from '../components/HotspotOverview'
import { stats } from '../data/sample'

export default function Dashboard({ reports }) {
  const total = reports ? reports.length : 0
  const cards = stats.map((s) => (s.label === 'Total Reports' ? { ...s, value: total } : s))
  return (
    <div className="dashboard">
      <div className="stat-grid">
        {cards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>
      <MapView reports={reports} />
      <div className="dashboard-bottom">
        <RecentReports />
        <HotspotOverview />
      </div>
    </div>
  )
}
