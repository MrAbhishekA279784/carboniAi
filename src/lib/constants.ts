import { Bus, Zap, Leaf, ShoppingBag, Droplet } from "lucide-react";
import React from "react";

export const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444'];

export const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; fill?: string; className?: string }>> = {
  "Transport": Bus,
  "Home Energy": Zap,
  "Food": Leaf,
  "Shopping": ShoppingBag,
  "Waste": Droplet,
};
