import axios from 'axios';

const HAZARD_API = 'https://api.openeventdatabase.org/event';

// Tunisia bounding box
const TUNISIA_BBOX = '7,30,12,38';

export const fetchHazards = async () => {
  try {
    const response = await axios.get(HAZARD_API, {
      params: {
        what: 'weather.flood,weather.storm,traffic.accident,traffic.roadwork',
        bbox: TUNISIA_BBOX,
        limit: 100
      }
    });
    
    return response.data.features || [];
  } catch (error) {
    console.error('Error fetching hazards:', error);
    return [];
  }
};

export const fetchHazardsByRegion = async (bbox) => {
  try {
    const response = await axios.get(HAZARD_API, {
      params: {
        what: 'weather,traffic',
        bbox: bbox,
        limit: 50
      }
    });
    return response.data.features || [];
  } catch (error) {
    console.error('Error fetching regional hazards:', error);
    return [];
  }
};

export const getHazardIcon = (hazardType) => {
  const icons = {
    'weather.flood': '🌊',
    'weather.storm': '⛈️',
    'traffic.accident': '🚗💥',
    'traffic.roadwork': '🚧',
    'default': '⚠️'
  };
  return icons[hazardType] || icons.default;
};

export const getHazardColor = (hazardType) => {
  const colors = {
    'weather.flood': '#3b82f6',
    'weather.storm': '#8b5cf6',
    'traffic.accident': '#ef4444',
    'traffic.roadwork': '#f59e0b',
    'default': '#94a3b8'
  };
  return colors[hazardType] || colors.default;
};