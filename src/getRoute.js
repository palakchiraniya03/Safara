const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY

export async function getRoute(startLat, startLng, endLat, endLng) {
  const url = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson'

  const body = {
    coordinates: [
      [startLng, startLat],
      [endLng, endLat],
    ],
    alternative_routes: {
      target_count: 3,
      weight_factor: 1.6,
      share_factor: 0.6,
    },
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: ORS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return null
    }

    return data.features.map((feature, i) => ({
      id: i + 1,
      name: `Route ${String.fromCharCode(65 + i)}`,
      points: feature.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
      rawCoords: feature.geometry.coordinates,
      distance: (feature.properties.summary.distance / 1000).toFixed(1),
      duration: Math.round(feature.properties.summary.duration / 60),
    }))
  } catch (err) {
    console.error('Route fetch error:', err)
    return null
  }
}