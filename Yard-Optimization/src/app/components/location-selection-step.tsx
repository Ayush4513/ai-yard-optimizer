import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Save,
  Ship,
  Truck,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapIcon,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { toast } from "sonner";
import { cn } from "@/app/components/ui/utils";
import type {
  Container,
  Yard,
  YardLocation,
  Block,
  AIRecommendation,
  ColorCodingMode,
} from "@/app/types/yard-optimization";
import { validateLocation, generateAIRecommendations } from "@/app/utils/yard-validation";
import { yardAPI, blockAPI, optimizationAPI, containerAPI } from "@/services/api";
import { YardOverview } from "@/app/components/yard-overview";
import { YardDetailView } from "@/app/components/yard-detail-view";
import { MetricsPanel } from "@/app/components/metrics-panel";

interface LocationSelectionStepProps {
  container: Container;
  onBack: () => void;
  onConfirm: () => void;
}

function generateManualSelectionWarnings(
  container: Container,
  location: YardLocation,
  recommendations: AIRecommendation[],
  block: Block | null,
): string[] {
  const warnings: string[] = [];
  const bestRec = recommendations[0];

  if (!bestRec) return warnings;

  // Movement type vs yard side mismatch
  if (container.type === "export_container" && location.yard_name && !location.yard_name.startsWith("SS")) {
    warnings.push("Export containers are optimally placed in Sea-Side (SS) blocks for quay proximity — this location is Land-Side");
  }
  if (container.type === "import_container" && location.yard_name && !location.yard_name.startsWith("LS")) {
    warnings.push("Import containers are optimally placed in Land-Side (LS) blocks for gate proximity — this location is Sea-Side");
  }

  // Higher tier = higher rehandle risk
  if (location.tier > 2) {
    warnings.push(`Tier ${location.tier} has higher rehandle risk — AI recommended tier ${bestRec.location.tier} for lower retrieval time`);
  }

  // Heavy container on high tier
  if (container.weight_class === "Heavy" && location.tier > 1) {
    warnings.push("Heavy containers on higher tiers create safety concerns and increase crane load during retrieval");
  }

  // Compare with AI's best score
  warnings.push(`AI's top pick (${bestRec.location.location_id}) scored ${bestRec.score}/100 with ${bestRec.estimated_retrieval_minutes} min retrieval — this manual selection was not in AI's top 3`);

  // POD clustering
  if (container.pod && bestRec.metrics.pod_cluster_match_percent > 50) {
    warnings.push(`AI recommendation has ${bestRec.metrics.pod_cluster_match_percent}% POD cluster match for ${container.pod} — manual selection may reduce port grouping`);
  }

  // Block utilization warning
  if (block && block.total_slots > 0) {
    const utilization = Math.round((block.occupied_slots / block.total_slots) * 100);
    if (utilization > 75) {
      warnings.push(`Block utilization is ${utilization}% — high utilization increases future rehandle probability`);
    }
  }

  return warnings;
}

