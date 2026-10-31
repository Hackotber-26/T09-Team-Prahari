const EARTH_RADIUS_METERS = 6371000
const CLUSTER_DISTANCE_METERS = 100

export function getReportCoordinates(report) {
  const rawLatitude = report.latitude ?? report.lat
  const rawLongitude = report.longitude ?? report.lng

  if (
    rawLatitude === '' ||
    rawLatitude === null ||
    rawLatitude === undefined ||
    rawLongitude === '' ||
    rawLongitude === null ||
    rawLongitude === undefined
  ) {
    return null
  }

  const latitude = Number(rawLatitude)
  const longitude = Number(rawLongitude)

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null
  }

  return { latitude, longitude }
}

function distanceMeters(first, second) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180
  const latitudeDifference = toRadians(second.latitude - first.latitude)
  const longitudeDifference = toRadians(second.longitude - first.longitude)
  const firstLatitude = toRadians(first.latitude)
  const secondLatitude = toRadians(second.latitude)
  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDifference / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine))
}

export function getReportPriority(reports) {
  const levels = reports.map((report) => {
    const priority = String(
      report.priority || report.severityLevel || report.severity || ''
    ).toLowerCase()

    if (priority === 'critical' || priority === 'very high') return 5
    if (priority === 'high') return 4
    if (priority === 'medium' || priority === 'moderate') return 3
    if (priority === 'low') return 2

    const severity = Number(report.severity)
    return Number.isFinite(severity) ? severity : 0
  })

  const highest = Math.max(...levels)
  if (highest >= 5) return 'Critical'
  if (highest >= 4) return 'High'
  if (highest >= 3) return 'Medium'
  if (highest > 0) return 'Low'
  return 'Unclassified'
}

export function groupReportsByProximity(reports) {
  const groups = []

  reports.forEach((report) => {
    const coordinates = getReportCoordinates(report)
    if (!coordinates) return

    const group = groups.find((candidate) =>
      distanceMeters(candidate, coordinates) <= CLUSTER_DISTANCE_METERS
    )

    if (group) {
      group.reports.push(report)
      const positions = group.reports
        .map(getReportCoordinates)
        .filter(Boolean)

      group.latitude =
        positions.reduce((sum, position) => sum + position.latitude, 0) /
        positions.length
      group.longitude =
        positions.reduce((sum, position) => sum + position.longitude, 0) /
        positions.length
    } else {
      groups.push({
        ...coordinates,
        reports: [report],
      })
    }
  })

  return groups.map((group, index) => ({
    ...group,
    id: `report-cluster-${index + 1}`,
    priority: getReportPriority(group.reports),
  }))
}
