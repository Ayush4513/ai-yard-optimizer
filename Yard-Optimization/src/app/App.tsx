import { RouterProvider } from "react-router";
import { router } from "@/app/routes";
import { LocationProvider } from "@/app/contexts/LocationContext";
import { ContainerPlacementProvider } from "@/app/contexts/ContainerPlacementContext";
import { AIAssistantProvider } from "@/app/contexts/AIAssistantContext";

export default function App() {
  return (
    <LocationProvider>
      <ContainerPlacementProvider>
        <AIAssistantProvider>
          <RouterProvider router={router} />
        </AIAssistantProvider>
      </ContainerPlacementProvider>
    </LocationProvider>
  );
}