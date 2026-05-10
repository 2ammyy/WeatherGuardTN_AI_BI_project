import React, { useState, useEffect } from 'react';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUnreadCount(0);
        return;
      }

      const response = await fetch('http://localhost:8001/api/forum/notifications/mine', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        let notifs = Array.isArray(data) ? data : (data.notifications || []);
        const unread = notifs.filter(n => !n.is_read && !n.read).length;
        setUnreadCount(unread);
      } else {
        setUnreadCount(0);
      }
    } catch (error) {
      console.debug('Notifications fetch failed (expected in dev):', error.message);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <button className="p-2 text-gray-300 hover:text-white relative">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default NotificationBell;cd