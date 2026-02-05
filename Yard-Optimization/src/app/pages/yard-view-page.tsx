import { useState, useEffect } from "react";
import {
  Package,
  ArrowLeft,
  Save,
  Ship,
  Truck,
  Sparkles,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  MapIcon,
  Snowflake,
  Box,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Progress } from "@/app/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";
import { cn } from "@/app/components/ui/utils";
import { toast } from "sonner";

import type {
  Container,
  YardLocation,
  Block,
  Yard,
  AIRecommendation,
  ColorCodingMode,
} from "@/app/types/yard-optimization";

import { colorPalettes } from "@/app/utils/yard-optimization-data";
import { validateLocation, generateAIRecommendations } from "@/app/utils/yard-validation";
import { yardAPI, blockAPI, syncAPI } from "@/services/api";

import { YardOverview } from "@/app/components/yard-overview";
import { YardDetailView } from "@/app/components/yard-detail-view";
import { MetricsPanel } from "@/app/components/metrics-panel";

// Mock container for demonstration
const DEMO_CONTAINER: Container = {
  container_id: "CNT-demo123",
  container_number: "MSCU1234567",
  iso_code: "42G1",
  size_teu: 2,
  container_type: "Dry",
  load_status: "Full",
  weight_mt: 22,
  weight_class: "Heavy",
  cargo_description: "Electronics",
  type: "export_container",
  customs_status: "Cleared",
  shipping_line: "Maersk",
  consignee: "ABC Corp",
  pod: "Singapore",
  pod_priority: 1,
  hazmat_flag: false,
  reefer_flag: false,
};

export function YardViewPage() {
  const [currentStep, setCurrentStep] = useState<"entry" | "location" | "confirmation">("location");
  const [currentContainer] = useState<Container>(DEMO_CONTAINER);
  const [selectedLocation, setSelectedLocation] = useState<YardLocation | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [recommendations] = useState<AIRecommendation[]>([]);
  const [viewMode, setViewMode] = useState<"overview" | "detail">("overview");
  const [detailBlock, setDetailBlock] = useState<Block | null>(null);
  const [colorCodingMode, setColorCodingMode] = useState<ColorCodingMode>("shipping_line");
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  // Dynamic data from API
  const [seaSideYards, setSeaSideYards] = useState<Yard[]>([]);
  const [landSideYards, setLandSideYards] = useState<Yard[]>([]);
  const [oogYards, setOogYards] = useState<Yard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchYardData() {
      try {
        setLoading(true);
        setError(null);
        const overview = await yardAPI.getOverview();
        setSeaSideYards(overview.sea_side);
        setLandSideYards(overview.land_side);
        setOogYards(overview.oog);
      } catch (err) {
        setError("Failed to load yard data. Please check if the backend is running on port 8000.");
        console.error("Yard overview fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchYardData();
  }, []);

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

  const handleLocationSelect = (location: YardLocation) => {
    const error = validateLocation(
      currentContainer,
      location,
      detailBlock?.locations,
      detailBlock ?? undefined
    );

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

    toast.success(`Container ${currentContainer.container_number} successfully assigned to ${selectedLocation.location_id}`);
    // Reset for next container
    setCurrentStep("entry");
    setSelectedLocation(null);
    setValidationError(null);
  };

  const handleRecommendationClick = (recommendation: AIRecommendation) => {
    handleLocationSelect(recommendation.location);
  };

  const [syncing, setSyncing] = useState(false);

  const handleSyncContainers = async () => {
    try {
      setSyncing(true);
      const result = await syncAPI.placeContainers();
      toast.success(`Sync complete: ${result.placed_count} containers placed, ${result.skipped_count} skipped`);
      // Refresh yard data
      const overview = await yardAPI.getOverview();
      setSeaSideYards(overview.sea_side);
      setLandSideYards(overview.land_side);
      setOogYards(overview.oog);
      // If detail view is open, refresh it too
      if (detailBlock) {
        const refreshed = await blockAPI.getDetails(detailBlock.block_id);
        setDetailBlock(refreshed);
      }
    } catch (err) {
      toast.error("Failed to sync container placements");
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-lg text-muted-foreground">Loading yard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Full Width Yard Map */}
        <div className="h-screen">
          <Card className="h-full rounded-none border-x-0 border-t-0">
            {/* Sync Header */}
            <div className="flex items-center justify-between border-b px-4 py-2">
              <h2 className="text-lg font-semibold">Yard Overview — Digital Twin</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncContainers}
                disabled={syncing}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                {syncing ? "Syncing..." : "Sync Containers"}
              </Button>
            </div>
            <CardContent className="h-full p-4">
              {loadingDetail ? (
                <div className="flex h-full items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-lg text-muted-foreground">Loading block details...</p>
                  </div>
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
      </div>
    </TooltipProvider>
  );
}
