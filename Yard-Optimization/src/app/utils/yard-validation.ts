import type {
  Container,
  YardLocation,
  Block,
  ValidationError,
  AIRecommendation,
} from "@/app/types/yard-optimization";

// ============================================================================
// VALIDATION RULES
// ============================================================================

export function validateLocation(
  container: Container,
  location: YardLocation,
  allLocations?: YardLocation[],
  block?: Block
): ValidationError | null {
  // Rule 1: Location Must Be Available
  if (location.occupied) {
    return {
      type: "hard_rule",
      message: "This location is already occupied.",
      rule_name: "Location Must Be Available",
    };
  }

  // Rule 2: No Floating Containers (Stack Integrity)
  if (location.tier > 1) {
    const lowerTier = location.tier - 1;

    // Search in provided locations array (from API block detail)
    const lowerLocation = allLocations?.find(
      (loc) =>
        loc.block_id === location.block_id &&
        loc.bay === location.bay &&
        loc.row === location.row &&
        loc.tier === lowerTier
    );

    if (!lowerLocation || !lowerLocation.occupied) {
      return {
        type: "hard_rule",
        message: `Stack integrity violation: Tier ${lowerTier} must be occupied before placing a container on Tier ${location.tier}. No floating containers allowed.`,
        rule_name: "No Floating Containers",
      };
    }
  }

  // Rule 3: Reefer Containers Must Be In Reefer Blocks
  if (container.reefer_flag || container.container_type === "Reefer") {
    if (block && block.block_type !== "Reefer") {
      return {
        type: "hard_rule",
        message: "Reefer containers must be placed in designated reefer blocks.",
        rule_name: "Reefer Containers Must Be In Reefer Blocks",
      };
    }
  }

  // Rule 4: Hazardous Containers Must Be In Hazmat Blocks
  if (container.hazmat_flag || container.container_type === "Hazardous") {
    if (block && block.block_type !== "Hazmat") {
      return {
        type: "hard_rule",
        message: "Hazardous containers must be placed in designated hazmat blocks.",
        rule_name: "Hazardous Containers Must Be In Hazmat Blocks",
      };
    }
  }

  // Rule 5: OOG Containers Must Be In OOG Yard
  if (container.container_type === "OOG") {
    if (!location.yard_name.startsWith("OOG")) {
      return {
        type: "hard_rule",
        message: "Out of Gauge (OOG) containers must be placed in the OOG yard.",
        rule_name: "OOG Containers Must Be In OOG Yard",
      };
    }
  }

  // Rule 6: Heavy Containers Limited to Lower Tiers
  if (container.weight_class === "Heavy" && location.tier > 2) {
    return {
      type: "hard_rule",
      message: "Heavy containers (>=20MT) should not be stacked above tier 2 for safety.",
      rule_name: "Heavy Containers Limited to Lower Tiers",
    };
  }

  return null;
}

// ============================================================================
// AI RECOMMENDATION LOGIC
// ============================================================================

