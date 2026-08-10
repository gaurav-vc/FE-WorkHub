import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { getCurrentPortal, PortalType } from '../lib/auth-utils';
import { getMyAccess } from "@/api/auth";

interface AuthContextType {
  token: string | null;
  role: string | null;
  username: string | null;
  fullName: string | null;
  email: string | null;
  userType: string | null;
  crossDepartmentAccess: boolean;
  orgName: string | null;
  siteName: string | null;
  portalType: PortalType;
  accessRoutes: any[];
  settings: any;
  login: (token: string, user_id: string, role?: string, user_type?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [role, setRole] = useState<string | null>(localStorage.getItem('role'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  const [fullName, setFullName] = useState<string | null>(localStorage.getItem('fullName'));
  const [email, setEmail] = useState<string | null>(localStorage.getItem('email'));
  const [userType, setUserType] = useState<string | null>(localStorage.getItem('user_type'));
  const [crossDepartmentAccess, setCrossDepartmentAccess] = useState<boolean>(localStorage.getItem('cross_department_access') === 'true');
  const [orgName, setOrgName] = useState<string | null>(localStorage.getItem('org_name'));
  const [siteName, setSiteName] = useState<string | null>(localStorage.getItem('site_name'));
  const [accessRoutes, setAccessRoutes] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(JSON.parse(localStorage.getItem('settings') || '{}'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const location = useLocation();
  const portalType = useMemo(() => getCurrentPortal(userType), [userType]);

  useEffect(() => {
    if (token) {
      fetchAccess();
    } else {
      setIsLoading(false);
      // We do not redirect to login immediately if we are on public pages
      const path = location.pathname.replace(/\/$/, "") || "/";
      const publicPaths = ['/login', '/register', '/forgot-password', '/home', '/privacy-policy', '/terms-of-service'];
      if (!publicPaths.includes(path)) {
        navigate('/login');
      }
    }
  }, [token]);

  const fetchAccess = async () => {
    try {
      const data = await getMyAccess();
      setRole(data.role);
      localStorage.setItem('role', data.role);
      if (data.username) {
        setUsername(data.username);
        localStorage.setItem('username', data.username);
      }
      if (data.full_name) {
        setFullName(data.full_name);
        localStorage.setItem('fullName', data.full_name);
      }
      if (data.email) {
        setEmail(data.email);
        localStorage.setItem('email', data.email);
      }
      if (data.user_type) {
        setUserType(data.user_type);
        localStorage.setItem('user_type', data.user_type);
      }
      if (data.org_name) {
        setOrgName(data.org_name);
        localStorage.setItem('org_name', data.org_name);
      }
      if (data.site_name) {
        setSiteName(data.site_name);
        localStorage.setItem('site_name', data.site_name);
      }
      if (data.advanced_settings) {
        setSettings(data.advanced_settings);
        localStorage.setItem('settings', JSON.stringify(data.advanced_settings));
      }
      setAccessRoutes(data.access);
      if (data.warning) {
        toast.error(data.warning, { duration: 10000 });
      }
    } catch (error: any) {
      if (error?.status === 401) {
        logout();
      }
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      let [resource, config] = args;
      
      // Determine module ID based on current pathname and accessRoutes
      const currentPath = window.location.pathname;
      let accessObj = accessRoutes.find(r => r.site_name === currentPath);
      if (!accessObj) {
        accessObj = accessRoutes.find(r => r.site_name !== '/' && currentPath.startsWith(r.site_name));
      }
      
      if (accessObj) {
        config = config || {};
        const headers = new Headers(config.headers || {});
        headers.set('X-Module-ID', accessObj.site_id);
        config.headers = headers;
        args[1] = config;
      }
      return originalFetch.apply(this, args);
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [accessRoutes]);

  const login = (newToken: string, user_id: string, newRole?: string, newUserType?: string) => {
    // Clear stale role/userType from previous session before setting new values
    localStorage.removeItem('role');
    localStorage.removeItem('user_type');

    setToken(newToken);
    localStorage.setItem('token', newToken);
    if (newRole) {
      setRole(newRole);
      localStorage.setItem('role', newRole);
    }
    if (newUserType) {
      setUserType(newUserType);
      localStorage.setItem('user_type', newUserType);
    }
    // Navigate based on user_type returned from backend
    if (newUserType === 'super_user') {
      navigate('/superadmin');
    } else if (newUserType === 'site_admin') {
      navigate('/admin/setup');
    } else {
      navigate('/');
    }
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    setUsername(null);
    setFullName(null);
    setEmail(null);
    setUserType(null);
    setCrossDepartmentAccess(false);
    setOrgName(null);
    setSiteName(null);
    setSettings({});
    setAccessRoutes([]);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('fullName');
    localStorage.removeItem('email');
    localStorage.removeItem('user_type');
    localStorage.removeItem('cross_department_access');
    localStorage.removeItem('org_name');
    localStorage.removeItem('site_name');
    localStorage.removeItem('settings');
    navigate('/login');
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{
      token,
      role,
      username,
      fullName,
      email,
      userType,
      crossDepartmentAccess,
      orgName,
      siteName,
      portalType,
      accessRoutes,
      settings,
      login,
      logout,
      isAuthenticated: !!token,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const usePageAccess = () => {
  const { role, accessRoutes, portalType } = useAuth();
  const location = useLocation();

  if (portalType === 'super_user') {
    return { canView: true, canCreate: true, canEdit: true };
  }

  const isAdminRole = portalType === 'site_admin' || role === 'admin' || role?.toLowerCase().includes('admin');
  const currentPath = location.pathname;

  if (isAdminRole && currentPath.startsWith('/admin')) {
    return { canView: true, canCreate: true, canEdit: true };
  }

  if (accessRoutes.length === 0) {
    return { canView: false, canCreate: false, canEdit: false };
  }
  let accessObj = accessRoutes.find(r => r.site_name === currentPath);
  
  if (!accessObj) {
    accessObj = accessRoutes.find(r => r.site_name !== '/' && currentPath.startsWith(r.site_name));
  }

  if (accessObj) {
    return {
      canView: accessObj.permissions?.view ?? false,
      canCreate: accessObj.permissions?.create ?? false,
      canEdit: accessObj.permissions?.edit ?? false,
    };
  }

  return { canView: false, canCreate: false, canEdit: false }; // Deny unmapped routes by default
};
