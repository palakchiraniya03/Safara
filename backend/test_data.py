from services.load_data import load_crime_data

df = load_crime_data()

print("\nColumns:\n")
print(df.columns)

print("\nShape:\n")
print(df.shape)

print("\nFirst 5 Rows:\n")
print(df.head())