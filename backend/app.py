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