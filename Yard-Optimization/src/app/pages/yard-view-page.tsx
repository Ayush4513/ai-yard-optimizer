import { useState } from "react";
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

import {
  getAllYards,
  getContainerById,
  getBlockById,
  colorPalettes,
} from "@/app/utils/yard-optimization-data";

import { validateLocation, generateAIRecommendations } from "@/app/utils/yard-validation";

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
  const [recommendations] = useState<AIRecommendation[]>(() => generateAIRecommendations(DEMO_CONTAINER));
  const [viewMode, setViewMode] = useState<"overview" | "detail">("overview");
  const [detailBlock, setDetailBlock] = useState<Block | null>(null);
  const [colorCodingMode, setColorCodingMode] = useState<ColorCodingMode>("shipping_line");
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  
  const allYards = getAllYards();
  const seaSideYards = allYards.filter(y => y.yard_type === "Sea-Side");
  const landSideYards = allYards.filter(y => y.yard_type === "Land-Side");
  const oogYards = allYards.filter(y => y.yard_type === "OOG");

  const handleLocationSelect = (location: YardLocation) => {
    const error = validateLocation(currentContainer, location);
    
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

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Full Width Yard Map */}
        <div className="h-screen">
          <Card className="h-full rounded-none border-x-0 border-t-0">
            <CardContent className="h-full p-4">
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
      </div>
    </TooltipProvider>
  );
}

// Continue in next file...