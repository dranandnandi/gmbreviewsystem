import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { LayoutDashboard, Home, MessageSquare, Settings, LogOut, Clock, Menu, X, Palette, Shield, FileText, Wand2 } from 'lucide-react';
import { Send } from 'lucide-react';

const defaultStyles = {
  backgroundColor: '#ffffff',
  color: '#1f2937'
};

const allNavItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/appointments', icon: Home, label: 'Appointments', feature: 'appointments' },
  { path: '/reviews', icon: MessageSquare, label: 'Reviews', feature: 'reviews' },
  { path: '/sequence-messages', icon: Clock, label: 'Sequences', feature: 'sequences' },
  { path: '/quick-send', icon: Send, label: 'Quick Send', feature: 'sequences' },
  { path: '/ai-sequence-generator', icon: Wand2, label: 'AI Generator', feature: 'sequences' },
  { path: '/creatives', icon: Palette, label: 'Your Creatives', feature: 'creatives' },
  { path: '/admin', icon: Shield, label: 'Admin Panel', adminOnly: true },
  { path: '/settings', icon: Settings, label: 'Settings' }
];

export function Layout() {
  const { user, setUser } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Filter navigation items based on user features and role
  const navItems = allNavItems.filter(item => {
    // Always show dashboard and settings
    if (!item.feature && !item.adminOnly) return true;
    
    // Show admin panel only for admin users
    if (item.adminOnly) return user?.role === 'admin';
    
    // Show feature-based items only if enabled
    if (item.feature) {
      return user?.enabledFeatures?.includes(item.feature) ?? false;
    }
    
    return true;
  });
  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  if (!user) {
    return <Outlet />;
  }

  const headerStyle = user?.primaryColor ? {
    backgroundColor: user.primaryColor,
    color: '#ffffff'
  } : defaultStyles;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 bg-gray-800 bg-opacity-75 z-50 transition-opacity duration-300 lg:hidden ${
        isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`} onClick={toggleMobileMenu}>
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4" style={headerStyle}>
            <div className="flex items-center space-x-2">
              {user.logo && (
                <img src={user.logo} alt={user.clinicName} className="h-8 w-auto" />
              )}
              <span className="text-lg font-semibold">{user.clinicName}</span>
            </div>
            <button onClick={toggleMobileMenu} className="p-2 rounded-md hover:bg-opacity-20 hover:bg-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="mt-4">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 text-gray-600 hover:bg-gray-100 ${
                  location.pathname === item.path ? 'bg-gray-100 text-indigo-600' : ''
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <nav className="shadow-md" style={headerStyle}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md lg:hidden"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex-shrink-0 flex items-center space-x-3 ml-2">
                {user.logo && (
                  <img 
                    src={user.logo} 
                    alt={user.clinicName} 
                    className="h-8 w-auto"
                  />
                )}
                <h1 className="text-xl font-bold truncate max-w-[200px]">{user.clinicName}</h1>
              </div>
              <div className="hidden lg:ml-6 lg:flex lg:space-x-8">
                {navItems.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                      location.pathname === item.path ? '' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm mr-4 hidden sm:block">
                {user.name} ({user.role})
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md bg-opacity-20 hover:bg-opacity-30 ml-2"
                style={{ 
                  backgroundColor: user.secondaryColor || '#f3f4f6',
                  color: user.primaryColor ? '#ffffff' : '#374151'
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:block">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 relative">
        <Outlet />
      </main>
    </div>
  );
}