import type {
  Container,
  YardLocation,
  Block,
  Yard,
  AIRecommendation,
  ValidationError,
} from "@/app/types/yard-optimization";

// ============================================================================
// COLOR PALETTES
// ============================================================================

export const colorPalettes = {
  shipping_line: {
    Maersk: "bg-blue-500 border-blue-600",
    MSC: "bg-yellow-500 border-yellow-600",
    "CMA CGM": "bg-red-500 border-red-600",
    COSCO: "bg-green-500 border-green-600",
    "Hapag-Lloyd": "bg-cyan-500 border-cyan-600",
    ONE: "bg-pink-500 border-pink-600",
    default: "bg-green-600 border-green-700",
  },
  pod: {
    Colombo: "bg-teal-500 border-teal-600",
    Singapore: "bg-indigo-500 border-indigo-600",
    Dubai: "bg-amber-500 border-amber-600",
    Rotterdam: "bg-cyan-500 border-cyan-600",
    Shanghai: "bg-rose-500 border-rose-600",
    default: "bg-green-600 border-green-700",
  },
  movement_type: {
    export_container: "bg-blue-500 border-blue-600",
    import_container: "bg-green-500 border-green-600",
    empty: "bg-gray-500 border-gray-600",
  },
  consignee: {
    "ABC Corp": "bg-violet-500 border-violet-600",
    "XYZ Ltd": "bg-fuchsia-500 border-fuchsia-600",
    "Global Trade Inc": "bg-pink-500 border-pink-600",
    "Ocean Freight Co": "bg-emerald-500 border-emerald-600",
    "Logistics Plus": "bg-lime-500 border-lime-600",
    default: "bg-green-600 border-green-700",
  },
  block_types: {
    General: "bg-green-50 border-green-200",
    Reefer: "bg-blue-100 border-blue-300",
    Hazmat: "bg-red-100 border-red-300",
    Empty: "bg-yellow-100 border-yellow-300",
    OOG: "bg-gray-100 border-gray-300",
  },
};

// ============================================================================
// YARD STRUCTURE CONFIGURATION
// ============================================================================

const yardConfigurations = {
  SS1: {
    blocks: 5,
    block_types: [
      { name: "B1", type: "Reefer" as const },
      { name: "B2", type: "Reefer" as const },
      { name: "B3", type: "Reefer" as const },
      { name: "B4", type: "General" as const },
      { name: "B5", type: "General" as const },
    ],
  },
  SS2: {
    blocks: 5,
    block_types: [
      { name: "B1", type: "Reefer" as const },
      { name: "B2", type: "Reefer" as const },
      { name: "B3", type: "Reefer" as const },
      { name: "B4", type: "General" as const },
      { name: "B5", type: "General" as const },
    ],
  },
  SS3: {
    blocks: 6,
    block_types: [
      { name: "B1", type: "General" as const },
      { name: "B2", type: "General" as const },
      { name: "B3", type: "General" as const },
      { name: "B4", type: "General" as const },
      { name: "B5", type: "General" as const },
      { name: "B6", type: "General" as const },
    ],
  },
  SS4: {
    blocks: 7,
    block_types: [
      { name: "B1", type: "General" as const },
      { name: "B2", type: "General" as const },
      { name: "B3", type: "General" as const },
      { name: "B4", type: "General" as const },
      { name: "B5", type: "General" as const },
      { name: "B6", type: "General" as const },
      { name: "B7", type: "General" as const },
    ],
  },
  SS5: {
    blocks: 5,
    block_types: [
      { name: "B1", type: "General" as const },
      { name: "B2", type: "General" as const },
      { name: "B3", type: "General" as const },
      { name: "B4", type: "Hazmat" as const },
      { name: "B5", type: "Hazmat" as const },
    ],
  },
  LS1: {
    blocks: 5,
    block_types: [
      { name: "B1", type: "Reefer" as const },
      { name: "B2", type: "Reefer" as const },
      { name: "B3", type: "General" as const },
      { name: "B4", type: "General" as const },
      { name: "B5", type: "General" as const },
    ],
  },
  LS2: {
    blocks: 6,
    block_types: [
      { name: "B1", type: "General" as const },
      { name: "B2", type: "General" as const },
      { name: "B3", type: "General" as const },
      { name: "B4", type: "General" as const },
      { name: "B5", type: "General" as const },
      { name: "B6", type: "General" as const },
    ],
  },
  LS3: {
    blocks: 5,
    block_types: [
      { name: "B1", type: "Reefer" as const },
      { name: "B2", type: "Reefer" as const },
      { name: "B3", type: "General" as const },
      { name: "B4", type: "General" as const },
      { name: "B5", type: "General" as const },
    ],
  },
  LS4: {
    blocks: 7,
    block_types: [
      { name: "B1", type: "Hazmat" as const },
      { name: "B2", type: "Hazmat" as const },
      { name: "B3", type: "Hazmat" as const },
      { name: "B4", type: "General" as const },
      { name: "B5", type: "General" as const },
      { name: "B6", type: "Empty" as const },
      { name: "B7", type: "Empty" as const },
    ],
  },
  OOG: {
    blocks: 4,
    block_types: [
      { name: "B1", type: "OOG" as const },
      { name: "B2", type: "OOG" as const },
      { name: "B3", type: "OOG" as const },
      { name: "B4", type: "OOG" as const },
    ],
  },
};

