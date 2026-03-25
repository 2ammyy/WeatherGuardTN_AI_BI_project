import React from 'react';

const HazardLegend = () => {
  return (
    <div className="hazard-legend">
      <h4><i className="fas fa-info-circle"></i> Map Legend</h4>
      <div className="legend-grid">
        <div className="legend-item">
          <span className="dot risk-green"></span>
          <span>SAFE / GREEN</span>
        </div>
        <div className="legend-item">
          <span className="dot risk-yellow"></span>
          <span>CAUTION / YELLOW</span>
        </div>
        <div className="legend-item">
          <span className="dot risk-orange"></span>
          <span>WARN / ORANGE</span>
        </div>
        <div className="legend-item">
          <span className="dot risk-red"></span>
          <span>ALERT / RED</span>
        </div>
        <div className="legend-item">
          <span className="dot risk-purple"></span>
          <span>EMERGENCY / PURPLE</span>
        </div>
        <div className="legend-item hazard">
          <span className="hazard-icon">🌊</span>
          <span>Flood hazard</span>
        </div>
        <div className="legend-item hazard">
          <span className="hazard-icon">🚗💥</span>
          <span>Accident</span>
        </div>
        <div className="legend-item hazard">
          <span className="hazard-icon">⛈️</span>
          <span>Storm</span>
        </div>
        <div className="legend-item hazard">
          <span className="hazard-icon">⚠️</span>
          <span>Road work</span>
        </div>
      </div>
    </div>
  );
};

export default HazardLegend;