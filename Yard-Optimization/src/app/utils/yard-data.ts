// Yard and container data structure

export interface Container {
  id: string;
  size: "20ft" | "40ft";
  category: "export" | "import" | "empty" | "reefer";
  consignee: string;
  hazmat: boolean;
  weight: number;
}

export interface ContainerStack {
  containers: Container[]; // Vertical stack of 1-5 containers
  size: "20ft" | "40ft"; // All containers in a stack must be same size
}

export interface Block {
  id: string;
  stack: Container[]; // Single vertical stack of 0-5 containers
}

export interface Yard {
  id: string;
  name: string;
  type: "export" | "import";
  side: "land" | "sea";
  blocks: Block[]; // 3×3 = 9 blocks
}

export interface YardLayout {
  landSide: Yard[];
  seaSide: Yard[];
}

// Color mapping for consignees
export const consigneeColors: Record<string, string> = {
  "Maersk": "#9333EA", // Purple
  "MSC": "#EA580C", // Orange
  "CMA CGM": "#EAB308", // Yellow
  "Hapag-Lloyd": "#06B6D4", // Cyan
  "ONE": "#EC4899", // Pink
  "Evergreen": "#10B981", // Green
  "Empty": "#D1D5DB", // Gray
};

export const categoryColors: Record<string, string> = {
  export: "#3B82F6", // Blue
  import: "#10B981", // Green
  empty: "#9CA3AF", // Gray
  reefer: "#06B6D4", // Cyan
};

// Generate random container
function generateContainer(size: "20ft" | "40ft", allowHazmat: boolean = false): Container {
  const categories: ("export" | "import" | "empty" | "reefer")[] = ["export", "import", "empty", "reefer"];
  const consignees = ["Maersk", "MSC", "CMA CGM", "Hapag-Lloyd", "ONE", "Evergreen"];
  
  const category = categories[Math.floor(Math.random() * categories.length)];
  const consignee = category === "empty" ? "Empty" : consignees[Math.floor(Math.random() * consignees.length)];
  
  return {
    id: `${consignee.slice(0, 4).toUpperCase()}${Math.floor(Math.random() * 1000000).toString().padStart(7, "0")}`,
    size,
    category,
    consignee,
    hazmat: allowHazmat ? Math.random() < 0.3 : false, // Only hazmat if allowed, 30% chance in hazmat zones
    weight: Math.floor(Math.random() * 15) + 10,
  };
}

// Generate a vertical stack of containers
function generateStack(): ContainerStack {
  const size: "20ft" | "40ft" = Math.random() > 0.5 ? "40ft" : "20ft";
  const height = Math.floor(Math.random() * 2) + 4; // 4-5 containers high
  
  const containers: Container[] = [];
  for (let i = 0; i < height; i++) {
    containers.push(generateContainer(size));
  }
  
  return {
    containers,
    size,
  };
}

// Generate a block with a single vertical stack (max 5 containers)
function generateBlock(blockId: string): Block {
  const numContainers = Math.floor(Math.random() * 6); // 0-5 containers
  const stack: Container[] = [];
  
  // Check if this is a hazmat block (ends with "31")
  const blockNumber = blockId.split('-')[1];
  const isHazmatBlock = blockNumber === '31';
  
  if (numContainers > 0) {
    // Decide if this stack is 20ft or 40ft
    const stackSize: "20ft" | "40ft" = Math.random() > 0.5 ? "40ft" : "20ft";
    
    for (let i = 0; i < numContainers; i++) {
      // Only allow hazmat containers in hazmat blocks (block 31)
      stack.push(generateContainer(stackSize, isHazmatBlock));
    }
  }
  
  return {
    id: blockId,
    stack,
  };
}

// Generate yard with 3×3 blocks
function generateYard(yardId: string, yardName: string, type: "export" | "import", side: "land" | "sea"): Yard {
  const blocks: Block[] = [];
  
  // 3 rows × 3 columns = 9 blocks
  // Row 1: 11, 12, 13
  // Row 2: 21, 22, 23
  // Row 3: 31, 32, 33
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const blockNum = `${row + 1}${col + 1}`;
      blocks.push(generateBlock(`${yardId}-${blockNum}`));
    }
  }
  
  return {
    id: yardId,
    name: yardName,
    type,
    side,
    blocks,
  };
}

// Generate complete yard layout
export function generateYardLayout(): YardLayout {
  return {
    landSide: [
      generateYard("L1", "Yard L1 - Exports", "export", "land"),
      generateYard("L2", "Yard L2 - Imports", "import", "land"),
    ],
    seaSide: [
      generateYard("S3", "Yard S3 - Exports", "export", "sea"),
      generateYard("S4", "Yard S4 - Exports", "export", "sea"),
      generateYard("S5", "Yard S5 - Imports", "import", "sea"),
    ],
  };
}

// Cache the layout
let cachedLayout: YardLayout | null = null;

export function getYardLayout(): YardLayout {
  if (!cachedLayout) {
    cachedLayout = generateYardLayout();
  }
  return cachedLayout;
}

// Helper to count containers in a block
export function getBlockContainerCount(block: Block): number {
  return block.stack.length;
}

// Helper to get block stats
export function getBlockStats(block: Block) {
  let totalContainers = 0;
  let export20 = 0, export40 = 0;
  let import20 = 0, import40 = 0;
  let empty20 = 0, empty40 = 0;
  let reefer20 = 0, reefer40 = 0;
  let hazmatCount = 0;
  
  block.stack.forEach(container => {
    totalContainers++;
    if (container.hazmat) hazmatCount++;
    
    const is20ft = container.size === "20ft";
    
    if (container.category === "export") {
      if (is20ft) export20++;
      else export40++;
    } else if (container.category === "import") {
      if (is20ft) import20++;
      else import40++;
    } else if (container.category === "empty") {
      if (is20ft) empty20++;
      else empty40++;
    } else if (container.category === "reefer") {
      if (is20ft) reefer20++;
      else reefer40++;
    }
  });
  
  return {
    totalContainers,
    export20, export40,
    import20, import40,
    empty20, empty40,
    reefer20, reefer40,
    hazmatCount,
  };
}