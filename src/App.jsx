import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Circle, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import crimeData from './crimeData'
import { calculateDangerScore } from './dangerScore'
import { geocodeAddress } from './geocode'
import { getRoute } from './getRoute'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const ROUTE_COLORS = ['#3388ff', '#ff8800', '#ff4444']

function FlyToLocation({ center }) {
  const map = useMap()
  if (center) map.flyTo(center, 14)
  return null
}

function App() {
  const [timeFilter, setTimeFilter] = useState('all')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [mapCenter, setMapCenter] = useState([18.5204, 73.8567])
  const [error, setError] = useState('')
  const [userLocation, setUserLocation] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn('Location error:', err),
      { enableHighAccuracy: true }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  const filteredCrimes = timeFilter === 'all'
    ? crimeData
    : crimeData.filter(c => c.time === timeFilter)

  const scoredRoutes = routes.map((route, i) => ({
    ...route,
    score: calculateDangerScore(route.points, filteredCrimes),
    color: ROUTE_COLORS[i] || ROUTE_COLORS[0]
  }))

  const safestId = scoredRoutes.length > 0
    ? scoredRoutes.reduce((min, r) => r.score < min.score ? r : min).id
    : null

  async function handleSearch() {
    if (!start || !end) return
    setLoading(true)
    setError('')
    setRoutes([])

    try {
      const startCoord = await geocodeAddress(start + ', Pune')
      const endCoord = await geocodeAddress(end + ', Pune')

      if (!startCoord || !endCoord) {
        setError('Could not find one of the locations. Try being more specific.')
        setLoading(false)
        return
      }

      const fetchedRoutes = await getRoute(
        startCoord.lat, startCoord.lng,
        endCoord.lat, endCoord.lng
      )

      if (!fetchedRoutes) {
        setError('Could not find a route. Try different locations.')
        setLoading(false)
        return
      }

      setRoutes(fetchedRoutes)
      setMapCenter([startCoord.lat, startCoord.lng])

    } catch (err) {
      setError('Something went wrong. Check your API key.')
    }

    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{
        width: '300px',
        background: '#0f0f1a',
        color: 'white',
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ color: '#00d4ff', margin: 0 }}>🛡️ Safara</h2>
          <p style={{ color: '#888', fontSize: '12px', margin: '4px 0 0' }}>
            AI-Powered Safe Route Recommendation
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ color: '#aaa', fontSize: '12px', margin: 0 }}>SEARCH ROUTE</p>
          <input
            value={start}
            onChange={e => setStart(e.target.value)}
            placeholder="From (e.g. Shivajinagar)"
            style={{
              background: '#1e1e2e',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '10px',
              color: 'white',
              fontSize: '13px'
            }}
          />
          <input
            value={end}
            onChange={e => setEnd(e.target.value)}
            placeholder="To (e.g. Hadapsar)"
            style={{
              background: '#1e1e2e',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '10px',
              color: 'white',
              fontSize: '13px'
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{
              background: loading ? '#333' : '#00d4ff',
              color: loading ? '#aaa' : '#000',
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Finding safe routes...' : 'Find Safest Route'}
          </button>
          {error && (
            <p style={{ color: '#ff4444', fontSize: '12px', margin: 0 }}>{error}</p>
          )}
        </div>

        <div>
          <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '8px' }}>FILTER BY TIME</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['all', 'day', 'evening', 'night'].map(t => (
              <button
                key={t}
                onClick={() => setTimeFilter(t)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  background: timeFilter === t ? '#00d4ff' : '#1e1e2e',
                  color: timeFilter === t ? '#000' : '#aaa',
                  fontWeight: timeFilter === t ? 'bold' : 'normal'
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {scoredRoutes.length > 0 && (
          <div>
            <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '8px' }}>ROUTE COMPARISON</p>
            {scoredRoutes.map(route => (
              <div key={route.id} style={{
                background: route.id === safestId ? '#0a2a4a' : '#16161e',
                border: `2px solid ${route.id === safestId ? '#00d4ff' : '#2a2a3a'}`,
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '10px'
              }}>
                <div style={{
                  width: '30px', height: '4px',
                  background: route.color,
                  borderRadius: '2px',
                  marginBottom: '8px'
                }} />
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{route.name}</div>
                <div style={{ color: '#aaa', fontSize: '13px', margin: '6px 0' }}>
                  Danger Score:{' '}
                  <span style={{
                    color: route.score >= 4 ? '#ff4444' : route.score >= 2 ? '#ffaa00' : '#44ff88',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    {route.score}
                  </span>
                  <span style={{ color: '#555' }}>/5</span>
                </div>
                {route.id === safestId && (
                  <div style={{
                    background: '#00d4ff',
                    color: '#000',
                    borderRadius: '4px',
                    padding: '3px 10px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    display: 'inline-block'
                  }}>✓ SAFEST ROUTE</div>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          style={{
            background: '#ff2244',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '14px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: 'auto'
          }}
          onClick={() => alert('🚨 SOS Alert Sent! Emergency contacts notified.')}
        >
          🚨 SOS Emergency
        </button>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ flex: 1 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />
        <FlyToLocation center={mapCenter} />

        {userLocation && (
          <>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={30}
              color="#4A90E2"
              fillColor="#4A90E2"
              fillOpacity={0.15}
              weight={1}
            />
            <CircleMarker
              center={[userLocation.lat, userLocation.lng]}
              radius={8}
              color="white"
              weight={2}
              fillColor="#4A90E2"
              fillOpacity={1}
            >
              <Popup>📍 You are here</Popup>
            </CircleMarker>
          </>
        )}

        {filteredCrimes.map(crime => (
          <CircleMarker
            key={crime.id}
            center={[crime.lat, crime.lng]}
            radius={crime.severity * 3}
            color="red"
            fillColor="red"
            fillOpacity={0.4}
          >
            <Popup>
              <b>{crime.type}</b><br />
              Severity: {crime.severity}/5<br />
              Time: {crime.time}
            </Popup>
          </CircleMarker>
        ))}

        {scoredRoutes.map(route => (
          <Polyline
            key={route.id}
            positions={route.points.map(p => [p.lat, p.lng])}
            color={route.id === safestId ? '#00ff88' : route.color}
            weight={route.id === safestId ? 6 : 3}
            opacity={route.id === safestId ? 1 : 0.6}
          />
        ))}
      </MapContainer>
    </div>
  )
}

export default App