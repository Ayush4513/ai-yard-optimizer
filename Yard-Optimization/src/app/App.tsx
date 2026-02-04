import { RouterProvider } from "react-router";
import { router } from "@/app/routes";
import { LocationProvider } from "@/app/contexts/LocationContext";
import { ContainerPlacementProvider } from "@/app/contexts/ContainerPlacementContext";

export default function App() {
  return (
    <LocationProvider>
      <ContainerPlacementProvider>
        <RouterProvider router={router} />
      </ContainerPlacementProvider>
    </LocationProvider>
  );
}