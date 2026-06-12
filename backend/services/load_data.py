import pandas as pd

def load_crime_data():

    df = pd.read_csv(
        "data/crime_dataset.csv",
        low_memory=False
    )

    df = df.sample(
        1000,
        random_state=42
    )

    return df