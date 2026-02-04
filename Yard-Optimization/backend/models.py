from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


# ============================================================================
# CONTAINER MODEL
# ============================================================================

class Container(Base):
    __tablename__ = "containers"

    # Core Identification
    container_id = Column(String, primary_key=True, index=True)
    container_number = Column(String, unique=True, index=True, nullable=False)
    iso_code = Column(String, nullable=False)
    size_teu = Column(Integer, nullable=False)  # 1 or 2
    container_type = Column(String, nullable=False)  # Dry, Reefer, Hazardous, OOG
    load_status = Column(String, nullable=False)  # Full, Empty

    # Weight & Cargo
    weight_mt = Column(Float, nullable=False)
    weight_class = Column(String, nullable=False)  # Heavy, Medium, Light
    cargo_description = Column(String, nullable=False)
    seal_number = Column(String, nullable=True)

    # Movement & Status
    type = Column(String, nullable=False)  # export_container, import_container, empty
    shipping_bill_number = Column(String, nullable=True)
    bill_of_lading = Column(String, nullable=True)
    customs_status = Column(String, nullable=False)  # Cleared, Hold, Pending
    shipping_line = Column(String, nullable=True)
    consignee = Column(String, nullable=True)

    # Vessel & Voyage
    vessel_id = Column(String, nullable=True)
    voyage_id = Column(String, nullable=True)
    pod = Column(String, nullable=True)
    pod_priority = Column(Integer, nullable=True)  # 1, 2, 3, 4
    cutoff_datetime = Column(String, nullable=True)

    # Hazmat
    hazmat_flag = Column(Boolean, default=False, nullable=False)
    imdg_class = Column(String, nullable=True)
    un_number = Column(String, nullable=True)
    hazmat_segregation = Column(String, nullable=True)

    # Reefer
    reefer_flag = Column(Boolean, default=False, nullable=False)
    set_temperature = Column(Float, nullable=True)
    current_temperature = Column(Float, nullable=True)
    ventilation_setting = Column(String, nullable=True)
    humidity_setting = Column(Float, nullable=True)

    # Current Location
    current_location_id = Column(String, ForeignKey("yard_locations.location_id"), nullable=True)
    block_id = Column(String, nullable=True)
    bay = Column(Integer, nullable=True)
    row = Column(Integer, nullable=True)
    tier = Column(Integer, nullable=True)

    # Timestamps
    gate_in_time = Column(String, nullable=True)
    expected_pickup_time = Column(String, nullable=True)
    dwell_time_hours = Column(Float, nullable=True)

    # ========== NEW FIELDS FROM EXCEL EVENT DATA ==========

    # Event Tracking
    event_sequence_number = Column(Integer, nullable=True)
    movement_id = Column(String, nullable=True)
    event_type = Column(String, nullable=True)  # Gate In, Gate Out, Yard Move, etc.

    # Voyage & Movement
    actual_voyage_datetime = Column(String, nullable=True)
    movement_type = Column(String, nullable=True)  # Gate In, Discharge, Loading, etc.

    # Location Details
    yard_zone_type = Column(String, nullable=True)  # Sea-Side, Land-Side
    from_location_type = Column(String, nullable=True)
    from_location_id = Column(String, nullable=True)
    to_location_type = Column(String, nullable=True)
    to_location_id = Column(String, nullable=True)
    stack_id = Column(String, nullable=True)  # Original stack ID before parsing
    stack_height_after_move = Column(Integer, nullable=True)

    # Equipment & Operations
    equipment_id = Column(String, nullable=True)
    equipment_type = Column(String, nullable=True)  # RTG, Reach Stacker, Internal Truck, etc.
    operator_id = Column(String, nullable=True)
    job_id = Column(String, nullable=True)

    # Timing
    planned_timestamp = Column(String, nullable=True)
    actual_timestamp = Column(String, nullable=True)
    delay_minutes = Column(Integer, nullable=True)
    dwell_time_since_last_event_min = Column(Float, nullable=True)

    # Status & Exceptions
    exception_flag = Column(Boolean, default=False, nullable=True)
    exception_reason = Column(String, nullable=True)
    reason_for_movement = Column(String, nullable=True)
    container_status_after_event = Column(String, nullable=True)

    # Optimization Metrics
    move_intent = Column(String, nullable=True)  # Planned, Unplanned
    optimality_tag = Column(String, nullable=True)  # Optimal, Sub-optimal
    rehandle_flag = Column(Boolean, default=False, nullable=True)
    rehandle_count = Column(Integer, default=0, nullable=True)
    total_dwell_time_min = Column(Float, nullable=True)

    # Yard Metrics
    yard_utilization_percent = Column(Float, nullable=True)
    block_utilization_percent = Column(Float, nullable=True)
    congestion_level = Column(String, nullable=True)  # Low, Medium, High

    # Relationship
    location = relationship("YardLocation", back_populates="container", foreign_keys=[current_location_id])


# ============================================================================
# YARD LOCATION MODEL
# ============================================================================

class YardLocation(Base):
    __tablename__ = "yard_locations"

    location_id = Column(String, primary_key=True, index=True)
    yard_name = Column(String, nullable=False, index=True)
    block_id = Column(String, ForeignKey("blocks.block_id"), nullable=False, index=True)
    bay = Column(Integer, nullable=False)
    row = Column(Integer, nullable=False)
    tier = Column(Integer, nullable=False)
    occupied = Column(Boolean, default=False, nullable=False)
    container_id = Column(String, nullable=True)
    status = Column(String, nullable=True)  # actual, preplanned, planned_move

    # Relationships
    block = relationship("Block", back_populates="locations")
    container = relationship("Container", back_populates="location", foreign_keys=[Container.current_location_id])


# ============================================================================
# BLOCK MODEL
# ============================================================================

class Block(Base):
    __tablename__ = "blocks"

    block_id = Column(String, primary_key=True, index=True)
    yard_name = Column(String, nullable=False, index=True)
    block_name = Column(String, nullable=False)
    block_type = Column(String, nullable=False)  # General, Reefer, Hazmat, Empty, OOG
    position_x = Column(Float, nullable=False)
    position_y = Column(Float, nullable=False)
    total_slots = Column(Integer, nullable=False)
    occupied_slots = Column(Integer, default=0, nullable=False)

    # Relationship
    locations = relationship("YardLocation", back_populates="block")


# ============================================================================
# YARD MODEL
# ============================================================================

class Yard(Base):
    __tablename__ = "yards"

    yard_id = Column(String, primary_key=True, index=True)
    yard_name = Column(String, unique=True, nullable=False, index=True)
    yard_type = Column(String, nullable=False)  # Sea-Side, Land-Side, OOG
