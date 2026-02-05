-- ============================================================================
-- CONTAINER PLACEMENT QUERIES FOR YARD OPTIMIZATION
-- ============================================================================
-- Rules:
-- 1. For each distinct container_number, find the row with MAX(event_sequence_number)
--    — that is the container's CURRENT state.
-- 2. If that row has valid placement (block_id NOT NULL, bay > 0, row > 0, tier > 0)
--    — the container is currently in the yard.
-- 3. Otherwise — the container has left (Vessel Load, Gate Out, etc.) or is not placed.
-- ============================================================================


-- ============================================================================
-- QUERY 1: Find the latest event for each container
-- ============================================================================
-- This gets the most recent event (highest event_sequence_number) per container_number

SELECT
    c.container_id,
    c.container_number,
    c.event_sequence_number,
    c.event_type,
    c.block_id,
    c.bay,
    c.row,
    c.tier,
    c.container_type,
    c.load_status,
    c.pod,
    c.shipping_line,
    c.weight_mt
FROM containers c
INNER JOIN (
    SELECT
        container_number,
        MAX(event_sequence_number) AS max_seq
    FROM containers
    GROUP BY container_number
) latest ON c.container_number = latest.container_number
        AND c.event_sequence_number = latest.max_seq;


-- ============================================================================
-- QUERY 2: Containers currently PLACED in the yard
-- ============================================================================
-- Filters for containers where the latest event has valid placement data
-- (block_id is not null AND bay > 0 AND row > 0 AND tier > 0)

SELECT
    c.container_id,
    c.container_number,
    c.event_sequence_number,
    c.event_type,
    c.block_id,
    c.bay,
    c.row,
    c.tier,
    c.container_type,
    c.load_status,
    c.type,
    c.pod,
    c.shipping_line,
    c.weight_mt,
    c.weight_class
FROM containers c
INNER JOIN (
    SELECT
        container_number,
        MAX(event_sequence_number) AS max_seq
    FROM containers
    GROUP BY container_number
) latest ON c.container_number = latest.container_number
        AND c.event_sequence_number = latest.max_seq
WHERE c.block_id IS NOT NULL
  AND c.block_id != ''
  AND c.bay IS NOT NULL
  AND c.bay > 0
  AND c.row IS NOT NULL
  AND c.row > 0
  AND c.tier IS NOT NULL
  AND c.tier > 0;


-- ============================================================================
-- QUERY 3: Containers NOT currently placed (left yard or never placed)
-- ============================================================================
-- These containers have null/0 placement values in their latest event

SELECT
    c.container_id,
    c.container_number,
    c.event_sequence_number,
    c.event_type,
    c.block_id,
    c.bay,
    c.row,
    c.tier,
    c.movement_type,
    c.reason_for_movement
FROM containers c
INNER JOIN (
    SELECT
        container_number,
        MAX(event_sequence_number) AS max_seq
    FROM containers
    GROUP BY container_number
) latest ON c.container_number = latest.container_number
        AND c.event_sequence_number = latest.max_seq
WHERE c.block_id IS NULL
   OR c.block_id = ''
   OR c.bay IS NULL
   OR c.bay <= 0
   OR c.row IS NULL
   OR c.row <= 0
   OR c.tier IS NULL
   OR c.tier <= 0;


-- ============================================================================
-- QUERY 4: Count of distinct containers vs total event rows
-- ============================================================================

SELECT
    COUNT(*) AS total_event_rows,
    COUNT(DISTINCT container_number) AS distinct_containers
FROM containers;


-- ============================================================================
-- QUERY 5: Placed containers with their matching YardLocation
-- ============================================================================
-- Joins with yard_locations to get the location_id for placement

SELECT
    c.container_id,
    c.container_number,
    c.block_id,
    c.bay,
    c.row,
    c.tier,
    c.container_type,
    c.pod,
    yl.location_id,
    yl.yard_name
FROM containers c
INNER JOIN (
    SELECT
        container_number,
        MAX(event_sequence_number) AS max_seq
    FROM containers
    GROUP BY container_number
) latest ON c.container_number = latest.container_number
        AND c.event_sequence_number = latest.max_seq
INNER JOIN yard_locations yl
    ON yl.block_id = c.block_id
   AND yl.bay = c.bay
   AND yl.row = c.row
   AND yl.tier = c.tier
WHERE c.block_id IS NOT NULL
  AND c.block_id != ''
  AND c.bay > 0
  AND c.row > 0
  AND c.tier > 0;


-- ============================================================================
-- QUERY 6: Summary of containers by placement status
-- ============================================================================

