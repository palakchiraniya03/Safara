// Calculate distance between two lat/lng points in meters
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000 // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Score a route based on nearby crime incidents
export function calculateDangerScore(routePoints, crimeData) {
  const RADIUS = 300 // 300 meters radius
  let totalScore = 0
  let matchCount = 0

  routePoints.forEach(point => {
    crimeData.forEach(crime => {
      const distance = getDistance(point.lat, point.lng, crime.lat, crime.lng)
      if (distance <= RADIUS) {
        totalScore += crime.severity
        matchCount++
      }
    })
  })

  return matchCount === 0 ? 0 : Math.round(totalScore / matchCount * 10) / 10
}