import { useState } from 'react'
import './App.css'
import { getApiUrl, API_CONFIG } from './config'

// AQI Categories and their color codes
const AQI_CATEGORIES = {
  Good: { min: 0, max: 50, color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' },
  Satisfactory: { min: 51, max: 100, color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  Moderate: { min: 101, max: 200, color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  Poor: { min: 201, max: 300, color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  VeryPoor: { min: 301, max: 400, color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50' },
  Severe: { min: 401, max: 500, color: 'bg-red-800', textColor: 'text-red-900', bgLight: 'bg-red-100' }
}

// Pollutant information with tooltips
const POLLUTANTS = [
  { name: 'PM2.5', key: 'pm25', unit: 'μg/m³', description: 'Particulate matter with diameter less than 2.5 micrometers' },
  { name: 'PM10', key: 'pm10', unit: 'μg/m³', description: 'Particulate matter with diameter less than 10 micrometers' },
  { name: 'NO', key: 'no', unit: 'μg/m³', description: 'Nitric Oxide' },
  { name: 'NO2', key: 'no2', unit: 'μg/m³', description: 'Nitrogen Dioxide' },
  { name: 'NOx', key: 'nox', unit: 'ppb', description: 'Nitrogen Oxides' },
  { name: 'NH3', key: 'nh3', unit: 'μg/m³', description: 'Ammonia' },
  { name: 'CO', key: 'co', unit: 'mg/m³', description: 'Carbon Monoxide' },
  { name: 'SO2', key: 'so2', unit: 'μg/m³', description: 'Sulfur Dioxide' },
  { name: 'O3', key: 'o3', unit: 'μg/m³', description: 'Ozone' },
  { name: 'Benzene', key: 'benzene', unit: 'μg/m³', description: 'Benzene' },
  { name: 'Toluene', key: 'toluene', unit: 'μg/m³', description: 'Toluene' },
  { name: 'Xylene', key: 'xylene', unit: 'μg/m³', description: 'Xylene' }
]

function App() {
  const [formData, setFormData] = useState({
    pm25: '',
    pm10: '',
    no: '',
    no2: '',
    nox: '',
    nh3: '',
    co: '',
    so2: '',
    o3: '',
    benzene: '',
    toluene: '',
    xylene: ''
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Get AQI category based on value
  const getAQICategory = (aqi) => {
    if (aqi <= 50) return 'Good'
    if (aqi <= 100) return 'Satisfactory'
    if (aqi <= 200) return 'Moderate'
    if (aqi <= 300) return 'Poor'
    if (aqi <= 400) return 'VeryPoor'
    return 'Severe'
  }

  // Validate input
  const validateInput = (name, value) => {
    const newErrors = { ...errors }
    
    if (value === '') {
      delete newErrors[name]
      setErrors(newErrors)
      return true
    }

    // Check if numeric
    if (isNaN(value) || value === '') {
      newErrors[name] = 'Must be a number'
      setErrors(newErrors)
      return false
    }

    // Check if negative
    if (parseFloat(value) < 0) {
      newErrors[name] = 'Cannot be negative'
      setErrors(newErrors)
      return false
    }

    delete newErrors[name]
    setErrors(newErrors)
    return true
  }

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    validateInput(name, value)
    // Clear result when input changes
    if (result) {
      setResult(null)
      setError(null)
    }
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate all fields
    let isValid = true
    const newErrors = {}
    
    Object.keys(formData).forEach(key => {
      if (!validateInput(key, formData[key])) {
        isValid = false
      }
    })

    if (!isValid) {
      return
    }

    // Check if at least one field is filled
    const hasData = Object.values(formData).some(val => val !== '')
    if (!hasData) {
      setError('Please enter at least one pollutant value')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Prepare data - convert to numbers, exclude empty values
      const payload = {}
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '') {
          payload[key] = parseFloat(formData[key])
        }
      })

      const response = await fetch(getApiUrl(API_CONFIG.PREDICT_ENDPOINT), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      // Handle different response formats
      const aqi = data.aqi ?? data.predicted_aqi ?? data.prediction ?? data.result
      
      if (aqi === undefined || aqi === null) {
        throw new Error('Invalid response format from API')
      }

      setResult({
        aqi: parseFloat(aqi),
        category: getAQICategory(parseFloat(aqi))
      })
    } catch (err) {
      setError(err.message || 'Failed to predict AQI. Please check your backend connection.')
      console.error('Prediction error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle reset
  const handleReset = () => {
    setFormData({
      pm25: '',
      pm10: '',
      no: '',
      no2: '',
      nox: '',
      nh3: '',
      co: '',
      so2: '',
      o3: '',
      benzene: '',
      toluene: '',
      xylene: ''
    })
    setErrors({})
    setResult(null)
    setError(null)
  }

  const categoryInfo = result ? AQI_CATEGORIES[result.category] : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-2">
            Air Quality Index Prediction
          </h1>
          <p className="text-gray-600 text-lg">
            Enter pollutant concentrations to predict AQI
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Form - Left Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Pollutant Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {POLLUTANTS.map((pollutant) => (
                    <div key={pollutant.key} className="relative">
                      <label 
                        htmlFor={pollutant.key}
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        {pollutant.name}
                        <span className="text-gray-500 text-xs ml-1">({pollutant.unit})</span>
                        <span 
                          className="ml-2 text-blue-500 cursor-help"
                          title={pollutant.description}
                        >
                          ℹ️
                        </span>
                      </label>
                      <input
                        type="text"
                        id={pollutant.key}
                        name={pollutant.key}
                        value={formData[pollutant.key]}
                        onChange={handleChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                          errors[pollutant.key] 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300'
                        }`}
                        placeholder="0.00"
                      />
                      {errors[pollutant.key] && (
                        <p className="mt-1 text-sm text-red-600">{errors[pollutant.key]}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Predicting...
                      </>
                    ) : (
                      'Predict AQI'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                  >
                    Reset
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <p className="font-medium">Error</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Results Panel - Right Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Prediction Result */}
            {result && (
              <div className={`bg-white rounded-xl shadow-lg p-6 ${categoryInfo.bgLight} border-2 ${categoryInfo.color.replace('bg-', 'border-')}`}>
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Prediction Result</h2>
                <div className="text-center mb-4">
                  <div className={`inline-block ${categoryInfo.color} text-white text-5xl font-bold px-8 py-4 rounded-lg mb-3`}>
                    {result.aqi.toFixed(1)}
                  </div>
                  <div className={`text-2xl font-semibold ${categoryInfo.textColor} mb-2`}>
                    {result.category.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className="text-sm text-gray-600">
                    AQI Value
                  </div>
                </div>
              </div>
            )}

            {/* AQI Scale Legend */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">AQI Scale</h3>
              <div className="space-y-2">
                {Object.entries(AQI_CATEGORIES).map(([category, info]) => (
                  <div 
                    key={category} 
                    className={`flex items-center p-2 rounded ${info.bgLight} border-l-4 ${info.color.replace('bg-', 'border-')}`}
                  >
                    <div className={`w-4 h-4 rounded-full ${info.color} mr-3`}></div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-800">
                        {category.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-xs text-gray-600">
                        {info.min} - {info.max}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-3 text-gray-800">ℹ️ Information</h3>
              <p className="text-sm text-gray-600 mb-3">
                Enter pollutant concentrations in their respective units. The model will predict the Air Quality Index (AQI) based on Indian AQI standards.
              </p>
              <p className="text-sm text-gray-600">
                Hover over the ℹ️ icon next to each pollutant for more information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
