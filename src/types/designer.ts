export type RoomType =
  | 'living'
  | 'bedroom'
  | 'bathroom'
  | 'kitchen'
  | 'office'
  | 'gym'
  | 'garden'
  | 'pool'
  | 'garage'
  | 'hallway';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  x: number; // in feet (relative to plot bottom-left or top-left)
  y: number; // in feet
  width: number; // in feet
  height: number; // in feet
  color: string; // hex color for visualization
}

export type FurnitureType =
  | 'bed'
  | 'sofa'
  | 'table'
  | 'chair'
  | 'tv'
  | 'desk'
  | 'toilet'
  | 'shower'
  | 'sink'
  | 'fridge'
  | 'stove'
  | 'plant'
  | 'car'
  | 'pool_chair';

export interface Furniture {
  id: string;
  name: string;
  type: FurnitureType;
  x: number; // relative to the room center or floor plan (let's keep absolute relative to floor plan for easier drawing and 3D positioning)
  y: number;
  width: number; // in feet
  height: number; // in feet
  rotation: number; // in degrees (0, 90, 180, 270)
  roomId?: string; // which room it belongs to (optional)
}

export type DesignStyle = 'Modern' | 'Minimalist' | 'Luxury' | 'Traditional';

export interface DesignConfig {
  style: DesignStyle;
  budget: number; // in USD or local currency (e.g. $100,000)
  bedrooms: number;
  bathrooms: number;
  plotWidth: number; // in feet
  plotLength: number; // in feet
  requirements: string[]; // ['home office', 'gym', 'garden', etc.]
}

export interface MaterialPalette {
  wallColor: string;
  wallMaterial: string;
  floorColor: string;
  floorMaterial: string;
  furnitureStyle: string;
  roofStyle: string;
}

export interface CostCategory {
  name: string;
  cost: number;
  percentage: number;
  notes: string;
}

export interface CostEstimate {
  totalCost: number;
  costPerSqFt: number;
  categories: CostCategory[];
}

export interface VastuItem {
  rule: string;
  status: 'passed' | 'warning' | 'info';
  message: string;
}

export interface VastuReport {
  score: number; // 0 to 100
  items: VastuItem[];
}

export interface DesignVariation {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

export interface HousePlan {
  id: string;
  name: string;
  config: DesignConfig;
  rooms: Room[];
  furniture: Furniture[];
  materialPalette: MaterialPalette;
  costEstimate: CostEstimate;
  vastuReport: VastuReport;
  variations?: DesignVariation[];
  createdAt: string;
}
