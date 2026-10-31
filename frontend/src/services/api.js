const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
).replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options)
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError('Cannot reach the NearMiss Atlas backend. Check that the API server is running.')
    }
    throw error
  }

  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text()
  if (!response.ok) {
    const detail = typeof payload === 'object' && payload !== null
      ? payload.detail
      : payload
    throw new ApiError(
      typeof detail === 'string' ? detail : `The API request failed (${response.status}).`,
      response.status,
    )
  }
  return payload
}

export function toUiReport(report) {
  const attachments = (report.attachments || []).map((attachment) => ({
    ...attachment,
    name: attachment.filename,
    size: attachment.size_bytes,
    type: attachment.content_type || 'Evidence file',
    url: `${API_BASE_URL}${attachment.download_url}`,
  }))
  const locationName = report.location_name?.trim() || report.title?.trim() || 'Pinned location'
  return {
    ...report,
    location: locationName,
    locationName,
    lat: report.latitude,
    lng: report.longitude,
    type: report.category || 'Other',
    incidentType: report.category || 'Other',
    reportedAt: report.incident_datetime || report.created_at,
    createdAt: report.created_at,
    evidence: report.evidence_available,
    attachments,
    evidenceMetadata: attachments,
  }
}

export async function getReports() {
  const reports = await request('/api/v1/reports?limit=1000')
  return reports.map(toUiReport)
}

export function getHotspots() {
  return request('/api/v1/hotspots')
}

export async function createReport(report, idempotencyKey, onUploadProgress) {
  const saved = await request('/api/v1/reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      title: report.location,
      location_source: report.locationSource,
      latitude: report.lat,
      longitude: report.lng,
      description: report.description,
      category: report.type,
      severity: report.severity,
      incident_datetime: new Date().toISOString(),
      evidence_available: false,
    }),
  })

  let attachments = []
  if (report.attachments?.length) {
    const formData = new FormData()
    report.attachments.forEach((file) => formData.append('files', file, file.name))
    attachments = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE_URL}/api/v1/reports/${saved.id}/evidence`)
      xhr.responseType = 'json'
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onUploadProgress?.(Math.round((event.loaded / event.total) * 100))
        }
      })
      xhr.addEventListener('error', () => {
        reject(new ApiError('Evidence upload failed because the backend could not be reached.'))
      })
      xhr.addEventListener('load', () => {
        const payload = xhr.response
        if (xhr.status < 200 || xhr.status >= 300) {
          const detail = payload && typeof payload === 'object' ? payload.detail : null
          reject(new ApiError(
            typeof detail === 'string' ? detail : `Evidence upload failed (${xhr.status}).`,
            xhr.status,
          ))
          return
        }
        onUploadProgress?.(100)
        resolve(payload)
      })
      xhr.send(formData)
    })
  }

  return toUiReport({
    ...saved,
    evidence_available: attachments.length > 0,
    attachments,
  })
}

export function getSimilarReports(reportId) {
  return request(`/api/v1/reports/${reportId}/similar`)
}
