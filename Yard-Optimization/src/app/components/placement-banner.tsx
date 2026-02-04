import { Sparkles, MapPin, X, AlertCircle, TrendingUp } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { cn } from "@/app/components/ui/utils";

interface PlacementBannerProps {
  containerID: string;
  suggestion: {
    fullLocation: string;
    confidence: number;
    reason: string;
    alternativeReason?: string;
  };
  selectedLocation?: string;
  onCancel: () => void;
  onViewImpact: () => void;
}

export function PlacementBanner({
  containerID,
  suggestion,
  selectedLocation,
  onCancel,
  onViewImpact,
}: PlacementBannerProps) {
  return (
    <div className="mb-4 rounded-lg border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Container Placement: <span className="font-mono">{containerID}</span>
                </h3>
                <p className="text-sm text-gray-600">
                  Step 3/5: Select yard location
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* AI Recommendation Card */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-green-300 bg-green-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-900">AI Recommendation</span>
                </div>
                <Badge className="bg-green-600 text-white">{suggestion.confidence}% Confidence</Badge>
              </div>
              
              <div className="mb-3 flex items-center gap-3">
                <MapPin className="h-6 w-6 text-green-600" />
                <div className="font-mono text-2xl font-bold text-gray-900">{suggestion.fullLocation}</div>
              </div>
              
              <div className="space-y-1.5">
                <p className="text-xs text-green-800">✓ {suggestion.reason}</p>
                {suggestion.alternativeReason && (
                  <p className="text-xs text-green-800">✓ {suggestion.alternativeReason}</p>
                )}
              </div>
            </div>

            {/* Current Selection */}
            <div className={cn(
              "rounded-lg border p-4",
              selectedLocation
                ? "border-blue-300 bg-blue-50"
                : "border-gray-300 bg-gray-50"
            )}>
              <div className="mb-2 flex items-center gap-2">
                <MapPin className={cn(
                  "h-4 w-4",
                  selectedLocation ? "text-blue-600" : "text-gray-400"
                )} />
                <span className="text-sm font-semibold text-gray-900">Selected Location</span>
              </div>
              
              {selectedLocation ? (
                <div>
                  <div className="mb-2 font-mono text-2xl font-bold text-gray-900">{selectedLocation}</div>
                  {selectedLocation === suggestion.fullLocation ? (
                    <p className="text-xs text-blue-800">✓ Using AI-recommended location</p>
                  ) : (
                    <p className="text-xs text-orange-800">⚠ Different from AI recommendation</p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="mb-2 text-sm text-gray-600">No location selected</p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Click on any block below to select</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {selectedLocation && (
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={onCancel}>
                Cancel Placement
              </Button>
              <Button onClick={onViewImpact} className="bg-blue-600 hover:bg-blue-700">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Impact & Continue →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