// ============================================================================
// MOCK DATA GENERATION
// ============================================================================

const shippingLines = ["Maersk", "MSC", "CMA CGM", "COSCO", "Hapag-Lloyd", "ONE"];
const pods = ["Colombo", "Singapore", "Dubai", "Rotterdam", "Shanghai"];
const consignees = ["ABC Corp", "XYZ Ltd", "Global Trade Inc", "Ocean Freight Co", "Logistics Plus"];

function generateContainerNumber(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const owner = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
  const number = Math.floor(Math.random() * 1000000).toString().padStart(7, "0");
  return `${owner}${number}`;
}

export function generateContainer(blockType: Block["block_type"]): Container {
  const isReefer = blockType === "Reefer" || Math.random() < 0.05;
  const isHazmat = blockType === "Hazmat" || (blockType === "General" && Math.random() < 0.02);
  const isEmpty = blockType === "Empty" || Math.random() < 0.1;
  
  const weight = Math.floor(Math.random() * 20) + 5;
  const weightClass: Container["weight_class"] = 
    weight >= 20 ? "Heavy" : weight >= 10 ? "Medium" : "Light";
  
  const movementTypes: Container["type"][] = isEmpty ? ["empty"] : ["export_container", "import_container"];
  const type = movementTypes[Math.floor(Math.random() * movementTypes.length)];
  
  const container: Container = {
    container_id: `CNT-${Math.random().toString(36).substr(2, 9)}`,
    container_number: generateContainerNumber(),
    iso_code: "42G1",
    size_teu: Math.random() > 0.5 ? 2 : 1,
    container_type: isReefer ? "Reefer" : isHazmat ? "Hazardous" : "Dry",
    load_status: isEmpty ? "Empty" : "Full",
    weight_mt: weight,
    weight_class: weightClass,
    cargo_description: isEmpty ? "Empty container" : "General cargo",
    type,
    customs_status: Math.random() > 0.9 ? "Hold" : Math.random() > 0.5 ? "Cleared" : "Pending",
    hazmat_flag: isHazmat,
    reefer_flag: isReefer,
  };
  
  if (!isEmpty) {
    container.shipping_line = shippingLines[Math.floor(Math.random() * shippingLines.length)];
    container.consignee = consignees[Math.floor(Math.random() * consignees.length)];
    container.pod = pods[Math.floor(Math.random() * pods.length)];
    container.pod_priority = (Math.floor(Math.random() * 4) + 1) as 1 | 2 | 3 | 4;
  }
  
  if (isHazmat) {
    container.imdg_class = ["1.4", "2.2", "3", "4.1", "5.1", "6.1", "8", "9"][Math.floor(Math.random() * 8)];
    container.un_number = `UN${Math.floor(Math.random() * 9000) + 1000}`;
  }
  
  if (isReefer) {
    container.set_temperature = Math.floor(Math.random() * 30) - 20;
    container.current_temperature = container.set_temperature + (Math.random() * 2 - 1);
  }
  
  return container;
}

// Container storage for lookup
const containerStorage = new Map<string, Container>();

