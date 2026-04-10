import { useState, useEffect, useRef } from "react";

const AQI_CATEGORIES = {
  Good: { min: 0, max: 50, color: "#00e5a0", glow: "0 0 30px #00e5a055", label: "Good", icon: "◈" },
  Moderate: { min: 51, max: 100, color: "#f5c842", glow: "0 0 30px #f5c84255", label: "Moderate", icon: "◉" },
  UnhealthySensitiveGroups: { min: 101, max: 150, color: "#ff8c42", glow: "0 0 30px #ff8c4255", label: "Unhealthy for Sensitive Groups", icon: "◎" },
  Unhealthy: { min: 151, max: 200, color: "#ff4d6d", glow: "0 0 30px #ff4d6d55", label: "Unhealthy", icon: "◌" },
  VeryUnhealthy: { min: 201, max: 300, color: "#c77dff", glow: "0 0 30px #c77dff55", label: "Very Unhealthy", icon: "◍" },
  Hazardous: { min: 301, max: 500, color: "#ff0a54", glow: "0 0 40px #ff0a5488", label: "Hazardous", icon: "⊗" },
};

const getAQICategory = (aqi) => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "UnhealthySensitiveGroups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "VeryUnhealthy";
  return "Hazardous";
};

// Animated particle canvas background
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 229, 160, ${p.alpha})`;
        ctx.fill();
      });
      // draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const d = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
          if (d < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 229, 160, ${0.08 * (1 - d / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

// Animated arc gauge
function AQIGauge({ aqi, category }) {
  const info = AQI_CATEGORIES[category];
  const pct = Math.min(aqi / 500, 1);
  const radius = 70, stroke = 10;
  const circ = Math.PI * radius; // half circle
  const offset = circ * (1 - pct);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={180} height={100} viewBox="0 0 180 100" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00e5a0" />
            <stop offset="50%" stopColor={info.color} />
            <stop offset="100%" stopColor={info.color} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Track */}
        <path
          d={`M 15 95 A ${radius} ${radius} 0 0 1 165 95`}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M 15 95 A ${radius} ${radius} 0 0 1 165 95`}
          fill="none" stroke="url(#gaugeGrad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          filter="url(#glow)"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}
        />
        {/* Center value */}
        <text x="90" y="80" textAnchor="middle" fill={info.color}
          style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Space Mono', monospace", filter: `drop-shadow(${info.glow})` }}>
          {aqi.toFixed(0)}
        </text>
        <text x="90" y="97" textAnchor="middle" fill="rgba(255,255,255,0.4)"
          style={{ fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: 2 }}>
          AQI
        </text>
      </svg>
    </div>
  );
}

// Scan line animation for result reveal
function ScanReveal({ children, visible }) {
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(16px)",
      transition: "opacity 0.6s ease, transform 0.6s ease",
    }}>
      {children}
    </div>
  );
}

