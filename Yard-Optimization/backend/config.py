"""
Backend Configuration

Feature flags and settings for the Yard Optimization API.
"""

# =============================================================================
# DATA SOURCE TOGGLE
# =============================================================================
# Set to True to use the filtered v2 tables (limited blocks and bays)
# Set to False to use the full original tables
USE_V2_TABLES = True

# =============================================================================
# TABLE NAME HELPERS
# =============================================================================
def get_table_suffix():
    """Returns '_v2' if using v2 tables, empty string otherwise."""
    return "_v2" if USE_V2_TABLES else ""

def get_yards_table():
    """Returns the yards table name based on config."""
    return "yards_v2" if USE_V2_TABLES else "yards"

def get_blocks_table():
    """Returns the blocks table name based on config."""
    return "blocks_v2" if USE_V2_TABLES else "blocks"

def get_locations_table():
    """Returns the yard_locations table name based on config."""
    return "yard_locations_v2" if USE_V2_TABLES else "yard_locations"

def get_containers_table():
    """Returns the containers table name based on config."""
    return "containers_v2" if USE_V2_TABLES else "containers"
