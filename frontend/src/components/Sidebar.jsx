import { LayoutDashboard, Map as MapIcon, History, AlertTriangle, Settings } from 'lucide-react';

export default function Sidebar() {
  const menuItems = [
    { icon: <MapIcon size={20}/>, label: "Real-time Map", active: true },
    { icon: <History size={20}/>, label: "Historical Trends" },
    { icon: <LayoutDashboard size={20}/>, label: "Model Stats" },
    { icon: <AlertTriangle size={20}/>, label: "Emergency Alerts" },
  ];

  return (
    <div className="w-64 h-screen bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-8">
      <h1 className="text-xl font-bold text-blue-400">WeatherGuard TN</h1>
      <nav className="flex flex-col gap-4">
        {menuItems.map((item, i) => (
          <div key={i} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${item.active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            {item.icon} <span>{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}