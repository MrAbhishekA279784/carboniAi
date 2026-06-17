import { ActionItem, UserProfile, CarbonCategory } from "../types";

export function generateRecommendations(profile: UserProfile, _currentFootprint: Record<CarbonCategory, number>): ActionItem[] {
  const recommendations: ActionItem[] = [];

  if (profile.transportMode === 'Car' || profile.transportMode === 'Motorcycle') {
    recommendations.push({ id: '1', title: 'Switch to Public Transit', description: 'Replace car commute with metro or bus', carbonReduction: 35, impact: 'High', difficulty: 'Medium', category: 'Transport', cost: 0, timeRequired: 0 });
    if (profile.fuelType !== 'Electric') {
      recommendations.push({ id: '4', title: 'Consider an EV', description: 'Switch to an electric vehicle', carbonReduction: 120, impact: 'High', difficulty: 'Hard', category: 'Transport', cost: 30000, timeRequired: 0 });
    }
  }

  if ((profile.electricityUsage || 0) > 200) {
    recommendations.push({ id: '2', title: 'LED Bulbs', description: 'Replace all bulbs with LEDs', carbonReduction: 15, impact: 'Medium', difficulty: 'Easy', category: 'Home Energy', cost: 50, timeRequired: 2 });
    recommendations.push({ id: '5', title: 'Smart Thermostat', description: 'Install a smart thermostat to save energy', carbonReduction: 25, impact: 'Medium', difficulty: 'Medium', category: 'Home Energy', cost: 150, timeRequired: 1 });
  }

  if (profile.foodPreference === 'Omnivore' || profile.foodPreference === 'Carnivore') {
    recommendations.push({ id: '3', title: 'Vegetarian Diet', description: 'Switch to plant-based meals 5x/week', carbonReduction: 40, impact: 'High', difficulty: 'Medium', category: 'Food', cost: 0, timeRequired: 0 });
  } else if (profile.foodPreference === 'Vegetarian') {
    recommendations.push({ id: '3', title: 'Fully Vegan Diet', description: 'Eliminate all animal products', carbonReduction: 20, impact: 'Medium', difficulty: 'Hard', category: 'Food', cost: 0, timeRequired: 0 });
  }

  if (profile.shoppingHabits === 'Weekly' || profile.shoppingHabits === 'Daily') {
    recommendations.push({ id: '6', title: 'Second-hand Shopping', description: 'Buy used items instead of new', carbonReduction: 25, impact: 'Medium', difficulty: 'Easy', category: 'Shopping', cost: 0, timeRequired: 0 });
  }

  if (profile.wasteHabits === 'None' || profile.wasteHabits === 'Recycling') {
    recommendations.push({ id: '7', title: 'Start Composting', description: 'Compost organic food waste', carbonReduction: 10, impact: 'Low', difficulty: 'Medium', category: 'Waste', cost: 20, timeRequired: 2 });
  }

  if (recommendations.length === 0) {
    recommendations.push({ id: '8', title: 'Plant a Community Garden', description: 'Offset emissions practically', carbonReduction: 5, impact: 'Low', difficulty: 'Hard', category: 'Food', cost: 50, timeRequired: 10 });
  }

  return recommendations;
}
