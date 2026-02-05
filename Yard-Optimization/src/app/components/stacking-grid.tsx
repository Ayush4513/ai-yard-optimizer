import { AlertTriangle, Package, Snowflake, Box } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { ContainerSlot, ContainerInfo, getTopDownView } from "@/app/utils/container-stacking-data";

interface MiniStackingGridProps {
  slots: ContainerSlot[];
}

// Mini preview grid showing top-down view of container placement (for block cards)
export function MiniStackingGrid({ slots }: MiniStackingGridProps) {
  const topDownView = getTopDownView(slots);

  return (
    <div className="mt-2 flex gap-[1px] justify-center">
      {topDownView.map((bayRow, bayIndex) => (
        <div key={bayIndex} className="flex flex-col gap-[1px]">
          {bayRow.map((slot, rowIndex) => {
            const hasContainer = !!slot.container;
            const containerType = slot.container?.type || "empty";
            const isHazmat = slot.container?.hazmat || false;

            return (
              <div
                key={`${bayIndex}-${rowIndex}`}
                className={cn(
                  "h-2 w-2 rounded-[1px]",
                  hasContainer
                    ? containerType === "export"
                      ? "bg-blue-500"
                      : containerType === "import"
                      ? "bg-green-500"
                      : containerType === "reefer"
                      ? "bg-cyan-500"
                      : "bg-gray-400"
                    : "bg-gray-200",
                  isHazmat && "ring-1 ring-red-500"
                )}
                title={hasContainer ? slot.container?.id : "Empty slot"}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface DetailedStackingViewProps {
  blockId: string;
  slots: ContainerSlot[];
}

// Detailed 3D-style stacking view showing all tiers (for details panel)
export function DetailedStackingView({ blockId, slots }: DetailedStackingViewProps) {
  const topDownView = getTopDownView(slots);

  // Count containers by tier
  const tierCounts = [0, 0, 0, 0, 0];
  slots.forEach((slot) => {
    if (slot.container && slot.tier >= 1 && slot.tier <= 5) {
      tierCounts[slot.tier - 1]++;
    }
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Top-Down View</h3>
          <span className="text-xs text-gray-500">3 Bays × 5 Rows</span>
        </div>
        
        {/* Bay labels */}
        <div className="mb-1 flex gap-[2px] pl-6">
          {[1, 2, 3].map((bay) => (
            <div key={bay} className="w-6 text-center text-[9px] font-semibold text-gray-500">
              B{bay}
            </div>
          ))}
        </div>

        {/* Grid with row labels */}
        <div className="flex gap-2">
          {/* Row labels */}
          <div className="flex flex-col gap-[2px] justify-center">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="h-6 flex items-center text-[9px] font-semibold text-gray-500">
                R{row}
              </div>
            ))}
          </div>

          {/* Container grid */}
          <div className="flex gap-[2px]">
            {topDownView.map((bayRow, bayIndex) => (
              <div key={bayIndex} className="flex flex-col gap-[2px]">
                {bayRow.map((slot, rowIndex) => {
                  const hasContainer = !!slot.container;
                  const containerType = slot.container?.type || "empty";
                  const isHazmat = slot.container?.hazmat || false;
                  const tier = slot.tier;

                  return (
                    <div
                      key={`${bayIndex}-${rowIndex}`}
                      className={cn(
                        "group relative h-6 w-6 rounded border-2 transition-all hover:scale-110 hover:z-10",
                        hasContainer
                          ? containerType === "export"
                            ? "border-blue-500 bg-blue-100 hover:bg-blue-200"
                            : containerType === "import"
                            ? "border-green-500 bg-green-100 hover:bg-green-200"
                            : containerType === "reefer"
                            ? "border-cyan-500 bg-cyan-100 hover:bg-cyan-200"
                            : "border-gray-400 bg-gray-100 hover:bg-gray-200"
                          : "border-gray-300 bg-white",
                        isHazmat && "ring-2 ring-red-500 ring-offset-1"
                      )}
                      title={
                        hasContainer
                          ? `${slot.container?.id}\nTier: ${tier}\nType: ${containerType}\n${isHazmat ? "⚠️ Hazmat" : ""}`
                          : `Empty\nBay: ${bayIndex + 1}, Row: ${rowIndex + 1}`
                      }
                    >
                      {hasContainer && (
                        <div className="flex h-full w-full items-center justify-center">
                          {isHazmat ? (
                            <AlertTriangle className="h-3 w-3 text-red-600" />
                          ) : containerType === "reefer" ? (
                            <Snowflake className="h-3 w-3 text-cyan-600" />
                          ) : (
                            <Box className="h-3 w-3 opacity-50" />
                          )}
                        </div>
                      )}
                      
                      {/* Tier indicator */}
                      {hasContainer && (
                        <div className="absolute bottom-0 right-0 text-[7px] font-bold leading-none bg-white/80 px-0.5 rounded-tl">
                          T{tier}
                        </div>
                      )}

                      {/* Hover tooltip */}
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[9px] text-white opacity-0 transition-opacity group-hover:block group-hover:opacity-100">
                        {hasContainer ? (
                          <>
                            <div className="font-semibold">{slot.container?.id}</div>
                            <div>Tier {tier} | {containerType}</div>
                            {isHazmat && <div className="text-red-400">⚠️ Hazmat</div>}
                          </>
                        ) : (
                          <>Empty Slot</>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tier Statistics */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold">Vertical Distribution</h3>
        <div className="space-y-2">
          {tierCounts.map((count, index) => {
            const tierNumber = index + 1;
            const percentage = Math.round((count / (3 * 5)) * 100);
            
            return (
              <div key={tierNumber} className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600 w-12">Tier {tierNumber}</span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      tierNumber === 5 ? "bg-red-500" :
                      tierNumber === 4 ? "bg-orange-500" :
                      tierNumber === 3 ? "bg-yellow-500" :
                      tierNumber === 2 ? "bg-blue-500" :
                      "bg-green-500"
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-12 text-right">
                  {count}/{3 * 5}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex flex-wrap gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded border-2 border-blue-500 bg-blue-100"></div>
            <span>Export</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded border-2 border-green-500 bg-green-100"></div>
            <span>Import</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded border-2 border-cyan-500 bg-cyan-100"></div>
            <span>Reefer</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded border-2 border-gray-400 bg-gray-100"></div>
            <span>Empty</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-red-600" />
            <span>Hazmat</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Get container type icon
export function getContainerIcon(type: string) {
  switch (type) {
    case "reefer":
      return Snowflake;
    case "export":
    case "import":
    case "empty":
    default:
      return Package;
  }
}