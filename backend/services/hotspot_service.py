import pandas as pd
from sklearn.cluster import DBSCAN


def prepare_coordinates(df):

    coords = (
        df["Location "]
        .dropna()
        .astype(str)
    )

    coordinates = []

    for location in coords:

        location = location.strip()

        if "(" not in location:
            continue

        try:
            lat, lon = location.strip("()").split(",")

            coordinates.append([
                float(lat),
                float(lon)
            ])

        except:
            pass

    return pd.DataFrame(
        coordinates,
        columns=["lat", "lon"]
    )


def detect_hotspots(df):

    coordinates = prepare_coordinates(df)

    print(
        f"Coordinates found: {len(coordinates)}"
    )

    model = DBSCAN(
        eps=0.01,
        min_samples=20
    )

    labels = model.fit_predict(
        coordinates[["lat", "lon"]]
    )

    coordinates["cluster"] = labels

    return coordinates