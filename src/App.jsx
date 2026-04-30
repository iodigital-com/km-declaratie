import { useState, useRef, useEffect } from "react";

const VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";
// Pas deze URL aan naar de locatie waar je version.json host (bv. GitHub raw of Azure Blob)
const VERSION_CHECK_URL = "https://raw.githubusercontent.com/momeeuw/km-declaratie/main/public/version.json";

function isNewerVersion(remote, local) {
  const r = remote.split(".").map(Number);
  const l = local.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}

const MAANDEN = [  "januari","februari","maart","april","mei","juni",  "juli","augustus","september","oktober","november","december"];
const DAGEN_NL = ["zo","ma","di","wo","do","vr","za"];

const DEFAULT_CONFIG = {
  naam: "",
  kmVergoeding: 0.23,
  routes: [
    {
      id: 1,
      label: "Woon-werk",
      soortDag: "Kantoordag",
      vanPostcode: "",
      naarPostcode: "",
      doel: "woon-werk",
      kmEnkel: 0,
      retour: 2,
      mapImage: null,
    }
  ]
};

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function formatDate(day, month, year) { return `${day} ${MAANDEN[month]} ${year}`; }
function uid() { return Math.floor(Math.random() * 1e9); }

const labelStyle = { fontSize:"11px", color:"#747474", display:"block", marginBottom:"4px", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.4px" };
const inputStyle = { padding:"7px 10px", borderRadius:"6px", border:"1px solid #ddd", fontSize:"13px", width:"100%", fontFamily:"Arial" };
const tdStyle = { padding:"4px 7px", borderBottom:"1px solid #e8e8e8", fontFamily:"Arial" };
const routeColor = ["#0000D2","#C3594B","#2D8A4E","#8B5CF6","#D97706"];
const SOORT_DAG_OPTIES = ["Kantoordag", "Klantdag", "Thuiswerkdag", "Feestdag", "Vrij"];

async function fetchRouteMapImage(vanPostcode, naarPostcode) {
  const geocode = async (postcode) => {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(postcode + ", Nederland")}&format=json&limit=1`,
      { headers: { "Accept-Language": "nl" } }
    );
    const data = await r.json();
    if (!data[0]) throw new Error(`Postcode "${postcode}" niet gevonden`);
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  };
  const [van, naar] = await Promise.all([geocode(vanPostcode), geocode(naarPostcode)]);

  const W = 600, H = 380, PAD = 60;
  const minLat = Math.min(van.lat, naar.lat) - 0.04;
  const maxLat = Math.max(van.lat, naar.lat) + 0.04;
  const minLon = Math.min(van.lon, naar.lon) - 0.06;
  const maxLon = Math.max(van.lon, naar.lon) + 0.06;
  const toX = (lon) => PAD + ((lon - minLon) / (maxLon - minLon)) * (W - PAD * 2);
  const toY = (lat) => H - PAD - ((lat - minLat) / (maxLat - minLat)) * (H - PAD * 2);

  const vX = toX(van.lon), vY = toY(van.lat);
  const nX = toX(naar.lon), nY = toY(naar.lat);
  const dist = Math.sqrt(Math.pow(van.lat - naar.lat, 2) + Math.pow(van.lon - naar.lon, 2)) * 111;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#f0ebe3" rx="8"/>
    <rect x="1" y="1" width="${W-2}" height="${H-2}" fill="none" stroke="#ccc" stroke-width="1" rx="8"/>
    <line x1="${vX}" y1="${vY}" x2="${nX}" y2="${nY}" stroke="#0000D2" stroke-width="3" stroke-dasharray="10,5" opacity="0.7"/>
    <circle cx="${vX}" cy="${vY}" r="12" fill="#C3594B" stroke="white" stroke-width="2"/>
    <text x="${vX}" y="${vY + 5}" font-family="Arial" font-size="11" font-weight="bold" fill="white" text-anchor="middle">A</text>
    <rect x="${vX + 16}" y="${vY - 14}" width="${vanPostcode.length * 7 + 8}" height="18" fill="white" rx="3" opacity="0.9"/>
    <text x="${vX + 20}" y="${vY - 2}" font-family="Arial" font-size="11" fill="#333">${vanPostcode}</text>
    <circle cx="${nX}" cy="${nY}" r="12" fill="#2D8A4E" stroke="white" stroke-width="2"/>
    <text x="${nX}" y="${nY + 5}" font-family="Arial" font-size="11" font-weight="bold" fill="white" text-anchor="middle">B</text>
    <rect x="${nX + 16}" y="${nY - 14}" width="${naarPostcode.length * 7 + 8}" height="18" fill="white" rx="3" opacity="0.9"/>
    <text x="${nX + 20}" y="${nY - 2}" font-family="Arial" font-size="11" fill="#333">${naarPostcode}</text>
    <text x="${(vX+nX)/2 + 8}" y="${(vY+nY)/2 - 6}" font-family="Arial" font-size="11" fill="#0000D2" font-weight="bold">≈ ${dist.toFixed(1)} km</text>
    <text x="10" y="${H - 8}" font-family="Arial" font-size="9" fill="#aaa">Gegenereerd o.b.v. OpenStreetMap / Nominatim</text>
  </svg>`;

  return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
}

export default function KmDeclaratie() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [view, setView] = useState("select");
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [draftConfig, setDraftConfig] = useState(DEFAULT_CONFIG);
  const [selectedDays, setSelectedDays] = useState({});
  const [activeTool, setActiveTool] = useState(DEFAULT_CONFIG.routes[0]?.id ?? null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [mapLoading, setMapLoading] = useState({});
  const [mapErrors, setMapErrors] = useState({});
  const [settingsError, setSettingsError] = useState("");
  const printRef = useRef();

  // Laad opgeslagen instellingen uit localStorage bij opstarten
  useEffect(() => {
    const saved = localStorage.getItem("km-declaratie-config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        setDraftConfig(parsed);
        setActiveTool(parsed.routes[0]?.id ?? null);
      } catch (e) { /* corrupte data negeren */ }
    } else {
      // Eerste keer opstarten: open instellingen direct
      setShowSettings(true);
    }

    // Versiecheck
    fetch(VERSION_CHECK_URL)
      .then(r => r.json())
      .then(data => {
        if (data.version && isNewerVersion(data.version, VERSION)) {
          setUpdateInfo(data);
        }
      })
      .catch(() => { /* geen internet of URL niet ingesteld */ });
  }, []);

  // Sla instellingen op in localStorage bij elke wijziging
  useEffect(() => {
    localStorage.setItem("km-declaratie-config", JSON.stringify(config));
  }, [config]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const toggleDay = (day) => {
    const dow = new Date(year, month, day).getDay();
    if (dow === 0 || dow === 6) return;
    setSelectedDays(prev => {
      const next = { ...prev };
      if (next[day] === activeTool) delete next[day];
      else next[day] = activeTool;
      return next;
    });
  };

  const totalKm = Object.entries(selectedDays).reduce((sum, [, routeId]) => {
    const route = config.routes.find(r => r.id === routeId);
    return route ? sum + route.kmEnkel * route.retour : sum;
  }, 0);
  const totalVergoeding = totalKm * config.kmVergoeding;
  const selectedCount = Object.keys(selectedDays).length;

  // Collect unique routes used this month
  const usedRouteIds = [...new Set(Object.values(selectedDays))];
  const usedRoutes = usedRouteIds.map(id => config.routes.find(r => r.id === id)).filter(Boolean);

  const handlePrint = () => {
    const printContents = printRef.current.innerHTML;
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>Kilometerdeclaratie ${MAANDEN[month]} ${year}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; font-size:9pt; padding:15mm; color:#000; }
        h2 { font-size:13pt; margin-bottom:4px; }
        table { width:100%; border-collapse:collapse; margin-top:8px; }
        th { background:#1a1a2e; color:white; padding:5px 7px; text-align:left; font-size:7.5pt; white-space:nowrap; }
        td { padding:4px 7px; border-bottom:1px solid #e0e0e0; font-size:8.5pt; }
        .map-section { margin-top:20px; page-break-inside:avoid; }
        .map-section h3 { font-size:9pt; color:#444; margin-bottom:6px; border-bottom:1px solid #ddd; padding-bottom:4px; }
        .map-section img { max-width:480px; width:100%; border:1px solid #ddd; border-radius:4px; }
        .map-url { font-size:7.5pt; color:#0000D2; margin-bottom:6px; word-break:break-all; }
        @media print { body { padding:10mm 12mm; } }
      </style></head><body>${printContents}</body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  };

  // Calendar
  const calendarCells = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  const rows = [];
  for (let i = 0; i < calendarCells.length; i += 7) rows.push(calendarCells.slice(i, i + 7));

  // Settings helpers
  const updateDraftRoute = (id, field, value) => {
    setDraftConfig(prev => ({ ...prev, routes: prev.routes.map(r => r.id === id ? { ...r, [field]: value } : r) }));
  };
  const handleImageUpload = (id, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => updateDraftRoute(id, "mapImage", e.target.result);
    reader.readAsDataURL(file);
  };
  const addDraftRoute = () => {
    setDraftConfig(prev => ({
      ...prev,
      routes: [...prev.routes, { id: uid(), label: "Nieuwe route", soortDag: "Kantoordag", vanPostcode: "", naarPostcode: "", doel: "", kmEnkel: 0, retour: 2, mapImage: null }]
    }));
  };
  const removeDraftRoute = (id) => {
    setDraftConfig(prev => ({ ...prev, routes: prev.routes.filter(r => r.id !== id) }));
  };
  const handleAutoMap = async (route) => {
    if (!route.vanPostcode || !route.naarPostcode) return;
    setMapLoading(prev => ({ ...prev, [route.id]: true }));
    setMapErrors(prev => ({ ...prev, [route.id]: null }));
    try {
      const imageData = await fetchRouteMapImage(route.vanPostcode, route.naarPostcode);
      updateDraftRoute(route.id, "mapImage", imageData);
    } catch (e) {
      setMapErrors(prev => ({ ...prev, [route.id]: e.message }));
    } finally {
      setMapLoading(prev => ({ ...prev, [route.id]: false }));
    }
  };
  const saveSettings = () => {
    const missing = draftConfig.routes.filter(r => !r.mapImage);
    if (missing.length > 0) {
      setSettingsError(`Routekaart ontbreekt voor: ${missing.map(r => r.label).join(", ")}`);
      return;
    }
    setSettingsError("");
    setConfig(draftConfig);
    if (!draftConfig.routes.find(r => r.id === activeTool)) setActiveTool(draftConfig.routes[0]?.id ?? null);
    setSelectedDays({});
    setShowSettings(false);
  };

  return (
    <div style={{ fontFamily:"Arial, sans-serif", minHeight:"100vh", background:"#EBE8E3", padding:"20px" }}>

      {/* Update-banner */}
      {updateInfo && (
        <div style={{ background:"#FFF3CD", border:"1px solid #FFCA28", borderRadius:"8px", padding:"10px 16px", marginBottom:"14px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
          <div style={{ fontSize:"13px", color:"#7A5800" }}>
            <strong>⬆️ Nieuwe versie beschikbaar ({updateInfo.version})</strong>
            {updateInfo.changelog && <span style={{ marginLeft:"8px", opacity:0.8 }}>— {updateInfo.changelog}</span>}
          </div>
          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
            <a href={updateInfo.downloadUrl} target="_blank" rel="noreferrer"
              style={{ padding:"5px 14px", borderRadius:"5px", background:"#0000D2", color:"white", textDecoration:"none", fontSize:"12px", fontWeight:"600" }}>
              Download nieuwste versie
            </a>
            <button onClick={() => setUpdateInfo(null)}
              style={{ background:"none", border:"none", cursor:"pointer", fontSize:"16px", color:"#7A5800", lineHeight:1 }}>✕</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:"#0000D2", color:"white", borderRadius:"10px", padding:"16px 22px", marginBottom:"16px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"10px" }}>
        <div>
          <div style={{ fontSize:"11px", opacity:0.7, textTransform:"uppercase", letterSpacing:"1px" }}>iO — Kilometerdeclaratie</div>
          <div style={{ fontSize:"20px", fontWeight:"bold", marginTop:"2px" }}>{config.naam}</div>
          <div style={{ fontSize:"11px", opacity:0.75, marginTop:"3px" }}>€{config.kmVergoeding}/km &nbsp;|&nbsp; {config.routes.length} route{config.routes.length !== 1 ? "s" : ""} geconfigureerd &nbsp;|&nbsp; v{VERSION}</div>
        </div>
        <button onClick={() => { setDraftConfig(JSON.parse(JSON.stringify(config))); setShowSettings(true); }}
          style={{ padding:"8px 16px", borderRadius:"7px", border:"2px solid rgba(255,255,255,0.4)", background:"transparent", color:"white", cursor:"pointer", fontWeight:"600", fontSize:"12px" }}>
          ⚙️ Instellingen
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
          <div style={{ background:"white", borderRadius:"12px", padding:"24px", width:"100%", maxWidth:"620px", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 8px 32px rgba(0,0,0,0.2)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"18px" }}>
              <div style={{ fontWeight:"700", fontSize:"16px" }}>⚙️ Instellingen</div>
              <button onClick={() => setShowSettings(false)} style={{ background:"none", border:"none", fontSize:"20px", cursor:"pointer", color:"#747474" }}>✕</button>
            </div>

            <div style={{ marginBottom:"14px" }}>
              <label style={labelStyle}>Naam</label>
              <input value={draftConfig.naam} onChange={e => setDraftConfig(p => ({ ...p, naam: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ marginBottom:"18px" }}>
              <label style={labelStyle}>KM vergoeding (€ per km)</label>
              <input type="number" step="0.01" value={draftConfig.kmVergoeding}
                onChange={e => setDraftConfig(p => ({ ...p, kmVergoeding: parseFloat(e.target.value) || 0 }))}
                style={{ ...inputStyle, width:"140px" }} />
            </div>

            <div style={{ fontWeight:"700", fontSize:"13px", marginBottom:"10px", borderTop:"1px solid #eee", paddingTop:"14px" }}>Routes</div>

            {draftConfig.routes.map((route, ri) => (
              <div key={route.id} style={{ background:"#f9f9f9", borderRadius:"8px", padding:"14px", marginBottom:"12px", borderLeft:`4px solid ${routeColor[ri % routeColor.length]}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"10px" }}>
                  <div style={{ fontWeight:"600", fontSize:"12px", color:routeColor[ri % routeColor.length] }}>Route {ri + 1}</div>
                  {draftConfig.routes.length > 1 && (
                    <button onClick={() => removeDraftRoute(route.id)}
                      style={{ background:"none", border:"none", color:"#C3594B", cursor:"pointer", fontSize:"12px", fontWeight:"600" }}>✕ Verwijder</button>
                  )}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                  {[["Label","label","text"],["Doel reis","doel","text"],["Van postcode","vanPostcode","text"],["Naar postcode","naarPostcode","text"],["KM enkel","kmEnkel","number"]].map(([lbl, field, type]) => (
                    <div key={field}>
                      <label style={labelStyle}>{lbl}</label>
                      <input type={type} step={field==="kmEnkel"?"0.1":undefined} value={route[field]}
                        onChange={e => updateDraftRoute(route.id, field, type==="number" ? parseFloat(e.target.value)||0 : e.target.value)}
                        style={inputStyle} />
                    </div>
                  ))}
                  <div>
                    <label style={labelStyle}>Soort dag</label>
                    <select
                      value={SOORT_DAG_OPTIES.includes(route.soortDag) ? route.soortDag : "Overig"}
                      onChange={e => updateDraftRoute(route.id, "soortDag", e.target.value === "Overig" ? "" : e.target.value)}
                      style={inputStyle}>
                      {SOORT_DAG_OPTIES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      <option value="Overig">Overig…</option>
                    </select>
                    {!SOORT_DAG_OPTIES.includes(route.soortDag) && (
                      <input type="text" placeholder="Vul soort dag in" value={route.soortDag}
                        onChange={e => updateDraftRoute(route.id, "soortDag", e.target.value)}
                        style={{ ...inputStyle, marginTop:"6px" }} />
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Enkel (1) of Retour (2)</label>
                    <select value={route.retour} onChange={e => updateDraftRoute(route.id, "retour", +e.target.value)} style={inputStyle}>
                      <option value={1}>1 – Enkel</option>
                      <option value={2}>2 – Retour</option>
                    </select>
                  </div>
                </div>

                {/* Google Maps kaart — verplicht */}
                <div style={{ marginTop:"12px", borderTop:"1px dashed #ddd", paddingTop:"12px" }}>
                  <label style={{ ...labelStyle, color: route.mapImage ? "#747474" : "#C3594B" }}>
                    📍 Routekaart * verplicht — verschijnt onderaan PDF
                  </label>

                  {/* Auto-ophalen */}
                  {route.vanPostcode && route.naarPostcode && (
                    <div style={{ marginBottom:"8px" }}>
                      <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
                        <button onClick={() => handleAutoMap(route)} disabled={mapLoading[route.id]}
                          style={{ padding:"6px 12px", borderRadius:"6px", border:"1px solid #0000D2", background:"white", color:"#0000D2", cursor:"pointer", fontSize:"12px", fontWeight:"600", opacity: mapLoading[route.id] ? 0.6 : 1 }}>
                          {mapLoading[route.id] ? "⏳ Ophalen…" : "🗺️ Kaart automatisch ophalen"}
                        </button>
                        <a href={`https://www.google.nl/maps/dir/${encodeURIComponent(route.vanPostcode + ",+NL")}/${encodeURIComponent(route.naarPostcode + ",+NL")}`}
                          target="_blank" rel="noreferrer"
                          style={{ fontSize:"12px", color:"#0000D2", textDecoration:"none" }}>
                          Open in Google Maps →
                        </a>
                      </div>
                      {mapErrors[route.id] && (
                        <div style={{ marginTop:"5px", fontSize:"11px", color:"#C3594B" }}>
                          ⚠️ {mapErrors[route.id]} — gebruik handmatig uploaden of "Open in Google Maps".
                        </div>
                      )}
                    </div>
                  )}

                  {/* Handmatig uploaden */}
                  <input type="file" accept="image/*"
                    onChange={e => handleImageUpload(route.id, e.target.files[0])}
                    style={{ fontSize:"12px", cursor:"pointer" }} />

                  {route.mapImage && (
                    <div style={{ marginTop:"10px", position:"relative", display:"inline-block" }}>
                      <img src={route.mapImage} alt="Routekaart" style={{ maxWidth:"100%", maxHeight:"140px", borderRadius:"6px", border:"1px solid #ddd", display:"block" }} />
                      <button onClick={() => updateDraftRoute(route.id, "mapImage", null)}
                        style={{ position:"absolute", top:"4px", right:"4px", background:"rgba(0,0,0,0.6)", color:"white", border:"none", borderRadius:"4px", padding:"2px 7px", cursor:"pointer", fontSize:"11px" }}>
                        ✕
                      </button>
                    </div>
                  )}
                  {!route.mapImage && (
                    <div style={{ marginTop:"6px", fontSize:"11px", color:"#C3594B" }}>
                      ⚠️ Nog geen kaart — gebruik "Kaart automatisch ophalen" of upload een screenshot.
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button onClick={addDraftRoute}
              style={{ padding:"7px 14px", borderRadius:"6px", border:"2px dashed #0000D2", background:"transparent", color:"#0000D2", cursor:"pointer", fontSize:"12px", fontWeight:"600", marginBottom:"18px" }}>
              + Route toevoegen
            </button>

            <div style={{ display:"flex", gap:"10px", justifyContent:"flex-end", borderTop:"1px solid #eee", paddingTop:"14px", flexWrap:"wrap", alignItems:"center" }}>
              {settingsError && (
                <div style={{ flex:"1 1 100%", fontSize:"12px", color:"#C3594B", fontWeight:"600" }}>⚠️ {settingsError}</div>
              )}
              <button onClick={() => setShowSettings(false)}
                style={{ padding:"8px 18px", borderRadius:"6px", border:"1px solid #ddd", background:"white", cursor:"pointer", fontSize:"13px" }}>Annuleer</button>
              <button onClick={saveSettings}
                style={{ padding:"8px 20px", borderRadius:"6px", border:"none", background:"#0000D2", color:"white", cursor:"pointer", fontSize:"13px", fontWeight:"600" }}>
                Opslaan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", gap:"8px", marginBottom:"16px" }}>
        {[["select","📅 Dagen selecteren"],["preview","📄 Declaratie preview"]].map(([v, label]) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding:"8px 18px", borderRadius:"6px", border:"none", cursor:"pointer", fontWeight:"600", fontSize:"13px",
            background: view===v ? "#0000D2" : "white", color: view===v ? "white" : "#242424",
            boxShadow:"0 1px 3px rgba(0,0,0,0.1)"
          }}>{label}</button>
        ))}
      </div>

      {view === "select" && (
        <div style={{ background:"white", borderRadius:"10px", padding:"20px", boxShadow:"0 1px 4px rgba(0,0,0,0.08)" }}>
          <div style={{ display:"flex", gap:"12px", alignItems:"flex-end", marginBottom:"16px", flexWrap:"wrap" }}>
            <div>
              <label style={labelStyle}>Maand</label>
              <select value={month} onChange={e => { setMonth(+e.target.value); setSelectedDays({}); }} style={{ ...inputStyle, width:"130px" }}>
                {MAANDEN.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Jaar</label>
              <select value={year} onChange={e => { setYear(+e.target.value); setSelectedDays({}); }} style={{ ...inputStyle, width:"90px" }}>
                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div style={{ marginLeft:"auto", textAlign:"right" }}>
              <div style={{ fontSize:"11px", color:"#747474" }}>Totaal geselecteerd</div>
              <div style={{ fontSize:"22px", fontWeight:"bold", color:"#0000D2", lineHeight:1 }}>{selectedCount} dagen</div>
              <div style={{ fontSize:"11px", color:"#747474" }}>{totalKm.toFixed(1)} km &nbsp;|&nbsp; €{totalVergoeding.toFixed(2)}</div>
            </div>
          </div>

          {config.routes.length > 0 && (
            <div style={{ marginBottom:"14px" }}>
              <div style={{ fontSize:"11px", color:"#747474", marginBottom:"6px", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.5px" }}>Actieve route</div>
              <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                {config.routes.map((r, ri) => (
                  <button key={r.id} onClick={() => setActiveTool(r.id)} style={{
                    padding:"6px 14px", borderRadius:"20px", border:`2px solid ${routeColor[ri % routeColor.length]}`,
                    background: activeTool===r.id ? routeColor[ri % routeColor.length] : "white",
                    color: activeTool===r.id ? "white" : routeColor[ri % routeColor.length],
                    cursor:"pointer", fontWeight:"600", fontSize:"12px", transition:"all 0.15s"
                  }}>{r.label}</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  {DAGEN_NL.map(d => (
                    <th key={d} style={{ padding:"5px", textAlign:"center", fontSize:"11px", color:d==="zo"||d==="za"?"#bbb":"#747474", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.5px" }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((day, di) => {
                      const dow = di % 7;
                      const isWeekend = dow===0||dow===6;
                      const routeId = day ? selectedDays[day] : null;
                      const route = routeId ? config.routes.find(r => r.id===routeId) : null;
                      const ri2 = route ? config.routes.findIndex(r => r.id===routeId) : -1;
                      const color = ri2>=0 ? routeColor[ri2%routeColor.length] : null;
                      return (
                        <td key={di} style={{ padding:"3px", textAlign:"center", verticalAlign:"top" }}>
                          {day ? (
                            <div onClick={() => toggleDay(day)} style={{
                              width:"44px", height:"48px", margin:"0 auto", borderRadius:"8px",
                              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                              cursor: isWeekend?"default":"pointer",
                              background: color?color:isWeekend?"#F4F4F4":"white",
                              color: color?"white":isWeekend?"#ccc":"#242424",
                              border:`2px solid ${color?color:isWeekend?"transparent":"#eee"}`,
                              fontWeight: color?"700":"400", transition:"all 0.15s",
                            }}>
                              <span style={{ fontSize:"14px" }}>{day}</span>
                              {route && <span style={{ fontSize:"7px", opacity:0.9, marginTop:"1px", lineHeight:1.2 }}>{route.soortDag}</span>}
                            </div>
                          ) : <div style={{ width:"44px", height:"48px" }} />}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop:"14px", display:"flex", gap:"8px", flexWrap:"wrap", alignItems:"center" }}>
            <button onClick={() => {
              const next = {};
              for (let d=1; d<=daysInMonth; d++) {
                const dow = new Date(year,month,d).getDay();
                if (dow!==0&&dow!==6) next[d]=activeTool;
              }
              setSelectedDays(next);
            }} style={{ padding:"7px 14px", borderRadius:"6px", border:"1px solid #ddd", background:"#f4f4f4", cursor:"pointer", fontSize:"12px" }}>
              Alle werkdagen (actieve route)
            </button>
            <button onClick={() => setSelectedDays({})}
              style={{ padding:"7px 14px", borderRadius:"6px", border:"1px solid #ddd", background:"#f4f4f4", cursor:"pointer", fontSize:"12px" }}>
              Wis alles
            </button>
            <button onClick={() => setView("preview")} disabled={selectedCount===0}
              style={{ padding:"7px 18px", borderRadius:"6px", border:"none", background:selectedCount>0?"#0000D2":"#ccc", color:"white", cursor:selectedCount>0?"pointer":"default", fontSize:"12px", fontWeight:"600", marginLeft:"auto" }}>
              Bekijk declaratie →
            </button>
          </div>
        </div>
      )}

      {view === "preview" && (
        <div style={{ background:"white", borderRadius:"10px", padding:"20px", boxShadow:"0 1px 4px rgba(0,0,0,0.08)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px", flexWrap:"wrap", gap:"8px" }}>
            <div style={{ fontWeight:"700", fontSize:"16px", color:"#242424" }}>
              Declaratie — {MAANDEN[month]} {year}
            </div>
            <button onClick={handlePrint}
              style={{ padding:"9px 20px", borderRadius:"6px", border:"none", background:"#0000D2", color:"white", cursor:"pointer", fontWeight:"600", fontSize:"13px" }}>
              🖨️ Download / Print PDF
            </button>
          </div>

          <div ref={printRef}>
            <h2 style={{ fontFamily:"Arial", fontSize:"14pt", marginBottom:"3px" }}>Kilometerdeclaratie</h2>
            <div style={{ fontFamily:"Arial", fontSize:"9pt", color:"#444", marginBottom:"12px" }}>
              {config.naam} &nbsp;|&nbsp; {MAANDEN[month].charAt(0).toUpperCase()+MAANDEN[month].slice(1)} {year}
            </div>

            <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"Arial", fontSize:"8.5pt" }}>
              <thead>
                <tr>
                  {["Datum","Soort dag","Van postcode","Naar postcode","Doel reis (woon-werk, campus, naam klant)","KMs (snelste route Google Maps)","Enkel (1) of Retour (2)","Totaal KMs"].map(h => (
                    <th key={h} style={{ background:"#1a1a2e", color:"white", padding:"5px 7px", textAlign:"left", fontSize:"7.5pt", fontFamily:"Arial", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: daysInMonth }, (_, i) => i+1).map(day => {
                  const routeId = selectedDays[day];
                  const route = routeId ? config.routes.find(r => r.id===routeId) : null;
                  const dayKm = route ? route.kmEnkel*route.retour : 0;
                  return (
                    <tr key={day} style={{ background: route?"#f0f4ff":"white" }}>
                      <td style={tdStyle}>{formatDate(day,month,year)}</td>
                      <td style={tdStyle}>{route?route.soortDag:""}</td>
                      <td style={tdStyle}>{route?route.vanPostcode:""}</td>
                      <td style={tdStyle}>{route?route.naarPostcode:""}</td>
                      <td style={tdStyle}>{route?route.doel:""}</td>
                      <td style={{ ...tdStyle, textAlign:"right" }}>{route?route.kmEnkel:""}</td>
                      <td style={{ ...tdStyle, textAlign:"center" }}>{route?route.retour:""}</td>
                      <td style={{ ...tdStyle, textAlign:"right" }}>{dayKm>0?dayKm.toFixed(1):"0"}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={6} style={{ padding:"6px 7px", fontFamily:"Arial" }}></td>
                  <td style={{ padding:"6px 7px", fontWeight:"bold", textAlign:"right", borderTop:"2px solid #1a1a2e", background:"#f9f9f9", fontFamily:"Arial", fontSize:"8pt" }}>TOTAAL aan KM's:</td>
                  <td style={{ padding:"6px 7px", fontWeight:"bold", textAlign:"right", borderTop:"2px solid #1a1a2e", background:"#f9f9f9", fontFamily:"Arial" }}>{totalKm.toFixed(1)}</td>
                </tr>
                <tr>
                  <td colSpan={6} style={{ padding:"4px 7px", fontFamily:"Arial" }}></td>
                  <td style={{ padding:"4px 7px", fontWeight:"bold", textAlign:"right", background:"#f9f9f9", fontFamily:"Arial", fontSize:"8pt" }}>Totale KM vergoeding:</td>
                  <td style={{ padding:"4px 7px", fontWeight:"bold", textAlign:"right", background:"#f9f9f9", fontFamily:"Arial" }}>{totalVergoeding.toFixed(3)}</td>
                </tr>
              </tbody>
            </table>

            {/* Google Maps screenshots per gebruikte route */}
            {usedRoutes.filter(r => r.mapImage).map((route, ri) => (
              <div key={route.id} style={{ marginTop:"24px", pageBreakInside:"avoid" }}>
                <div style={{ fontFamily:"Arial", fontSize:"9pt", fontWeight:"bold", color:"#333", borderBottom:"1px solid #ddd", paddingBottom:"5px", marginBottom:"10px" }}>
                  📍 Routekaart — {route.label} ({route.vanPostcode} → {route.naarPostcode}, {route.kmEnkel} km enkel)
                </div>
                <img src={route.mapImage} alt={`Google Maps ${route.label}`}
                  style={{ maxWidth:"480px", width:"100%", border:"1px solid #ddd", borderRadius:"4px", display:"block" }} />
              </div>
            ))}

            {/* Melding als routes gebruikt worden zonder screenshot */}
            {usedRoutes.filter(r => !r.mapImage).length > 0 && (
              <div style={{ marginTop:"16px", fontSize:"8pt", color:"#aaa", fontFamily:"Arial", fontStyle:"italic" }}>
                Geen routekaart beschikbaar voor: {usedRoutes.filter(r=>!r.mapImage).map(r=>r.label).join(", ")}. Upload een screenshot via ⚙️ Instellingen.
              </div>
            )}

            <div style={{ marginTop:"12px", fontSize:"8pt", color:"#555", fontFamily:"Arial" }}>
              Vergoeding: €{config.kmVergoeding}/km &nbsp;|&nbsp; {selectedCount} reisdagen in {MAANDEN[month]} {year}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
