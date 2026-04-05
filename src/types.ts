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
}

export interface Stage {
  id: string;
  name: string;
  type: 'stage' | 't-stage';
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ViewMode = 'seating' | 'table';
