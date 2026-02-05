import { ReactNode } from "react";
import { useAIAssistant } from "@/app/contexts/AIAssistantContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { HelpCircle, Sparkles } from "lucide-react";

type InspectModeTooltipProps = {
  children: ReactNode;
  fieldName: string;
  description: string;
  example?: string;
  required?: boolean;
  validation?: string;
};

/**
 * Wraps form fields with AI-powered tooltips when inspect mode is active
 */
export function InspectModeTooltip({
  children,
  fieldName,
  description,
  example,
  required = false,
  validation,
}: InspectModeTooltipProps) {
  const { isInspectMode } = useAIAssistant();

  if (!isInspectMode) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className="relative">
            {children}
            <div className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg">
              <Sparkles className="h-3 w-3" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="max-w-xs bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-purple-600" />
              <h4 className="font-semibold text-purple-900">{fieldName}</h4>
              {required && (
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                  Required
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700">{description}</p>
            {example && (
              <div className="rounded-lg bg-white/60 p-2 text-xs">
                <span className="font-medium text-gray-600">Example: </span>
                <span className="text-gray-800">{example}</span>
              </div>
            )}
            {validation && (
              <div className="text-xs text-gray-600">
                <span className="font-medium">Validation: </span>
                {validation}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Example usage in a form:
 *
 * <InspectModeTooltip
 *   fieldName="Container Number"
 *   description="Unique identifier for the shipping container"
 *   example="MSCU1234567"
 *   required={true}
 *   validation="11 characters: 4 letters + 7 digits"
 * >
 *   <Input name="container_number" placeholder="Enter container number" />
 * </InspectModeTooltip>
 */
