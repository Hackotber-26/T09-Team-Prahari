import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Crosshair,
  FileImage,
  FileText,
  MapPin,
  Search,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'

const incidentTypes = [
  'Near collision',
  'Sudden braking',
  'Dangerous overtaking',
  'Pedestrian conflict',
  'Poor road condition',
  'Other',
]
const severityLabels = {
  1: 'Low',
  2: 'Minor',
  3: 'Moderate',
  4: 'High',
  5: 'Critical',
}
const MAX_FILE_SIZE = 25 * 1024 * 1024
const MAX_ATTACHMENTS = 10
const ALLOWED_FILE_EXTENSIONS = new Set(['jpeg', 'jpg', 'pdf', 'png', 'webp'])
const SEARCH_DELAY_MS = 850
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org'
const initialForm = { location: '', type: '', severity: '3', description: '' }
const locationIcon = L.divIcon({
  className: 'report-location-pin',
  html: '<span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

function isValidCoordinates(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

function MapClickHandler({ onSelect, interactive }) {
  useMapEvents({
    click(event) {
      if (interactive) {
        onSelect({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        })
      }
    },
  })

  return null
}

function MapViewUpdater({ location }) {
  const map = useMap()

  useEffect(() => {
    if (location) {
      map.flyTo([location.latitude, location.longitude], Math.max(map.getZoom(), 15), {
        duration: 0.5,
      })
    }
  }, [location, map])

  return null
}

function LocationMap({ location, onSelect, interactive = true, label }) {
  const center = location
    ? [location.latitude, location.longitude]
    : [20, 0]

  return (
    <div className={`location-map${interactive ? ' is-interactive' : ' is-preview'}`}>
      <MapContainer
        center={center}
        zoom={location ? 15 : 2}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        zoomControl={interactive}
        keyboard={interactive}
        className="location-leaflet-map"
        aria-label={label}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onSelect={onSelect} interactive={interactive} />
        <MapViewUpdater location={location} />
        {location && (
          <Marker
            position={[location.latitude, location.longitude]}
            icon={locationIcon}
            draggable={interactive}
            eventHandlers={{
              dragend(event) {
                if (!interactive) return
                const point = event.target.getLatLng()
                onSelect({ latitude: point.lat, longitude: point.lng })
              },
            }}
          />
        )}
      </MapContainer>
      {interactive && (
        <span className="location-map-hint">
          <MapPin size={14} aria-hidden="true" />
          Click or drag the pin to select a location
        </span>
      )}
    </div>
  )
}

function getFileCategory(file) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (['jpeg', 'jpg', 'png', 'webp'].includes(extension)) return 'image'
  if (extension === 'pdf') return 'document'
  return 'file'
}

function FileTypeIcon({ file }) {
  const category = getFileCategory(file)
  const Icon =
    category === 'image'
      ? FileImage
      : FileText
  return <Icon size={20} aria-hidden="true" />
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validateForm(form, location) {
  const errors = {}
  if (!location || !isValidCoordinates(location.latitude, location.longitude)) {
    errors.location = 'Select the incident location using GPS, search, or the map.'
  }
  if (!form.type) errors.type = 'Select an incident type.'
  const severity = Number(form.severity)
  if (!Number.isInteger(severity) || severity < 1 || severity > 5) {
    errors.severity = 'Select a severity from 1 to 5.'
  }
  if (!form.description.trim()) errors.description = 'Description is required.'
  if (form.description.length > 500) errors.description = 'Description must be 500 characters or fewer.'
  return errors
}

export default function ReportIncident({ onAdd }) {
  const [form, setForm] = useState(initialForm)
  const [location, setLocation] = useState(null)
  const [locationMode, setLocationMode] = useState('search')
  const [locationQuery, setLocationQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [attachments, setAttachments] = useState([])
  const [fileError, setFileError] = useState('')
  const [errors, setErrors] = useState({})
  const [submissionError, setSubmissionError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [draggingFiles, setDraggingFiles] = useState(false)
  const searchController = useRef(null)
  const reverseController = useRef(null)
  const searchSequence = useRef(0)
  const geocoderLastRequest = useRef(0)
  const submissionInProgress = useRef(false)
  const fileInput = useRef(null)
  const reviewDialog = useRef(null)
  const previousFocus = useRef(null)
  const attachmentsRef = useRef(attachments)
  const submissionKey = useRef(null)

  const fetchGeocoder = useCallback(async (url, options = {}) => {
    const wait = Math.max(
      0,
      1000 - (Date.now() - geocoderLastRequest.current)
    )
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait))
    if (options.signal?.aborted) {
      throw new DOMException('The request was aborted.', 'AbortError')
    }

    geocoderLastRequest.current = Date.now()
    return fetch(url, {
      ...options,
      headers: { Accept: 'application/json', ...options.headers },
    })
  }, [])

  useEffect(
    () => () => {
      searchController.current?.abort()
      reverseController.current?.abort()
      attachmentsRef.current.forEach((attachment) => {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl)
      })
    },
    []
  )

  useEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])

  useEffect(() => {
    const query = locationQuery.trim()
    if (
      locationMode !== 'search' ||
      query.length < 3 ||
      (location?.source === 'search' && query === location.query)
    ) {
      return () => searchController.current?.abort()
    }

    const timerId = setTimeout(async () => {
      searchController.current?.abort()
      const controller = new AbortController()
      searchController.current = controller
      const sequence = ++searchSequence.current
      setSearching(true)

      try {
        const parameters = new URLSearchParams({
          q: query,
          format: 'jsonv2',
          addressdetails: '1',
          limit: '5',
        })
        const response = await fetchGeocoder(`${NOMINATIM_URL}/search?${parameters}`, {
          signal: controller.signal,
        })
        if (response.status === 429) {
          throw new Error('Location search is temporarily limited. Please wait a moment and try again.')
        }
        if (!response.ok) throw new Error('Location search is unavailable right now. Please try again.')

        const results = await response.json()
        if (sequence !== searchSequence.current) return
        setSuggestions(
          results
            .map((result) => ({
              label: result.display_name,
              latitude: Number(result.lat),
              longitude: Number(result.lon),
            }))
            .filter((result) =>
              isValidCoordinates(result.latitude, result.longitude)
            )
        )
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSuggestions([])
          setLocationError(
            error instanceof TypeError
              ? 'Location search is unavailable. Check your connection and try again.'
              : error.message || 'Unable to search for this location.'
          )
        }
      } finally {
        if (sequence === searchSequence.current) setSearching(false)
      }
    }, SEARCH_DELAY_MS)

    return () => {
      clearTimeout(timerId)
      searchController.current?.abort()
    }
  }, [fetchGeocoder, location?.query, location?.source, locationMode, locationQuery])

  useEffect(() => {
    if (!reviewOpen) return undefined

    previousFocus.current = document.activeElement
    reviewDialog.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !submitting) setReviewOpen(false)
      if (event.key === 'Tab') {
        const focusable = reviewDialog.current?.querySelectorAll(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable?.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus.current?.focus?.()
    }
  }, [reviewOpen, submitting])

  const setCoordinates = async (coordinates, source, query = '') => {
    if (!isValidCoordinates(coordinates.latitude, coordinates.longitude)) {
      setLocationError('The selected location has invalid coordinates. Please choose another location.')
      return
    }

    const nextLocation = {
      ...coordinates,
      address: source === 'search' ? query : '',
      source,
      query,
    }
    setLocation(nextLocation)
    setLocationError('')
    setSuggestions([])
    reverseController.current?.abort()
    if (source !== 'search') {
      setLocationQuery('')
      setForm((current) => ({ ...current, location: '' }))
    }
    setErrors((current) => {
      const next = { ...current }
      delete next.location
      return next
    })

    if (source === 'search' && query) {
      setForm((current) => ({ ...current, location: query }))
      return
    }

    const controller = new AbortController()
    reverseController.current = controller

    try {
      const parameters = new URLSearchParams({
        lat: String(coordinates.latitude),
        lon: String(coordinates.longitude),
        format: 'jsonv2',
      })
      const response = await fetchGeocoder(`${NOMINATIM_URL}/reverse?${parameters}`, {
        signal: controller.signal,
      })
      if (response.status === 429) {
        throw new Error('Address lookup is temporarily limited. The coordinates are selected; you can enter a landmark instead.')
      }
      if (!response.ok) throw new Error('Could not find an address. The coordinates are selected; you can enter a landmark instead.')
      const result = await response.json()
      const address = result.display_name || ''
      setLocation((current) =>
        current?.latitude === coordinates.latitude &&
        current?.longitude === coordinates.longitude
          ? { ...current, address }
          : current
      )
      if (address) {
        setForm((current) =>
          current.location ? current : { ...current, location: address }
        )
      } else {
        setLocationError('No readable address was found. The coordinates are selected; you can enter a landmark instead.')
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setLocationError(
          error instanceof TypeError
            ? 'Address lookup is unavailable. You can still add a landmark name.'
            : error.message || 'Address lookup failed. You can still add a landmark name.'
        )
      }
    }
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Location services are not supported by this browser.')
      return
    }

    setLocating(true)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false)
        void setCoordinates(
          { latitude: coords.latitude, longitude: coords.longitude },
          'gps'
        )
      },
      (error) => {
        setLocating(false)
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Allow location access in your browser or choose a location by search or map.'
            : error.code === error.TIMEOUT
              ? 'Getting your location timed out. Please try again or choose a location by search or map.'
              : 'Your location is unavailable right now. Please try again or choose a location by search or map.'
        setLocationError(message)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }

  const selectSearchResult = (result) => {
    setLocationQuery(result.label)
    setForm((current) => ({ ...current, location: result.label }))
    void setCoordinates(result, 'search', result.label)
  }

  const clearLocation = () => {
    setLocation(null)
    setLocationQuery('')
    setSuggestions([])
    setForm((current) => ({ ...current, location: '' }))
    setLocationError('')
  }

  const selectLocationMode = (mode) => {
    setLocationMode(mode)
    setSuggestions([])
    setSearching(false)
  }

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
    setSubmissionError('')
  }

  const addFiles = (selectedFiles) => {
    const files = Array.from(selectedFiles)
    const next = [...attachments]
    const messages = []
    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        messages.push(`${file.name} exceeds the 25 MB per-file limit.`)
        return
      }
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!extension || !ALLOWED_FILE_EXTENSIONS.has(extension)) {
        messages.push(`${file.name} is unsupported. Attach JPG, JPEG, PNG, WEBP, or PDF files.`)
        return
      }
      const duplicate = next.some(
        (attachment) =>
          attachment.file.name === file.name &&
          attachment.file.size === file.size &&
          attachment.file.lastModified === file.lastModified
      )
      if (duplicate) {
        messages.push(`${file.name} is already attached.`)
        return
      }
      if (next.length >= MAX_ATTACHMENTS) {
        messages.push(`A report can have at most ${MAX_ATTACHMENTS} evidence files.`)
        return
      }
      const category = getFileCategory(file)
      const previewUrl =
        category === 'image' || category === 'video'
          ? URL.createObjectURL(file)
          : ''
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        previewUrl,
        category,
      })
    })
    setAttachments(next)
    setFileError(messages.join(' '))
  }

  const removeAttachment = (id) => {
    setAttachments((current) => {
      const removed = current.find((attachment) => attachment.id === id)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return current.filter((attachment) => attachment.id !== id)
    })
  }

  const clearAttachments = () => {
    attachments.forEach((attachment) => {
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl)
    })
    setAttachments([])
    setFileError('')
    if (fileInput.current) fileInput.current.value = ''
  }

  const resetForm = () => {
    clearAttachments()
    setForm(initialForm)
    clearLocation()
    setErrors({})
    setSubmissionError('')
    setReviewOpen(false)
    submissionKey.current = null
  }

  const submit = async (event) => {
    event.preventDefault()
    if (submissionInProgress.current) return

    const validationErrors = validateForm(form, location)
    setErrors(validationErrors)
    setSubmissionError('')
    if (Object.keys(validationErrors).length) return
    setReviewOpen(true)
  }

  const confirmSubmission = async () => {
    if (submissionInProgress.current || !location) return

    submissionInProgress.current = true
    setSubmitting(true)
    setUploadProgress(null)
    setSubmissionError('')

    try {
      if (typeof onAdd !== 'function') {
        throw new Error('Report submission is unavailable. Please try again.')
      }

      const report = {
        location: form.location.trim() || location.address || 'Pinned location',
        lat: location.latitude,
        lng: location.longitude,
        type: form.type,
        severity: Number(form.severity),
        description: form.description.trim(),
        reportedAt: Date.now(),
        evidence: attachments.length > 0,
        attachments: attachments.map(({ file }) => file),
        evidenceMetadata: attachments.map(({ file }) => ({
          name: file.name,
          size: file.size,
          type: file.type || 'Unknown file type',
        })),
        locationSource: location.source,
        submissionKey: submissionKey.current || (submissionKey.current = globalThis.crypto?.randomUUID?.()
          || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      }

      await onAdd(report, setUploadProgress)
      attachments.forEach((attachment) => {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl)
      })
      setForm(initialForm)
      setLocation(null)
      setLocationQuery('')
      setAttachments([])
      setReviewOpen(false)
      submissionKey.current = null
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : 'Unable to submit the report. Please try again.'
      )
    } finally {
      submissionInProgress.current = false
      setSubmitting(false)
    }
  }

  const suggestedLocationError =
    !location && locationError ? locationError : ''

  return (
    <section className="page incident-page">
      <div className="incident-heading">
        <p className="incident-eyebrow">Help make road risks visible</p>
        <h1>Report a near-miss</h1>
        <p>Share what happened, choose the incident location, and submit it to the NearMiss Atlas database.</p>
      </div>

      <form className="report-form incident-form" onSubmit={submit} noValidate>
        <section className="form-section location-section" aria-labelledby="location-section-title">
          <div className="form-section-heading">
            <span className="form-section-number">01</span>
            <div>
              <h2 id="location-section-title">Where did it happen?</h2>
              <p>Select a location using GPS, search, or the map. Coordinates are collected automatically.</p>
            </div>
            <span className="required-note">Required <span aria-hidden="true">*</span></span>
          </div>

          <div className="location-mode-tabs" role="tablist" aria-label="Location selection method">
            <button type="button" role="tab" aria-selected={locationMode === 'search'} className={locationMode === 'search' ? 'location-mode active' : 'location-mode'} onClick={() => selectLocationMode('search')}>
              <Search size={16} aria-hidden="true" /> Search
            </button>
            <button type="button" role="tab" aria-selected={locationMode === 'current'} className={locationMode === 'current' ? 'location-mode active' : 'location-mode'} onClick={() => selectLocationMode('current')}>
              <Crosshair size={16} aria-hidden="true" /> Current location
            </button>
            <button type="button" role="tab" aria-selected={locationMode === 'map'} className={locationMode === 'map' ? 'location-mode active' : 'location-mode'} onClick={() => selectLocationMode('map')}>
              <MapPin size={16} aria-hidden="true" /> Choose on map
            </button>
          </div>

          <div className="location-method-panel">
            {locationMode === 'search' && (
              <div className="location-search-panel">
                <label className="location-search-label" htmlFor="location-search">
                  Search a road, junction, landmark, area, or address
                </label>
                <div className="location-search-wrap">
                  <Search size={17} aria-hidden="true" />
                  <input
                    id="location-search"
                    type="search"
                    autoComplete="off"
                    placeholder="e.g. MG Road, Bengaluru"
                    value={locationQuery}
                    aria-expanded={suggestions.length > 0}
                    aria-controls="location-suggestions"
                    onChange={(event) => {
                      setLocationQuery(event.target.value)
                      setSuggestions([])
                      setSearching(false)
                      setLocationError('')
                    }}
                  />
                  {searching && <span className="search-spinner" aria-label="Searching" />}
                </div>
                {suggestions.length > 0 && (
                  <ul className="location-suggestions" id="location-suggestions" role="listbox" aria-label="Location search results">
                    {suggestions.map((result) => (
                      <li key={`${result.latitude}-${result.longitude}-${result.label}`}>
                        <button type="button" role="option" aria-selected={false} onClick={() => selectSearchResult(result)}>
                          <MapPin size={16} aria-hidden="true" />
                          <span>{result.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {locationQuery.trim().length > 0 && locationQuery.trim().length < 3 && (
                  <p className="form-hint">Enter at least 3 characters to search.</p>
                )}
                {locationQuery.trim().length >= 3 &&
                  !searching &&
                  !suggestions.length &&
                  !locationError &&
                  !(location?.source === 'search' && location.query === locationQuery.trim()) && (
                  <p className="form-hint">No locations found. Try a nearby street or landmark.</p>
                )}
              </div>
            )}
            {locationMode === 'current' && (
              <div className="current-location-panel">
                <div>
                  <strong>Use your device location</strong>
                  <p>Your browser will ask for permission only after you select this button.</p>
                </div>
                <button type="button" className="secondary-action" onClick={useCurrentLocation} disabled={locating}>
                  <Crosshair size={16} aria-hidden="true" />
                  {locating ? 'Finding you…' : 'Use My Current Location'}
                </button>
              </div>
            )}
            {locationMode === 'map' && (
              <p className="map-select-instruction">Click on the map to select the incident location. You can zoom and move the map, or drag the marker.</p>
            )}
          </div>

          {(locationMode !== 'search' || location) && (
            <LocationMap
              location={location}
              onSelect={(coordinates) => void setCoordinates(coordinates, 'map')}
              interactive
              label="Choose the incident location on the map"
            />
          )}

          {suggestedLocationError && <p className="location-error" role="alert"><AlertCircle size={15} />{suggestedLocationError}</p>}
          {location && (
            <div className="selected-location-card">
              <div className="selected-location-copy">
                <span className="location-confirmation"><CheckCircle2 size={16} /> Location selected</span>
                <strong>{location.address || form.location || 'Address lookup in progress'}</strong>
                <span className="form-hint">
                  {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · coordinates are saved with your report
                </span>
                <button type="button" className="text-action" onClick={clearLocation}>Change or clear location</button>
              </div>
              <div className="selected-location-preview">
                <LocationMap location={location} interactive={false} label="Map preview of selected incident location" />
              </div>
            </div>
          )}
          {errors.location && <p className="err" role="alert"><AlertCircle size={14} />{errors.location}</p>}
          {locationError && location && <p className="location-error" role="status"><AlertCircle size={15} />{locationError}</p>}

          <label className="incident-location-label" htmlFor="incident-landmark">
            Incident location or landmark <span>(optional)</span>
            <input
              id="incident-landmark"
              autoComplete="street-address"
              placeholder="Add a nearby road or landmark if the address needs context"
              value={form.location}
              onChange={(event) => updateField('location', event.target.value)}
            />
          </label>
        </section>

        <section className="form-section" aria-labelledby="incident-section-title">
          <div className="form-section-heading">
            <span className="form-section-number">02</span>
            <div>
              <h2 id="incident-section-title">Tell us what happened</h2>
              <p>A few details help explain the road-safety concern.</p>
            </div>
          </div>

          <div className="incident-select-fields">
            <label htmlFor="report-type">
              Incident type <span className="required-mark" aria-hidden="true">*</span>
              <select id="report-type" value={form.type} aria-invalid={Boolean(errors.type)} aria-describedby={errors.type ? 'report-type-error' : undefined} onChange={(event) => updateField('type', event.target.value)}>
                <option value="">Select an incident type</option>
                {incidentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              {errors.type && <span className="err" id="report-type-error">{errors.type}</span>}
            </label>
            <label htmlFor="report-severity">
              Severity <span className="required-mark" aria-hidden="true">*</span>
              <select id="report-severity" value={form.severity} aria-invalid={Boolean(errors.severity)} aria-describedby={errors.severity ? 'report-severity-error' : undefined} onChange={(event) => updateField('severity', event.target.value)}>
                {[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level} — {severityLabels[level]}</option>)}
              </select>
              {errors.severity && <span className="err" id="report-severity-error">{errors.severity}</span>}
            </label>
          </div>

          <label htmlFor="report-description">
            Description <span className="required-mark" aria-hidden="true">*</span>
            <textarea id="report-description" value={form.description} maxLength={500} placeholder="Briefly describe the near-miss and any road conditions that may have contributed." aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'report-description-error report-description-count' : 'report-description-count'} onChange={(event) => updateField('description', event.target.value)} />
            <span className="form-hint" id="report-description-count">{form.description.length}/500 characters</span>
            {errors.description && <span className="err" id="report-description-error">{errors.description}</span>}
          </label>
        </section>

        <section className="form-section evidence-section" aria-labelledby="evidence-section-title">
          <div className="form-section-heading">
            <span className="form-section-number">03</span>
            <div>
              <h2 id="evidence-section-title">Supporting evidence <span className="optional-note">Optional</span></h2>
              <p>Attach JPG, JPEG, PNG, WEBP, or PDF files (up to 25 MB each; 10 files maximum).</p>
            </div>
          </div>

          <input
            ref={fileInput}
            className="visually-hidden"
            id="evidence-files"
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={(event) => {
              addFiles(event.target.files || [])
              event.target.value = ''
            }}
          />
          <div
            className={`file-dropzone${draggingFiles ? ' is-dragging' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="Choose or drop evidence files"
            onClick={() => fileInput.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                fileInput.current?.click()
              }
            }}
            onDragOver={(event) => {
              event.preventDefault()
              setDraggingFiles(true)
            }}
            onDragLeave={() => setDraggingFiles(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDraggingFiles(false)
              addFiles(event.dataTransfer.files)
            }}
          >
            <span className="file-drop-icon"><Upload size={20} /></span>
            <strong>Drag files here, or <span>browse files</span></strong>
            <small>JPG, JPEG, PNG, WEBP, or PDF · up to 25 MB each · 10 files maximum</small>
          </div>
          {fileError && <p className="file-error" role="alert"><AlertCircle size={15} />{fileError}</p>}

          {attachments.length > 0 && (
            <div className="attachment-list">
              <div className="attachment-list-heading">
                <strong>{attachments.length} attached {attachments.length === 1 ? 'file' : 'files'}</strong>
                <button type="button" className="text-action" onClick={clearAttachments}>Clear all</button>
              </div>
              <ul>
                {attachments.map((attachment) => (
                  <li className="attachment-item" key={attachment.id}>
                    {attachment.category === 'image' && attachment.previewUrl
                      ? <img className="attachment-preview" src={attachment.previewUrl} alt={`Preview of ${attachment.file.name}`} />
                      : <span className="attachment-file-icon"><FileTypeIcon file={attachment.file} /></span>}
                    <span className="attachment-details">
                      <strong title={attachment.file.name}>{attachment.file.name}</strong>
                      <small>{attachment.file.type || 'Unknown file type'} · {formatFileSize(attachment.file.size)}</small>
                    </span>
                    <button type="button" className="remove-attachment" aria-label={`Remove ${attachment.file.name}`} onClick={() => removeAttachment(attachment.id)}>
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <div className="form-actions">
          <button type="button" className="secondary-action" onClick={resetForm}>Reset form</button>
          <button type="submit" className="submit-btn" disabled={submitting}>
            <Check size={16} aria-hidden="true" />
            Review report
          </button>
        </div>
        {submissionError && <div className="form-message error" role="alert">{submissionError}</div>}
      </form>

      {reviewOpen && (
        <div className="review-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !submitting) setReviewOpen(false)
        }}>
          <section ref={reviewDialog} className="review-dialog" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="review-title">
            <div className="review-dialog-heading">
              <div><p className="incident-eyebrow">Final check</p><h2 id="review-title">Review your report</h2></div>
              <button type="button" className="icon-btn" aria-label="Close review" onClick={() => setReviewOpen(false)} disabled={submitting}><X size={18} /></button>
            </div>
            <div className="review-summary">
              <div><span>Location</span><strong>{form.location.trim() || location?.address || 'Pinned location'}</strong></div>
              <div><span>Incident</span><strong>{form.type} · {severityLabels[form.severity]}</strong></div>
              <div><span>Description</span><p>{form.description}</p></div>
              <div><span>Evidence</span><strong>{attachments.length ? `${attachments.length} file${attachments.length === 1 ? '' : 's'} attached` : 'No files attached'}</strong></div>
            </div>
            <p className="local-only-note"><AlertCircle size={15} /> The selected coordinates and attached evidence will be saved with this report.</p>
            {uploadProgress !== null && (
              <div className="upload-progress" role="status">
                <span>Uploading evidence… {uploadProgress}%</span>
                <progress value={uploadProgress} max="100" aria-label="Evidence upload progress" />
              </div>
            )}
            {submissionError && <div className="form-message error" role="alert">{submissionError}</div>}
            <div className="review-actions">
              <button type="button" className="secondary-action" onClick={() => setReviewOpen(false)} disabled={submitting}>Back to edit</button>
              <button type="button" className="submit-btn" onClick={confirmSubmission} disabled={submitting}>
                <Send size={15} />{submitting ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
