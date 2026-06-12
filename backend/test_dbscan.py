from services.load_data import load_crime_data
from services.hotspot_service import detect_hotspots

print("Loading dataset...")

df = load_crime_data()

print("Running DBSCAN...")

clusters = detect_hotspots(df)

print(clusters.head())

print("\nUnique Clusters:")
print(clusters["cluster"].nunique())

print("\nCluster Distribution:")
print(
    clusters["cluster"]
    .value_counts()
    .head(20)
)