import StatCard from '../components/StatCard'
import MapPlaceholder from '../components/MapPlaceholder'
import RecentReports from '../components/RecentReports'
import HotspotOverview from '../components/HotspotOverview'
import { stats } from '../data/sample'

export default function Dashboard() {
  return (
    <div className="dashboard">
      <div className="stat-grid">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>
      <MapPlaceholder />
      <div className="dashboard-bottom">
        <RecentReports />
        <HotspotOverview />
      </div>
    </div>
  )
}
