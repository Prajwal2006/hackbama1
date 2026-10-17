import {
  Bell, Box, Calendar, Car, Gavel, Gift, House, Layers, Plane, Plus, Repeat, Search, User, Utensils, Wallet,
  type LucideIcon,
} from "lucide-react";
import type { FeatureIcon } from "@/config/features";

export const FEATURE_ICONS: Record<FeatureIcon, LucideIcon> = {
  home: House, search: Search, plus: Plus, user: User, bell: Bell, gavel: Gavel, gift: Gift,
  repeat: Repeat, layers: Layers, box: Box, wallet: Wallet, car: Car, plane: Plane, utensils: Utensils, calendar: Calendar,
};
