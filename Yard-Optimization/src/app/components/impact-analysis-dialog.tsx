import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Separator } from "@/app/components/ui/separator";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Layers,
  BarChart3,
  Save
} from "lucide-react";
import { cn } from "@/app/components/ui/utils";

interface ImpactAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerID: string;
  selectedLocation: string;
  suggestedLocation: string;
  impactData: {
    rehandles: number;
    capacityUtilization: number;
    conflicts: string[];
    estimatedTime: number;
  };
  onSave: () => void;
}

export function ImpactAnalysisDialog({
  open,
  onOpenChange,
  containerID,
  selectedLocation,
  suggestedLocation,
  impactData,
  onSave,
}: ImpactAnalysisDialogProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    onSave();
    setIsSaving(false);
  };

  const isOptimalLocation = selectedLocation === suggestedLocation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Placement Impact Analysis</DialogTitle>
          <DialogDescription>
            Step 4/5: Review the impact of placing <span className="font-mono font-semibold">{containerID}</span> at {selectedLocation}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Location Comparison */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-green-200 bg-green-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-900">AI Recommended</span>
              </div>
              <div className="font-mono text-xl font-bold text-gray-900">{suggestedLocation}</div>
            </Card>

            <Card className={cn(
              "p-4",
              isOptimalLocation 
                ? "border-green-200 bg-green-50" 
                : "border-blue-200 bg-blue-50"
            )}>
              <div className="mb-2 flex items-center gap-2">
                {isOptimalLocation ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-900">Selected Location</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">Selected Location</span>
                  </>
                )}
              </div>
              <div className="font-mono text-xl font-bold text-gray-900">{selectedLocation}</div>
              {isOptimalLocation && (
                <p className="mt-1 text-xs text-green-700">✓ Matches AI recommendation</p>
              )}
            </Card>
          </div>

          {/* Impact Metrics */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <BarChart3 className="h-4 w-4" />
              Operational Impact Metrics
            </h3>
            
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {/* Re-handles */}
              <Card className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-gray-600">Re-handles</div>
                    <div className="mt-1 text-2xl font-bold">{impactData.rehandles}</div>
                  </div>
                  {impactData.rehandles === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : impactData.rehandles <= 2 ? (
                    <TrendingUp className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div className="mt-2">
                  {impactData.rehandles === 0 ? (
                    <Badge className="bg-green-100 text-green-800 text-xs">Optimal</Badge>
                  ) : impactData.rehandles <= 2 ? (
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">Acceptable</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800 text-xs">High</Badge>
                  )}
                </div>
              </Card>

              {/* Capacity */}
              <Card className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-gray-600">Block Capacity</div>
                    <div className="mt-1 text-2xl font-bold">{impactData.capacityUtilization}%</div>
                  </div>
                  {impactData.capacityUtilization < 80 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div 
                    className={cn(
                      "h-full transition-all",
                      impactData.capacityUtilization < 80 ? "bg-green-600" : "bg-yellow-600"
                    )}
                    style={{ width: `${impactData.capacityUtilization}%` }}
                  />
                </div>
              </Card>

              {/* Time */}
              <Card className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-gray-600">Est. Time</div>
                    <div className="mt-1 text-2xl font-bold">{impactData.estimatedTime}</div>
                    <div className="text-xs text-gray-500">minutes</div>
                  </div>
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
              </Card>

              {/* Conflicts */}
              <Card className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-gray-600">Conflicts</div>
                    <div className="mt-1 text-2xl font-bold">{impactData.conflicts.length}</div>
                  </div>
                  {impactData.conflicts.length === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  )}
                </div>
                <div className="mt-2">
                  {impactData.conflicts.length === 0 ? (
                    <Badge className="bg-green-100 text-green-800 text-xs">Clear</Badge>
                  ) : (
                    <Badge className="bg-orange-100 text-orange-800 text-xs">Review</Badge>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Conflicts & Warnings */}
          {impactData.conflicts.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-orange-900">
                <AlertCircle className="h-4 w-4" />
                Warnings & Conflicts
              </h3>
              <Card className="border-orange-200 bg-orange-50 p-4">
                <ul className="space-y-2">
                  {impactData.conflicts.map((conflict, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-orange-900">
                      <span className="mt-0.5">⚠️</span>
                      <span>{conflict}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}

          {/* Optimization Insights */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Layers className="h-4 w-4" />
              AI Optimization Insights
            </h3>
            <Card className="border-blue-200 bg-blue-50 p-4">
              <ul className="space-y-2 text-sm text-blue-900">
                {isOptimalLocation ? (
                  <>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                      <span>Using AI-recommended location - optimal placement achieved</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                      <span>Minimizes future re-handling operations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                      <span>Balances block capacity across the yard</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                      <span>Alternative location selected - may require additional re-handles</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                      <span>Consider AI recommendation at {suggestedLocation} for optimal efficiency</span>
                    </li>
                  </>
                )}
              </ul>
            </Card>
          </div>

          <Separator />

          {/* Summary */}
          <div className={cn(
            "rounded-lg p-4",
            isOptimalLocation ? "bg-green-50 border border-green-200" : "bg-blue-50 border border-blue-200"
          )}>
            <div className="flex items-start gap-3">
              {isOptimalLocation ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              )}
              <div>
                <div className="font-semibold text-sm mb-1">
                  {isOptimalLocation ? "Optimal Placement" : "Manual Override"}
                </div>
                <div className="text-xs text-gray-700">
                  {isOptimalLocation 
                    ? "This placement follows AI recommendations and minimizes operational impact."
                    : "You've selected a different location than recommended. The system has calculated the impact of this decision."}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            ← Back to Location Selection
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-green-600 hover:bg-green-700"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Confirm & Save Container
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
