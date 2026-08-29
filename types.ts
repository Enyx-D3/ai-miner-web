
import { LucideIcon } from 'lucide-react';
import { style } from 'framer-motion/client';



export interface ValuePropData {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface BlogCardData {
  id: string;
  title: string;
  image: string;
  date: string;
  excerpt: string;
  category: string;
  readTime: string;
  author: string;
  country?: string;
  city?: string;
}

export interface NavLink {
  label: string;
  href: string;
}

// --- Itinerary Types ---

export interface ActivityOption {
    id: string;
    title: string;
    tagline: string;
    description: string[];
    energy: 'Low' | 'Moderate' | 'High';
    priceChange: number; // 0 for included
    image: string;
    gallery?: string[];
    tags: string[];
}

export interface ActivitySlot {
    id: string; // Unique ID for the slot (e.g., 'day2-afternoon')
    time: string;
    defaultActivityId: string; // ID of the default option
    icon: LucideIcon;
    changeable: boolean;
    options?: ActivityOption[]; // Available alternatives if changeable
    // Static data for non-changeable items
    staticTitle?: string;
    staticDesc?: string;
    staticImage?: string;
}

export interface DayItinerary {
    day: number;
    title: string;
    summary: string;
    slots: ActivitySlot[];
}

export interface SearchCriteria {
  destination: string;
  city: string;
  tripType: string;
  checkIn: Date | null;
  checkOut: Date | null;
}



export type Traveller = {
  id: number;
  name: string;
  email: string;
  mobile: string;
  nationality: string;
  passport: string | null;
  birth: string | null;
  expire: string | null;
};

