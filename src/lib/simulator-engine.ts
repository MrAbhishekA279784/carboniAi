import { UserProfile } from "../types";
import { EMISSION_FACTORS } from "./emission-factors";

export interface LifestyleData {
  transport: {
    carKmPerWeek: number;
    carType: keyof typeof EMISSION_FACTORS.transport;
    publicTransportKmPerWeek: number;
    flightsPerHourPerYear: number;
  };
  energy: {
    electricityKwhPerMonth: number;
    acHoursPerDay: number;
  };
  diet: {
    type: keyof typeof EMISSION_FACTORS.food;
  };
}

export function calculateAnnualFootprint(data: LifestyleData) {
  // Transport (Annual)
  const carAnnual = data.transport.carKmPerWeek * 52 * (EMISSION_FACTORS.transport[data.transport.carType] || 0.17);
  const publicAnnual = data.transport.publicTransportKmPerWeek * 52 * EMISSION_FACTORS.transport.bus;
  const flightAnnual = data.transport.flightsPerHourPerYear * 250; // approx 250kg CO2 per flight hour

  // Energy (Annual)
  const electricityAnnual = data.energy.electricityKwhPerMonth * 12 * EMISSION_FACTORS.energy.electricity_kwh;
  const acAnnual = data.energy.acHoursPerDay * 365 * EMISSION_FACTORS.energy.ac_hourly;

  // Food (Annual)
  const foodAnnual = 365 * (EMISSION_FACTORS.food[data.diet.type] || 7.0);

  const breakdown = {
    Transport: Math.round(carAnnual + publicAnnual + flightAnnual),
    Energy: Math.round(electricityAnnual + acAnnual),
    Food: Math.round(foodAnnual),
  };

  const total = breakdown.Transport + breakdown.Energy + breakdown.Food;

  return {
    total,
    breakdown,
    monthlyAverage: Math.round(total / 12)
  };
}

export function simulateScenario(profile: UserProfile, scenario: any) {
  const baseCalculations = calculateAnnualFootprint({
    transport: {
      carKmPerWeek: profile.commuteDistance || 0,
      carType: (profile.transportMode === 'car' ? (profile.fuelType === 'electric' ? 'car_ev' : 'car_petrol') : 'car_petrol') as any,
      publicTransportKmPerWeek: profile.transportMode === 'public' ? 50 : 0,
      flightsPerHourPerYear: 0,
    },
    energy: {
      electricityKwhPerMonth: profile.electricityUsage || 0,
      acHoursPerDay: profile.acUsage || 0,
    },
    diet: {
      type: (profile.foodPreference === 'vegan' ? 'vegan_daily' : profile.foodPreference === 'vegetarian' ? 'vegetarian_daily' : 'omnivore_daily') as any,
    }
  });

  return {
    original: baseCalculations,
    simulated: {
      ...baseCalculations,
      total: Math.round(baseCalculations.total * (1 - (scenario.reduction || 0.1))),
    }
  };
}