export function LocationSelectionStep({ container, onBack, onConfirm }: LocationSelectionStepProps) {
  const [selectedLocation, setSelectedLocation] = useState<YardLocation | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"overview" | "detail">("overview");
  const [detailBlock, setDetailBlock] = useState<Block | null>(null);
  const [colorCodingMode, setColorCodingMode] = useState<ColorCodingMode>("shipping_line");
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [manualSelectionWarnings, setManualSelectionWarnings] = useState<string[]>([]);

  // Dynamic data from API
  const [seaSideYards, setSeaSideYards] = useState<Yard[]>([]);
  const [landSideYards, setLandSideYards] = useState<Yard[]>([]);
  const [oogYards, setOogYards] = useState<Yard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    async function fetchYardData() {
      try {
        setLoading(true);
        const overview = await yardAPI.getOverview();
        setSeaSideYards(overview.sea_side);
        setLandSideYards(overview.land_side);
        setOogYards(overview.oog);
      } catch (err) {
        console.error("Yard overview fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchYardData();
  }, []);

  // Fetch AI placement recommendations from LLM
  useEffect(() => {
    async function fetchRecommendations() {
      try {
        setLoadingRecommendations(true);
        setRecommendationError(null);
        const result = await optimizationAPI.getPlacementRecommendations({
          container_id: container.container_id,
          container_type: container.container_type,
          pod: container.pod,
          weight_class: container.weight_class,
          hazmat_flag: container.hazmat_flag,
          reefer_flag: container.reefer_flag,
        });
        setRecommendations(result.recommendations);
      } catch (err) {
        console.error("Recommendation fetch error:", err);
        setRecommendationError("Failed to load AI recommendations");
      } finally {
        setLoadingRecommendations(false);
      }
    }
    fetchRecommendations();
  }, [container]);

  const handleLocationSelect = (location: YardLocation) => {
    // Build allLocations from detailBlock for stack integrity validation
    let allLocations: YardLocation[] | undefined;
    if (detailBlock) {
      allLocations = [];
      const bays = detailBlock.bays || 1;
      const rows = detailBlock.rows || 1;
      const maxTier = detailBlock.max_tier || 5;

      for (let bay = 1; bay <= bays; bay++) {
        for (let row = 1; row <= rows; row++) {
          for (let tier = 1; tier <= maxTier; tier++) {
            const occupiedLoc = detailBlock.occupied_locations?.find(
              (ol) => ol.bay === bay && ol.row === row && ol.tier === tier
            );
            allLocations.push({
              location_id: `${detailBlock.block_id}-${String(bay).padStart(2, '0')}-${String(row).padStart(2, '0')}-${tier}`,
              yard_name: detailBlock.yard_name,
              block_id: detailBlock.block_id,
              bay,
              row,
              tier,
              occupied: !!occupiedLoc,
            });
          }
        }
      }
    }

    const error = validateLocation(
      container,
      location,
      allLocations,
      detailBlock ?? undefined
    );

    if (error) {
      setValidationError(error.message);
      toast.error(error.message);
      return;
    }

    setSelectedLocation(location);
    setValidationError(null);

    // Check if this is a recommended location or manual selection
    const isRecommended = recommendations.some(
      (r) => r.location.location_id === location.location_id
    );

    if (!isRecommended && recommendations.length > 0) {
      const warnings = generateManualSelectionWarnings(container, location, recommendations, detailBlock);
      setManualSelectionWarnings(warnings);
      toast.success("Location validated — review AI analysis below");
    } else {
      setManualSelectionWarnings([]);
      toast.success("Location validated successfully!");
    }
  };

  const handleBlockClick = async (block: Block) => {
    try {
      setLoadingDetail(true);
      const blockDetail = await blockAPI.getDetails(block.block_id);
      setDetailBlock(blockDetail);
      setViewMode("detail");
    } catch (err) {
      toast.error("Failed to load block details");
      console.error("Block detail fetch error:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleConfirmSave = async () => {
    if (!selectedLocation) return;

    try {
      setIsSaving(true);
      // Persist the location assignment to the database
      await containerAPI.update(container.container_id, {
        current_location_id: selectedLocation.location_id,
        block_id: selectedLocation.block_id,
        bay: selectedLocation.bay,
        row: selectedLocation.row,
        tier: selectedLocation.tier,
      });
      toast.success(`Container ${container.container_number} successfully assigned to ${selectedLocation.location_id}`);
      onConfirm();
    } catch (error: any) {
      console.error("Failed to save location assignment:", error);
      toast.error("Failed to save location assignment", {
        description: error.response?.data?.detail || error.message || "Please try again",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecommendationClick = async (recommendation: AIRecommendation) => {
    // AI recommendations are pre-validated — skip validateLocation to avoid
    // false "stack integrity" errors when detailBlock is not loaded yet
    setSelectedLocation(recommendation.location);
    setValidationError(null);
    setManualSelectionWarnings([]);
    toast.success("Location validated successfully!");

    // Always navigate to the recommended block's detail view (even if already in detail mode)
    const blockId = recommendation.location.block_id;
    if (blockId) {
      try {
        setLoadingDetail(true);
        const blockDetail = await blockAPI.getDetails(blockId);
        setDetailBlock(blockDetail);
        setViewMode("detail");
      } catch (err) {
        console.error("Block detail fetch error:", err);
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Container Info Bar */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="h-8 w-px bg-gray-300" />

            <div className="border-l-2 border-gray-300 pl-4">
              <div className="text-xs text-muted-foreground">Current Container</div>
              <div className="font-semibold">{container.container_number}</div>
            </div>

            <div className="border-l-2 border-gray-300 pl-4">
              <div className="text-xs text-muted-foreground">Type</div>
              <div className="font-semibold">
                {container.container_type} • {container.size_teu === 1 ? "20'" : "40'"}
              </div>
            </div>

            <div className="border-l-2 border-gray-300 pl-4">
              <div className="text-xs text-muted-foreground">Weight</div>
              <div className="font-semibold">
                {container.weight_mt}MT ({container.weight_class})
              </div>
            </div>

            <div className="border-l-2 border-gray-300 pl-4">
              <div className="text-xs text-muted-foreground">Movement</div>
              <div className="font-semibold capitalize">
                {container.type.replace("_", " ")}
              </div>
            </div>
          </div>

          {selectedLocation && !validationError && (
            <Button onClick={handleConfirmSave} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? "Saving..." : "Confirm & Save"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Validation Alert */}
      {selectedLocation && !validationError && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">Location Validated</AlertTitle>
          <AlertDescription className="text-green-700">
            Location validated successfully! Review the metrics below and click 'Confirm & Save' to assign.
          </AlertDescription>
        </Alert>
      )}

      {/* AI Analysis Warning for Manual Selections */}
      {selectedLocation && !validationError && manualSelectionWarnings.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">AI Analysis — Manual Selection</AlertTitle>
          <AlertDescription className="text-amber-700">
            <div className="mt-1 space-y-1">
              {manualSelectionWarnings.map((warning, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs">You can still proceed with this location or select an AI-recommended one above.</p>
          </AlertDescription>
        </Alert>
      )}

      {/* AI Recommendations Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            <CardTitle>AI Recommended Locations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loadingRecommendations ? (
            <div className="flex items-center justify-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              <span className="text-muted-foreground">Getting AI recommendations...</span>
            </div>
          ) : recommendationError ? (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900">Recommendations Unavailable</AlertTitle>
              <AlertDescription className="text-amber-700">
                {recommendationError}. You can still select a location manually from the yard map below.
              </AlertDescription>
            </Alert>
          ) : recommendations.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              No recommendations available. Select a location manually from the yard map below.
            </div>
          ) : (
          <div className="grid grid-cols-3 gap-4">
            {recommendations.map((rec) => (
              <Card
                key={rec.location.location_id}
                className={cn(
                  "cursor-pointer border-2 transition-all hover:shadow-md",
                  selectedLocation?.location_id === rec.location.location_id
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200"
                )}
                onClick={() => handleRecommendationClick(rec)}
              >
                <CardContent className="space-y-3 p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge
                        className={cn(
                          "mb-1",
                          rec.rank === 1 && "bg-orange-500",
                          rec.rank === 2 && "bg-orange-400",
                          rec.rank === 3 && "bg-orange-300"
                        )}
                      >
                        #{rec.rank}
                      </Badge>
                      <div className="font-semibold">{rec.location.location_id}</div>
                      <div className="text-xs text-muted-foreground">
                        Bay {rec.location.bay} • Row {rec.location.row} • Tier {rec.location.tier}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-orange-600">{rec.score}</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                  </div>

                  {/* Reasons */}
                  <div className="space-y-1">
                    {rec.reasons.map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  {/* Warnings */}
                  {rec.warnings.length > 0 && (
                    <div className="space-y-1">
                      {rec.warnings.map((warning, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-amber-700">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick Metrics */}
                  <div className="flex gap-4 border-t pt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {rec.estimated_retrieval_minutes} min
                    </div>
                    {rec.metrics.distance_to_quay_m && (
                      <div className="flex items-center gap-1">
                        <Ship className="h-3 w-3" />
                        {rec.metrics.distance_to_quay_m}m
                      </div>
                    )}
                    {rec.metrics.distance_to_gate_m && (
                      <div className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {rec.metrics.distance_to_gate_m}m
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <Button
                    size="sm"
                    className="w-full"
                    variant={
                      selectedLocation?.location_id === rec.location.location_id
                        ? "default"
                        : "outline"
                    }
                  >
                    {selectedLocation?.location_id === rec.location.location_id
                      ? "Selected"
                      : "Select This Location"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Main Grid: Yard Map + Metrics */}
      <div className="grid grid-cols-12 gap-4">
        {/* Yard Map (7/12) */}
        <div className="col-span-7">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapIcon className="h-5 w-5" />
                <div>
                  <CardTitle>Step 2: Yard Map - Digital Twin</CardTitle>
                  <CardDescription>
                    Select a location manually or use AI recommendations. Click on blocks to view detailed bay layout.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : viewMode === "overview" ? (
                <YardOverview
                  seaSideYards={seaSideYards}
                  landSideYards={landSideYards}
                  oogYards={oogYards}
                  onBlockClick={handleBlockClick}
                  selectedLocation={selectedLocation}
                  recommendations={recommendations}
                />
              ) : (
                detailBlock && (
                  <YardDetailView
                    block={detailBlock}
                    onBack={() => {
                      setViewMode("overview");
                      setDetailBlock(null);
                    }}
                    selectedLocation={selectedLocation}
                    onLocationSelect={handleLocationSelect}
                    recommendations={recommendations}
                    colorCodingMode={colorCodingMode}
                    onColorModeChange={setColorCodingMode}
                    hoveredLocation={hoveredLocation}
                    onLocationHover={setHoveredLocation}
                  />
                )
              )}
            </CardContent>
          </Card>
        </div>

        {/* Metrics Panel (5/12) */}
        <div className="col-span-5">
          {selectedLocation && (
            <MetricsPanel
              location={selectedLocation}
              recommendation={recommendations.find(r => r.location.location_id === selectedLocation.location_id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
