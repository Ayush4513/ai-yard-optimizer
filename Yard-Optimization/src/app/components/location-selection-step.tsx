import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { toast } from "sonner";
import { cn } from "@/app/components/ui/utils";
import type {
  Container,
  YardLocation,
  Block,
  AIRecommendation,
  ColorCodingMode,
} from "@/app/types/yard-optimization";
import {
  getAllYards,
  getBlockById,
} from "@/app/utils/yard-optimization-data";
import { validateLocation, generateAIRecommendations } from "@/app/utils/yard-validation";
import { YardOverview } from "@/app/components/yard-overview";
import { YardDetailView } from "@/app/components/yard-detail-view";
import { MetricsPanel } from "@/app/components/metrics-panel";

interface LocationSelectionStepProps {
  container: Container;
  onBack: () => void;
  onConfirm: () => void;
}

export function LocationSelectionStep({ container, onBack, onConfirm }: LocationSelectionStepProps) {
  const [selectedLocation, setSelectedLocation] = useState<YardLocation | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [recommendations] = useState<AIRecommendation[]>(() => generateAIRecommendations(container));
  const [viewMode, setViewMode] = useState<"overview" | "detail">("overview");
  const [detailBlock, setDetailBlock] = useState<Block | null>(null);
  const [colorCodingMode, setColorCodingMode] = useState<ColorCodingMode>("shipping_line");
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  
  const allYards = getAllYards();
  const seaSideYards = allYards.filter(y => y.yard_type === "Sea-Side");
  const landSideYards = allYards.filter(y => y.yard_type === "Land-Side");
  const oogYards = allYards.filter(y => y.yard_type === "OOG");

  const handleLocationSelect = (location: YardLocation) => {
    const error = validateLocation(container, location);
    
    if (error) {
      setValidationError(error.message);
      toast.error(error.message);
      return;
    }
    
    setSelectedLocation(location);
    setValidationError(null);
    toast.success("Location validated successfully!");
  };

  const handleConfirmSave = () => {
    if (!selectedLocation) return;
    
    toast.success(`Container ${container.container_number} successfully assigned to ${selectedLocation.location_id}`);
    onConfirm();
  };

  const handleRecommendationClick = (recommendation: AIRecommendation) => {
    handleLocationSelect(recommendation.location);
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
            <Button onClick={handleConfirmSave} className="gap-2">
              <Save className="h-4 w-4" />
              Confirm & Save
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

      {/* AI Recommendations Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            <CardTitle>AI Recommended Locations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
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
              {viewMode === "overview" ? (
                <YardOverview
                  seaSideYards={seaSideYards}
                  landSideYards={landSideYards}
                  oogYards={oogYards}
                  onBlockClick={(block) => {
                    setDetailBlock(block);
                    setViewMode("detail");
                  }}
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
