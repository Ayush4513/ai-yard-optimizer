import { useState, useMemo } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import { cn } from "@/app/components/ui/utils";
import type { Block, YardLocation, AIRecommendation, ColorCodingMode, Container, OccupiedLocation } from "@/app/types/yard-optimization";
import { colorPalettes } from "@/app/utils/yard-optimization-data";

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
  const totalBays = block.bays || 20;
  const totalRows = block.rows || 7;
  const totalTiers = block.max_tier || 4;
  const baysPerPage = 5;
  const totalPages = Math.ceil(totalBays / baysPerPage);
  const [currentPage, setCurrentPage] = useState(0);
  const startBay = currentPage * baysPerPage + 1;
  const endBay = Math.min(startBay + baysPerPage - 1, totalBays);

  // Build a lookup map from sparse occupied_locations data
  // Key: "bay-row-tier" -> OccupiedLocation
  const occupiedMap = useMemo(() => {
    const map = new Map<string, OccupiedLocation>();
    (block.occupied_locations || []).forEach(loc => {
      const key = `${loc.bay}-${loc.row}-${loc.tier}`;
      map.set(key, loc);
    });
    return map;
  }, [block.occupied_locations]);

  // Helper to get occupied location or null
  const getOccupiedLocation = (bay: number, row: number, tier: number): OccupiedLocation | null => {
    return occupiedMap.get(`${bay}-${row}-${tier}`) || null;
  };

  const getContainerColor = (container: Container, mode: ColorCodingMode): string => {
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

  // Render a single slot (either occupied or empty)
  const renderSlot = (bay: number, row: number, tier: number) => {
    const occupiedLoc = getOccupiedLocation(bay, row, tier);
    const isOccupied = !!occupiedLoc;
    const container = occupiedLoc?.container || null;
    const locationId = occupiedLoc?.location_id || `${block.block_id}-${String(bay).padStart(2, '0')}-${String(row).padStart(2, '0')}-${tier}`;

    // Build a YardLocation object for callbacks (empty slot case)
    const location: YardLocation = {
      location_id: locationId,
      bay,
      row,
      tier,
      occupied: isOccupied,
      status: occupiedLoc?.status,
      container: container || undefined,
    };

    const isRecommended = recommendations.some(r => r.location.location_id === locationId);
    const recommendation = recommendations.find(r => r.location.location_id === locationId);
    const isSelected = selectedLocation?.location_id === locationId;
    const isHovered = hoveredLocation === locationId;

    let colorClass = "bg-white border-gray-300";
    let opacity = "opacity-100";
    let pattern = "";

    if (isOccupied && container) {
      colorClass = getContainerColor(container, colorCodingMode);

      // Apply visual state overlays
      if (occupiedLoc?.status === "preplanned") {
        opacity = "opacity-60";
        pattern = "polka-dots";
      } else if (occupiedLoc?.status === "planned_move") {
        pattern = "diagonal-stripes";
      }
    }

    if (isRecommended) {
      colorClass = "bg-orange-50 border-orange-400";
    }

    return (
      <Tooltip key={locationId}>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "relative h-10 w-full rounded border-2 transition-all",
              colorClass,
              opacity,
              !isOccupied && "hover:border-blue-400 hover:scale-105 hover:shadow-lg",
              isOccupied && "cursor-not-allowed",
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
            onClick={() => !isOccupied && onLocationSelect(location)}
            onMouseEnter={() => isOccupied && onLocationHover(locationId)}
            onMouseLeave={() => onLocationHover(null)}
            disabled={isOccupied}
          >
            {/* Recommendation Rank Badge */}
            {isRecommended && recommendation && (
              <div className="absolute -right-1 -top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                {recommendation.rank}
              </div>
            )}

            {/* Container Type Indicator */}
            {isOccupied && container && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <span className="text-[11px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                  {container.type === "import_container" && "I"}
                  {container.type === "export_container" && "E"}
                  {container.type === "empty" && "Em"}
                </span>
              </div>
            )}
          </button>
        </TooltipTrigger>

        {isOccupied && container && (
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

  // Generate grid programmatically - no longer depends on locations array
  const renderBay = (bayNumber: number) => {
    // Generate all rows (1 to totalRows)
    const rows = Array.from({ length: totalRows }, (_, i) => i + 1);

    return (
      <div key={bayNumber} className="mb-4">
        <div className="mb-2 text-sm font-medium">Bay {bayNumber}</div>
        <div className="flex gap-2">
          {/* Tier Labels */}
          <div className="flex flex-col justify-around pr-1">
            {Array.from({ length: totalTiers }, (_, i) => totalTiers - i).map(tier => (
              <div key={tier} className="flex h-10 w-6 items-center justify-center text-xs text-muted-foreground">
                T{tier}
              </div>
            ))}
          </div>

          {/* Grid of Slots - generated programmatically */}
          <div
            className="grid flex-1 gap-1"
            style={{ gridTemplateColumns: `repeat(${totalRows}, minmax(0, 1fr))` }}
          >
            {rows.map(row => (
              <div key={row} className="space-y-0.5">
                {/* Slots (top tier to T1, top to bottom) */}
                {Array.from({ length: totalTiers }, (_, i) => totalTiers - i).map(tier => (
                  renderSlot(bayNumber, row, tier)
                ))}

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

      {/* Bay Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border bg-gray-50 px-4 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Bays {startBay}–{endBay} of {totalBays}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Bay Visualization */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-6">
          {Array.from({ length: endBay - startBay + 1 }, (_, i) => startBay + i).map(bayNumber => renderBay(bayNumber))}
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
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded border-2 border-gray-600 bg-gray-500 text-xs font-bold text-white">Em</div>
              <div>
                <div className="font-medium">Letter "Em"</div>
                <div className="text-muted-foreground">Empty container</div>
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