import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import { cn } from "@/app/components/ui/utils";
import type { Block, YardLocation, AIRecommendation, ColorCodingMode, Container } from "@/app/types/yard-optimization";
import { colorPalettes, getContainerById } from "@/app/utils/yard-optimization-data";

interface YardDetailViewProps {
  block: Block;
  onBack: () => void;
  selectedLocation: YardLocation | null;
  onLocationSelect: (location: YardLocation) => void;
  recommendations: AIRecommendation[];
  colorCodingMode: ColorCodingMode;
  onColorModeChange: (mode: ColorCodingMode) => void;
  hoveredLocation: string | null;
  onLocationHover: (locationId: string | null) => void;
}

export function YardDetailView({
  block,
  onBack,
  selectedLocation,
  onLocationSelect,
  recommendations,
  colorCodingMode,
  onColorModeChange,
  hoveredLocation,
  onLocationHover,
}: YardDetailViewProps) {
  const baysToShow = 5;

  const getContainerColor = (container: Container, mode: ColorCodingMode): string => {
    if (container.load_status === "Empty") {
      return "white";
    }

    const palette = colorPalettes[mode];
    let key: string;

    switch (mode) {
      case "shipping_line":
        key = container.shipping_line || "default";
        break;
      case "pod":
        key = container.pod || "default";
        break;
      case "movement_type":
        key = container.type;
        break;
      case "consignee":
        key = container.consignee || "default";
        break;
      default:
        return palette.default || "bg-green-600 border-green-700";
    }

    return palette[key as keyof typeof palette] || palette.default || "bg-green-600 border-green-700";
  };

  const renderContainerSlot = (location: YardLocation) => {
    const container = location.container_id ? getContainerById(location.container_id) : null;
    const isRecommended = recommendations.some(r => r.location.location_id === location.location_id);
    const recommendation = recommendations.find(r => r.location.location_id === location.location_id);
    const isSelected = selectedLocation?.location_id === location.location_id;
    const isHovered = hoveredLocation === location.location_id;

    let colorClass = "bg-white border-gray-300";
    let opacity = "opacity-100";
    let pattern = "";

    if (location.occupied && container) {
      colorClass = getContainerColor(container, colorCodingMode);
      
      // Apply visual state overlays
      if (location.status === "preplanned") {
        opacity = "opacity-60";
        pattern = "polka-dots";
      } else if (location.status === "planned_move") {
        pattern = "diagonal-stripes";
      }
      
      // Empty containers special case
      if (container.load_status === "Empty") {
        colorClass = "bg-white border-gray-400";
      }
    }

    if (isRecommended) {
      colorClass = "bg-orange-50 border-orange-400";
    }

    return (
      <Tooltip key={location.location_id}>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "relative h-10 w-full rounded border-2 transition-all",
              colorClass,
              opacity,
              !location.occupied && "hover:border-blue-400 hover:scale-105 hover:shadow-lg",
              location.occupied && "cursor-not-allowed",
              isRecommended && "animate-pulse",
              isSelected && "ring-2 ring-purple-500",
              isHovered && "scale-105 shadow-lg",
              pattern === "polka-dots" && "bg-polka-dots",
              pattern === "diagonal-stripes" && "bg-diagonal-stripes"
            )}
            style={
              pattern === "polka-dots"
                ? {
                    backgroundImage:
                      "radial-gradient(circle, rgba(255, 255, 255, 0.4) 1px, transparent 1px)",
                    backgroundSize: "4px 4px",
                  }
                : pattern === "diagonal-stripes"
                ? {
                    backgroundImage:
                      "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255, 255, 255, 0.3) 3px, rgba(255, 255, 255, 0.3) 6px)",
                  }
                : undefined
            }
            onClick={() => !location.occupied && onLocationSelect(location)}
            onMouseEnter={() => location.occupied && onLocationHover(location.location_id)}
            onMouseLeave={() => onLocationHover(null)}
            disabled={location.occupied}
          >
            {/* Recommendation Rank Badge */}
            {isRecommended && recommendation && (
              <div className="absolute -right-1 -top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                {recommendation.rank}
              </div>
            )}

            {/* Container Type Indicator */}
            {location.occupied && container && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <span className={cn(
                  "text-[11px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]",
                  container.load_status === "Empty" ? "text-gray-500" : "text-white"
                )}>
                  {container.type === "import_container" && "I"}
                  {container.type === "export_container" && "E"}
                </span>
              </div>
            )}
          </button>
        </TooltipTrigger>
        
        {location.occupied && container && (
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              <div className="font-semibold">{container.container_number}</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div className="text-muted-foreground">Type:</div>
                <div>{container.type.replace("_", " ")}</div>
                {container.shipping_line && (
                  <>
                    <div className="text-muted-foreground">Line:</div>
                    <div>{container.shipping_line}</div>
                  </>
                )}
                {container.pod && (
                  <>
                    <div className="text-muted-foreground">POD:</div>
                    <div>{container.pod}</div>
                  </>
                )}
                <div className="text-muted-foreground">Weight:</div>
                <div>{container.weight_mt} MT</div>
                <div className="text-muted-foreground">Container:</div>
                <div>{container.container_type}</div>
                <div className="text-muted-foreground">Size:</div>
                <div>{container.size_teu === 2 ? "40ft" : "20ft"}</div>
              </div>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    );
  };

  const renderBay = (bayNumber: number) => {
    const bayLocations = block.locations.filter(loc => loc.bay === bayNumber);
    const rows = Array.from(new Set(bayLocations.map(loc => loc.row))).sort((a, b) => a - b);

    return (
      <div key={bayNumber} className="mb-4">
        <div className="mb-2 text-sm font-medium">Bay {bayNumber}</div>
        <div className="flex gap-2">
          {/* Tier Labels */}
          <div className="flex flex-col justify-around pr-1">
            {[4, 3, 2, 1].map(tier => (
              <div key={tier} className="flex h-10 w-6 items-center justify-center text-xs text-muted-foreground">
                T{tier}
              </div>
            ))}
          </div>

          {/* Grid of Slots */}
          <div className="grid flex-1 grid-cols-7 gap-1">
            {rows.map(row => (
              <div key={row} className="space-y-0.5">
                {/* Slots (T4 to T1, top to bottom) */}
                {[4, 3, 2, 1].map(tier => {
                  const location = bayLocations.find(loc => loc.row === row && loc.tier === tier);
                  return location ? renderContainerSlot(location) : <div key={tier} className="h-10" />;
                })}
                
                {/* Row Label */}
                <div className="flex h-6 items-center justify-center text-xs text-muted-foreground">
                  R{row}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Color legend based on mode
  const getLegendItems = () => {
    const palette = colorPalettes[colorCodingMode];
    return Object.entries(palette)
      .filter(([key]) => key !== "default")
      .slice(0, 5)
      .map(([label, colorClass]) => ({ label, colorClass }));
  };

  return (
    <div className="space-y-4">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
        <div>
          <div className="text-lg font-semibold">{block.block_id}</div>
          <div className="text-sm text-muted-foreground">
            {block.block_type} Block • {block.occupied_slots} / {block.total_slots} occupied
          </div>
        </div>
        <Button variant="default" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Yard Overview
        </Button>
      </div>

      {/* Color Coding Selector */}
      <Card className="border bg-gray-50 p-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Color Code By:</label>
          <Select value={colorCodingMode} onValueChange={(value) => onColorModeChange(value as ColorCodingMode)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shipping_line">Shipping Line</SelectItem>
              <SelectItem value="pod">Port of Delivery</SelectItem>
              <SelectItem value="movement_type">Import/Export/Empty</SelectItem>
              <SelectItem value="consignee">Consignee</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Color Legend */}
      <Card className="border p-2">
        <div className="flex flex-wrap items-center gap-4">
          {getLegendItems().map(({ label, colorClass }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={cn("h-4 w-6 rounded border", colorClass)} />
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Bay Visualization */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-6">
          {Array.from({ length: baysToShow }, (_, i) => i + 1).map(bayNumber => renderBay(bayNumber))}
          <div className="py-4 text-center text-sm text-muted-foreground">
            Showing {baysToShow} of 20 bays. Full visualization available in production.
          </div>
        </div>
      </ScrollArea>

      {/* Legends */}
      <div className="space-y-3">
        {/* Container State Legend */}
        <Card className="border p-3">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">Container State</div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded border-2 border-green-700 bg-green-600" />
              <div>
                <div className="font-medium">Solid</div>
                <div className="text-muted-foreground">Current location</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded border-2 border-green-700 bg-green-600 opacity-60 bg-polka-dots" />
              <div>
                <div className="font-medium">Translucent + Dots</div>
                <div className="text-muted-foreground">Preplanned (not moved)</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded border-2 border-green-700 bg-green-600 bg-diagonal-stripes" />
              <div>
                <div className="font-medium">Hatched</div>
                <div className="text-muted-foreground">Planned move (pending)</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Container Type Legend */}
        <Card className="border p-3">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">Container Type</div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded border-2 border-gray-400 bg-white" />
              <div>
                <div className="font-medium">White outline</div>
                <div className="text-muted-foreground">Empty container</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded border-2 border-green-700 bg-green-600 text-xs font-bold text-white">I</div>
              <div>
                <div className="font-medium">Letter "I"</div>
                <div className="text-muted-foreground">Import container</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded border-2 border-blue-700 bg-blue-600 text-xs font-bold text-white">E</div>
              <div>
                <div className="font-medium">Letter "E"</div>
                <div className="text-muted-foreground">Export container</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Slot Status Legend */}
        <Card className="border p-3">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">Slot Status</div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded border-2 border-gray-300 bg-white" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative h-6 w-6 rounded border-2 border-orange-400 bg-orange-50">
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">1</div>
              </div>
              <span>AI Recommended</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded border-2 border-purple-500 bg-white ring-2 ring-purple-500" />
              <span>Selected</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}