import { createBrowserRouter } from "react-router";
import { DashboardPage } from "@/app/pages/dashboard-page";
import { YardViewPage } from "@/app/pages/yard-view-page";
import { ContainersPage } from "@/app/pages/containers-page";
import { RecommendationsPage } from "@/app/pages/recommendations-page";
import { TimelinePage } from "@/app/pages/timeline-page";
import { SimulatorPage } from "@/app/pages/simulator-page";
import { ConfigurationPage } from "@/app/pages/configuration-page";
import { RootLayout } from "@/app/layouts/root-layout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      {
        index: true,
        Component: DashboardPage,
      },
      {
        path: "yard",
        Component: YardViewPage,
      },
      {
        path: "containers",
        Component: ContainersPage,
      },
      {
        path: "recommendations",
        Component: RecommendationsPage,
      },
      {
        path: "timeline",
        Component: TimelinePage,
      },
      {
        path: "simulator",
        Component: SimulatorPage,
      },
      {
        path: "configuration",
        Component: ConfigurationPage,
      },
    ],
  },
]);
