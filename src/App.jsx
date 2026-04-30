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

const FONT = "'Manrope', 'Inter', system-ui, sans-serif";
const C = {
  blue: "#0000D2", blueDark: "#0000A8", blueLight: "#e8eaff",
  black: "#1a1a1a", gray: "#6b6b6b", grayLight: "#e2e2e2",
  bg: "#f5f4f1", white: "#ffffff", red: "#C3594B", green: "#2D8A4E",
};
const labelStyle = { fontSize:"11px", color:C.gray, display:"block", marginBottom:"5px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.6px", fontFamily:FONT };
const inputStyle = { padding:"10px 14px", borderRadius:"8px", border:`1.5px solid ${C.grayLight}`, fontSize:"14px", width:"100%", fontFamily:FONT, color:C.black, background:C.white, outline:"none", transition:"border-color 0.15s" };
const tdStyle = { padding:"6px 10px", borderBottom:`1px solid ${C.grayLight}`, fontFamily:FONT, fontSize:"13px" };
const routeColor = [C.blue, C.red, C.green, "#8B5CF6", "#D97706"];
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

  // Werkelijke rijafstand + routelijn via OSRM (gratis, geen API key)
  const osrmRes = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${van.lon},${van.lat};${naar.lon},${naar.lat}?overview=full&geometries=geojson`
  );
  const osrmData = await osrmRes.json();
  const route = osrmData.routes?.[0];
  const distKm = route ? parseFloat((route.distance / 1000).toFixed(1)) : null;
  const routeCoords = route?.geometry?.coordinates ?? [];

  const W = 600, H = 380, PAD = 60;
  const allLons = [van.lon, naar.lon, ...routeCoords.map(c => c[0])];
  const allLats = [van.lat, naar.lat, ...routeCoords.map(c => c[1])];
  const minLon = Math.min(...allLons) - 0.02;
  const maxLon = Math.max(...allLons) + 0.02;
  const minLat = Math.min(...allLats) - 0.02;
  const maxLat = Math.max(...allLats) + 0.02;
  const toX = (lon) => PAD + ((lon - minLon) / (maxLon - minLon)) * (W - PAD * 2);
  const toY = (lat) => H - PAD - ((lat - minLat) / (maxLat - minLat)) * (H - PAD * 2);

  const vX = toX(van.lon), vY = toY(van.lat);
  const nX = toX(naar.lon), nY = toY(naar.lat);

  const routePath = routeCoords.length > 1
    ? `<polyline points="${routeCoords.map(c => `${toX(c[0])},${toY(c[1])}`).join(" ")}" fill="none" stroke="#0000D2" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>`
    : `<line x1="${vX}" y1="${vY}" x2="${nX}" y2="${nY}" stroke="#0000D2" stroke-width="3" stroke-dasharray="10,5" opacity="0.7"/>`;

  const midIdx = Math.floor(routeCoords.length / 2);
  const midX = routeCoords.length > 1 ? toX(routeCoords[midIdx][0]) : (vX + nX) / 2;
  const midY = routeCoords.length > 1 ? toY(routeCoords[midIdx][1]) : (vY + nY) / 2;
  const distLabel = distKm ? `${distKm} km` : "? km";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#f0ebe3" rx="8"/>
    <rect x="1" y="1" width="${W-2}" height="${H-2}" fill="none" stroke="#ccc" stroke-width="1" rx="8"/>
    ${routePath}
    <rect x="${midX - 30}" y="${midY - 15}" width="60" height="20" fill="white" rx="10" opacity="0.93"/>
    <text x="${midX}" y="${midY - 1}" font-family="Arial" font-size="12" font-weight="bold" fill="#0000D2" text-anchor="middle">${distLabel}</text>
    <circle cx="${vX}" cy="${vY}" r="12" fill="#C3594B" stroke="white" stroke-width="2"/>
    <text x="${vX}" y="${vY + 5}" font-family="Arial" font-size="11" font-weight="bold" fill="white" text-anchor="middle">A</text>
    <rect x="${vX + 16}" y="${vY - 14}" width="${vanPostcode.length * 7 + 8}" height="18" fill="white" rx="3" opacity="0.9"/>
    <text x="${vX + 20}" y="${vY - 2}" font-family="Arial" font-size="11" fill="#333">${vanPostcode}</text>
    <circle cx="${nX}" cy="${nY}" r="12" fill="#2D8A4E" stroke="white" stroke-width="2"/>
    <text x="${nX}" y="${nY + 5}" font-family="Arial" font-size="11" font-weight="bold" fill="white" text-anchor="middle">B</text>
    <rect x="${nX + 16}" y="${nY - 14}" width="${naarPostcode.length * 7 + 8}" height="18" fill="white" rx="3" opacity="0.9"/>
    <text x="${nX + 20}" y="${nY - 2}" font-family="Arial" font-size="11" fill="#333">${naarPostcode}</text>
    <text x="10" y="${H - 8}" font-family="Arial" font-size="9" fill="#aaa">© OpenStreetMap bijdragers | Routeberekening via OSRM</text>
  </svg>`;

  return {
    image: "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg))),
    distKm,
  };
}

