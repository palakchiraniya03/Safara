export async function fetchHotspots() {
  const response = await fetch(
    "http://127.0.0.1:5000/cluster-hotspots"
  );

  const data = await response.json();

  return data;
}