from sklearn.cluster import DBSCAN
import numpy as np

def detect_hotspots(crime_points):

    if len(crime_points) == 0:
        return []

    coordinates = np.array([
        [point["lat"], point["lng"]]
        for point in crime_points
    ])

    model = DBSCAN(
        eps=0.005,
        min_samples=2
    )

    labels = model.fit_predict(coordinates)

    results = []

    for point, label in zip(crime_points, labels):
        results.append({
            "lat": point["lat"],
            "lng": point["lng"],
            "cluster": int(label)
        })

    return results