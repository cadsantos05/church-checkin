import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Volunteer {
  id: string;
  full_name: string;
  role: string;
}

interface ChurchConfig {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
}

export type DeviceMode = 'parent' | 'volunteer';

interface AuthState {
  churchId: string | null;
  churchConfig: ChurchConfig | null;
  volunteer: Volunteer | null;
  isDeviceAuthorized: boolean;
  deviceMode: DeviceMode | null;
  canRegister: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  authorizeDevice: (adminPin: string, mode: DeviceMode) => Promise<{ success: boolean; error?: string }>;
  volunteerLogin: (name: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  volunteerLogout: () => void;
  resetDevice: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEVICE_KEY = 'church_checkin_device';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    churchId: null,
    churchConfig: null,
    volunteer: null,
    isDeviceAuthorized: false,
    deviceMode: null,
    canRegister: false,
    isLoading: true,
  });

  useEffect(() => {
    loadDeviceAuth();
  }, []);

  async function loadDeviceAuth() {
    try {
      const stored = await AsyncStorage.getItem(DEVICE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        // If old data without deviceMode, clear it and start fresh
        if (!parsed.deviceMode) {
          await AsyncStorage.removeItem(DEVICE_KEY);
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        const { data: church } = await supabase
          .from('churches')
          .select('id, name, logo_url, primary_color')
          .eq('id', parsed.churchId)
          .single();

        if (!church) {
          await AsyncStorage.removeItem(DEVICE_KEY);
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        setState((prev) => ({
          ...prev,
          churchId: parsed.churchId,
          churchConfig: church,
          isDeviceAuthorized: true,
          deviceMode: parsed.deviceMode,
          canRegister: parsed.deviceMode === 'volunteer',
          isLoading: false,
        }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch {
      await AsyncStorage.removeItem(DEVICE_KEY);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  async function authorizeDevice(adminPin: string, mode: DeviceMode): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase
      .from('churches')
      .select('id, name, logo_url, primary_color')
      .eq('admin_pin', adminPin)
      .single();

    if (error || !data) {
      return { success: false, error: 'PIN inválido. Verifique com o administrador.' };
    }

    const deviceData = { churchId: data.id, deviceMode: mode };
    await AsyncStorage.setItem(DEVICE_KEY, JSON.stringify(deviceData));

    setState((prev) => ({
      ...prev,
      churchId: data.id,
      churchConfig: data,
      isDeviceAuthorized: true,
      deviceMode: mode,
      canRegister: mode === 'volunteer',
    }));

    return { success: true };
  }

  async function volunteerLogin(name: string, pin: string): Promise<{ success: boolean; error?: string }> {
    if (!state.churchId) {
      return { success: false, error: 'Dispositivo não autorizado.' };
    }

    const { data, error } = await supabase
      .from('volunteers')
      .select('id, full_name, role')
      .eq('church_id', state.churchId)
      .eq('pin', pin)
      .ilike('full_name', `%${name}%`)
      .single();

    if (error || !data) {
      return { success: false, error: 'Nome ou PIN incorreto.' };
    }

    setState((prev) => ({
      ...prev,
      volunteer: { id: data.id, full_name: data.full_name, role: data.role },
    }));

    return { success: true };
  }

  function volunteerLogout() {
    setState((prev) => ({ ...prev, volunteer: null }));
  }

  async function resetDevice() {
    await AsyncStorage.removeItem(DEVICE_KEY);
    setState({
      churchId: null,
      churchConfig: null,
      volunteer: null,
      isDeviceAuthorized: false,
      deviceMode: null,
      canRegister: false,
      isLoading: false,
    });
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        authorizeDevice,
        volunteerLogin,
        volunteerLogout,
        resetDevice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
