export interface Guest {
  id: string;
  name: string;
  tags: string[]; // e.g., ["Family", "Bride's Side", "Colleagues"]
  tableId?: string;
  seatIndex?: number;
  status?: 'confirmed' | 'maybe' | 'unconfirmed';
}

export interface Table {
  id: string;
  name: string;
  type: 'round' | 'long';
  seatsCount: number;
  x: number;
  y: number;
  radius?: number; // For round tables
  width?: number;  // For long tables
  height?: number; // For long tables
  color?: string;
}

export interface Stage {
  id: string;
  name: string;
  type: 'stage' | 't-stage';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface Project {
  id: string;
  name: string;
  remarks?: string;
  templateId?: string;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  tablesCount: number;
  seatsPerTable: number;
  hasStage: boolean;
  isPublic: boolean;
  hotCount: number;
}

export type ViewMode = 'seating' | 'table' | 'setup';
