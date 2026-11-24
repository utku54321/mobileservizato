import * as Location from "expo-location";
import { api } from "./api";

export interface GpsReading {
  latitude: number;
  longitude: number;
  accuracy: number;
  observedAt: number;
}

export async function ensureLocationPermission() {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return true;
  const asked = await Location.requestForegroundPermissionsAsync();
  return asked.granted;
}

/** One fresh, high-accuracy reading in the exact shape the backend validates. */
export async function currentReading(): Promise<GpsReading> {
  if (!(await ensureLocationPermission())) {
    throw new Error("Location permission is off. Turn it on in Settings or enter the address manually.");
  }
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: Math.max(1, Math.round(position.coords.accuracy ?? 50)),
    observedAt: Math.round(position.timestamp || Date.now()),
  };
}

export interface SuggestedAddress {
  addressLine?: string;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

/** Server-side Google reverse geocoding (same endpoint the website uses). */
export async function suggestAddress(reading: GpsReading) {
  const { address } = await api.post<{ address: SuggestedAddress }>("/api/location/reverse", reading);
  return address;
}