export default function KmDeclaratie() {
  // Inject global styles once
  if (typeof document !== "undefined" && !document.getElementById("km-global-style")) {
    const s = document.createElement("style");
    s.id = "km-global-style";
    s.textContent = `*{box-sizing:border-box;margin:0;padding:0}body{background:#f5f4f1}input,select,textarea{font-family:'Manrope','Inter',system-ui,sans-serif}input:focus,select:focus{outline:none;border-color:#0000D2!important}`;
    document.head.appendChild(s);
  }
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
      const result = await fetchRouteMapImage(route.vanPostcode, route.naarPostcode);
      updateDraftRoute(route.id, "mapImage", result.image);
      if (result.distKm !== null) updateDraftRoute(route.id, "kmEnkel", result.distKm);
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
    <div style={{ fontFamily:FONT, minHeight:"100vh", background:C.bg, color:C.black }}>

      {/* Update-banner */}
      {updateInfo && (
        <div style={{ background:"#FFF8E1", borderBottom:`2px solid #F9A825`, padding:"10px 32px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
          <div style={{ fontSize:"13px", color:"#7A5800", fontWeight:"600" }}>
            ⬆ Nieuwe versie beschikbaar ({updateInfo.version})
            {updateInfo.changelog && <span style={{ fontWeight:"400", marginLeft:"8px", opacity:0.8 }}>— {updateInfo.changelog}</span>}
          </div>
          <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
            <a href={updateInfo.downloadUrl} target="_blank" rel="noreferrer"
              style={{ padding:"6px 18px", borderRadius:"24px", background:C.blue, color:C.white, textDecoration:"none", fontSize:"13px", fontWeight:"700", display:"flex", alignItems:"center", gap:"6px" }}>
              Download →
            </a>
            <button onClick={() => setUpdateInfo(null)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"18px", color:"#7A5800", lineHeight:1, padding:"0 4px" }}>✕</button>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ background:C.white, borderBottom:`1px solid ${C.grayLight}`, padding:"0 32px" }}>
        <div style={{ maxWidth:"1100px", margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", height:"64px", gap:"16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"20px" }}>
            <div style={{ fontWeight:"800", fontSize:"22px", letterSpacing:"-0.5px", color:C.black }}>
              <span style={{ color:C.blue }}>i</span>O
            </div>
            <div style={{ width:"1px", height:"24px", background:C.grayLight }} />
            <div>
              <div style={{ fontSize:"13px", color:C.gray, fontWeight:"500", letterSpacing:"0.2px" }}>Kilometerdeclaratie</div>
              {config.naam && <div style={{ fontSize:"16px", fontWeight:"700", color:C.black, lineHeight:1.2 }}>{config.naam}</div>}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
            <span style={{ fontSize:"12px", color:C.gray }}>€{config.kmVergoeding}/km · {config.routes.length} route{config.routes.length !== 1 ? "s" : ""} · v{VERSION}</span>
            <button onClick={() => { setDraftConfig(JSON.parse(JSON.stringify(config))); setShowSettings(true); }}
              style={{ padding:"8px 20px", borderRadius:"24px", border:`1.5px solid ${C.blue}`, background:"transparent", color:C.blue, cursor:"pointer", fontWeight:"700", fontSize:"13px", fontFamily:FONT, display:"flex", alignItems:"center", gap:"6px", transition:"all 0.15s" }}>
              Instellingen →
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position:"fixed", inset:0, background:"rgba(26,26,26,0.5)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
          <div style={{ background:C.white, borderRadius:"16px", padding:"32px", width:"100%", maxWidth:"640px", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)", fontFamily:FONT }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
              <div style={{ fontWeight:"800", fontSize:"20px", color:C.black }}>Instellingen</div>
              <button onClick={() => setShowSettings(false)} style={{ background:"none", border:"none", fontSize:"22px", cursor:"pointer", color:C.gray, lineHeight:1, padding:"4px" }}>✕</button>
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

            <div style={{ fontWeight:"700", fontSize:"14px", marginBottom:"12px", borderTop:`1px solid ${C.grayLight}`, paddingTop:"20px", color:C.black }}>Routes</div>

            {draftConfig.routes.map((route, ri) => (
              <div key={route.id} style={{ background:C.bg, borderRadius:"12px", padding:"18px", marginBottom:"14px", borderLeft:`4px solid ${routeColor[ri % routeColor.length]}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
                  <div style={{ fontWeight:"700", fontSize:"13px", color:routeColor[ri % routeColor.length], textTransform:"uppercase", letterSpacing:"0.5px" }}>Route {ri + 1}</div>
                  {draftConfig.routes.length > 1 && (
                    <button onClick={() => removeDraftRoute(route.id)}
                      style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:"13px", fontWeight:"700", fontFamily:FONT }}>Verwijder ✕</button>
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
                  <label style={{ ...labelStyle, color: route.mapImage ? C.gray : C.red }}>
                    Routekaart * verplicht
                  </label>

                  {/* Auto-ophalen */}
                  {route.vanPostcode && route.naarPostcode && (
                    <div style={{ marginBottom:"8px" }}>
                      <div style={{ display:"flex", gap:"10px", alignItems:"center", flexWrap:"wrap" }}>
                        <button onClick={() => handleAutoMap(route)} disabled={mapLoading[route.id]}
                          style={{ padding:"8px 16px", borderRadius:"24px", border:`1.5px solid ${C.blue}`, background:"transparent", color:C.blue, cursor:"pointer", fontSize:"13px", fontWeight:"700", fontFamily:FONT, opacity: mapLoading[route.id] ? 0.6 : 1 }}>
                          {mapLoading[route.id] ? "Ophalen…" : "Kaart automatisch ophalen →"}
                        </button>
                        <a href={`https://www.google.nl/maps/dir/${encodeURIComponent(route.vanPostcode + ",+NL")}/${encodeURIComponent(route.naarPostcode + ",+NL")}`}
                          target="_blank" rel="noreferrer"
                          style={{ fontSize:"13px", color:C.blue, textDecoration:"none", fontWeight:"600" }}>
                          Open in Google Maps →
                        </a>
                      </div>
                      {mapErrors[route.id] && (
                        <div style={{ marginTop:"6px", fontSize:"12px", color:C.red, fontWeight:"600" }}>
                          ⚠ {mapErrors[route.id]} — gebruik handmatig uploaden of "Open in Google Maps".
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
                      <img src={route.mapImage} alt="Routekaart" style={{ maxWidth:"100%", maxHeight:"140px", borderRadius:"10px", border:`1px solid ${C.grayLight}`, display:"block" }} />
                      <button onClick={() => updateDraftRoute(route.id, "mapImage", null)}
                        style={{ position:"absolute", top:"6px", right:"6px", background:"rgba(26,26,26,0.7)", color:C.white, border:"none", borderRadius:"6px", padding:"3px 8px", cursor:"pointer", fontSize:"12px", fontWeight:"700" }}>
                        ✕
                      </button>
                    </div>
                  )}
                  {!route.mapImage && (
                    <div style={{ marginTop:"8px", fontSize:"12px", color:C.red, fontWeight:"600" }}>
                      Nog geen kaart — gebruik "Kaart automatisch ophalen" of upload een screenshot.
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button onClick={addDraftRoute}
              style={{ padding:"10px 18px", borderRadius:"24px", border:`2px dashed ${C.blue}`, background:"transparent", color:C.blue, cursor:"pointer", fontSize:"13px", fontWeight:"700", marginBottom:"20px", fontFamily:FONT }}>
              + Route toevoegen
            </button>

            <div style={{ display:"flex", gap:"10px", justifyContent:"flex-end", borderTop:`1px solid ${C.grayLight}`, paddingTop:"20px", flexWrap:"wrap", alignItems:"center" }}>
              {settingsError && (
                <div style={{ flex:"1 1 100%", fontSize:"13px", color:C.red, fontWeight:"600" }}>⚠ {settingsError}</div>
              )}
              <button onClick={() => setShowSettings(false)}
                style={{ padding:"10px 22px", borderRadius:"24px", border:`1.5px solid ${C.grayLight}`, background:C.white, cursor:"pointer", fontSize:"13px", fontWeight:"600", fontFamily:FONT, color:C.black }}>Annuleer</button>
              <button onClick={saveSettings}
                style={{ padding:"10px 28px", borderRadius:"24px", border:"none", background:C.blue, color:C.white, cursor:"pointer", fontSize:"13px", fontWeight:"700", fontFamily:FONT }}>
                Opslaan →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"24px 32px 0" }}>
        <div style={{ display:"flex", gap:"0", borderBottom:`2px solid ${C.grayLight}`, marginBottom:"24px" }}>
          {[["select","Dagen selecteren"],["preview","Declaratie"]].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding:"12px 24px", border:"none", background:"transparent", cursor:"pointer",
              fontWeight:"700", fontSize:"14px", fontFamily:FONT,
              color: view===v ? C.blue : C.gray,
              borderBottom: view===v ? `3px solid ${C.blue}` : "3px solid transparent",
              marginBottom:"-2px", transition:"color 0.15s"
            }}>{label}</button>
          ))}
        </div>
      </div>

      {view === "select" && (
        <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"0 32px 32px" }}>
        <div style={{ background:C.white, borderRadius:"16px", padding:"28px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ display:"flex", gap:"12px", alignItems:"flex-end", marginBottom:"20px", flexWrap:"wrap" }}>
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
              <div style={{ fontSize:"11px", color:C.gray, fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.4px", marginBottom:"2px" }}>Geselecteerd</div>
              <div style={{ fontSize:"28px", fontWeight:"800", color:C.blue, lineHeight:1, fontFamily:FONT }}>{selectedCount}</div>
              <div style={{ fontSize:"11px", color:C.gray }}>dagen · {totalKm.toFixed(1)} km · €{totalVergoeding.toFixed(2)}</div>
            </div>
          </div>

          {config.routes.length > 0 && (
            <div style={{ marginBottom:"20px" }}>
              <div style={labelStyle}>Actieve route</div>
              <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                {config.routes.map((r, ri) => (
                  <button key={r.id} onClick={() => setActiveTool(r.id)} style={{
                    padding:"8px 18px", borderRadius:"24px", border:`2px solid ${routeColor[ri % routeColor.length]}`,
                    background: activeTool===r.id ? routeColor[ri % routeColor.length] : "transparent",
                    color: activeTool===r.id ? C.white : routeColor[ri % routeColor.length],
                    cursor:"pointer", fontWeight:"700", fontSize:"13px", fontFamily:FONT, transition:"all 0.15s"
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
                    <th key={d} style={{ padding:"8px 4px", textAlign:"center", fontSize:"11px", color:d==="zo"||d==="za"?C.grayLight:C.gray, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.6px", fontFamily:FONT }}>{d}</th>
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
                        <td key={di} style={{ padding:"4px", textAlign:"center", verticalAlign:"top" }}>
                          {day ? (
                            <div onClick={() => toggleDay(day)} style={{
                              width:"46px", height:"52px", margin:"0 auto", borderRadius:"10px",
                              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                              cursor: isWeekend?"default":"pointer",
                              background: color?color:isWeekend?C.bg:C.white,
                              color: color?C.white:isWeekend?C.grayLight:C.black,
                              border:`2px solid ${color?color:isWeekend?"transparent":C.grayLight}`,
                              fontWeight: color?"700":"500", transition:"all 0.15s",
                              boxShadow: color?"0 2px 6px rgba(0,0,0,0.12)":"none",
                            }}>
                              <span style={{ fontSize:"15px", fontFamily:FONT }}>{day}</span>
                              {route && <span style={{ fontSize:"7px", opacity:0.85, marginTop:"2px", lineHeight:1.2, fontFamily:FONT }}>{route.soortDag}</span>}
                            </div>
                          ) : <div style={{ width:"46px", height:"52px" }} />}
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
            }} style={{ padding:"8px 18px", borderRadius:"24px", border:`1.5px solid ${C.grayLight}`, background:C.white, cursor:"pointer", fontSize:"13px", fontFamily:FONT, fontWeight:"600", color:C.black }}>
              Alle werkdagen
            </button>
            <button onClick={() => setSelectedDays({})}
              style={{ padding:"8px 18px", borderRadius:"24px", border:`1.5px solid ${C.grayLight}`, background:C.white, cursor:"pointer", fontSize:"13px", fontFamily:FONT, fontWeight:"600", color:C.black }}>
              Wis alles
            </button>
            <button onClick={() => setView("preview")} disabled={selectedCount===0}
              style={{ padding:"10px 24px", borderRadius:"24px", border:"none", background:selectedCount>0?C.blue:"#ccc", color:C.white, cursor:selectedCount>0?"pointer":"default", fontSize:"13px", fontWeight:"700", fontFamily:FONT, marginLeft:"auto" }}>
              Bekijk declaratie →
            </button>
          </div>
        </div>
        </div>
      )}

      {view === "preview" && (
        <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"0 32px 32px" }}>
        <div style={{ background:C.white, borderRadius:"16px", padding:"28px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px", flexWrap:"wrap", gap:"12px" }}>
            <div style={{ fontWeight:"800", fontSize:"20px", color:C.black }}>
              Declaratie — {MAANDEN[month]} {year}
            </div>
            <button onClick={handlePrint}
              style={{ padding:"10px 24px", borderRadius:"24px", border:"none", background:C.blue, color:C.white, cursor:"pointer", fontWeight:"700", fontSize:"13px", fontFamily:FONT }}>
              Download / Print PDF →
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
                    <th key={h} style={{ background:C.black, color:C.white, padding:"5px 7px", textAlign:"left", fontSize:"7.5pt", fontFamily:"Arial", whiteSpace:"nowrap" }}>{h}</th>
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

            {/* Routekaarten per gebruikte route */}
            {usedRoutes.filter(r => r.mapImage).map((route, ri) => (
              <div key={route.id} style={{ marginTop:"24px", pageBreakInside:"avoid" }}>
                <div style={{ fontFamily:"Arial", fontSize:"9pt", fontWeight:"bold", color:C.black, borderBottom:`2px solid ${C.black}`, paddingBottom:"5px", marginBottom:"10px" }}>
                  Routekaart — {route.label} ({route.vanPostcode} → {route.naarPostcode}, {route.kmEnkel} km enkel)
                </div>
                <img src={route.mapImage} alt={`Routekaart ${route.label}`}
                  style={{ maxWidth:"480px", width:"100%", border:`1px solid ${C.grayLight}`, borderRadius:"8px", display:"block" }} />
              </div>
            ))}

            {/* Melding als routes gebruikt worden zonder screenshot */}
            {usedRoutes.filter(r => !r.mapImage).length > 0 && (
              <div style={{ marginTop:"16px", fontSize:"13px", color:C.gray, fontStyle:"italic" }}>
                Geen routekaart beschikbaar voor: {usedRoutes.filter(r=>!r.mapImage).map(r=>r.label).join(", ")}. Upload een screenshot via Instellingen.
              </div>
            )}

            <div style={{ marginTop:"16px", fontSize:"13px", color:C.gray, borderTop:`1px solid ${C.grayLight}`, paddingTop:"12px" }}>
              Vergoeding: €{config.kmVergoeding}/km &nbsp;·&nbsp; {selectedCount} reisdagen in {MAANDEN[month]} {year}
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
