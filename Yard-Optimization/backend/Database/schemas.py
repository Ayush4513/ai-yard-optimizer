from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime


# ============================================================================
# CONTAINER SCHEMAS
# ============================================================================

class ContainerBase(BaseModel):
    """Base container schema"""
    container_number: str
    iso_code: str
    size_teu: Literal[1, 2]
    container_type: Literal["Dry", "Reefer", "Hazardous", "OOG"]
    load_status: Literal["Full", "Empty"]
    weight_mt: float
    weight_class: Literal["Heavy", "Medium", "Light"]
    cargo_description: str
    seal_number: Optional[str] = None
    type: Literal["export_container", "import_container", "empty"]
    shipping_bill_number: Optional[str] = None
    bill_of_lading: Optional[str] = None
    customs_status: Literal["Cleared", "Hold", "Pending"]
    shipping_line: Optional[str] = None
    consignee: Optional[str] = None
    vessel_id: Optional[str] = None
    voyage_id: Optional[str] = None
    pod: Optional[str] = None
    pod_priority: Optional[Literal[1, 2, 3, 4]] = None
    cutoff_datetime: Optional[str] = None
    hazmat_flag: bool = False
    imdg_class: Optional[str] = None
    un_number: Optional[str] = None
    hazmat_segregation: Optional[str] = None
    reefer_flag: bool = False
    set_temperature: Optional[float] = None
    current_temperature: Optional[float] = None
    ventilation_setting: Optional[str] = None
    humidity_setting: Optional[float] = None
    current_location_id: Optional[str] = None
    block_id: Optional[str] = None
    bay: Optional[int] = None
    row: Optional[int] = None
    tier: Optional[int] = None
    gate_in_time: Optional[str] = None
    expected_pickup_time: Optional[str] = None
    dwell_time_hours: Optional[float] = None

    # Event Tracking
    event_sequence_number: Optional[int] = None
    movement_id: Optional[str] = None
    event_type: Optional[str] = None

    # Voyage & Movement
    actual_voyage_datetime: Optional[str] = None
    movement_type: Optional[str] = None

    # Location Details
    yard_zone_type: Optional[str] = None
    from_location_type: Optional[str] = None
    from_location_id: Optional[str] = None
    to_location_type: Optional[str] = None
    to_location_id: Optional[str] = None
    stack_id: Optional[str] = None
    stack_height_after_move: Optional[int] = None

    # Equipment & Operations
    equipment_id: Optional[str] = None
    equipment_type: Optional[str] = None
    operator_id: Optional[str] = None
    job_id: Optional[str] = None

    # Timing
    planned_timestamp: Optional[str] = None
    actual_timestamp: Optional[str] = None
    delay_minutes: Optional[int] = None
    dwell_time_since_last_event_min: Optional[float] = None

    # Status & Exceptions
    exception_flag: Optional[bool] = False
    exception_reason: Optional[str] = None
    reason_for_movement: Optional[str] = None
    container_status_after_event: Optional[str] = None

    # Optimization Metrics
    move_intent: Optional[str] = None
    optimality_tag: Optional[str] = None
    rehandle_flag: Optional[bool] = False
    rehandle_count: Optional[int] = 0
    total_dwell_time_min: Optional[float] = None

    # Yard Metrics
    yard_utilization_percent: Optional[float] = None
    block_utilization_percent: Optional[float] = None
    congestion_level: Optional[str] = None


class ContainerCreate(ContainerBase):
    """Schema for creating a new container"""
    container_id: str


