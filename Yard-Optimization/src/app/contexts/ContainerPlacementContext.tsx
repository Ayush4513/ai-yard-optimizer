import React, { createContext, useContext, useState, ReactNode } from "react";

interface ContainerData {
  containerID: string;
  containerType: "import" | "export" | "empty";
  size: "20ft" | "40ft";
  weight: string;
  consignee: string;
  vessel: string;
  voyage: string;
  isHazmat: boolean;
  isReefer: boolean;
  cargoDescription: string;
  priority: "high" | "normal";
}

interface LocationSuggestion {
  yard: string;
  block: string;
  fullLocation: string;
  confidence: number;
  reason: string;
  alternativeReason?: string;
}

interface ContainerPlacementData {
  container: ContainerData;
  suggestion: LocationSuggestion;
  selectedLocation?: string;
  impactAnalysis?: ImpactAnalysis;
}

interface ImpactAnalysis {
  rehandles: number;
  capacityUtilization: number;
  conflicts: string[];
  estimatedTime: number;
}

interface ContainerPlacementContextType {
  placementData: ContainerPlacementData | null;
  setPlacementData: (data: ContainerPlacementData | null) => void;
  setSelectedLocation: (location: string) => void;
  setImpactAnalysis: (impact: ImpactAnalysis) => void;
  clearPlacementData: () => void;
}

const ContainerPlacementContext = createContext<ContainerPlacementContextType | undefined>(undefined);

export function ContainerPlacementProvider({ children }: { children: ReactNode }) {
  const [placementData, setPlacementData] = useState<ContainerPlacementData | null>(null);

  const clearPlacementData = () => {
    setPlacementData(null);
  };

  const setSelectedLocation = (location: string) => {
    if (placementData) {
      setPlacementData({
        ...placementData,
        selectedLocation: location
      });
    }
  };

  const setImpactAnalysis = (impact: ImpactAnalysis) => {
    if (placementData) {
      setPlacementData({
        ...placementData,
        impactAnalysis: impact
      });
    }
  };

  return (
    <ContainerPlacementContext.Provider value={{ placementData, setPlacementData, setSelectedLocation, setImpactAnalysis, clearPlacementData }}>
      {children}
    </ContainerPlacementContext.Provider>
  );
}

export function useContainerPlacement() {
  const context = useContext(ContainerPlacementContext);
  if (context === undefined) {
    throw new Error("useContainerPlacement must be used within a ContainerPlacementProvider");
  }
  return context;
}