export default function App() {
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [pulse, setPulse] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const handleSubmit = async () => {
    if (!city.trim()) { setError("Enter a city name"); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const response = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city }),
      });
      if (!response.ok) { const e = await response.json(); throw new Error(e.detail || "Server error"); }
      const data = await response.json();
      const cat = getAQICategory(data.aqi);
      setResult({ aqi: data.aqi, category: cat });
      setPulse(true); setTimeout(() => setPulse(false), 800);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const catInfo = result ? AQI_CATEGORIES[result.category] : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; overflow: hidden; }
        body { background: #060810; font-family: 'Syne', sans-serif; }
        
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scanline {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes ripple {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0,229,160,0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(0,229,160,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0,229,160,0); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes rotateBorder {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .input-field {
          width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 14px 18px; color: #fff;
          font-family: 'Space Mono', monospace; font-size: 14px; letter-spacing: 1px;
          outline: none; transition: all 0.3s ease;
        }
        .input-field:focus { border-color: rgba(0,229,160,0.6); background: rgba(0,229,160,0.04); box-shadow: 0 0 20px rgba(0,229,160,0.1); }
        .input-field::placeholder { color: rgba(255,255,255,0.2); }
        
        .btn-primary {
          width: 100%; padding: 14px; border: none; border-radius: 12px; cursor: pointer;
          font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 700;
          letter-spacing: 2px; text-transform: uppercase; position: relative; overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .btn-primary:hover:not(:disabled) { transform: translateY(-2px); }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .btn-primary:disabled { cursor: not-allowed; opacity: 0.7; }
        
        .scale-item {
          display: flex; align-items: center; gap: 10px; padding: 7px 12px;
          border-radius: 8px; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          transition: all 0.2s ease; cursor: default;
        }
        .scale-item:hover { background: rgba(255,255,255,0.06); transform: translateX(4px); }
        
        .glass-panel {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px; backdrop-filter: blur(20px);
          position: relative; overflow: hidden;
        }
        .glass-panel::before {
          content: ''; position: absolute; inset: 0; border-radius: 20px;
          background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 60%);
          pointer-events: none;
        }

        .loading-ring {
          width: 18px; height: 18px; border: 2px solid rgba(0,0,0,0.3);
          border-top-color: #000; border-radius: 50%;
          animation: spin 0.7s linear infinite; display: inline-block; vertical-align: middle; margin-right: 8px;
        }

        @media (max-width: 1100px) {
          html, body, #root { overflow: auto !important; }

          .app-shell {
            min-height: 100dvh;
            height: auto !important;
            overflow: auto !important;
          }

          .main-grid {
            grid-template-columns: 1fr !important;
            overflow: visible !important;
          }

          .left-panel {
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            padding: 24px !important;
          }

          .right-panel {
            padding: 20px 24px 24px !important;
          }

          .input-row {
            flex-direction: column;
          }

          .scan-button {
            width: 100% !important;
            min-width: 0 !important;
          }

          .result-row {
            align-items: flex-start !important;
            gap: 16px !important;
          }
        }

        @media (max-width: 700px) {
          .top-bar,
          .status-bar {
            padding: 10px 14px !important;
          }

          .main-grid {
            gap: 0;
          }

          .left-panel,
          .right-panel {
            padding: 16px !important;
          }

          .status-pollutants {
            display: none !important;
          }

          .result-row {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="app-shell" style={{
        height: "100vh", width: "100vw", position: "relative",
        display: "flex", flexDirection: "column", overflow: "hidden",
        background: "radial-gradient(ellipse at 20% 50%, rgba(0,229,160,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(120,80,255,0.04) 0%, transparent 60%), #060810",
      }}>
        <ParticleCanvas />

        {/* Decorative grid lines */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        {/* Top bar */}
        <div className="top-bar" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          position: "relative", zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", background: "#00e5a0",
              boxShadow: "0 0 12px #00e5a0", animation: "blink 2s ease infinite",
            }} />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 3, textTransform: "uppercase" }}>
              AQI · MONITOR
            </span>
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>
            SYS_READY
          </div>
        </div>

        {/* Main content */}
        <div className="main-grid" style={{
          flex: 1, display: "grid", gridTemplateColumns: "1fr 340px",
          gap: 0, overflow: "hidden", position: "relative", zIndex: 10,
        }}>

          {/* LEFT: Hero + Input */}
          <div className="left-panel" style={{
            display: "flex", flexDirection: "column", justifyContent: "center",
            padding: "24px 48px", borderRight: "1px solid rgba(255,255,255,0.06)",
          }}>

            {/* Title */}
            <div style={{ marginBottom: 32, animation: "fadeSlideIn 0.8s ease both" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#00e5a0", letterSpacing: 4, textTransform: "uppercase", marginBottom: 12 }}>
                ◈ ATMOSPHERIC INTELLIGENCE
              </div>
              <h1 style={{
                fontSize: "clamp(36px, 5vw, 58px)", fontWeight: 800, lineHeight: 1.05,
                color: "#fff", letterSpacing: -1,
              }}>
                Air Quality
                <br />
                <span style={{
                  background: "linear-gradient(90deg, #00e5a0, #7b5ea7, #00e5a0)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  animation: "shimmer 4s linear infinite",
                }}>
                  Index Scan
                </span>
              </h1>
              <p style={{ marginTop: 14, color: "rgba(255,255,255,0.4)", fontSize: 14, maxWidth: 400, lineHeight: 1.7, fontWeight: 400 }}>
                Predict real-time AQI values by scanning atmospheric pollutant data for any city worldwide.
              </p>
            </div>

            {/* Input Area */}
            <div style={{ maxWidth: 480, animation: "fadeSlideIn 0.9s ease 0.1s both" }}>
              <div style={{ marginBottom: 10, fontFamily: "'Space Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 3 }}>
                TARGET LOCATION
              </div>
              <div className="input-row" style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <input
                  className="input-field"
                  type="text"
                  value={city}
                  onChange={(e) => { setCity(e.target.value); if (result) { setResult(null); setError(null); } }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="e.g. Mumbai, Delhi, Tokyo..."
                />
                <button
                  className="btn-primary scan-button"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    width: "auto", padding: "14px 24px", whiteSpace: "nowrap", minWidth:"180px",
                    background: loading ? "rgba(0,229,160,0.3)" : "linear-gradient(135deg, #00e5a0, #00b377)",
                    color: "#000", boxShadow: loading ? "none" : "0 0 24px rgba(0,229,160,0.4)",
                    animation: pulse ? "ripple 0.8s ease" : "none",
                  }}
                >
                  {loading ? <><span className="loading-ring" />SCANNING</> : "→ SCAN"}
                </button>
              </div>

              {error && (
                <div style={{
                  padding: "12px 16px", borderRadius: 10, background: "rgba(255,77,109,0.1)",
                  border: "1px solid rgba(255,77,109,0.3)", color: "#ff4d6d",
                  fontFamily: "'Space Mono', monospace", fontSize: 12,
                  animation: "fadeSlideIn 0.3s ease both",
                }}>
                  ⚠ {error}
                </div>
              )}

              {/* Result Display */}
              <ScanReveal visible={!!result}>
                {result && (
                  <div style={{ marginTop: 20 }}>
                    <div className="glass-panel" style={{
                      padding: "24px", border: `1px solid ${catInfo.color}33`,
                      boxShadow: `0 0 40px ${catInfo.color}15`,
                    }}>
                      {/* Scan line effect */}
                      <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 20, pointerEvents: "none" }}>
                        <div style={{
                          position: "absolute", left: 0, right: 0, height: 2,
                          background: `linear-gradient(90deg, transparent, ${catInfo.color}80, transparent)`,
                          animation: "scanline 2s ease forwards",
                        }} />
                      </div>
                      <div className="result-row" style={{ display: "flex", alignItems: "center", gap: 24, position: "relative" }}>
                        <AQIGauge aqi={result.aqi} category={result.category} />
                        <div>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 3, marginBottom: 8 }}>
                            CLASSIFICATION
                          </div>
                          <div style={{
                            fontSize: 22, fontWeight: 800, color: catInfo.color,
                            textShadow: catInfo.glow, marginBottom: 4,
                          }}>
                            {catInfo.icon} {catInfo.label}
                          </div>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>
                            {city.toUpperCase()} · LIVE
                          </div>
                          <div style={{
                            marginTop: 12, display: "flex", gap: 6,
                            fontFamily: "'Space Mono', monospace", fontSize: 10,
                          }}>
                            <span style={{ padding: "4px 10px", borderRadius: 6, background: `${catInfo.color}20`, color: catInfo.color, border: `1px solid ${catInfo.color}40` }}>
                              {catInfo.min}–{catInfo.max === 500 ? "500+" : catInfo.max}
                            </span>
                            <span style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}>
                              US AQI
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </ScanReveal>

              {/* Idle state hint */}
              {!result && !loading && (
                <div style={{
                  marginTop: 20, fontFamily: "'Space Mono', monospace", fontSize: 10,
                  color: "rgba(255,255,255,0.15)", letterSpacing: 2, animation: "float 3s ease infinite",
                }}>
                  ↑ ENTER CITY AND HIT SCAN
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Scale Legend */}
          <div className="right-panel" style={{
            display: "flex", flexDirection: "column", justifyContent: "center",
            padding: "24px 24px", gap: 8, animation: "fadeSlideIn 1s ease 0.2s both",
          }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 3, marginBottom: 12 }}>
              AQI REFERENCE SCALE
            </div>
            {Object.entries(AQI_CATEGORIES).map(([key, info], i) => (
              <div
                key={key}
                className="scale-item"
                style={{
                  animationDelay: `${i * 0.08}s`,
                  borderLeft: `3px solid ${info.color}`,
                  background: result?.category === key ? `${info.color}12` : "rgba(255,255,255,0.02)",
                  boxShadow: result?.category === key ? `0 0 20px ${info.color}20` : "none",
                  transition: "all 0.4s ease",
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", background: info.color, flexShrink: 0,
                  boxShadow: result?.category === key ? `0 0 10px ${info.color}` : "none",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: result?.category === key ? info.color : "rgba(255,255,255,0.7)" }}>
                    {info.label}
                  </div>
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>
                  {info.min}–{info.max > 400 ? "500" : info.max}
                </div>
              </div>
            ))}

            {/* Bottom decorative element */}
            <div style={{ marginTop: 16, padding: "14px", borderRadius: 12, background: "rgba(0,229,160,0.04)", border: "1px solid rgba(0,229,160,0.1)" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "rgba(0,229,160,0.5)", letterSpacing: 2, marginBottom: 6 }}>
                DATA SOURCE
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
                ML-powered prediction engine analyzing atmospheric pollutants in real time.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="status-bar" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 32px", borderTop: "1px solid rgba(255,255,255,0.06)",
          position: "relative", zIndex: 10,
        }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.15)", letterSpacing: 2 }}>
            AQI PREDICTION ENGINE v2.0
          </div>
          <div className="status-pollutants" style={{ display: "flex", gap: 20 }}>
            {["PM2.5", "PM10", "NO₂", "SO₂", "CO", "O₃"].map(p => (
              <span key={p} style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.15)", letterSpacing: 1 }}>
                {p}
              </span>
            ))}
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "rgba(0,229,160,0.4)", letterSpacing: 2 }}>
            ● ONLINE
          </div>
        </div>
      </div>
    </>
  );
}
