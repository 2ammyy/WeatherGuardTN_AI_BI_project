import React, { useState } from 'react';
import axios from 'axios';

const RouteChecker = ({ hazards = [] }) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [checking, setChecking] = useState(false);
  const [routeSafety, setRouteSafety] = useState(null);

  const checkRoute = async () => {
    if (!origin || !destination) return;
    
    setChecking(true);
    
    // Simulate route check (in production, use OSRM or Google Directions)
    setTimeout(() => {
      // Check if any hazards are near the route
      const nearbyHazards = hazards.filter(h => {
        // Simplified check - in reality you'd calculate distance from route
        return Math.random() > 0.5;
      });

      const safetyScore = 100 - (nearbyHazards.length * 15);
      
      setRouteSafety({
        safe: safetyScore > 70,
        score: safetyScore,
        hazards: nearbyHazards.slice(0, 3),
        message: safetyScore > 70 
          ? '✅ Route is passable with caution'
          : '⚠️ Route may be dangerous - consider postponing travel'
      });
      
      setChecking(false);
    }, 1500);
  };

  return (
    <div className="route-checker">
      <h3><i className="fas fa-route"></i> Check Route Safety</h3>
      
      <div className="route-inputs">
        <div className="input-group">
          <label>From:</label>
          <input 
            type="text" 
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="City or address"
            list="cities"
          />
        </div>
        
        <div className="input-group">
          <label>To:</label>
          <input 
            type="text" 
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="City or address"
            list="cities"
          />
        </div>
        
        <datalist id="cities">
          <option value="Tunis" />
          <option value="Sfax" />
          <option value="Sousse" />
          <option value="Bizerte" />
          <option value="Jendouba" />
        </datalist>
        
        <button 
          onClick={checkRoute} 
          disabled={checking || !origin || !destination}
          className="check-btn"
        >
          {checking ? 'Checking...' : 'Check Route'}
        </button>
      </div>

      {routeSafety && (
        <div className={`route-result ${routeSafety.safe ? 'safe' : 'danger'}`}>
          <div className="safety-score">
            <div className="score-circle" style={{ 
              background: `conic-gradient(${routeSafety.safe ? '#10b981' : '#ef4444'} ${routeSafety.score * 3.6}deg, #f1f5f9 0deg)`
            }}>
              <span>{routeSafety.score}%</span>
            </div>
            <div className="score-message">{routeSafety.message}</div>
          </div>
          
          {routeSafety.hazards.length > 0 && (
            <div className="route-hazards">
              <h4>⚠️ Hazards on route:</h4>
              <ul>
                {routeSafety.hazards.map((h, i) => (
                  <li key={i}>{h.properties?.what || 'Unknown hazard'}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RouteChecker;