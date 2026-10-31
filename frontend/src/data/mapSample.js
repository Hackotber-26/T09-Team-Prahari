const sampleTime = Date.now()

export const mapReports = [
  { id: 1, lat: 12.9716, lng: 77.5946, location: 'MG Road', type: 'Sudden braking', severity: 'High', description: 'Vehicle braked abruptly near junction.', reportedAt: sampleTime - 12 * 60000 },
  { id: 2, lat: 12.9352, lng: 77.6245, location: 'Koramangala', type: 'Near collision', severity: 'Critical', description: 'Two vehicles almost collided at turn.', reportedAt: sampleTime - 28 * 60000 },
  { id: 3, lat: 13.0358, lng: 77.597, location: 'Hebbal', type: 'Lane change', severity: 'Medium', description: 'Unsafe lane change without signal.', reportedAt: sampleTime - 60 * 60000 },
  { id: 4, lat: 12.9141, lng: 77.6101, location: 'BTM Layout', type: 'Pedestrian close call', severity: 'Low', description: 'Pedestrian crossed close to moving car.', reportedAt: sampleTime - 120 * 60000 },
]

export const mapHotspots = [
  { id: 1, lat: 12.9716, lng: 77.5946, name: 'MG Road Cluster', reports: 1, score: 91, priority: 'High', action: 'Deploy traffic calming and signage.' },
  { id: 2, lat: 12.9352, lng: 77.6245, name: 'Koramangala Cluster', reports: 1, score: 78, priority: 'Medium', action: 'Increase enforcement at peak hours.' },
  { id: 3, lat: 13.0358, lng: 77.597, name: 'Hebbal Cluster', reports: 1, score: 52, priority: 'Low', action: 'Monitor and collect more data.' },
]
