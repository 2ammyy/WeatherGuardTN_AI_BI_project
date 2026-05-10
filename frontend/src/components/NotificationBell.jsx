import React, { useState, useEffect } from 'react';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('http://localhost:8001/api/forum/notifications/mine', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            const unread = data.filter(n => !n.read).length;
            setUnreadCount(unread);
          }
        }
      } catch (error) {
        // Silently fail - not critical
        console.debug('Notifications not available');
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span style={{ fontSize: '20px', cursor: 'pointer' }}>🔔</span>
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          background: '#ef4444',
          color: 'white',
          borderRadius: '50%',
          padding: '2px 6px',
          fontSize: '10px',
          fontWeight: 'bold',
          minWidth: '16px',
          textAlign: 'center'
        }}>
          {unreadCount}
        </span>
      )}
    </div>
  );
};

export default NotificationBell;
