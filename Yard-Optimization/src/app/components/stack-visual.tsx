import { AlertTriangle, Snowflake } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { ContainerSlot, getSlotAt } from "@/app/utils/container-stacking-data";

interface StackVisualProps {
  slots: ContainerSlot[];
  compact?: boolean;
}

// Side-view visualization of container stacks (shows vertical stacking)
// 3 bays × 5 tiers configuration
export function StackVisual({ slots, compact = false }: StackVisualProps) {
  const bays = 3;
  const maxTiers = 5;
  const displayRow = 3; // Show middle row for visual simplicity

  return (
    <div className={cn("flex gap-1 justify-center", compact ? "mt-2" : "mt-3")}>
      {Array.from({ length: bays }, (_, bayIndex) => {
        const bay = bayIndex + 1;
        
        // Get all containers in this bay at the display row, sorted by tier (bottom to top)
        const stackContainers = Array.from({ length: maxTiers }, (_, tierIndex) => {
          const tier = tierIndex + 1;
          return getSlotAt(slots, displayRow, bay, tier);
        }).filter(Boolean) as ContainerSlot[];

        return (
          <div key={bayIndex} className="flex flex-col-reverse gap-[2px]">
            {Array.from({ length: maxTiers }, (_, tierIndex) => {
              const tier = tierIndex + 1;
              const slot = getSlotAt(slots, displayRow, bay, tier);
              const hasContainer = !!slot?.container;
              const containerType = slot?.container?.type || "empty";
              const isHazmat = slot?.container?.hazmat || false;

              return (
                <div
                  key={tierIndex}
                  className={cn(
                    "relative rounded-sm border transition-all",
                    compact ? "h-3 w-10" : "h-4 w-16",
                    hasContainer
                      ? containerType === "export"
                        ? "border-blue-600 bg-blue-500"
                        : containerType === "import"
                        ? "border-green-600 bg-green-500"
                        : containerType === "reefer"
                        ? "border-cyan-600 bg-cyan-500"
                        : "border-gray-500 bg-gray-400"
                      : "border-gray-400 bg-gray-100 opacity-40",
                    isHazmat && "ring-1 ring-red-600"
                  )}
                  title={
                    hasContainer
                      ? `${slot.container?.id} - Bay ${bay} Tier ${tier}`
                      : `Empty - Bay ${bay} Tier ${tier}`
                  }
                >
                  {/* Hazmat indicator */}
                  {isHazmat && !compact && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-600" />
                    </div>
                  )}
                  
                  {/* Reefer indicator */}
                  {containerType === "reefer" && !compact && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Snowflake className="h-2.5 w-2.5 text-white opacity-70" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// Alternative: Show multiple rows in side view (more detailed)
interface DetailedStackVisualProps {
  slots: ContainerSlot[];
}

export function DetailedStackVisual({ slots }: DetailedStackVisualProps) {
  const bays = 3;
  const rows = 5;
  const maxTiers = 5;

  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, rowIndex) => {
        const row = rowIndex + 1;
        
        return (
          <div key={rowIndex}>
            <div className="mb-1 text-[8px] font-semibold text-gray-500">Row {row}</div>
            <div className="flex gap-[2px]">
              {Array.from({ length: bays }, (_, bayIndex) => {
                const bay = bayIndex + 1;
                
                // Get all containers in this bay-row combination, sorted by tier (bottom to top)
                return (
                  <div key={bayIndex} className="flex flex-col-reverse gap-[1px]">
                    {Array.from({ length: maxTiers }, (_, tierIndex) => {
                      const tier = tierIndex + 1;
                      const slot = getSlotAt(slots, row, bay, tier);
                      const hasContainer = !!slot?.container;
                      const containerType = slot?.container?.type || "empty";
                      const isHazmat = slot?.container?.hazmat || false;

                      return (
                        <div
                          key={tierIndex}
                          className={cn(
                            "relative h-2 w-3 rounded-[1px] border transition-all hover:scale-110",
                            hasContainer
                              ? containerType === "export"
                                ? "border-blue-600 bg-blue-500"
                                : containerType === "import"
                                ? "border-green-600 bg-green-500"
                                : containerType === "reefer"
                                ? "border-cyan-600 bg-cyan-500"
                                : "border-gray-500 bg-gray-400"
                              : "border-gray-400 bg-gray-100 opacity-20",
                            isHazmat && "ring-[0.5px] ring-red-600"
                          )}
                          title={
                            hasContainer
                              ? `${slot?.container?.id}\nBay ${bay}, Row ${row}, Tier ${tier}\n${isHazmat ? "⚠️ Hazmat" : ""}`
                              : `Empty\nBay ${bay}, Row ${row}, Tier ${tier}`
                          }
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      
      {/* Bay labels */}
      <div className="flex gap-[2px] pl-0">
        {Array.from({ length: bays }, (_, i) => (
          <div key={i} className="w-3 text-center text-[7px] text-gray-400">
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