class ContainerUpdate(BaseModel):
    """Schema for updating a container (all fields optional)"""
    container_number: Optional[str] = None
    iso_code: Optional[str] = None
    size_teu: Optional[Literal[1, 2]] = None
    container_type: Optional[Literal["Dry", "Reefer", "Hazardous", "OOG"]] = None
    load_status: Optional[Literal["Full", "Empty"]] = None
    weight_mt: Optional[float] = None
    weight_class: Optional[Literal["Heavy", "Medium", "Light"]] = None
    cargo_description: Optional[str] = None
    seal_number: Optional[str] = None
    type: Optional[Literal["export_container", "import_container", "empty"]] = None
    customs_status: Optional[Literal["Cleared", "Hold", "Pending"]] = None
    shipping_line: Optional[str] = None
    consignee: Optional[str] = None
    vessel_id: Optional[str] = None
    voyage_id: Optional[str] = None
    pod: Optional[str] = None
    pod_priority: Optional[Literal[1, 2, 3, 4]] = None
    cutoff_datetime: Optional[str] = None
    hazmat_flag: Optional[bool] = None
    imdg_class: Optional[str] = None
    un_number: Optional[str] = None
    hazmat_segregation: Optional[str] = None
    reefer_flag: Optional[bool] = None
    set_temperature: Optional[float] = None
    current_temperature: Optional[float] = None
    ventilation_setting: Optional[str] = None
    humidity_setting: Optional[float] = None
    current_location_id: Optional[str] = None
    block_id: Optional[str] = None
    bay: Optional[int] = None
    row: Optional[int] = None
    tier: Optional[int] = None
    gate_in_time: Optional[str] = None
    expected_pickup_time: Optional[str] = None
    dwell_time_hours: Optional[float] = None

    # Event Tracking
    event_sequence_number: Optional[int] = None
    movement_id: Optional[str] = None
    event_type: Optional[str] = None

    # Voyage & Movement
    actual_voyage_datetime: Optional[str] = None
    movement_type: Optional[str] = None

    # Location Details
    yard_zone_type: Optional[str] = None
    from_location_type: Optional[str] = None
    from_location_id: Optional[str] = None
    to_location_type: Optional[str] = None
    to_location_id: Optional[str] = None
    stack_id: Optional[str] = None
    stack_height_after_move: Optional[int] = None

    # Equipment & Operations
    equipment_id: Optional[str] = None
    equipment_type: Optional[str] = None
    operator_id: Optional[str] = None
    job_id: Optional[str] = None

    # Timing
    planned_timestamp: Optional[str] = None
    actual_timestamp: Optional[str] = None
    delay_minutes: Optional[int] = None
    dwell_time_since_last_event_min: Optional[float] = None

    # Status & Exceptions
    exception_flag: Optional[bool] = None
    exception_reason: Optional[str] = None
    reason_for_movement: Optional[str] = None
    container_status_after_event: Optional[str] = None

    # Optimization Metrics
    move_intent: Optional[str] = None
    optimality_tag: Optional[str] = None
    rehandle_flag: Optional[bool] = None
    rehandle_count: Optional[int] = None
    total_dwell_time_min: Optional[float] = None

    # Yard Metrics
    yard_utilization_percent: Optional[float] = None
    block_utilization_percent: Optional[float] = None
    congestion_level: Optional[str] = None


class Container(ContainerBase):
    """Full container schema with ID"""
    container_id: str

    model_config = {"from_attributes": True}


# ============================================================================
# YARD LOCATION SCHEMAS
# ============================================================================

class YardLocationBase(BaseModel):
    """Base yard location schema"""
    yard_name: str
    block_id: str
    bay: int
    row: int
    tier: int
    occupied: bool = False
    container_id: Optional[str] = None
    status: Optional[Literal["actual", "preplanned", "planned_move"]] = None


class YardLocationCreate(YardLocationBase):
    """Schema for creating a new yard location"""
    location_id: str


class YardLocationUpdate(BaseModel):
    """Schema for updating a yard location"""
    occupied: Optional[bool] = None
    container_id: Optional[str] = None
    status: Optional[Literal["actual", "preplanned", "planned_move"]] = None


class YardLocation(YardLocationBase):
    """Full yard location schema with ID"""
    location_id: str

    class Config:
        from_attributes = True


# ============================================================================
# BLOCK SCHEMAS
# ============================================================================

class BlockBase(BaseModel):
    """Base block schema"""
    block_name: str
    yard_name: str
    block_type: Literal["General", "Reefer", "Hazmat", "Empty", "OOG"]
    position_x: float
    position_y: float
    total_slots: int
    occupied_slots: int = 0


class BlockCreate(BlockBase):
    """Schema for creating a new block"""
    block_id: str


class Block(BlockBase):
    """Full block schema"""
    block_id: str

    class Config:
        from_attributes = True


# ============================================================================
# AI RECOMMENDATION SCHEMAS
# ============================================================================

class RecommendationMetrics(BaseModel):
    """Metrics for placement recommendation"""
    rehandle_risk_percent: float
    blocking_containers: int
    distance_to_quay_m: Optional[float] = None
    distance_to_gate_m: Optional[float] = None
    pod_cluster_match_percent: float
    weight_stack_compliant: bool
    block_utilization_percent: float


class AIRecommendation(BaseModel):
    """AI recommendation for container placement"""
    rank: Literal[1, 2, 3]
    location: YardLocation
    score: float
    reasons: List[str]
    warnings: List[str]
    estimated_retrieval_minutes: int
    metrics: RecommendationMetrics


# ============================================================================
# OPTIMIZATION REQUEST/RESPONSE SCHEMAS
# ============================================================================

class PlacementRequest(BaseModel):
    """Request schema for placement optimization"""
    container_id: str
    container_type: Optional[str] = None
    pod: Optional[str] = None
    weight_class: Optional[str] = None
    hazmat_flag: Optional[bool] = False
    reefer_flag: Optional[bool] = False


class PlacementRecommendation(BaseModel):
    """Response schema for placement recommendations"""
    container_id: str
    recommendations: List[AIRecommendation]


# ============================================================================
# STATISTICS SCHEMAS
# ============================================================================

class YardStats(BaseModel):
    """Yard statistics response"""
    total_containers: int
    total_locations: int
    occupied_locations: int
    available_locations: int
    occupancy_rate: float


class ContainerStats(BaseModel):
    """Container statistics response"""
    total: int
    by_type: dict
    by_status: dict
