import os

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

# ========== US EPA AQI BREAKPOINTS (40 CFR Appendix G) ==========
# Format: (BP_lo, BP_hi, I_lo, I_hi) for each AQI category
# PM2.5 (µg/m³) - updated May 2024
PM25_BREAKPOINTS = [
    (0.0, 9.0, 0, 50),
    (9.1, 35.4, 51, 100),
    (35.5, 55.4, 101, 150),
    (55.5, 125.4, 151, 200),
    (125.5, 225.4, 201, 300),
    (225.5, 500.4, 301, 500),  # 500.4 = cap for AQI 500
]
# PM10 (µg/m³)
PM10_BREAKPOINTS = [
    (0, 54, 0, 50),
    (55, 154, 51, 100),
    (155, 254, 101, 150),
    (255, 354, 151, 200),
    (355, 424, 201, 300),
    (425, 604, 301, 500),
]
# O3 8-hour (ppm) - OpenWeather returns µg/m³: 1 ppm ≈ 1960 µg/m³
O3_8HR_BREAKPOINTS = [
    (0.000, 0.054, 0, 50),
    (0.055, 0.070, 51, 100),
    (0.071, 0.085, 101, 150),
    (0.086, 0.105, 151, 200),
    (0.106, 0.200, 201, 300),
    (0.201, 0.604, 301, 500),
]
# CO 8-hour (ppm) - OpenWeather returns µg/m³: 1 ppm ≈ 1146 µg/m³
CO_8HR_BREAKPOINTS = [
    (0.0, 4.4, 0, 50),
    (4.5, 9.4, 51, 100),
    (9.5, 12.4, 101, 150),
    (12.5, 15.4, 151, 200),
    (15.5, 30.4, 201, 300),
    (30.5, 50.4, 301, 500),
]
# SO2 1-hour (ppb) - OpenWeather returns µg/m³: 1 ppb ≈ 2.62 µg/m³
SO2_1HR_BREAKPOINTS = [
    (0, 35, 0, 50),
    (36, 75, 51, 100),
    (76, 185, 101, 150),
    (186, 304, 151, 200),
    (305, 604, 201, 300),
    (605, 1004, 301, 500),
]
# NO2 1-hour (ppb) - OpenWeather returns µg/m³: 1 ppb ≈ 1.88 µg/m³
NO2_1HR_BREAKPOINTS = [
    (0, 53, 0, 50),
    (54, 100, 51, 100),
    (101, 360, 101, 150),
    (361, 649, 151, 200),
    (650, 1249, 201, 300),
    (1250, 2049, 301, 500),
]


def _calc_sub_index(conc: float, breakpoints: list) -> float | None:
    """US EPA Equation 1: Ip = ((Ihi - Ilo) / (BP_hi - BP_lo)) * (Cp - BP_lo) + Ilo"""
    if conc is None or conc < 0:
        return None
    for bp_lo, bp_hi, i_lo, i_hi in breakpoints:
        if bp_lo <= conc <= bp_hi:
            if bp_hi == bp_lo:
                return float(i_hi)
            return (i_hi - i_lo) / (bp_hi - bp_lo) * (conc - bp_lo) + i_lo
    # Above highest breakpoint: use last segment
    bp_lo, bp_hi, i_lo, i_hi = breakpoints[-1]
    return min(500, (i_hi - i_lo) / (bp_hi - bp_lo) * (conc - bp_lo) + i_lo)


def calc_us_aqi(components: dict) -> float:
    """
    Calculate US EPA AQI from pollutant concentrations.
    OpenWeather returns all values in µg/m³.
    """
    pm25 = components.get("pm2_5")
    pm10 = components.get("pm10")
    o3_ug = components.get("o3")
    co_ug = components.get("co")
    so2_ug = components.get("so2")
    no2_ug = components.get("no2")

    sub_indices = []

    if pm25 is not None:
        sub_indices.append(_calc_sub_index(pm25, PM25_BREAKPOINTS))
    if pm10 is not None:
        sub_indices.append(_calc_sub_index(pm10, PM10_BREAKPOINTS))
    if o3_ug is not None:
        o3_ppm = o3_ug / 1960  # µg/m³ -> ppm
        sub_indices.append(_calc_sub_index(o3_ppm, O3_8HR_BREAKPOINTS))
    if co_ug is not None:
        co_ppm = co_ug / 1146  # µg/m³ -> ppm
        sub_indices.append(_calc_sub_index(co_ppm, CO_8HR_BREAKPOINTS))
    if so2_ug is not None:
        so2_ppb = so2_ug / 2.62  # µg/m³ -> ppb
        sub_indices.append(_calc_sub_index(so2_ppb, SO2_1HR_BREAKPOINTS))
    if no2_ug is not None:
        no2_ppb = no2_ug / 1.88  # µg/m³ -> ppb
        sub_indices.append(_calc_sub_index(no2_ppb, NO2_1HR_BREAKPOINTS))

    valid = [x for x in sub_indices if x is not None]
    if not valid:
        raise ValueError("No valid pollutant data for AQI calculation")
    return max(valid)

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

    # ---------- 3️⃣ Calculate AQI using US EPA formula ----------
    try:
        aqi = calc_us_aqi(components)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"city": city, "aqi": round(aqi, 2)}
