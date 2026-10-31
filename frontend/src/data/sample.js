export const stats = [
  { label: 'Total Reports', value: 1284, icon: 'FileText', tone: 'blue' },
  { label: 'Active Hotspots', value: 37, icon: 'Flame', tone: 'orange' },
  { label: 'High Priority Areas', value: 9, icon: 'AlertTriangle', tone: 'red' },
  { label: 'Reports Today', value: 24, icon: 'Calendar', tone: 'blue' },
]

export const recentReports = [
  { id: 1, location: 'MG Road, Bangalore', type: 'Sudden braking', severity: 'High', time: '12 min ago' },
  { id: 2, location: 'Ring Road, Delhi', type: 'Near collision', severity: 'Critical', time: '28 min ago' },
  { id: 3, location: 'Anna Salai, Chennai', type: 'Pedestrian close call', severity: 'Medium', time: '1 hr ago' },
  { id: 4, location: 'Marine Drive, Mumbai', type: 'Lane change', severity: 'Low', time: '2 hr ago' },
  { id: 5, location: 'Outer Ring Road, Hyderabad', type: 'Red light run', severity: 'High', time: '3 hr ago' },
]

export const hotspots = [
  { id: 1, location: 'Silk Board Junction', reports: 42, score: 91, priority: 'Critical' },
  { id: 2, location: 'Hebbal Flyover', reports: 31, score: 78, priority: 'High' },
  { id: 3, location: 'Koramangala 80ft Rd', reports: 24, score: 64, priority: 'Medium' },
  { id: 4, location: 'Electronic City Phase 2', reports: 19, score: 52, priority: 'Medium' },
]
