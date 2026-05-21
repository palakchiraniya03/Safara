const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
 
async function fetchSafeSpotsNear(lat, lng, radiusMeters = 600) {
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      node["amenity"="police"](around:${radiusMeters},${lat},${lng});
      node["amenity"="clinic"](around:${radiusMeters},${lat},${lng});
      way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      way["amenity"="police"](around:${radiusMeters},${lat},${lng});
    );
    out center;
  `
 
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`
  })
 
  if (!response.ok) throw new Error(`Overpass error: ${response.status}`)
  const json = await response.json()
 
  // ✅ DEBUG LOG — tells us if Overpass is reachable and returning data
  console.log(`📍 Overpass (${lat.toFixed(4)},${lng.toFixed(4)}):`, json.elements?.length ?? 0, 'elements')
 
  return json.elements || []
}
 
function sampleCheckpoints(coords, numSamples = 6) {
  if (!coords || coords.length === 0) return []
  if (coords.length <= numSamples) {
    return coords.map(([lng, lat]) => ({ lat, lng }))
  }
  const result = []
  const step = (coords.length - 1) / (numSamples - 1)
  for (let i = 0; i < numSamples; i++) {
    const idx = Math.round(i * step)
    const [lng, lat] = coords[idx]
    result.push({ lat, lng })
  }
  return result
}
 
function normalizeElement(el) {
  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon
  if (!lat || !lng) return null
  const amenity = el.tags?.amenity || 'unknown'
  return {
    id: `${el.type}-${el.id}`,
    type: amenity === 'clinic' ? 'hospital' : amenity,
    name: el.tags?.name || (amenity === 'police' ? 'Police Station' : 'Hospital'),
    lat,
    lng,
  }
}
 
export async function getSafeSpotsAlongRoute(routeCoords, {
  numCheckpoints = 6,
  radiusMeters = 600
} = {}) {
  // ✅ DEBUG LOG — tells us if rawCoords arrived correctly
  console.log('🗺️ getSafeSpotsAlongRoute called, coords length:', routeCoords?.length ?? 'UNDEFINED')
 
  const checkpoints = sampleCheckpoints(routeCoords, numCheckpoints)
 
  // ✅ DEBUG LOG — shows the sampled checkpoints
  console.log('📌 Checkpoints sampled:', checkpoints)
 
  if (checkpoints.length === 0) {
    console.warn('⚠️ No checkpoints — rawCoords may be missing or empty!')
    return []
  }
 
  const results = await Promise.allSettled(
    checkpoints.map(({ lat, lng }) => fetchSafeSpotsNear(lat, lng, radiusMeters))
  )
 
  // ✅ DEBUG LOG — shows how many requests succeeded vs failed
  const fulfilled = results.filter(r => r.status === 'fulfilled')
  const rejected  = results.filter(r => r.status === 'rejected')
  console.log(`✅ ${fulfilled.length} succeeded, ❌ ${rejected.length} failed`)
  if (rejected.length > 0) {
    rejected.forEach(r => console.error('Overpass request failed:', r.reason))
  }
 
  const allElements = fulfilled.flatMap(r => r.value)
 
  const seen = new Set()
  const spots = []
  for (const el of allElements) {
    const normalized = normalizeElement(el)
    if (!normalized) continue
    if (seen.has(normalized.id)) continue
    seen.add(normalized.id)
    spots.push(normalized)
  }
 
  // ✅ DEBUG LOG — final result count
  console.log('🏥 Final safe spots after dedup:', spots.length)
 
  return spots
}
 
export async function getSafeSpots(lat, lng) {
  try {
    const elements = await fetchSafeSpotsNear(lat, lng, 3000)
    return elements.map(normalizeElement).filter(Boolean)
  } catch (err) {
    console.error('Safe spots error:', err)
    return []
  }
}
