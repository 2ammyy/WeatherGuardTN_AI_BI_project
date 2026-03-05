import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { tunisiaRegions } from '../data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

// --- Fix for Leaflet Default Icons (Important for Vite) ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;
// ----------------------------------------------------------

export default function MapDisplay() {
  const [hoveredCity, setHoveredCity] = useState(null);

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-900">
      <MapContainer 
        center={[34.5, 9.5]} // Centered on Tunisia
        zoom={6.5} 
        className="h-full w-full z-0"
        scrollWheelZoom={false}
      >
        {/* Using a dark themed map layer */}
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />
        
        {/* {tunisiaRegions.map((city) => (
          <Marker 
            key={city.id} 
            position={[city.lat, city.lng]}
            eventHandlers={{
              mouseover: () => setHoveredCity(city),
              mouseout: () => setHoveredCity(null),
            }}
          />
        ))} */}
      {tunisiaRegions.map((city) => (
      <CircleMarker 
        key={city.id} 
        center={[city.lat, city.lng]}
        radius={city.dangerScore / 5} // Size based on danger
        pathOptions={{
          fillColor: city.dangerScore > 70 ? '#ef4444' : '#3b82f6', 
          color: city.dangerScore > 70 ? '#f87171' : '#60a5fa',
          weight: 2,
          fillOpacity: 0.6
        }}
        eventHandlers={{
          mouseover: (e) => {
            e.target.setStyle({ fillOpacity: 0.9, weight: 4 });
            setHoveredCity(city);
          },
          mouseout: (e) => {
            e.target.setStyle({ fillOpacity: 0.6, weight: 2 });
            setHoveredCity(null);
          },
        }}
      />
      ))}
      </MapContainer>

      {/* The Smooth Hover Card (Danger Summary) */}
      <AnimatePresence>
        {hoveredCity && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 20 }}
            className="absolute top-10 right-10 z-[1000] w-72 bg-slate-900/90 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-2xl"
          >
            <div className="flex justify-between items-start">
              <h2 className="text-white font-bold text-xl">{hoveredCity.name}</h2>
              <span className={`px-2 py-1 rounded text-xs font-bold ${hoveredCity.dangerScore > 70 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {hoveredCity.dangerScore > 70 ? 'CRITICAL' : 'STABLE'}
              </span>
            </div>
            
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Danger Level:</span>
                <span className="text-white font-mono font-bold text-lg">
                  {hoveredCity.dangerScore}%
                </span>
              </div>
              
              {/* Simple Progress Bar */}
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${hoveredCity.dangerScore}%` }}
                  className={`h-full ${hoveredCity.dangerScore > 70 ? 'bg-red-500' : 'bg-blue-500'}`}
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400 text-sm">Primary Risk:</span>
                <span className="text-slate-200 text-sm font-medium">{hoveredCity.risk}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
              <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase">Temp</p>
                <p className="text-sm font-bold">{hoveredCity.temp}°C</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase">Source</p>
                <p className="text-sm font-bold text-blue-400 italic">MLflow Model</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}