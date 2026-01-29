import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Table2,
  Upload, 
  BarChart3,
  Users  // ⭐ NEW ICON
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'STAFF'] },
    { path: '/applications', icon: FileText, label: 'Applications', roles: ['ADMIN', 'STAFF'] },
    { path: '/data-table', icon: Table2, label: 'Data Table', roles: ['ADMIN', 'STAFF'] },
    { path: '/staff-management', icon: Users, label: 'Staff Management', roles: ['ADMIN'] },  // ⭐ NEW
    { path: '/upload', icon: Upload, label: 'Upload Excel', roles: ['ADMIN', 'STAFF'] },
    { path: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['ADMIN'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {filteredMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;