export function generateYardLocations(
  yardName: string,
  blockId: string,
  blockType: Block["block_type"]
): YardLocation[] {
  const locations: YardLocation[] = [];
  const baysToShow = 5; // Show first 5 bays only for performance
  const totalRows = 7;
  const totalTiers = 4;
  
  for (let bay = 1; bay <= baysToShow; bay++) {
    for (let row = 1; row <= totalRows; row++) {
      // Build stack from bottom to top
      let stackHeight = 0;
      
      // Determine if this row should have containers (35-65% occupancy)
      if (Math.random() < 0.5) {
        stackHeight = Math.floor(Math.random() * 3) + 1; // 1-3 tiers
      }
      
      for (let tier = 1; tier <= totalTiers; tier++) {
        const location_id = `${blockId}-${bay.toString().padStart(2, "0")}-${row.toString().padStart(2, "0")}-${tier}`;
        const occupied = tier <= stackHeight;
        
        let container_id: string | undefined;
        let status: "actual" | "preplanned" | "planned_move" | undefined;
        
        if (occupied) {
          const container = generateContainer(blockType);
          container.current_location_id = location_id;
          container.block_id = blockId;
          container.bay = bay;
          container.row = row;
          container.tier = tier;
          
          container_id = container.container_id;
          containerStorage.set(container_id, container);
          
          // Assign status: 90% actual, 5% preplanned, 5% planned_move
          const rand = Math.random();
          status = rand < 0.9 ? "actual" : rand < 0.95 ? "preplanned" : "planned_move";
        }
        
        locations.push({
          location_id,
          yard_name: yardName,
          block_id: blockId,
          bay,
          row,
          tier,
          occupied,
          container_id,
          status,
        });
      }
    }
  }
  
  return locations;
}

export function generateBlock(
  yardName: string,
  blockName: string,
  blockType: Block["block_type"],
  position: { x: number; y: number }
): Block {
  const block_id = `${yardName}-${blockName}`;
  const locations = generateYardLocations(yardName, block_id, blockType);
  const occupied_slots = locations.filter(loc => loc.occupied).length;
  
  return {
    block_id,
    yard_name: yardName,
    block_name: blockName,
    block_type: blockType,
    position,
    total_slots: 20 * 7 * 4, // 20 bays × 7 rows × 4 tiers
    occupied_slots,
    locations,
  };
}

export function generateYard(
  yardName: keyof typeof yardConfigurations,
  yardType: Yard["yard_type"]
): Yard {
  const config = yardConfigurations[yardName];
  const blocks: Block[] = [];
  
  config.block_types.forEach((blockConfig, index) => {
    const block = generateBlock(
      yardName,
      blockConfig.name,
      blockConfig.type,
      { x: index * 100, y: 0 }
    );
    blocks.push(block);
  });
  
  return {
    yard_id: yardName,
    yard_name: yardName,
    yard_type: yardType,
    blocks,
  };
}

export function generateAllYards(): Yard[] {
  return [
    // Sea-Side Yards
    generateYard("SS1", "Sea-Side"),
    generateYard("SS2", "Sea-Side"),
    generateYard("SS3", "Sea-Side"),
    generateYard("SS4", "Sea-Side"),
    generateYard("SS5", "Sea-Side"),
    // Land-Side Yards
    generateYard("LS1", "Land-Side"),
    generateYard("LS2", "Land-Side"),
    generateYard("LS3", "Land-Side"),
    generateYard("LS4", "Land-Side"),
    // OOG Yard
    generateYard("OOG", "OOG"),
  ];
}

// Cache generated yards
let cachedYards: Yard[] | null = null;

export function getAllYards(): Yard[] {
  if (!cachedYards) {
    cachedYards = generateAllYards();
  }
  return cachedYards;
}

export function getContainerById(containerId: string): Container | undefined {
  return containerStorage.get(containerId);
}

export function getLocationById(locationId: string): YardLocation | undefined {
  const yards = getAllYards();
  for (const yard of yards) {
    for (const block of yard.blocks) {
      const location = block.locations.find(loc => loc.location_id === locationId);
      if (location) return location;
    }
  }
  return undefined;
}

export function getBlockById(blockId: string): Block | undefined {
  const yards = getAllYards();
  for (const yard of yards) {
    const block = yard.blocks.find(b => b.block_id === blockId);
    if (block) return block;
  }
  return undefined;
}
