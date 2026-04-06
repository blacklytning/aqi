import { useState } from "react";
import "./App.css";
import { getApiUrl, API_CONFIG } from "./config";

// AQI Categories and their color codes
const AQI_CATEGORIES = {
    Good: {
        min: 0,
        max: 50,
        color: "bg-green-500",
        textColor: "text-green-700",
        bgLight: "bg-green-50",
    },
    Moderate: {
        min: 51,
        max: 100,
        color: "bg-yellow-500",
        textColor: "text-yellow-700",
        bgLight: "bg-yellow-50",
    },
    UnhealthySensitiveGroups: {
        min: 101,
        max: 150,
        color: "bg-orange-500",
        textColor: "text-orange-700",
        bgLight: "bg-orange-50",
    },
    Unhealthy: {
        min: 151,
        max: 200,
        color: "bg-red-500",
        textColor: "text-red-700",
        bgLight: "bg-red-50",
    },
    VeryUnhealthy: {
        min: 201,
        max: 300,
        color: "bg-purple-500",
        textColor: "text-purple-700",
        bgLight: "bg-purple-50",
    },
    Hazardous: {
        min: 301,
        max: 500,
        rangeLabel: ">300",
        color: "bg-rose-900",
        textColor: "text-rose-900",
        bgLight: "bg-rose-100",
    },
};

function App() {
    const [city, setCity] = useState("");

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // Get AQI category based on value
    const getAQICategory = (aqi) => {
        if (aqi <= 50) return "Good";
        if (aqi <= 100) return "Moderate";
        if (aqi <= 150) return "UnhealthySensitiveGroups";
        if (aqi <= 200) return "Unhealthy";
        if (aqi <= 300) return "VeryUnhealthy";
        return "Hazardous";
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!city.trim()) {
            setError("Please enter a city name");
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch("http://localhost:8000/predict", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ city }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Server error");
            }

            const data = await response.json();

            setResult({
                aqi: data.aqi,
                category: getAQICategory(data.aqi),
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const categoryInfo = result ? AQI_CATEGORIES[result.category] : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-4 tracking-tight">
                        <span className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                            Air Quality Index
                        </span>{" "}
                        Prediction
                    </h1>
                    <p className="text-gray-700 text-xl max-w-2xl mx-auto">
                        Uncover insights into your air quality by predicting AQI values
                        based on pollutant concentrations.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Input Form - Left Column */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-10 border border-gray-100">
                            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                                Enter City
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <input
                                        type="text"
                                        value={city}
                                        onChange={(e) => {
                                            setCity(e.target.value);
                                            if (result) {
                                                setResult(null);
                                                setError(null);
                                            }
                                        }}
                                        placeholder="e.g. Delhi"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-6 rounded-xl"
                                >
                                    {loading ? "Fetching & Predicting..." : "Get AQI Prediction"}
                                </button>

                                {error && (
                                    <div className="bg-red-100 border border-red-300 text-red-800 px-5 py-3 rounded-xl">
                                        {error}
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>

                    {/* Results Panel - Right Column */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Prediction Result */}
                        {result && (
                            <div
                                className={`bg-white rounded-3xl shadow-xl p-6 border-2 ${categoryInfo.color.replace("bg-", "border-")} ${categoryInfo.bgLight}`}
                            >
                                <h2 className="text-3xl font-bold mb-5 text-gray-800 text-center">
                                    Predicted AQI
                                </h2>
                                <div className="text-center mb-4">
                                    <div
                                        className={`inline-block ${categoryInfo.color} text-white text-6xl font-extrabold px-10 py-5 rounded-2xl mb-4 transform hover:scale-105 transition-transform duration-200`}
                                    >
                                        {result.aqi.toFixed(1)}
                                    </div>
                                    <div
                                        className={`text-3xl font-bold ${categoryInfo.textColor} mb-2`}
                                    >
                                        {result.category.replace(/([A-Z])/g, " $1").trim()}
                                    </div>
                                    <p className="text-md text-gray-600">
                                        Air Quality Index Value
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* AQI Scale Legend */}
                        <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
                            <h3 className="text-2xl font-bold mb-5 text-gray-800 text-center">
                                AQI Scale Legend
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(AQI_CATEGORIES).map(([category, info]) => (
                                    <div
                                        key={category}
                                        className={`flex items-center p-3 rounded-xl ${info.bgLight} border-l-4 ${info.color.replace("bg-", "border-")} transition-all duration-200 hover:shadow-md`}
                                    >
                                        <div
                                            className={`w-5 h-5 rounded-full ${info.color} mr-4 flex-shrink-0`}
                                        ></div>
                                        <div className="flex-1 flex justify-between items-center">
                                            <div className="font-semibold text-gray-800 text-base">
                                                {category.replace(/([A-Z])/g, " $1").trim()}
                                            </div>
                                            <div className="text-sm text-gray-600 font-medium">
                                                {info.rangeLabel ?? `${info.min} - ${info.max}`}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
