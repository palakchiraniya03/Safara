/**
 * App.jsx — Safara
 *
 * IMPROVEMENTS OVER ORIGINAL:
 *  1. Safe spots fetched along the SELECTED (safest) route, not just start point
 *  2. Route cards show distance + duration + score + danger label
 *  3. Map legend in bottom-right corner
 *  4. Danger score uses improved scoring (time-aware via dangerScore.js)
 *  5. Loading spinner replaces plain text
 *  6. Safe spot markers differentiate hospital / police / clinic
 *  7. Minor visual polish: score colour from getDangerLabel, card layout
 *  8. Active route selection — click a card to highlight that route
 */
 
import { useState, useEffect, useCallback } from 'react'
import {
  MapContainer, TileLayer, CircleMarker, Popup,
  Polyline, Circle, useMap, useMapEvents
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import MarkerClusterGroup from 'react-leaflet-cluster'
 
import crimeData from './crimeData'
import {
  calculateDangerScore,
  getDangerLabel,
  analyzeRouteSafety
} from './dangerScore'
import { geocodeAddress } from './geocode'
import { getRoute } from './getRoute'
import { getSafeSpotsAlongRoute } from './safeSpots'
 
// ─── Leaflet icon fix ───────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})
 
// ─── Constants ───────────────────────────────────────────────────────────────
const ROUTE_COLORS = ['#3b82f6', '#f97316', '#ef4444']
const PUNE_CENTER  = [18.5204, 73.8567]
 
// ─── Helper component: fly to location on map ────────────────────────────────
function FlyToLocation({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, 13, { duration: 1.4 })
  }, [center, map])
  return null
}
 
