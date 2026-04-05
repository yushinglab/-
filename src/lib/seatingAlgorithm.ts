import { Guest, Table } from '../types';

/**
 * Intelligent Seating Suggestion Algorithm
 * 
 * Logic:
 * 1. Group guests by their primary tag (the first tag in the array).
 * 2. Sort groups by total guest count (descending) to handle large groups first.
 * 3. Iterate through tables and fill them greedily with groups.
 * 4. If a group is too large for any single table, split it across adjacent tables (if possible) 
 *    or just the next available ones.
 */
export function suggestSeating(guests: Guest[], tables: Table[]): Guest[] {
  // 1. Reset all seating assignments for the suggestion
  const updatedGuests = guests.map(g => ({ ...g, tableId: undefined, seatIndex: undefined }));
  
  // 2. Group guests by their first tag
  const groups: Record<string, Guest[]> = {};
  const noTagGuests: Guest[] = [];

  updatedGuests.forEach(guest => {
    if (guest.tags && guest.tags.length > 0) {
      const primaryTag = guest.tags[0];
      if (!groups[primaryTag]) groups[primaryTag] = [];
      groups[primaryTag].push(guest);
    } else {
      noTagGuests.push(guest);
    }
  });

  // 3. Prepare tables with tracking of remaining capacity
  const tableStatus = tables.map(t => ({
    ...t,
    remainingSeats: t.seatsCount,
    assignedGuestIds: [] as string[]
  }));

  // Helper to assign a guest to a table
  const assignToTable = (guest: Guest, tableIdx: number) => {
    if (tableStatus[tableIdx].remainingSeats >= 1) {
      guest.tableId = tableStatus[tableIdx].id;
      // Simple seat indexing
      guest.seatIndex = tableStatus[tableIdx].seatsCount - tableStatus[tableIdx].remainingSeats;
      tableStatus[tableIdx].remainingSeats -= 1;
      tableStatus[tableIdx].assignedGuestIds.push(guest.id);
      return true;
    }
    return false;
  };

  // 4. Process groups with tags first (they have relationships)
  // Sort tags by total count to prioritize larger social groups
  const sortedTags = Object.keys(groups).sort((a, b) => {
    const countA = groups[a].length;
    const countB = groups[b].length;
    return countB - countA;
  });

  sortedTags.forEach(tag => {
    const groupGuests = groups[tag];
    
    // Try to keep the group together as much as possible
    groupGuests.forEach(guest => {
      // Find the first table with enough space
      // Ideally, we'd find a table that already has someone from the same group
      let targetTableIdx = tableStatus.findIndex(t => 
        t.assignedGuestIds.some(id => groups[tag].some(gg => gg.id === id)) && 
        t.remainingSeats >= 1
      );

      if (targetTableIdx === -1) {
        // Find any table with enough space
        targetTableIdx = tableStatus.findIndex(t => t.remainingSeats >= 1);
      }

      if (targetTableIdx !== -1) {
        assignToTable(guest, targetTableIdx);
      }
    });
  });

  // 5. Process guests without tags
  noTagGuests.forEach(guest => {
    const targetTableIdx = tableStatus.findIndex(t => t.remainingSeats >= 1);
    if (targetTableIdx !== -1) {
      assignToTable(guest, targetTableIdx);
    }
  });

  return updatedGuests;
}
