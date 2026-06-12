from flask import Flask
from flask_cors import CORS
from services.dbscan_service import detect_hotspots
from services.load_data import load_crime_data
from services.hotspot_service import detect_hotspots

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return {
        "message": "Safara ML Backend Running"
    }

@app.route("/hotspots")
def hotspots():

    df = load_crime_data()

    clusters = detect_hotspots(df)

    hotspots = clusters[
        clusters["cluster"] != -1
    ]

    return hotspots.to_dict(
        orient="records"
    )

@app.route("/cluster-hotspots")
def cluster_hotspots():

    sample_crimes = [
        {"lat": 18.5204, "lng": 73.8567},
        {"lat": 18.5210, "lng": 73.8572},
        {"lat": 18.5220, "lng": 73.8580},
        {"lat": 18.5404, "lng": 73.8720},
        {"lat": 18.5410, "lng": 73.8730},
    ]

    result = detect_hotspots(sample_crimes)

    return result

if __name__ == "__main__":
    app.run(debug=True)