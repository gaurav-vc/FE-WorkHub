import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE } from '@/config';

export interface BrandSettings {
  id?: number;
  companyName: string;
  primaryColor: string;
  accentColor: string;
  logo: string;
  favicon: string;
  font: string;
  customDomain: string;
  darkModeDefault: boolean;
  showWelcomeBanner: boolean;
  sidebarStyle: "full" | "compact";
}

interface BrandingContextType {
  branding: BrandSettings | null;
  fetchBranding: () => Promise<void>;
  updateBrandingState: (settings: BrandSettings) => void;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

// Helper to convert HEX to HSL format like "224 76% 48%"
function hexToHslString(hex: string): string {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [branding, setBranding] = useState<BrandSettings | null>(null);

  const fetchBranding = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/branding/settings/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          updateBrandingState(data[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch branding', e);
    }
  };

  const updateBrandingState = (settings: BrandSettings) => {
    setBranding(settings);
    
    // Apply Side Effects to DOM
    if (settings.primaryColor) {
      document.documentElement.style.setProperty('--primary', hexToHslString(settings.primaryColor));
    }
    if (settings.accentColor) {
      document.documentElement.style.setProperty('--accent', hexToHslString(settings.accentColor));
    }
    
    if (settings.font) {
      let fontFamily = 'Inter, sans-serif';
      if (settings.font === 'jakarta') fontFamily = '"Plus Jakarta Sans", sans-serif';
      else if (settings.font === 'roboto') fontFamily = 'Roboto, sans-serif';
      else if (settings.font === 'poppins') fontFamily = 'Poppins, sans-serif';
      document.body.style.fontFamily = fontFamily;
    }

    if (settings.darkModeDefault) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (settings.favicon) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = settings.favicon;
    }
  };

  useEffect(() => {
    fetchBranding();
  }, [token]);

  return (
    <BrandingContext.Provider value={{ branding, fetchBranding, updateBrandingState }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
