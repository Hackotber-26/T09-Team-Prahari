import { useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org'
let lastGeocodingRequest = 0

const selectedLocationIcon = L.divIcon({
  className: 'selected-location-marker',
  html: '<div></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
let nominatimQueue = Promise.resolve()

function nominatimRequest(path, parameters) {
  const request = nominatimQueue.then(async () => {
    const delay = Math.max(0, 1000 - (Date.now() - lastGeocodingRequest))
    if (delay) await wait(delay)
    lastGeocodingRequest = Date.now()

    const response = await fetch(`${NOMINATIM_URL}${path}?${new URLSearchParams(parameters)}`, {
      headers: { 'Accept-Language': 'en' },
    })
    if (!response.ok) throw new Error('Location search is temporarily unavailable.')
    return response.json()
  })
  nominatimQueue = request.catch(() => {})
  return request
}

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

function MapFocus({ location }) {
  const map = useMap()
  const latitude = location?.latitude
  const longitude = location?.longitude
  useEffect(() => {
    if (latitude != null && longitude != null) {
      map.setView([latitude, longitude], Math.max(map.getZoom(), 15))
    }
  }, [latitude, longitude, map])
  return null
}

function coordinatesLabel(latitude, longitude) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
}

export default function LocationPicker({ location, onChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [locationError, setLocationError] = useState('')
  const [resolvingAddress, setResolvingAddress] = useState(false)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const selectionRequest = useRef(0)

  const selectCoordinates = async (latitude, longitude, name, source) => {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setLocationError('The selected location has invalid coordinates. Please choose another location.')
      return
    }
    const requestId = ++selectionRequest.current
    const selected = {
      latitude,
      longitude,
      name: name || `Selected location (${coordinatesLabel(latitude, longitude)})`,
      source,
      confirmed: false,
    }
    onChange(selected)
    setLocationError('')
    setResolvingAddress(!name)

    if (name) return

    try {
      const result = await nominatimRequest('/reverse', {
        lat: String(latitude),
        lon: String(longitude),
        format: 'jsonv2',
      })
      if (requestId === selectionRequest.current) {
        onChange({
          ...selected,
          name: result.display_name || selected.name,
        })
      }
    } catch {
      if (requestId === selectionRequest.current) {
        setLocationError('Address lookup failed. You can still confirm the selected coordinates.')
      }
    } finally {
      if (requestId === selectionRequest.current) setResolvingAddress(false)
    }
  }

  const searchLocations = async () => {
    const searchTerm = query.trim()
    if (searchTerm.length < 3) {
      setSearchError('Enter at least 3 characters to search.')
      setResults([])
      return
    }

    setSearching(true)
    setSearchError('')
    setResults([])
    try {
      const matches = await nominatimRequest('/search', {
        q: searchTerm,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '5',
      })
      setResults(matches)
      if (matches.length === 0) setSearchError('No locations found. Try a road, junction, landmark or area.')
    } catch {
      setSearchError('Location search failed. Check your connection and try again.')
    } finally {
      setSearching(false)
    }
  }

  const useCurrentLocation = () => {
    setLocationError('')
    if (!navigator.geolocation) {
      setLocationError('Location detection is not supported by this browser.')
      return
    }

    setDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setDetectingLocation(false)
        void selectCoordinates(coords.latitude, coords.longitude, '', 'current')
      },
      (error) => {
        const messages = {
          1: 'Location permission was denied. Allow access in your browser or choose a location on the map.',
          2: 'Your current location is unavailable. Try searching or selecting it on the map.',
          3: 'Location detection timed out. Try again or select it on the map.',
        }
        setDetectingLocation(false)
        setLocationError(messages[error.code] || 'Could not detect your location. Try searching or selecting it on the map.')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  const confirmLocation = () => {
    if (!location) return
    onChange({ ...location, confirmed: true })
  }

  return (
    <fieldset className="location-picker">
      <legend>Incident location</legend>
      <p className="location-help">
        Choose where the incident happened. Your current location is never selected unless you request it.
      </p>

      <button className="location-action" type="button" onClick={useCurrentLocation} disabled={detectingLocation}>
        {detectingLocation ? 'Detecting location…' : 'Use current location'}
      </button>

      <div className="location-search">
        <label htmlFor="location-search">Search for a road, junction, landmark or area</label>
        <div className="location-search-row">
          <input
            id="location-search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void searchLocations()
              }
            }}
            placeholder="e.g. MG Road, Bengaluru"
          />
          <button className="location-action" type="button" onClick={() => void searchLocations()} disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>

      {searchError && <p className="location-error" role="status">{searchError}</p>}
      {results.length > 0 && (
        <ul className="location-results" aria-label="Location search results">
          {results.map((result) => (
            <li key={result.place_id}>
              <button
                type="button"
                onClick={() => {
                  void selectCoordinates(Number(result.lat), Number(result.lon), result.display_name, 'search')
                  setResults([])
                }}
              >
                {result.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="map-prompt">Or click the map to place the incident marker.</p>
      <div className="location-map" aria-label="Select incident location on map">
        <MapContainer center={[12.9716, 77.5946]} zoom={12} scrollWheelZoom style={{ height: '280px', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onSelect={(latitude, longitude) => {
            void selectCoordinates(latitude, longitude, '', 'map')
          }} />
          <MapFocus location={location} />
          {location && (
            <Marker
              position={[location.latitude, location.longitude]}
              icon={selectedLocationIcon}
            />
          )}
        </MapContainer>
      </div>

      {location && (
        <div className="selected-location" aria-live="polite">
          <strong>{location.confirmed ? 'Confirmed incident location' : 'Selected location'}</strong>
          <span>{location.name}</span>
          <span className="location-coordinates">
            {coordinatesLabel(location.latitude, location.longitude)}
            {resolvingAddress && ' · Finding address…'}
          </span>
          {locationError && <span className="location-error">{locationError}</span>}
          {location.confirmed ? (
            <button type="button" className="location-action" onClick={() => onChange(null)}>
              Change location
            </button>
          ) : (
            <button
              type="button"
              className="location-action"
              onClick={confirmLocation}
              disabled={resolvingAddress}
            >
              Confirm this incident location
            </button>
          )}
        </div>
      )}

      <small className="geocoding-attribution">
        Search and address data by <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> (Nominatim).
      </small>
    </fieldset>
  )
}
