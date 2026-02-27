import os

import joblib
import numpy as np
import pandas as pd
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

# ========== CONFIG ==========
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

GEOCODE_URL = "http://api.openweathermap.org/geo/1.0/direct"
AIR_POLLUTION_URL = "http://api.openweathermap.org/data/2.5/air_pollution"

# ========== LOAD MODEL ==========
model = joblib.load("aqi_rf_model.pkl")
feature_cols = joblib.load("aqi_columns.pkl")

# ========== FASTAPI ==========

app = FastAPI()
origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CityRequest(BaseModel):
    city: str


@app.post("/predict")
def predict_aqi(data: CityRequest):
    city = data.city.strip()

    if not city:
        raise HTTPException(status_code=400, detail="City name is required")

    # ---------- 1️⃣ Get Lat/Lon ----------
    geo_params = {"q": city, "limit": 1, "appid": OPENWEATHER_API_KEY}

    geo_response = requests.get(GEOCODE_URL, params=geo_params)

    if geo_response.status_code != 200:
        raise HTTPException(status_code=500, detail="Geocoding API failed")

    geo_data = geo_response.json()

    if not geo_data:
        raise HTTPException(status_code=404, detail="City not found")

    lat = geo_data[0]["lat"]
    lon = geo_data[0]["lon"]

    # ---------- 2️⃣ Get Pollution Data ----------
    pollution_params = {"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY}

    pollution_response = requests.get(AIR_POLLUTION_URL, params=pollution_params)

    if pollution_response.status_code != 200:
        raise HTTPException(status_code=500, detail="Air Pollution API failed")

    pollution_data = pollution_response.json()

    try:
        components = pollution_data["list"][0]["components"]
    except (KeyError, IndexError):
        raise HTTPException(status_code=500, detail="Invalid pollution API response")

    # ---------- 3️⃣ Map to Expected Features ----------
    feature_map = {
        "PM2.5": components.get("pm2_5"),
        "PM10": components.get("pm10"),
        "NO": components.get("no"),
        "NO2": components.get("no2"),
        "NH3": components.get("nh3"),
        "CO": components.get("co") / 100,
        "SO2": components.get("so2"),
        "O3": components.get("o3"),
    }
    print(feature_map)

    # Check missing values
    # if any(v is None for v in feature_map.values()):
    # raise HTTPException(status_code=500, detail="Missing pollutant data")

    # ---------- 4️⃣ Create DataFrame ----------
    X = pd.DataFrame([feature_map], columns=feature_cols)

    # X_imputed = imputer.transform(X)
    # Convert back to DataFrame with correct column names
    # X_imputed = pd.DataFrame(X_imputed, columns=feature_cols)

    # ---------- 5️⃣ Predict ----------
    try:
        aqi = float(model.predict(X)[0])
    except Exception:
        raise HTTPException(status_code=500, detail="Model prediction failed")

    return {"city": city, "aqi": round(aqi, 2)}
