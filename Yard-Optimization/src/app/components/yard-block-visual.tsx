import { Block, Container, consigneeColors } from "@/app/utils/yard-data";
import { cn } from "@/app/components/ui/utils";
import { Snowflake, AlertTriangle } from "lucide-react";

interface YardBlockVisualProps {
  block: Block;
  yardId: string;
  onContainerClick?: (containerId: string) => void;
  onBlockClick?: (blockId: string) => void;
  selectedContainerId?: string;
  isPlacementMode?: boolean;
  isSelectedBlock?: boolean;
}

// Visualize a single block with a vertical stack of up to 5 containers
export function YardBlockVisual({ block, yardId, onContainerClick, onBlockClick, selectedContainerId, isPlacementMode, isSelectedBlock }: YardBlockVisualProps) {
  const maxHeight = 5;
  
  // Check if this is a special block (33 for reefer, 31 for hazmat)
  const blockNumber = block.id.split('-')[1];
  const isReeferBlock = blockNumber === '33';
  const isHazmatBlock = blockNumber === '31';
  
  // Determine background color
  let bgColor = 'bg-gray-800';
  if (isReeferBlock) {
    bgColor = 'bg-blue-100'; // Pale blue for reefer
  } else if (isHazmatBlock) {
    bgColor = 'bg-pink-100'; // Pale pink for hazmat
  }
  
  return (
    <div
      className={cn(
        "rounded-md border-2 border-gray-700 p-2",
        bgColor,
        isPlacementMode && isSelectedBlock ? 'border-yellow-400 ring-2 ring-yellow-400' : ''
      )}
      title={`Block ${block.id} - ${block.stack.length} containers`}
      onClick={() => onBlockClick?.(block.id)}
    >
      {/* Single vertical stack with max 5 slots */}
      <div className="flex flex-col-reverse gap-[1px]">
        {Array.from({ length: maxHeight }, (_, index) => {
          const container = block.stack[index];
          
          if (container) {
            return (
              <ContainerBox
                key={index}
                container={container}
                onClick={() => onContainerClick?.(container.id)}
                isSelected={selectedContainerId === container.id}
              />
            );
          } else {
            // Empty slot - adjust color based on block type
            const emptySlotBg = isReeferBlock ? 'bg-blue-50' : isHazmatBlock ? 'bg-pink-50' : 'bg-gray-700';
            const emptySlotBorder = isReeferBlock ? 'border-blue-300' : isHazmatBlock ? 'border-pink-300' : 'border-gray-600';
            
            return (
              <div
                key={index}
                className={cn(
                  "h-4 w-full rounded-[1px] border border-dashed",
                  emptySlotBg,
                  emptySlotBorder
                )}
              />
            );
          }
        })}
      </div>
      
      {/* Block label with optional symbol */}
      <div className="mt-1.5 flex items-center justify-center gap-1 text-center text-[9px] font-bold">
        {isReeferBlock && <Snowflake className="h-3 w-3 text-blue-600" />}
        {isHazmatBlock && <AlertTriangle className="h-3 w-3 text-pink-600" />}
        <span className={cn(
          isReeferBlock ? 'text-blue-900' : isHazmatBlock ? 'text-pink-900' : 'text-white'
        )}>
          {block.id}
        </span>
      </div>
    </div>
  );
}

interface ContainerBoxProps {
  container: Container;
  onClick?: () => void;
  isSelected?: boolean;
}

function ContainerBox({ container, onClick, isSelected }: ContainerBoxProps) {
  const color = consigneeColors[container.consignee] || "#9CA3AF";
  const is40ft = container.size === "40ft";
  
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "relative cursor-pointer rounded-[2px] border-2 transition-all hover:shadow-lg",
        is40ft ? "h-4 w-full" : "h-4 w-1/2",
        isSelected ? "border-yellow-400 ring-2 ring-yellow-400" : "border-gray-900"
      )}
      style={{ backgroundColor: color }}
      title={`${container.id}\n${container.consignee}\n${container.size} ${container.category}${container.hazmat ? "\n⚠️ Hazmat" : ""}`}
    >
      {/* Container ID */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden px-0.5">
        <span className="truncate text-[8px] font-bold text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
          {container.id}
        </span>
      </div>
      
      {/* Hazmat indicator */}
      {container.hazmat && (
        <div className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-red-600 ring-1 ring-red-800" />
      )}
    </div>
  );
}

// Detailed block view for the sidebar
interface DetailedBlockViewProps {
  block: Block;
}

export function DetailedBlockView({ block }: DetailedBlockViewProps) {
  const maxHeight = 5;
  
  return (
    <div className="space-y-3">
      {/* Visual representation */}
      <div className="rounded-lg border-2 border-gray-300 bg-gray-100 p-4">
        <div className="mb-3 text-xs font-semibold text-gray-600">Block Layout</div>
        <div className="flex justify-center">
          <div className="space-y-1">
            <div className="flex flex-col-reverse gap-1">
              {Array.from({ length: maxHeight }, (_, index) => {
                const container = block.stack[index];
                
                if (container) {
                  const color = consigneeColors[container.consignee] || "#9CA3AF";
                  const is40ft = container.size === "40ft";
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "relative rounded border-2 border-gray-800",
                        is40ft ? "h-8 w-20" : "h-8 w-10"
                      )}
                      style={{ backgroundColor: color }}
                      title={`${container.id}\n${container.consignee}\n${container.size} ${container.category}${container.hazmat ? "\n⚠️ Hazmat" : ""}`}
                    >
                      {/* Container info */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white opacity-80">
                          {container.size === "40ft" ? "40ft" : "20ft"}
                        </span>
                      </div>
                      
                      {/* Tier number */}
                      <div className="absolute left-0 top-0 bg-black bg-opacity-50 px-1 text-[8px] text-white">
                        T{index + 1}
                      </div>
                      
                      {/* Hazmat indicator */}
                      {container.hazmat && (
                        <div className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-600 ring-1 ring-red-800" />
                      )}
                    </div>
                  );
                } else {
                  // Empty slot
                  return (
                    <div
                      key={index}
                      className={cn(
                        "rounded border-2 border-dashed border-gray-400 bg-gray-50",
                        "h-8 w-20"
                      )}
                    >
                      <div className="flex h-full items-center justify-center text-[9px] text-gray-400">
                        Empty
                      </div>
                    </div>
                  );
                }
              })}
            </div>
            <div className="text-center text-[9px] text-gray-500">
              {block.stack.length} / 5 slots used
            </div>
          </div>
        </div>
      </div>

      {/* Stack summary */}
      {block.stack.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="mb-2 text-xs font-semibold">Stack Summary</div>
          <div className="space-y-1 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Containers</span>
              <span className="font-semibold">{block.stack.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Stack Type</span>
              <span className="font-semibold">
                {block.stack[0]?.size === "40ft" ? "40ft Stack" : "20ft Stack"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}