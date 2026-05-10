import axios from 'axios';

export const fetchHazards = async (baseUrl) => {
  const API = baseUrl || process.env.REACT_APP_API_URL || 'http://localhost:8001';
  try {
    const response = await axios.get(`${API}/api/hazards/realtime`, { timeout: 10000 });
    return response.data.hazards || [];
  } catch (error) {
    console.error('Error fetching hazards:', error);
    return [];
  }
};

export const fetchHazardsByRegion = async () => {
  return fetchHazards();
};

export const getHazardIcon = (hazardType) => {
  const lower = (hazardType || '').toLowerCase();
  if (lower.includes('rain') || lower.includes('flood')) return '🌊';
  if (lower.includes('thunderstorm') || lower.includes('storm') || lower.includes('orage')) return '⛈️';
  if (lower.includes('earthquake') || lower.includes('sism') || lower.includes('secous')) return '🔴';
  if (lower.includes('wind') || lower.includes('vent')) return '💨';
  if (lower.includes('heat') || lower.includes('chaleur') || lower.includes('canicule')) return '🔥';
  if (lower.includes('snow') || lower.includes('neige') || lower.includes('frost')) return '❄️';
  if (lower.includes('disaster')) return '⚠️';
  return '⚠️';
};

export const getHazardColor = (severity) => {
  const colors = { 1: '#22c55e', 2: '#eab308', 3: '#f97316', 4: '#ef4444', 5: '#a855f7' };
  return colors[severity] || '#94a3b8';
};
