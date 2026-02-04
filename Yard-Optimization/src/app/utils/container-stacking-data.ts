// Container stacking configuration: 5 rows × 3 bays × 5 tiers
// Capacity per block = 5 * 3 * 5 = 75 slots

export interface ContainerSlot {
  row: number; // 1-5
  bay: number; // 1-3
  tier: number; // 1-5
  container: ContainerInfo | null;
}

export interface ContainerInfo {
  id: string; // Container number (e.g., "MAEU1234567")
  type: "export" | "import" | "empty" | "reefer";
  hazmat: boolean;
  weight: number; // in tonnes
  destination?: string;
}

// Generate realistic container numbers
function generateContainerNumber(prefix: string, index: number): string {
  const prefixes = ["MAEU", "MSCU", "TCLU", "CMAU", "HLCU"];
  const selectedPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${selectedPrefix}${String(index).padStart(7, "0")}`;
}

// Generate container stacking data for a block
export function generateBlockStacking(
  blockId: string,
  blockType: "export" | "import" | "empty" | "reefer",
  occupancy: number,
  totalContainers: number
): ContainerSlot[] {
  const slots: ContainerSlot[] = [];
  const rows = 5;
  const bays = 3;
  const tiers = 5;

  // Calculate how many slots to fill based on occupancy
  const totalSlots = rows * bays * tiers; // 75 slots
  const filledSlots = Math.floor((occupancy / 100) * totalSlots);

  let containerCount = 0;
  let slotIndex = 0;

  // Fill slots from bottom to top (tier 1 to tier 5), back to front (bay 1 to 8), left to right (row 1 to 3)
  for (let tier = 1; tier <= tiers; tier++) {
    for (let bay = 1; bay <= bays; bay++) {
      for (let row = 1; row <= rows; row++) {
        const shouldFill = slotIndex < filledSlots;
        
        const slot: ContainerSlot = {
          row,
          bay,
          tier,
          container: shouldFill
            ? {
                id: generateContainerNumber(blockType, containerCount++),
                type: blockType,
                hazmat: Math.random() < 0.05, // 5% chance of hazmat
                weight: Math.floor(Math.random() * 15) + 10, // 10-25 tonnes
                destination: blockType === "export" ? ["Singapore", "Shanghai", "Rotterdam", "Los Angeles"][Math.floor(Math.random() * 4)] : undefined,
              }
            : null,
        };
        
        slots.push(slot);
        slotIndex++;
      }
    }
  }

  return slots;
}

// Generate stacking data for all blocks
const blockStackingCache = new Map<string, ContainerSlot[]>();

export function getBlockStacking(
  blockId: string,
  blockType: "export" | "import" | "empty" | "reefer",
  occupancy: number,
  totalContainers: number
): ContainerSlot[] {
  if (!blockStackingCache.has(blockId)) {
    blockStackingCache.set(
      blockId,
      generateBlockStacking(blockId, blockType, occupancy, totalContainers)
    );
  }
  return blockStackingCache.get(blockId)!;
}

// Helper to get slot at specific position
export function getSlotAt(
  slots: ContainerSlot[],
  row: number,
  bay: number,
  tier: number
): ContainerSlot | undefined {
  return slots.find((s) => s.row === row && s.bay === bay && s.tier === tier);
}

// Get bay view (all tiers for a specific bay and row)
export function getBayView(
  slots: ContainerSlot[],
  bay: number,
  row: number
): ContainerSlot[] {
  return slots
    .filter((s) => s.bay === bay && s.row === row)
    .sort((a, b) => a.tier - b.tier);
}

// Get top-down view (highest tier for each bay-row combination)
export function getTopDownView(slots: ContainerSlot[]): ContainerSlot[][] {
  const view: ContainerSlot[][] = [];
  
  for (let bay = 1; bay <= 3; bay++) {
    const bayRow: ContainerSlot[] = [];
    for (let row = 1; row <= 5; row++) {
      // Find the highest tier with a container at this bay-row position
      let highestFilledSlot: ContainerSlot | null = null;
      for (let tier = 5; tier >= 1; tier--) {
        const slot = getSlotAt(slots, row, bay, tier);
        if (slot && slot.container) {
          highestFilledSlot = slot;
          break;
        }
      }
      
      // If no container found, use tier 1 as empty slot
      if (!highestFilledSlot) {
        const emptySlot = getSlotAt(slots, row, bay, 1);
        if (emptySlot) {
          bayRow.push(emptySlot);
        }
      } else {
        bayRow.push(highestFilledSlot);
      }
    }
    view.push(bayRow);
  }
  
  return view;
}