// ─── Map Legend ───────────────────────────────────────────────────────────────
function MapLegend() {
  const entries = [
    { color: '#ef4444', label: 'Crime hotspot',    shape: 'circle' },
    { color: '#22c55e', label: 'Hospital / Clinic', shape: 'circle' },
    { color: '#3b82f6', label: 'Police station',   shape: 'circle' },
    { color: '#4A90E2', label: 'Your location',    shape: 'circle' },
    { color: '#00ff88', label: 'Safest route',     shape: 'line'   },
  ]
 
  return (
    <div style={{
      position: 'absolute',
      bottom: '28px',
      right: '12px',
      zIndex: 1000,
      background: 'rgba(15,15,26,0.92)',
      border: '1px solid #2a2a3a',
      borderRadius: '10px',
      padding: '12px 14px',
      backdropFilter: 'blur(6px)',
      minWidth: '160px',
    }}>
      <div style={{ color: '#aaa', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '8px' }}>
        MAP LEGEND
      </div>
      {entries.map(({ color, label, shape }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
          {shape === 'circle' ? (
            <div style={{
              width: 10, height: 10,
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
            }} />
          ) : (
            <div style={{
              width: 18, height: 3,
              background: color,
              borderRadius: 2,
              flexShrink: 0,
            }} />
          )}
          <span style={{ color: '#ccc', fontSize: '11px' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}
 
// ─── Route Card ───────────────────────────────────────────────────────────────
function RouteCard({ route, isSafest, isSelected, onClick }) {
  const { label, color, emoji } = getDangerLabel(route.score)
 
  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected ? '#0a2a4a' : '#16161e',
        border: `2px solid ${isSelected ? '#00d4ff' : isSafest ? '#00d4ff44' : '#2a2a3a'}`,
        borderRadius: '12px',
        padding: '14px',
        marginBottom: '10px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      {/* Colour stripe */}
      <div style={{
        width: '28px', height: '4px',
        background: isSafest ? '#00ff88' : route.color,
        borderRadius: '2px',
        marginBottom: '10px',
      }} />
 
      {/* Route name + safest badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontWeight: 700, fontSize: '14px', color: '#f0f0f0' }}>{route.name}</span>
        {isSafest && (
          <span style={{
            background: '#00d4ff',
            color: '#000',
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.05em',
          }}>✓ SAFEST</span>
        )}
      </div>
 
      {/* Stats row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <span style={{ color: '#aaa', fontSize: '12px' }}>
          📍 <b style={{ color: '#e0e0e0' }}>{route.distance} km</b>
        </span>
        <span style={{ color: '#aaa', fontSize: '12px' }}>
          ⏱ <b style={{ color: '#e0e0e0' }}>{route.duration} min</b>
        </span>
      </div>
 
      {/* Danger score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#aaa', fontSize: '12px' }}>Danger:</span>
        <span style={{
          color,
          fontWeight: 800,
          fontSize: '16px',
          lineHeight: 1,
        }}>{route.score}</span>
        <span style={{ color: '#555', fontSize: '12px' }}>/5</span>
        <span style={{
          background: color + '22',
          color,
          borderRadius: '4px',
          padding: '2px 7px',
          fontSize: '11px',
          fontWeight: 600,
        }}>{emoji} {label}</span>
      </div>

      <div style={{
        marginTop: '12px',
        paddingTop: '10px',
        borderTop: '1px solid #2a2a3a',
      }}>
        <div style={{
          color: '#888',
          fontSize: '11px',
          marginBottom: '6px',
          letterSpacing: '0.04em',
          fontWeight: 600,
        }}>
          WHY THIS ROUTE?
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          fontSize: '11px',
          color: '#bbb',
          lineHeight: 1.4,
        }}>
          <span>
            🚨 {route.analysis.nearbyCrimes} nearby crime points
          </span>

          <span>
            ⚠️ {route.analysis.severeCrimes} high severity zones
          </span>

          <span>
            🥷 {route.analysis.robberyCount} robbery hotspots
          </span>

          <span>
            👊 {route.analysis.assaultCount} assault hotspots
          </span>
        </div>
      </div>
    </div>
  )
}
 
// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  start, setStart, end, setEnd,
  timeFilter, setTimeFilter,
  loading, error,
  scoredRoutes, safestId, selectedId, setSelectedId,
  onSearch, safeSpotCount,
}) {
  return (
    <div style={{
      width: '300px',
      minWidth: '300px',
      background: '#0f0f1a',
      color: 'white',
      padding: '20px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      borderRight: '1px solid #1e1e2e',
    }}>
      {/* Header */}
      <div>
        <h2 style={{ color: '#00d4ff', margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em' }}>
          🛡️ Safara
        </h2>
        <p style={{ color: '#555', fontSize: '11px', margin: '4px 0 0', letterSpacing: '0.04em' }}>
          AI-POWERED SAFE ROUTE RECOMMENDATION
        </p>
      </div>
 
      {/* Search inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: '#aaa', fontSize: '11px', letterSpacing: '0.06em', fontWeight: 600 }}>
          SEARCH ROUTE
        </label>
        <input
          value={start}
          onChange={e => setStart(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSearch()}
          placeholder="From (e.g. Shivajinagar)"
          style={inputStyle}
        />
        <input
          value={end}
          onChange={e => setEnd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSearch()}
          placeholder="To (e.g. Hadapsar)"
          style={inputStyle}
        />
        <button
          onClick={onSearch}
          disabled={loading}
          style={{
            background: loading ? '#1e1e2e' : '#00d4ff',
            color: loading ? '#555' : '#000',
            border: loading ? '1px solid #2a2a3a' : 'none',
            borderRadius: '8px',
            padding: '11px',
            fontWeight: 800,
            fontSize: '13px',
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '0.02em',
            transition: 'background 0.2s',
          }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Spinner /> Finding safe routes…
            </span>
          ) : (
            'Find Safest Route'
          )}
        </button>
        {error && (
          <p style={{ color: '#ff4444', fontSize: '12px', margin: 0, lineHeight: 1.4 }}>{error}</p>
        )}
      </div>
 
      {/* Time filter */}
      <div>
        <label style={{ color: '#aaa', fontSize: '11px', letterSpacing: '0.06em', fontWeight: 600 }}>
          FILTER BY TIME
        </label>
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
          {['all', 'day', 'evening', 'night'].map(t => (
            <button
              key={t}
              onClick={() => setTimeFilter(t)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                background: timeFilter === t ? '#00d4ff' : '#1e1e2e',
                color: timeFilter === t ? '#000' : '#777',
                fontWeight: timeFilter === t ? 800 : 500,
                transition: 'background 0.15s',
              }}
            >
              {t === 'all' ? 'All' : t === 'day' ? '☀️ Day' : t === 'evening' ? '🌆 Eve' : '🌙 Night'}
            </button>
          ))}
        </div>
      </div>
 
      {/* Route comparison */}
      {scoredRoutes.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ color: '#aaa', fontSize: '11px', letterSpacing: '0.06em', fontWeight: 600 }}>
              ROUTE COMPARISON
            </label>
            {safeSpotCount > 0 && (
              <span style={{ color: '#00ff88', fontSize: '11px' }}>
                {safeSpotCount} safe spots found
              </span>
            )}
          </div>
          {scoredRoutes.map(route => (
            <RouteCard
              key={route.id}
              route={route}
              isSafest={route.id === safestId}
              isSelected={route.id === selectedId}
              onClick={() => setSelectedId(route.id === selectedId ? null : route.id)}
            />
          ))}
        </div>
      )}
 
      {/* SOS button pinned to bottom */}
      <div style={{ marginTop: 'auto' }}>
        <button
          style={{
            background: 'linear-gradient(135deg, #ff2244, #cc0022)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '14px',
            fontSize: '15px',
            fontWeight: 800,
            cursor: 'pointer',
            width: '100%',
            letterSpacing: '0.02em',
            boxShadow: '0 4px 20px rgba(255,34,68,0.35)',
          }}
          onClick={() => alert('🚨 SOS Alert Sent!\nEmergency contacts notified.\nNearest police & hospital shown on map.')}
        >
          🚨 SOS Emergency
        </button>
      </div>
    </div>
  )
}
 
// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: '12px',
      height: '12px',
      border: '2px solid #33333388',
      borderTop: '2px solid #00d4ff',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}
 
// ─── Styles ───────────────────────────────────────────────────────────────────
const inputStyle = {
  background: '#1e1e2e',
  border: '1px solid #2a2a3a',
  borderRadius: '8px',
  padding: '10px 12px',
  color: 'white',
  fontSize: '13px',
  outline: 'none',
  transition: 'border-color 0.2s',
}
 
// ─── Main App ─────────────────────────────────────────────────────────────────
function App() {
  const [timeFilter, setTimeFilter]   = useState('all')
  const [start, setStart]             = useState('')
  const [end, setEnd]                 = useState('')
  const [routes, setRoutes]           = useState([])
  const [loading, setLoading]         = useState(false)
  const [mapCenter, setMapCenter]     = useState(PUNE_CENTER)
  const [error, setError]             = useState('')
  const [safeSpots, setSafeSpots]     = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const [selectedId, setSelectedId]   = useState(null)
 
  // Live location watch
  useEffect(() => {
    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => console.warn('Location error:', err),
      { enableHighAccuracy: true }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])
 
  // Inject spinner CSS globally (once)
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])
 
  // Filtered crime data based on selected time
  const filteredCrimes = timeFilter === 'all'
    ? crimeData
    : crimeData.filter(c => c.time === timeFilter)
 
  // Score all routes, attach colour
  const scoredRoutes = routes.map((route, i) => {
    const score = calculateDangerScore(
      route.points,
      filteredCrimes,
      timeFilter
    )

    const analysis = analyzeRouteSafety(
      route.points,
      filteredCrimes,
      timeFilter
    )

    return {
      ...route,
      score,
      analysis,
      color: ROUTE_COLORS[i] || ROUTE_COLORS[0],
    }
  })
 
  // Safest = lowest score
  const safestId = scoredRoutes.length > 0
    ? scoredRoutes.reduce((min, r) => r.score < min.score ? r : min).id
    : null
 
  // The route currently highlighted (selected > safest as fallback)
  const highlightId = selectedId ?? safestId
 
  // ── Search handler ──────────────────────────────────────────────────────────
  async function handleSearch() {
    if (!start || !end) return
    setLoading(true)
    setError('')
    setRoutes([])
    setSafeSpots([])
    setSelectedId(null)
 
    try {
      const startCoord = await geocodeAddress(start + ', Pune')
      const endCoord   = await geocodeAddress(end   + ', Pune')
 
      if (!startCoord || !endCoord) {
        setError('Could not find one of the locations. Try being more specific.')
        setLoading(false)
        return
      }
 
      const fetchedRoutes = await getRoute(
        startCoord.lat, startCoord.lng,
        endCoord.lat,   endCoord.lng
      )
 
      if (!fetchedRoutes) {
        setError('Could not find a route. Try different locations.')
        setLoading(false)
        return
      }
 
      setRoutes(fetchedRoutes)
      setMapCenter([startCoord.lat, startCoord.lng])
 
      // ── IMPROVEMENT: fetch safe spots along the SAFEST route ────────────────
      // Score temporarily to find safest (before state settles)
      const tempScored = fetchedRoutes.map((r, i) => ({
        ...r,
        score: calculateDangerScore(r.points, filteredCrimes, timeFilter),
      }))
      const tempSafest = tempScored.reduce((min, r) => r.score < min.score ? r : min)
 
      // Use rawCoords (ORS [lng,lat] format) for checkpoint sampling
      const targetRoute = tempSafest.rawCoords
        ? tempSafest
        : fetchedRoutes[0]
 

      console.log('🗺️ rawCoords sample:', targetRoute.rawCoords?.slice(0, 3))
      console.log('🔍 Fetching safe spots along route...')

      const spots = await getSafeSpotsAlongRoute(targetRoute.rawCoords, {
        numCheckpoints: 7,
        radiusMeters: 600,
      })
      setSafeSpots(spots)
 
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Check your API key or connection.')
    }
 
    setLoading(false)
  }
 
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
      <Sidebar
        start={start} setStart={setStart}
        end={end}     setEnd={setEnd}
        timeFilter={timeFilter} setTimeFilter={setTimeFilter}
        loading={loading} error={error}
        scoredRoutes={scoredRoutes}
        safestId={safestId}
        selectedId={selectedId} setSelectedId={setSelectedId}
        onSearch={handleSearch}
        safeSpotCount={safeSpots.length}
      />
 
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={mapCenter} zoom={13} style={{ width: '100%', height: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <FlyToLocation center={mapCenter} />
 
          {/* User location dot */}
          {userLocation && (
            <>
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={40}
                color="#4A90E2"
                fillColor="#4A90E2"
                fillOpacity={0.12}
                weight={1}
              />
              <CircleMarker
                center={[userLocation.lat, userLocation.lng]}
                radius={7}
                color="white"
                weight={2}
                fillColor="#4A90E2"
                fillOpacity={1}
              >
                <Popup>📍 You are here</Popup>
              </CircleMarker>
            </>
          )}
 
          {/* Safe spots — hospitals (green), police (blue), clinics (teal) */}
          {safeSpots.map(place => {
            const isPolice   = place.type === 'police'
            const dotColor   = isPolice ? '#3b82f6' : '#22c55e'
            const fillColor  = isPolice ? '#60a5fa' : '#4ade80'
            const icon       = isPolice ? '🚓' : '🏥'
            return (
              <CircleMarker
                key={place.id}
                center={[place.lat, place.lng]}
                radius={7}
                color={dotColor}
                weight={1.5}
                fillColor={fillColor}
                fillOpacity={0.85}
              >
                <Popup>
                  <b>{icon} {place.name}</b><br />
                  <span style={{ textTransform: 'capitalize' }}>{place.type}</span>
                </Popup>
              </CircleMarker>
            )
          })}
 
          {/* Crime hotspots */}
          <MarkerClusterGroup chunkedLoading>
            {filteredCrimes.map(crime => (
              <CircleMarker
                key={crime.id}
                center={[crime.lat, crime.lng]}
                radius={crime.severity * 2.5 + 4}
                color="#cc0000"
                weight={2}
                fillColor="#ff2244"
                fillOpacity={0.55}
              >
                <Popup>
                  <b>⚠️ {crime.type}</b><br />
                  Severity: {crime.severity}/5<br />
                  Time: {crime.time}<br />
                  Area: {crime.area}
                </Popup>
              </CircleMarker>
            ))}
          </MarkerClusterGroup>
 
          {/* Routes — safest / highlighted on top, others dimmed */}
          {scoredRoutes
            .slice()
            .sort((a, b) => (a.id === highlightId ? 1 : 0) - (b.id === highlightId ? 1 : 0))
            .map(route => {
              const isHighlight = route.id === highlightId
              const isSafest    = route.id === safestId
              return (
                <Polyline
                  key={route.id}
                  positions={route.points.map(p => [p.lat, p.lng])}
                  color={isSafest && isHighlight ? '#00ff88' : route.color}
                  weight={isHighlight ? 6 : 3}
                  opacity={isHighlight ? 1 : 0.35}
                />
              )
            })}
        </MapContainer>
 
        {/* Map legend overlay */}
        <MapLegend />
      </div>
    </div>
  )
}
 
export default App