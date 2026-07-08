import { createContext, useContext, useState, ReactNode } from 'react';

export interface TripCheckpoint {
  id: number;
  order: number;
  name: string;
  vibe: string;
  lat: number;
  lng: number;
  kind?: 'poi' | 'food' | 'finish';
  real?: boolean;
}

export interface TripStats {
  targetMinutes: number;
  routeKm: number | null;
  estimatedMinutes: number | null;
  realPoiCount: number;
}

export interface TripData {
  tripId: string;
  routeGeometry: { type: string; coordinates: number[][] } | null;
  checkpoints: TripCheckpoint[];
  isTargetTrip?: boolean;
  stats?: TripStats;
}

export interface TripWizardData {
  duration: number;
  vibe: string;
  eat: boolean;
  roundTrip: boolean;
  startLat: number;
  startLng: number;
  vehicle: string;
  endLat?: number | null;
  endLng?: number | null;
  endName?: string | null;
}

interface TripContextType {
  wizard: TripWizardData | null;
  setWizard: (data: TripWizardData | null) => void;
  trip: TripData | null;
  setTrip: (data: TripData | null) => void;
}

const TripContext = createContext<TripContextType>({
  wizard: null, setWizard: () => {}, trip: null, setTrip: () => {},
});

export function TripProvider({ children }: { children: ReactNode }) {
  const [wizard, setWizard] = useState<TripWizardData | null>(null);
  const [trip, setTrip] = useState<TripData | null>(null);
  return (
    <TripContext.Provider value={{ wizard, setWizard, trip, setTrip }}>
      {children}
    </TripContext.Provider>
  );
}

export const useTrip = () => useContext(TripContext);
