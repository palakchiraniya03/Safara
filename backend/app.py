from flask import Flask
from flask_cors import CORS

from services.load_data import load_crime_data
from services.hotspot_service import detect_hotspots

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return {
        "message": "Safara ML Backend Running"
    }

@app.route("/ml-stats")
def ml_stats():

    df = load_crime_data()

    clusters = detect_hotspots(df)

    cluster_ids = set(
        clusters["cluster"]
    )

    cluster_ids.discard(-1)

    return {
        "records": len(df),
        "clusters": len(cluster_ids),
        "noise_points": int(
            (clusters["cluster"] == -1).sum()
        ),
        "algorithm": "DBSCAN"
    }

@app.route("/cluster-hotspots")
def cluster_hotspots():

    df = load_crime_data()

    clusters = detect_hotspots(df)

    hotspots = clusters[
        clusters["cluster"] != -1
    ]

    return hotspots.to_dict(
        orient="records"
    )

if __name__ == "__main__":
    app.run(debug=True)