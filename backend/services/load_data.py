import pandas as pd

def load_crime_data():

    df = pd.read_csv(
        "data/crime_dataset.csv",
        low_memory=False,
        nrows=5000
    )

    return df