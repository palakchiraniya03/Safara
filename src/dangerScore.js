/**
 * dangerScore.js
 *
 * IMPROVED danger scoring logic with:
 *  - Distance-decay weighting (closer crimes score higher)
 *  - Time-of-day multipliers (night crimes weigh more at night)
 *  - Crime-type severity multipliers
 *  - Score normalisation to a clean 0–5 scale
 *  - Descriptive label export for UI use
 */
 
// How far from a route point (metres) a crime can still influence the score
const INFLUENCE_RADIUS = 350
 
// Crimes closer than this threshold get maximum weight
const MIN_DISTANCE = 50
 
/**
 * Weight by crime type — more violent crimes increase the score more.
 */
const TYPE_WEIGHT = {
  Assault: 1.4,
  Robbery: 1.3,
  Theft: 1.0,
  Harassment: 0.8,
}
 
/**
 * Time-of-day multiplier applied when route is queried at that time.
 * A night-time assault is more impactful than a daytime one.
 */
const TIME_MULTIPLIER = {
  day: { day: 1.0, evening: 0.5, night: 0.3 },
  evening: { day: 0.7, evening: 1.0, night: 0.5 },
  night: { day: 0.3, evening: 0.7, night: 1.2 },
  all: { day: 1.0, evening: 1.0, night: 1.0 },
}
 
/**
 * Haversine distance between two lat/lng points, returns metres.
 */
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
 
/**
 * Distance-decay weight: 1.0 at MIN_DISTANCE, falls to ~0 at INFLUENCE_RADIUS.
 * Uses an inverse-square-style curve.
 */
function distanceWeight(distanceMetres) {
  if (distanceMetres <= MIN_DISTANCE) return 1.0
  if (distanceMetres >= INFLUENCE_RADIUS) return 0.0
  const t = (distanceMetres - MIN_DISTANCE) / (INFLUENCE_RADIUS - MIN_DISTANCE)
  return Math.max(0, 1 - t * t)
}
 
/**
 * Sample every Nth route point to avoid redundant calculations on dense geometries.
 * For most ORS routes 300–800 points, stepping by 5 gives ~60–160 samples.
 */
function samplePoints(points, step = 5) {
  return points.filter((_, i) => i % step === 0)
}
 
/**
 * Calculate a danger score (0.0 – 5.0) for a route given crime data.
 *
 * @param {Array<{ lat: number, lng: number }>} routePoints - route geometry
 * @param {Array<object>} crimeData                        - crime records
 * @param {string} activeTimeFilter                        - 'all' | 'day' | 'evening' | 'night'
 * @returns {number} score rounded to 1 decimal place
 */
export function calculateDangerScore(routePoints, crimeData, activeTimeFilter = 'all') {
  if (!routePoints.length || !crimeData.length) return 0
 
  const sampledPoints = samplePoints(routePoints)
  const timeWeights = TIME_MULTIPLIER[activeTimeFilter] || TIME_MULTIPLIER.all
 
  let totalWeight = 0
  let weightedScore = 0
 
  for (const point of sampledPoints) {
    for (const crime of crimeData) {
      const dist = getDistance(point.lat, point.lng, crime.lat, crime.lng)
      if (dist > INFLUENCE_RADIUS) continue
 
      const dw = distanceWeight(dist)
      const tw = timeWeights[crime.time] ?? 1.0
      const typeW = TYPE_WEIGHT[crime.type] ?? 1.0
 
      const contribution = crime.severity * dw * tw * typeW
      weightedScore += contribution
      totalWeight += dw
    }
  }
 
  if (totalWeight === 0) return 0
 
  // Raw average, then scale to 0–5 range
  // The divisor (4.0) was tuned so that a route passing directly
  // through 3 high-severity clusters ≈ 5.0. Adjust if needed.
  const rawAvg = weightedScore / totalWeight
  const scaled = Math.min(5, rawAvg / 4.0)
 
  return Math.round(scaled * 10) / 10
}
 
/**
 * Returns a human-readable safety label and a hex colour for a given score.
 *
 * @param {number} score - 0.0 – 5.0
 * @returns {{ label: string, color: string, emoji: string }}
 */
export function getDangerLabel(score) {
  if (score < 1.5) return { label: 'Safe',        color: '#44ff88', emoji: '✅' }
  if (score < 2.5) return { label: 'Low Risk',    color: '#aaee44', emoji: '🟡' }
  if (score < 3.5) return { label: 'Moderate',    color: '#ffaa00', emoji: '⚠️' }
  if (score < 4.5) return { label: 'High Risk',   color: '#ff6622', emoji: '🔴' }
  return              { label: 'Dangerous',   color: '#ff2244', emoji: '🚨' }
}

export function analyzeRouteSafety(routePoints, crimeData, activeTimeFilter = 'all') {
  let nearbyCrimes = 0
  let severeCrimes = 0
  let robberyCount = 0
  let assaultCount = 0

  const sampledPoints = samplePoints(routePoints)

  for (const point of sampledPoints) {
    for (const crime of crimeData) {
      const dist = getDistance(point.lat, point.lng, crime.lat, crime.lng)

      if (dist > INFLUENCE_RADIUS) continue

      nearbyCrimes++

      if (crime.severity >= 4) {
        severeCrimes++
      }

      if (crime.type === 'Robbery') {
        robberyCount++
      }

      if (crime.type === 'Assault') {
        assaultCount++
      }
    }
  }

  return {
    nearbyCrimes,
    severeCrimes,
    robberyCount,
    assaultCount,
  }
}