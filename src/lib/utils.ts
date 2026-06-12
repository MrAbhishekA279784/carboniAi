import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (!denominator || isNaN(denominator) || !isFinite(denominator)) return fallback;
  return numerator / denominator;
}

export function carbonEquivalency(kgCO2: number): string {
  if (kgCO2 <= 0) return '';
  const trees = (kgCO2 / 21.77).toFixed(1);      // EPA: 1 tree absorbs 21.77 kg CO2/year
  const kmDriven = Math.round(kgCO2 / 0.17);       // Average petrol car: 0.17 kg/km
  const phoneCharges = Math.round(kgCO2 / 0.00822); // 8.22g CO2 per phone charge
  
  if (kgCO2 >= 100) return `≈ ${trees} trees worth of annual absorption`;
  if (kgCO2 >= 20) return `≈ ${kmDriven} km not driven by a petrol car`;
  return `≈ ${phoneCharges} phone charges avoided`;
}
