import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { API_BASE } from "@/config";

export const ProtectedRoute: React.FC<{ children: React.ReactNode; route?: string }> = ({ children, route }) => {
  const { isAuthenticated, isLoading, role, portalType, accessRoutes } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Strict check for superadmin-only routes
  const superAdminPrefix = '/superadmin/';
  const isAdminOrSuperAdminRoute = location.pathname.startsWith('/admin/') || location.pathname.startsWith(superAdminPrefix);
  const isSuperAdminRoute = location.pathname.startsWith(superAdminPrefix);
  
  const handleRestricted = () => {
    if (location.pathname === '/') {
      return <div className="h-screen w-full bg-slate-50 flex flex-col items-center justify-center text-slate-500">
        <h2 className="text-xl font-semibold mb-2">No Access</h2>
        <p>You have not been granted access to the Dashboard.</p>
      </div>;
    }
    return <Navigate to="/" replace />;
  };

  if (portalType === 'super_user') {
    // Super user can strictly view ONLY super admin routes and some basic admin setup/org routes that are shared
    // actually, user said strictly: Dashboard, Organizations, Sites List, Billing & Payments.
    const allowedSuperUserPaths = ['/superadmin', '/admin/organizations', '/admin/sites', '/login', '/register'];
    const canSuperUserAccess = location.pathname === '/' || allowedSuperUserPaths.some(p => location.pathname.startsWith(p));
    if (!canSuperUserAccess) return handleRestricted();
  } else {
    // Non-super-users cannot access superadmin routes
    if (isSuperAdminRoute) return handleRestricted();
  }

  // Strict check for admin-only routes
  const adminPrefix = '/admin/';
  const isAdminRoute = location.pathname.startsWith(adminPrefix);
  
  // Explicitly block normal admins from super-admin-only Setup pages
  const superAdminOnlyAdminRoutes = ['/admin/organizations', '/admin/sites'];
  if (superAdminOnlyAdminRoutes.some(p => location.pathname.startsWith(p))) {
    if (portalType !== 'super_user') {
      return handleRestricted();
    }
  }

  // AppSidebar already hides Organizations and Sites from site_admin.
  // Here we allow site_admin to access /admin/setup, /admin/branding etc.
  const hasAdminAccess = isAdminRoute ? (portalType === 'super_user' || portalType === 'site_admin' || role === 'admin') : true;

  if (!hasAdminAccess) {
    return handleRestricted();
  }

  // Strict check for RBAC route permissions
  if (route && !(portalType === 'super_user' || portalType === 'site_admin' || role === 'admin')) {
    if (!accessRoutes || accessRoutes.length === 0) {
      return handleRestricted();
    }
    
    // 1. Try exact match first
    let accessObj = accessRoutes.find((r: any) => r.site_name === route);
    
    // 2. Try prefix match but ignore the root path '/'
    if (!accessObj) {
      accessObj = accessRoutes.find((r: any) => r.site_name !== '/' && route.startsWith(r.site_name));
    }
    
    // If NOT found, OR view is explicitly false, block access
    if (accessObj) {
      const viewPerm = accessObj.permissions?.view;
      if (viewPerm === 'none' || viewPerm === false || !viewPerm) return handleRestricted();
    } else {
      return handleRestricted();
    }
  }

  return <>{children}</>;
};

const AccessRestricted = () => (
  <div className="flex items-center justify-center h-full w-full p-8 text-center bg-slate-50 min-h-screen">
     <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-md w-full">
        <h1 className="text-3xl font-bold mb-2 text-slate-800">Access Restricted</h1>
        <p className="text-slate-500 mb-6 text-sm">You do not have permission to view this page.</p>
        <Button 
           onClick={() => window.history.back()} 
           className="w-full bg-primary hover:bg-primary/90 text-white"
        >
           Go Back
        </Button>
     </div>
  </div>
);

