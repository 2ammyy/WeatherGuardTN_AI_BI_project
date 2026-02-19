import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { Shield, Activity, Thermometer } from 'lucide-react';

const cities = [
  { id: 1, name: "Tunis", lat: 36.8, lng: 10.1, danger: 85 },
  { id: 2, name: "Sousse", lat: 35.8, lng: 10.6, danger: 35 },
  { id: 3, name: "Kairouan", lat: 35.6, lng: 10.1, danger: 65 },
  { id: 4, name: "Tataouine", lat: 32.9, lng: 10.4, danger: 95 },
];

export default function App() {
  const [active, setActive] = useState(null);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#020617', color: 'white', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      
      {/* Importation forcée du CSS Leaflet pour éviter les barres grises */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* Sidebar Latérale */}
      <aside style={{ width: '320px', backgroundColor: '#0b1120', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '30px', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div style={{ backgroundColor: '#2563eb', padding: '10px', borderRadius: '12px' }}>
            <Shield size={24} />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '-1px' }}>GUARDIA-TN</h1>
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', letterSpacing: '2px', marginBottom: '20px' }}>ALERTES ACTIVES</p>
          {cities.map(c => (
            <div key={c.id} style={{ padding: '15px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontWeight: '600' }}>{c.name}</span>
              <span style={{ color: c.danger > 70 ? '#ef4444' : '#3b82f6', fontWeight: 'bold', fontSize: '14px' }}>{c.danger}%</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Zone Carte - Style Google Hybrid */}
      <main style={{ flex: 1, position: 'relative' }}>
        <MapContainer 
          center={[34.5, 9.5]} 
          zoom={7} 
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          {/* TUILES GOOGLE MAPS HYBRIDE (Satellite + Routes) */}
          <TileLayer 
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" 
            attribution='&copy; Google Maps'
          />
          
          {cities.map(city => (
            <CircleMarker 
              key={city.id}
              center={[city.lat, city.lng]}
              radius={15}
              pathOptions={{
                fillColor: city.danger > 70 ? '#ef4444' : '#3b82f6',
                color: 'white',
                weight: 2,
                fillOpacity: 0.8
              }}
              eventHandlers={{
                mouseover: () => setActive(city),
                mouseout: () => setActive(null)
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <div style={{ padding: '5px', fontWeight: 'bold' }}>{city.name}</div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* HUD - Interface Supérieure */}
        <div style={{ position: 'absolute', top: '30px', left: '30px', zIndex: 1000, pointerEvents: 'none' }}>
          <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', fontStyle: 'italic' }}>SATELLITE <span style={{ color: '#3b82f6' }}>AI MONITOR</span></h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '10px', marginTop: '5px', fontWeight: 'bold' }}>
              <Activity size={14} /> FLUX DE DONNÉES EN DIRECT
            </div>
          </div>
        </div>

        {/* Carte de détails au survol */}
        {active && (
          <div style={{ position: 'absolute', bottom: '40px', right: '40px', zIndex: 1000, width: '280px', backgroundColor: 'rgba(11, 17, 32, 0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', padding: '25px', borderRadius: '32px' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '22px' }}>{active.name}</h3>
            <p style={{ color: '#3b82f6', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '20px' }}>ANALYSE BIOCLIMATIQUE</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b', fontSize: '12px' }}>Niveau de risque</span>
              <span style={{ fontWeight: 'bold', color: active.danger > 70 ? '#ef4444' : '#3b82f6' }}>{active.danger}%</span>
            </div>
            <div style={{ height: '6px', width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', marginTop: '10px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${active.danger}%`, backgroundColor: active.danger > 70 ? '#ef4444' : '#3b82f6', transition: 'width 0.5s ease-out' }}></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}