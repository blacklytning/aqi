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
  { name: 'PM2.5', key: 'pm25', unit: 'μg/m³', description: 'Particulate matter with diameter less than 2.5 micrometers', fullForm: 'Fine Particulate Matter (PM2.5)' },
  { name: 'PM10', key: 'pm10', unit: 'μg/m³', description: 'Particulate matter with diameter less than 10 micrometers', fullForm: 'Coarse Particulate Matter (PM10)' },
  { name: 'NO', key: 'no', unit: 'μg/m³', description: 'Nitric Oxide', fullForm: 'Nitric Oxide' },
  { name: 'NO2', key: 'no2', unit: 'μg/m³', description: 'Nitrogen Dioxide', fullForm: 'Nitrogen Dioxide' },
  { name: 'NOx', key: 'nox', unit: 'ppb', description: 'Nitrogen Oxides', fullForm: 'Nitrogen Oxides' },
  { name: 'NH3', key: 'nh3', unit: 'μg/m³', description: 'Ammonia', fullForm: 'Ammonia' },
  { name: 'CO', key: 'co', unit: 'mg/m³', description: 'Carbon Monoxide', fullForm: 'Carbon Monoxide' },
  { name: 'SO2', key: 'so2', unit: 'μg/m³', description: 'Sulfur Dioxide', fullForm: 'Sulfur Dioxide' },
  { name: 'O3', key: 'o3', unit: 'μg/m³', description: 'Ozone', fullForm: 'Ozone' },
  { name: 'Benzene', key: 'benzene', unit: 'μg/m³', description: 'Benzene', fullForm: 'Benzene' },
  { name: 'Toluene', key: 'toluene', unit: 'μg/m³', description: 'Toluene', fullForm: 'Toluene' },
  { name: 'Xylene', key: 'xylene', unit: 'μg/m³', description: 'Xylene', fullForm: 'Xylene' }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-4 tracking-tight">
            <span className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Air Quality Index
            </span> Prediction
          </h1>
          <p className="text-gray-700 text-xl max-w-2xl mx-auto">
            Uncover insights into your air quality by predicting AQI values based on pollutant concentrations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Form - Left Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-10 border border-gray-100">
              <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Pollutant Concentrations</h2>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Pollutant Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {POLLUTANTS.map((pollutant) => (
                    <div key={pollutant.key} className="relative group">
                      <label 
                        htmlFor={pollutant.key}
                        className="block text-sm font-semibold text-gray-700 mb-2 flex items-center"
                      >
                        {pollutant.name}
                        <span className="text-gray-500 text-xs ml-2">({pollutant.unit})</span>
                        <span 
                          className="ml-2 text-blue-500 cursor-help group-hover:text-blue-700 transition-colors"
                          title={pollutant.fullForm + ': ' + pollutant.description}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                      </label>
                      <input
                        type="text"
                        id={pollutant.key}
                        name={pollutant.key}
                        value={formData[pollutant.key]}
                        onChange={handleChange}
                        className={`w-full px-4 py-2 border rounded-lg shadow-sm text-gray-800 
                          focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 
                          ${errors[pollutant.key] 
                            ? 'border-red-400 focus:ring-red-500' 
                            : 'border-gray-300 hover:border-gray-400'
                          }`}
                        placeholder="Enter value"
                      />
                      {errors[pollutant.key] && (
                        <p className="mt-2 text-sm text-red-600 font-medium">{errors[pollutant.key]}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center transform hover:-translate-y-0.5"
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
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                  >
                    Reset
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-100 border border-red-300 text-red-800 px-5 py-3 rounded-xl shadow-sm mt-6">
                    <p className="font-bold">Error:</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Results Panel - Right Column */}
          <div className="lg:col-span-1 space-y-8">
            {/* Prediction Result */}
            {result && (
              <div className={`bg-white rounded-3xl shadow-xl p-6 border-2 ${categoryInfo.color.replace('bg-', 'border-')} ${categoryInfo.bgLight}`}>
                <h2 className="text-3xl font-bold mb-5 text-gray-800 text-center">Predicted AQI</h2>
                <div className="text-center mb-4">
                  <div className={`inline-block ${categoryInfo.color} text-white text-6xl font-extrabold px-10 py-5 rounded-2xl mb-4 transform hover:scale-105 transition-transform duration-200`}>
                    {result.aqi.toFixed(1)}
                  </div>
                  <div className={`text-3xl font-bold ${categoryInfo.textColor} mb-2`}>
                    {result.category.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <p className="text-md text-gray-600">Air Quality Index Value</p>
                </div>
              </div>
            )}

            {/* AQI Scale Legend */}
            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-2xl font-bold mb-5 text-gray-800 text-center">AQI Scale Legend</h3>
              <div className="space-y-3">
                {Object.entries(AQI_CATEGORIES).map(([category, info]) => (
                  <div 
                    key={category} 
                    className={`flex items-center p-3 rounded-xl ${info.bgLight} border-l-4 ${info.color.replace('bg-', 'border-')} transition-all duration-200 hover:shadow-md`}
                  >
                    <div className={`w-5 h-5 rounded-full ${info.color} mr-4 flex-shrink-0`}></div>
                    <div className="flex-1 flex justify-between items-center">
                      <div className="font-semibold text-gray-800 text-base">
                        {category.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-sm text-gray-600 font-medium">
                        {info.min} - {info.max}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-2xl font-bold mb-4 text-gray-800 text-center">About This System</h3>
              <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                This Air Quality Index (AQI) Prediction System utilizes an Extra Trees Regressor machine learning model, specifically trained on Indian AQI data. Input various pollutant concentrations to receive an instant AQI prediction.
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                The predicted AQI value is categorized and color-coded according to standard air quality levels, providing a quick visual understanding of the air quality. Hover over the <span className="font-semibold text-blue-600">ⓘ icon</span> next to each pollutant for detailed descriptions and units.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
