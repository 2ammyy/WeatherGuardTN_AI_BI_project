const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export const tmapsAPI = {
  geocode: async (query) => {
    const resp = await fetch(`${API_BASE}/api/tmaps/geocode?q=${encodeURIComponent(query)}`);
    if (!resp.ok) throw new Error(`Geocoding failed: ${resp.status}`);
    const data = await resp.json();
    if (!data.features || data.features.length === 0) return null;
    const f = data.features[0];
    return {
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      name: f.properties.name || f.properties.label || query,
    };
  },

  route: async (origin, destination, profile = 'driving') => {
    const resp = await fetch(`${API_BASE}/api/tmaps/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination, profile }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `Routing failed: ${resp.status}`);
    }
    const data = await resp.json();
    return {
      distance_km: data.distance_km,
      duration_min: data.duration_min,
      coordinates: data.coordinates || [],
      origin: data.origin,
      destination: data.destination,
      instructions: [],
    };
  },

  distanceMatrix: async (coordinates) => {
    const resp = await fetch(`${API_BASE}/api/tmaps/distance-matrix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates }),
    });
    if (!resp.ok) throw new Error(`Distance matrix failed: ${resp.status}`);
    return resp.json();
  },
};
