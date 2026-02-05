import { useState } from "react";
import { Container as ContainerIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { ContainerEntryForm } from "@/app/components/container-entry-form";
import { LocationSelectionStep } from "@/app/components/location-selection-step";
import type { Container } from "@/app/types/yard-optimization";

type WorkflowStep = "entry" | "mapping" | "confirmation";

interface ContainerStackingWorkflowProps {
  onClose: () => void;
}

export function ContainerStackingWorkflow({ onClose }: ContainerStackingWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("entry");
  const [currentContainer, setCurrentContainer] = useState<Container | null>(null);

  const handleContainerSubmit = (container: Container) => {
    setCurrentContainer(container);
    setCurrentStep("mapping");
  };

  const handleBackToEntry = () => {
    setCurrentStep("entry");
    setCurrentContainer(null);
  };

  const handleLocationConfirm = () => {
    // Assignment complete - close workflow
    onClose();
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 border-b bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Left: Title */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Containers
            </Button>
            <div className="h-8 w-px bg-gray-300" />
            <ContainerIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">
                Yard Container Stacking Optimization
              </h1>
              <p className="text-sm text-muted-foreground">
                Module 1: Container Management
              </p>
            </div>
          </div>

          {/* Right: Step Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                currentStep === "entry"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              1. Container Entry
            </div>
            <div className="h-0.5 w-8 bg-gray-300" />
            <div
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                currentStep === "mapping"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              2. Location Selection
            </div>
            <div className="h-0.5 w-8 bg-gray-300" />
            <div
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                currentStep === "confirmation"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              3. Confirmation
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-6">
        {currentStep === "entry" && (
          <ContainerEntryForm
            onSubmit={handleContainerSubmit}
            onCancel={onClose}
          />
        )}

        {currentStep === "mapping" && currentContainer && (
          <LocationSelectionStep
            container={currentContainer}
            onBack={handleBackToEntry}
            onConfirm={handleLocationConfirm}
          />
        )}
      </div>
    </div>
  );
}