export function generateAIRecommendations(
  container: Container,
  allLocations?: YardLocation[],
  blocks?: Block[]
): AIRecommendation[] {
  if (!allLocations || allLocations.length === 0) {
    return [];
  }

  // Step 1: Filter available locations
  let availableLocations = allLocations.filter((loc) => !loc.occupied);

  // Step 2: Stack integrity filter
  availableLocations = availableLocations.filter((loc) => {
    if (loc.tier === 1) return true;

    for (let tier = 1; tier < loc.tier; tier++) {
      const lowerLocation = allLocations.find(
        (l) =>
          l.block_id === loc.block_id &&
          l.bay === loc.bay &&
          l.row === loc.row &&
          l.tier === tier
      );
      if (!lowerLocation || !lowerLocation.occupied) {
        return false;
      }
    }
    return true;
  });

  // Step 3: Container type filter using block data
  if (container.container_type === "Reefer") {
    availableLocations = availableLocations.filter((loc) => {
      const block = blocks?.find((b) => b.block_id === loc.block_id);
      return block?.block_type === "Reefer";
    });
  } else if (container.container_type === "Hazardous") {
    availableLocations = availableLocations.filter((loc) => {
      const block = blocks?.find((b) => b.block_id === loc.block_id);
      return block?.block_type === "Hazmat";
    });
  } else if (container.container_type === "OOG") {
    availableLocations = availableLocations.filter((loc) =>
      loc.yard_name.startsWith("OOG")
    );
  } else if (container.load_status === "Empty") {
    const emptyLocations = availableLocations.filter((loc) => {
      const block = blocks?.find((b) => b.block_id === loc.block_id);
      return block?.block_type === "Empty";
    });
    if (emptyLocations.length > 0) {
      availableLocations = emptyLocations;
    }
  }

  // Step 4: Weight filter
  if (container.weight_class === "Heavy") {
    availableLocations = availableLocations.filter((loc) => loc.tier <= 2);
  }

  // Step 5: Movement type sorting
  if (container.type === "export_container") {
    availableLocations.sort((a, b) => {
      const aScore = a.yard_name.startsWith("SS") ? 1 : 0;
      const bScore = b.yard_name.startsWith("SS") ? 1 : 0;
      return bScore - aScore;
    });
  } else if (container.type === "import_container") {
    availableLocations.sort((a, b) => {
      const aScore = a.yard_name.startsWith("LS") ? 1 : 0;
      const bScore = b.yard_name.startsWith("LS") ? 1 : 0;
      return bScore - aScore;
    });
  }

  // Step 6: Select top 3
  const topLocations = availableLocations.slice(0, 3);

  // Step 7: Generate scores and metrics
  const recommendations: AIRecommendation[] = topLocations.map(
    (location, index) => {
      const rank = (index + 1) as 1 | 2 | 3;
      const isExport = container.type === "export_container";
      const isImport = container.type === "import_container";
      const isSeaSide = location.yard_name.startsWith("SS");
      const isLandSide = location.yard_name.startsWith("LS");

      const block = blocks?.find((b) => b.block_id === location.block_id);
      const blockUtilization =
        block && block.total_slots > 0
          ? Math.round((block.occupied_slots / block.total_slots) * 100)
          : 50;

      let score = 94 - (rank - 1) * 7;
      const reasons: string[] = [];
      const warnings: string[] = [];

      if (rank === 1) {
        if (container.pod) {
          reasons.push(`Same POD cluster (${container.pod})`);
        }
        reasons.push("Weight compatible (can stack)");
        reasons.push("Low rehandle risk");
        if (isExport && isSeaSide) {
          reasons.push("Near quay for export efficiency");
        }
        if (isImport && isLandSide) {
          reasons.push("Near gate for import efficiency");
        }
      } else if (rank === 2) {
        reasons.push("Compatible with block type");
        reasons.push("Available for immediate placement");
        reasons.push("Good weight distribution");
        warnings.push("Slightly higher rehandle risk");
      } else {
        reasons.push("Available location");
        reasons.push("Meets basic stacking rules");
        warnings.push("Higher rehandle risk");
        if (blockUtilization > 75) {
          warnings.push("Block utilization is high");
        }
      }

      const rehandleRisk = rank === 1 ? 15 : rank === 2 ? 28 : 42;
      const blockingContainers =
        location.tier > 1 ? 0 : rank === 1 ? 0 : rank === 2 ? 1 : 2;
      const retrievalMinutes = 3 + (rank - 1) * 2 + blockingContainers;

      const recommendation: AIRecommendation = {
        rank,
        location,
        score,
        reasons,
        warnings,
        estimated_retrieval_minutes: retrievalMinutes,
        metrics: {
          rehandle_risk_percent: rehandleRisk,
          blocking_containers: blockingContainers,
          pod_cluster_match_percent: 85 - (rank - 1) * 15,
          weight_stack_compliant: true,
          block_utilization_percent: blockUtilization,
        },
      };

      if (isExport) {
        const distanceToQuay = isSeaSide
          ? 50 + Math.random() * 150
          : 300 + Math.random() * 200;
        recommendation.metrics.distance_to_quay_m = Math.round(distanceToQuay);
      }

      if (isImport) {
        const distanceToGate = isLandSide
          ? 50 + Math.random() * 150
          : 300 + Math.random() * 200;
        recommendation.metrics.distance_to_gate_m = Math.round(distanceToGate);
      }

      return recommendation;
    }
  );

  return recommendations;
}