SELECT
    CASE
        WHEN c.block_id IS NOT NULL
         AND c.block_id != ''
         AND c.bay > 0
         AND c.row > 0
         AND c.tier > 0
        THEN 'PLACED'
        ELSE 'NOT_PLACED'
    END AS placement_status,
    COUNT(*) AS container_count
FROM containers c
INNER JOIN (
    SELECT
        container_number,
        MAX(event_sequence_number) AS max_seq
    FROM containers
    GROUP BY container_number
) latest ON c.container_number = latest.container_number
        AND c.event_sequence_number = latest.max_seq
GROUP BY placement_status;


-- ============================================================================
-- QUERY 7: Containers grouped by block (for occupancy calculation)
-- ============================================================================

SELECT
    c.block_id,
    COUNT(*) AS container_count
FROM containers c
INNER JOIN (
    SELECT
        container_number,
        MAX(event_sequence_number) AS max_seq
    FROM containers
    GROUP BY container_number
) latest ON c.container_number = latest.container_number
        AND c.event_sequence_number = latest.max_seq
WHERE c.block_id IS NOT NULL
  AND c.block_id != ''
  AND c.bay > 0
  AND c.row > 0
  AND c.tier > 0
GROUP BY c.block_id
ORDER BY c.block_id;


-- ============================================================================
-- QUERY 8: Full container history for a specific container
-- ============================================================================
-- Replace 'MSCU7401281' with the container_number you want to trace

SELECT
    container_id,
    container_number,
    event_sequence_number,
    event_type,
    movement_type,
    block_id,
    bay,
    row,
    tier,
    actual_timestamp,
    reason_for_movement
FROM containers
WHERE container_number = 'MSCU7401281'
ORDER BY event_sequence_number ASC;


-- ============================================================================
-- QUERY 9: Update yard_locations to mark occupied slots (idempotent sync)
-- ============================================================================
-- Step 1: Reset all locations to unoccupied

UPDATE yard_locations
SET occupied = 0,
    container_id = NULL,
    status = NULL;

-- Step 2: Reset all block occupied_slots to 0

UPDATE blocks
SET occupied_slots = 0;

-- Step 3: Mark locations as occupied based on latest container events

UPDATE yard_locations
SET
    occupied = 1,
    container_id = (
        SELECT c.container_id
        FROM containers c
        INNER JOIN (
            SELECT container_number, MAX(event_sequence_number) AS max_seq
            FROM containers
            GROUP BY container_number
        ) latest ON c.container_number = latest.container_number
                AND c.event_sequence_number = latest.max_seq
        WHERE c.block_id = yard_locations.block_id
          AND c.bay = yard_locations.bay
          AND c.row = yard_locations.row
          AND c.tier = yard_locations.tier
          AND c.block_id IS NOT NULL
          AND c.bay > 0
          AND c.row > 0
          AND c.tier > 0
    ),
    status = 'actual'
WHERE EXISTS (
    SELECT 1
    FROM containers c
    INNER JOIN (
        SELECT container_number, MAX(event_sequence_number) AS max_seq
        FROM containers
        GROUP BY container_number
    ) latest ON c.container_number = latest.container_number
            AND c.event_sequence_number = latest.max_seq
    WHERE c.block_id = yard_locations.block_id
      AND c.bay = yard_locations.bay
      AND c.row = yard_locations.row
      AND c.tier = yard_locations.tier
      AND c.block_id IS NOT NULL
      AND c.bay > 0
      AND c.row > 0
      AND c.tier > 0
);

-- Step 4: Update block occupied_slots counts

UPDATE blocks
SET occupied_slots = (
    SELECT COUNT(*)
    FROM yard_locations yl
    WHERE yl.block_id = blocks.block_id
      AND yl.occupied = 1
);


-- ============================================================================
-- QUERY 10: Verify placement results
-- ============================================================================

-- Count occupied locations
SELECT COUNT(*) AS occupied_count FROM yard_locations WHERE occupied = 1;

-- List occupied locations with container details
SELECT
    yl.location_id,
    yl.block_id,
    yl.bay,
    yl.row,
    yl.tier,
    yl.container_id,
    c.container_number,
    c.container_type,
    c.pod,
    c.event_type
FROM yard_locations yl
INNER JOIN containers c ON yl.container_id = c.container_id
WHERE yl.occupied = 1;

-- Block occupancy summary
SELECT
    block_id,
    block_name,
    block_type,
    total_slots,
    occupied_slots,
    ROUND(occupied_slots * 100.0 / total_slots, 2) AS occupancy_percent
FROM blocks
WHERE occupied_slots > 0
ORDER BY block_id;
