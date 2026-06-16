export type CarbonCategory = "Transport" | "Home Energy" | "Food" | "Shopping" | "Waste";

export interface UserProfile {
  name: string;
  city: string;
  country: string; // Regional electricity grid country code, e.g. US, UK, DE, FR, IN
  occupation: string;
  commuteDistance: number;
  transportMode: string;
  fuelType: string;
  electricityUsage: number; // kWh per month
  acUsage: number; // hours per day
  foodPreference: string;
  shoppingHabits: string;
  wasteHabits: string;
  level: number;
  xp: number;
  ecoPoints: number;
  completedOnboarding: boolean;
  streak?: number;
  lastActivityDate?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  carbonReduction: number;
  annualSavings?: number;
  impact: "High" | "Medium" | "Low";
  difficulty: "Easy" | "Medium" | "Hard";
  category: CarbonCategory;
  cost: number;
  timeRequired: number; // in hours or abstract units
  completed?: boolean;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
  xpReward: number;
  ecoPointsReward: number;
  category: CarbonCategory;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  badgeIcon: string;
  milestoneKg: number;
  unlockedAt?: string;
}

export interface Habit {
  id: string;
  title: string;
  icon: string;
  completed: boolean;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}


export interface CarbonData {
  total: number;
  budget: number;
  spent: number;
  reductionGoal: number;
  breakdown: Record<CarbonCategory, number>;
  history: { month: string; value: number }[];
}

export const INITIAL_USER: UserProfile = {
  name: "Abhishek R.",
  city: "San Francisco",
  country: "US",
  occupation: "Software Engineer",
  commuteDistance: 25,
  transportMode: "Car",
  fuelType: "Petrol",
  electricityUsage: 350,
  acUsage: 4,
  foodPreference: "Omnivore",
  shoppingHabits: "Average",
  wasteHabits: "Medium",
  level: 7,
  xp: 350,
  ecoPoints: 1250,
  completedOnboarding: false,
};

export const INITIAL_CARBON_DATA: CarbonData = {
  total: 210, // kg CO2e
  budget: 300,
  spent: 210,
  reductionGoal: 50,
  breakdown: {
    "Transport": 110,
    "Home Energy": 46,
    "Food": 38,
    "Shopping": 16,
    "Waste": 0,
  },
  history: [
    { month: 'Jan', value: 300 },
    { month: 'Feb', value: 280 },
    { month: 'Mar', value: 250 },
    { month: 'Apr', value: 215 },
    { month: 'May', value: 185 },
    { month: 'Jun', value: 210 },
  ],
};

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'ac1', title: 'Carbon Saver I', description: 'Save 50kg of CO2', badgeIcon: '🌱', milestoneKg: 50 },
  { id: 'ac2', title: 'Eco Warrior', description: 'Save 100kg of CO2', badgeIcon: '🛡️', milestoneKg: 100 },
  { id: 'ac3', title: 'Earth Protector', description: 'Save 250kg of CO2', badgeIcon: '🌍', milestoneKg: 250 },
  { id: 'ac4', title: 'Solar Soul', description: 'Save 500kg of CO2', badgeIcon: '☀️', milestoneKg: 500 },
  { id: 'ac5', title: 'Planet Hero', description: 'Save 1000kg of CO2', badgeIcon: '🦸', milestoneKg: 1000 },
];

export const DEFAULT_HABITS: Habit[] = [
  { id: 'h1', title: 'Used Reusable Bag', icon: '🛍️', completed: false },
  { id: 'h2', title: 'No Food Waste', icon: '🍲', completed: false },
  { id: 'h3', title: 'Unplugged Idle Devices', icon: '🔌', completed: false },
  { id: 'h4', title: 'Used Public Transport', icon: '🚌', completed: false },
  { id: 'h5', title: 'Ate Plant-Based', icon: '🥗', completed: false },
];
