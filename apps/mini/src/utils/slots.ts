export interface StaffSlotGroup {
  staffId: number;
  staffName: string;
  slots: Array<{ time: string; available: boolean }>;
}

export interface FlatSlot {
  staffId: number;
  staffName: string;
  timeSlot: string;
  available: boolean;
  key: string;
}

export function flattenSlots(groups: StaffSlotGroup[]): FlatSlot[] {
  const flat: FlatSlot[] = [];
  for (const group of groups) {
    for (const slot of group.slots) {
      flat.push({
        staffId: group.staffId,
        staffName: group.staffName,
        timeSlot: slot.time,
        available: slot.available,
        key: `${group.staffId}-${slot.time}`,
      });
    }
  }
  return flat;
}

export function listStaffFromSlots(groups: StaffSlotGroup[]) {
  return groups.map((g) => ({ id: g.staffId, name: g.staffName }));
}
