import { UserProfile, CarbonCategory } from "../types";
import { EMISSION_FACTORS, GRID_FACTORS } from "./emission-factors";

export function calculateFootprint(profile: UserProfile): Record<CarbonCategory, number> {
  const { transport, energy, food: foodFactors, shopping: shoppingFactors } = EMISSION_FACTORS;

  // Transport Calculation
  let transportEmissions = 0;
  const monthlyDistance = profile.commuteDistance * 22; // 22 working days average

  if (profile.transportMode === "Car") {
    let factor = transport.car_petrol;
    if (profile.fuelType === "Diesel") factor = transport.car_diesel;
    else if (profile.fuelType === "Electric") factor = transport.car_ev;
    else if (profile.fuelType === "Hybrid") factor = (transport.car_petrol + transport.car_ev) / 2;
    transportEmissions = monthlyDistance * factor;
  } else if (profile.transportMode === "Bus") {
    transportEmissions = monthlyDistance * transport.bus;
  } else if (profile.transportMode === "Metro") {
    transportEmissions = monthlyDistance * transport.metro;
  } else if (profile.transportMode === "Bike" || profile.transportMode === "Cycle") {
    transportEmissions = monthlyDistance * transport.cycling;
  }

  // Energy Calculation with Regional Electricity Grid Factor
  const gridFactor = GRID_FACTORS[profile.country || ""] || GRID_FACTORS.default;
  const electricityEmissions = (profile.electricityUsage || 0) * gridFactor;
  const acEmissions = (profile.acUsage || 0) * 30 * energy.ac_hourly;
  const homeEnergyEmissions = electricityEmissions + acEmissions;

  // Food Calculation
  let foodEmissions = 30 * foodFactors.omnivore_daily;
  if (profile.foodPreference === "Vegan") foodEmissions = 30 * foodFactors.vegan_daily;
  else if (profile.foodPreference === "Vegetarian") foodEmissions = 30 * foodFactors.vegetarian_daily;
  else if (profile.foodPreference === "Pescatarian") foodEmissions = 30 * foodFactors.pescatarian_daily;
  else if (profile.foodPreference === "Carnivore") foodEmissions = 30 * (foodFactors.omnivore_daily * 1.5);

  // Shopping Calculation
  let shoppingEmissions = shoppingFactors.average;
  if (profile.shoppingHabits === "Weekly") shoppingEmissions = shoppingFactors.high;
  else if (profile.shoppingHabits === "Monthly") shoppingEmissions = shoppingFactors.average;
  else if (profile.shoppingHabits === "Rarely") shoppingEmissions = shoppingFactors.low;

  // Waste Calculation
  let wasteEmissions = 15; // Average kg CO2e per month from waste
  if (profile.wasteHabits === "None") wasteEmissions = 20; // No recycling/compost
  else if (profile.wasteHabits === "Recycling") wasteEmissions = 10;
  else if (profile.wasteHabits === "Composting") wasteEmissions = 5;
  else if (profile.wasteHabits === "Both") wasteEmissions = 2;

  return {
    "Transport": transportEmissions,
    "Home Energy": homeEnergyEmissions,
    "Food": foodEmissions,
    "Shopping": shoppingEmissions,
    "Waste": wasteEmissions
  };
}
