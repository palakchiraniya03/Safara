export async function fetchMlStats() {
  const response = await fetch(
    "http://127.0.0.1:5000/ml-stats"
  )

  const data = await response.json()

  return data
}