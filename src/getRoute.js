const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY

export async function getRoute(startLat, startLng, endLat, endLng) {
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${startLng},${startLat}&end=${endLng},${endLat}`
  const response = await fetch(url)
  const data = await response.json()
  if (!data.features || data.features.length === 0) return null
  const coords = data.features[0].geometry.coordinates
  return coords.map(([lng, lat]) => ({ lat, lng }))
}