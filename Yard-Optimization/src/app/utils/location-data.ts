// Location-specific configuration and data

export const LOCATIONS = {
  CFS: "Dhanay Tuticorin Terminal (CFS)",
  TICT: "TICT Port Terminal",
} as const;

export const locationData = {
  [LOCATIONS.CFS]: {
    fullName: "Dhanay Tuticorin Terminal Pvt Ltd",
    type: "CFS",
    description: "Container Freight Station at Tuticorin Port",
    formerName: "SLS Terminal",
    managedBy: "Private Limited Company",
    
    // Operational Data
    avgContainers: 450,
    avgTrucksPerDay: 180,
    avgTeusPerDay: 620,
    utilizationRate: 68,
    
    // Yard Configuration
    totalBlocks: 12,
    totalBays: 48,
    stackingRows: 8,
    maxStackHeight: 4,
    
    // Container Stats
    totalContainers: 1842,
    inbound: 456,
    outbound: 892,
    empty: 494,
    overstay: 8,
    
    // Operations
    primaryRole: "Custodian of containers under Customs supervision",
    operationalFocus: "Storage, movement control, examination coordination, and release of containers",
    regulatoryFramework: "HCCR 2009 (Handling of Cargo in Customs Areas Regulations)",
    
    // Customs & Documentation
    customsOversight: "Entire CFS operations under customs control",
    licensing: "Must obtain and maintain customs licenses to operate",
    transhipmentBond: "Required for container movement between Terminal → CFS → Export/Onward movement",
    bondValue: "INR 2-2.5L for 20-ft containers, INR 3L for 40-ft containers",
    movementTAT: "~1.5 hours",
    
    // Flow Patterns
    exportFlow: "Exporter → Port Gate → CFS (stuffing) → Terminal Gate",
    importFlow: "Terminal → CFS → Port Gate → End Customer",
    directPortDelivery: "Terminal → Port Gate → End Customer (bypassing CFS when DPD approved)",
    
    // Key Processes
    keyProcesses: [
      "IGM (Import General Manifest) filing",
      "CSR (Cargo Summary Report) filing",
      "CMFC permissions required",
      "Marked scanning list shared by CFS",
      "Physical movement to scanning division",
      "Movement submission to terminal post-scanning",
    ],
    
    // Common Commodities
    commodities: ["Textiles", "Auto Parts", "Electronics", "Industrial Equipment", "Consumer Goods"],
    
    // TSM Challenges
    tsmChallenges: [
      "Vessel berthing dependent timing",
      "Customs availability variations",
      "Downstream terminal congestion",
      "Labor shortages and handling capacity",
      "Document-driven processes",
    ],
  },
  
  [LOCATIONS.TICT]: {
    fullName: "Tuticorin International Container Terminal",
    type: "Port Terminal",
    description: "Container Terminal operated by V.O.CHIDAMBARANAR Port Authority",
    managedBy: "V.O.CHIDAMBARANAR Port Authority",
    
    // Operational Data
    avgContainers: 2600,
    avgTrucksPerDay: 1400, // 400 (TICT) + 1000 (DBGT)
    avgTeusPerDay: 2600, // 1000 (TICT) + 1600 (DBGT)
    utilizationRate: 74,
    
    // Yard Configuration
    totalBlocks: 24,
    totalBays: 96,
    stackingRows: 12,
    maxStackHeight: 5,
    
    // Container Stats
    totalContainers: 4286,
    inbound: 856, // 20% inbound
    outbound: 3430, // 80% outbound
    empty: 612,
    overstay: 18,
    
    // Operations
    primaryRole: "Feeder port to major hubs",
    operationalFocus: "Multi-vessel coordination, export stacking, re-marshalling",
    terminals: "2 Container Terminals (TICT, DBGT) + 1 Bulk Cargo Container",
    
    // Port Characteristics
    portType: "Shallow Water Port",
    depthConstraint: "Cannot handle big vessels due to depth constraints and port opening",
    flowSplit: "80% outbound, 20% inbound",
    feederConnections: ["Colombo", "JNPT", "Kochi", "Mundra"],
    feederPercentage: "90%+ feeder vessels",
    
    // Infrastructure
    cfsInRadius: "12 CFS + 1 ICD within 15 km radius",
    
    // Operational Details
    truckVolumeTICT: 400,
    truckVolumeDBGT: 1000,
    containerVolumeTICT: 1000,
    containerVolumeDBGT: 1600,
    
    // Common Commodities
    commodities: ["Garments", "Animal Food", "Fertilizers", "Coal", "Industrial Cargo"],
    
    // Container Types & Categories
    containerTypes: {
      dryStandard: "Standard 20-ft and 40-ft containers",
      highCube: "40-ft and 45-ft containers for taller cargo",
      reefer: "Temperature-controlled units",
      openTop: "For oversized cargo loading",
      flatRack: "Heavy/oversized equipment",
      tank: "Liquid cargo (limited volume)",
    },
    
    categories: {
      dangerous: "Classified by IMO class, isolated stacking",
      overweight: "Weight >24 tons for 20-ft, >30 tons for 40-ft",
      oversized: "Out-of-gauge cargo",
      perishable: "Reefer with plug monitoring",
    },
    
    // Permissions
    permissions: {
      gateIn: "Gatekeeper logs truck entry with documentation",
      gateOut: "Customs clearance + movement permission",
      restacking: "Internally approved based on optimization algorithms",
    },
    
    // Weight Distribution
    weightCategories: {
      light: "<15 tons",
      medium: "15-25 tons",
      heavy: ">25 tons",
    },
    
    // TSM Challenges
    tsmChallenges: [
      "Highly dependent on vessel berthing timing",
      "Customs clearance availability",
      "Downstream terminal congestion (external dependency)",
      "Process rigidity without solving root causes",
      "Viewed as adding process, not prioritized by Prompt Terminals",
    ],
    
    // Handling Process
    gateInProcess: [
      "Transporter coordination under customs-approved movement permissions",
      "Pre-gate checks: valid customs documentation, RFID scanning",
      "Gate operations: document-driven, ad-hoc without system orchestration",
    ],
    
    gateOutProcess: [
      "Customs clearance required",
      "Movement permission from terminal",
      "Coordination with transporter",
      "RFID scanning at exit",
    ],
  },
};

export type LocationKey = keyof typeof locationData;

export function getLocationData(locationName: string) {
  return locationData[locationName as LocationKey] || locationData[LOCATIONS.CFS];
}

export function isCFS(locationName: string): boolean {
  return locationName === LOCATIONS.CFS;
}

export function isTICT(locationName: string): boolean {
  return locationName === LOCATIONS.TICT;
}
