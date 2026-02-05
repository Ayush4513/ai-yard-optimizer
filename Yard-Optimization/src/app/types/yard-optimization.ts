// ============================================================================
// DATA MODELS FOR YARD CONTAINER STACKING OPTIMIZATION
// ============================================================================

export interface Container {
  // Core Identification
  container_id: string;
  container_number: string;
  iso_code: string;
  size_teu: 1 | 2;
  container_type: "Dry" | "Reefer" | "Hazardous" | "OOG";
  load_status: "Full" | "Empty";
  
  // Weight & Cargo
  weight_mt: number;
  weight_class: "Heavy" | "Medium" | "Light";
  cargo_description: string;
  seal_number?: string;
  
  // Movement & Status
  type: "export_container" | "import_container" | "empty";
  shipping_bill_number?: string;
  bill_of_lading?: string;
  customs_status: "Cleared" | "Hold" | "Pending";
  shipping_line?: string;
  consignee?: string;
  
  // Vessel & Voyage
  vessel_id?: string;
  voyage_id?: string;
  pod?: string;
  pod_priority?: 1 | 2 | 3 | 4;
  cutoff_datetime?: string;
  
  // Hazmat
  hazmat_flag: boolean;
  imdg_class?: string;
  un_number?: string;
  hazmat_segregation?: string;
  
  // Reefer
  reefer_flag: boolean;
  set_temperature?: number;
  current_temperature?: number;
  ventilation_setting?: string;
  humidity_setting?: number;
  
  // Current Location
  current_location_id?: string;
  block_id?: string;
  bay?: number;
  row?: number;
  tier?: number;
  
  // Timestamps
  gate_in_time?: string;
  expected_pickup_time?: string;
  dwell_time_hours?: number;
}

export interface YardLocation {
  location_id: string;
  yard_name: string;
  block_id: string;
  bay: number;
  row: number;
  tier: number;
  occupied: boolean;
  container_id?: string;
  status?: "actual" | "preplanned" | "planned_move";
}

export interface Block {
  block_id: string;
  yard_name: string;
  block_name: string;
  block_type: "General" | "Reefer" | "Hazmat" | "Empty" | "OOG";
  position: { x: number; y: number };
  total_slots: number;
  occupied_slots: number;
  locations: YardLocation[];
}

export interface Yard {
  yard_id: string;
  yard_name: string;
  yard_type: "Sea-Side" | "Land-Side" | "OOG";
  blocks: Block[];
}

export interface AIRecommendation {
  rank: 1 | 2 | 3;
  location: YardLocation;
  score: number;
  reasons: string[];
  warnings: string[];
  estimated_retrieval_minutes: number;
  metrics: {
    rehandle_risk_percent: number;
    blocking_containers: number;
    distance_to_quay_m?: number;
    distance_to_gate_m?: number;
    pod_cluster_match_percent: number;
    weight_stack_compliant: boolean;
    block_utilization_percent: number;
  };
}

export type ColorCodingMode = "shipping_line" | "pod" | "movement_type" | "consignee";

export interface ValidationError {
  type: "hard_rule" | "soft_rule";
  message: string;
  rule_name: string;
}
