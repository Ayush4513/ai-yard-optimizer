import { Ship, Truck, Package, Snowflake, AlertTriangle, Box } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { Progress } from "@/app/components/ui/progress";
import type { Yard, Block, YardLocation, AIRecommendation } from "@/app/types/yard-optimization";
import { colorPalettes } from "@/app/utils/yard-optimization-data";

interface YardOverviewProps {
  seaSideYards: Yard[];
  landSideYards: Yard[];
  oogYards: Yard[];
  onBlockClick: (block: Block) => void;
  selectedLocation: YardLocation | null;
  recommendations: AIRecommendation[];
}

export function YardOverview({
  seaSideYards,
  landSideYards,
  oogYards,
  onBlockClick,
  selectedLocation,
  recommendations,
}: YardOverviewProps) {
  const getBlockIcon = (blockType: Block["block_type"]) => {
    switch (blockType) {
      case "Reefer":
        return Snowflake;
      case "Hazmat":
        return AlertTriangle;
      case "Empty":
        return Box;
      case "OOG":
        return Package;
      default:
        return null;
    }
  };

  const renderBlock = (block: Block, yardType: "sea" | "land" | "oog") => {
    const utilization = Math.round((block.occupied_slots / block.total_slots) * 100);
    const Icon = getBlockIcon(block.block_type);
    const blockColor = colorPalettes.block_types[block.block_type];
    const isRecommended = recommendations.some(r => r.location.block_id === block.block_id);
    const isSelected = selectedLocation?.block_id === block.block_id;
    const recommendation = recommendations.find(r => r.location.block_id === block.block_id);

    return (
      <Button
        key={block.block_id}
        variant="ghost"
        className={cn(
          "relative h-auto w-full border-2 p-2 text-left transition-all hover:shadow-md",
          blockColor,
          isRecommended && "ring-2 ring-orange-400",
          isSelected && "ring-2 ring-purple-500"
        )}
        onClick={() => onBlockClick(block)}
      >
        {/* Recommendation Badge */}
        {isRecommended && recommendation && (
          <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
            {recommendation.rank}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {Icon && <Icon className="h-3 w-3" />}
            <span className="text-xs font-medium">{block.block_name}</span>
          </div>
          <span className="text-xs text-muted-foreground">{utilization}%</span>
        </div>
        
        <Progress value={utilization} className="mt-1 h-1" />
      </Button>
    );
  };

  const renderYardSection = (
    yards: Yard[],
    title: string,
    Icon: any,
    iconColor: string,
    borderColor: string,
    badgeText: string
  ) => (
    <div className="mb-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className={cn("h-5 w-5", iconColor)} />
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="secondary" className="ml-auto">{badgeText}</Badge>
      </div>
      
      <div className="grid grid-cols-5 gap-4">
        {yards.map((yard) => (
          <div key={yard.yard_id} className={cn("rounded-lg border-2 p-3", borderColor)}>
            <div className="mb-2 px-2 text-sm font-semibold">{yard.yard_name}</div>
            <div className="space-y-1">
              {yard.blocks.map((block) => renderBlock(block, yard.yard_type === "Sea-Side" ? "sea" : yard.yard_type === "Land-Side" ? "land" : "oog"))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Sea-Side Yards */}
      {renderYardSection(
        seaSideYards,
        "Sea-Side Yards",
        Ship,
        "text-blue-600",
        "border-blue-200",
        "SS1-SS5"
      )}

      {/* Land-Side Yards */}
      {renderYardSection(
        landSideYards,
        "Land-Side Yards",
        Truck,
        "text-green-600",
        "border-green-200",
        "LS1-LS4"
      )}

      {/* OOG Yard */}
      {renderYardSection(
        oogYards,
        "OOG (Out of Gauge) Yard",
        Package,
        "text-gray-600",
        "border-gray-200",
        "OOG"
      )}
    </div>
  );
}
