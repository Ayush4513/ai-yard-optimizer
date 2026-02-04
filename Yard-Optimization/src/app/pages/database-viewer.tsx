/**
 * Database Viewer - Admin Page
 *
 * Quick page to view all database contents directly in your React app
 * Add this to your router to access it
 */

import { useState, useEffect } from "react";
import { containerAPI, locationAPI, statsAPI } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Button } from "@/app/components/ui/button";
import { RefreshCw, Database, Package, MapPin, BarChart3 } from "lucide-react";

export function DatabaseViewer() {
  const [containers, setContainers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [containersData, locationsData, statsData] = await Promise.all([
        containerAPI.getAll(),
        locationAPI.getAll(),
        statsAPI.getYardStats(),
      ]);

      setContainers(containersData);
      setLocations(locationsData);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold">Database Viewer</h1>
              <p className="text-muted-foreground">
                View all data from your SQLite database
              </p>
            </div>
          </div>
          <Button onClick={loadAllData} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Containers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total_containers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Locations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total_locations}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Occupied
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.occupied_locations}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.occupancy_rate}% occupancy
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Available
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {stats.available_locations}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Data Tables */}
        <Tabs defaultValue="containers" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="containers" className="gap-2">
              <Package className="h-4 w-4" />
              Containers ({containers.length})
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-2">
              <MapPin className="h-4 w-4" />
              Locations ({locations.length})
            </TabsTrigger>
            <TabsTrigger value="json" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Raw JSON
            </TabsTrigger>
          </TabsList>

          {/* Containers Tab */}
          <TabsContent value="containers" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>All Containers in Database</CardTitle>
                <CardDescription>
                  Live data from backend/yard_optimization.db
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="p-2 text-left font-medium">Container #</th>
                        <th className="p-2 text-left font-medium">Type</th>
                        <th className="p-2 text-left font-medium">Size</th>
                        <th className="p-2 text-left font-medium">Weight</th>
                        <th className="p-2 text-left font-medium">Status</th>
                        <th className="p-2 text-left font-medium">POD</th>
                        <th className="p-2 text-left font-medium">Shipping Line</th>
                        <th className="p-2 text-left font-medium">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {containers.map((container, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-mono text-xs">
                            {container.container_number}
                          </td>
                          <td className="p-2">
                            <span
                              className={`rounded px-2 py-1 text-xs ${
                                container.container_type === "Reefer"
                                  ? "bg-blue-100 text-blue-700"
                                  : container.container_type === "Hazardous"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {container.container_type}
                            </span>
                          </td>
                          <td className="p-2">{container.size_teu} TEU</td>
                          <td className="p-2">
                            {container.weight_mt}t
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({container.weight_class})
                            </span>
                          </td>
                          <td className="p-2">
                            <span
                              className={`rounded px-2 py-1 text-xs ${
                                container.customs_status === "Cleared"
                                  ? "bg-green-100 text-green-700"
                                  : container.customs_status === "Hold"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {container.customs_status}
                            </span>
                          </td>
                          <td className="p-2">{container.pod || "-"}</td>
                          <td className="p-2">{container.shipping_line || "-"}</td>
                          <td className="p-2 font-mono text-xs">
                            {container.current_location_id || (
                              <span className="text-muted-foreground">Unassigned</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>All Yard Locations</CardTitle>
                <CardDescription>
                  {locations.filter((l) => l.occupied).length} occupied,{" "}
                  {locations.filter((l) => !l.occupied).length} available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="p-2 text-left font-medium">Location ID</th>
                        <th className="p-2 text-left font-medium">Yard</th>
                        <th className="p-2 text-left font-medium">Block</th>
                        <th className="p-2 text-left font-medium">Position</th>
                        <th className="p-2 text-left font-medium">Status</th>
                        <th className="p-2 text-left font-medium">Container</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.slice(0, 50).map((location, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-mono text-xs">
                            {location.location_id}
                          </td>
                          <td className="p-2">{location.yard_name}</td>
                          <td className="p-2">{location.block_id}</td>
                          <td className="p-2 font-mono text-xs">
                            Bay {location.bay}, Row {location.row}, Tier {location.tier}
                          </td>
                          <td className="p-2">
                            <span
                              className={`rounded px-2 py-1 text-xs ${
                                location.occupied
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {location.occupied ? "Occupied" : "Available"}
                            </span>
                          </td>
                          <td className="p-2 font-mono text-xs">
                            {location.container_id || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {locations.length > 50 && (
                    <p className="mt-2 text-center text-sm text-muted-foreground">
                      Showing first 50 of {locations.length} locations
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Raw JSON Tab */}
          <TabsContent value="json" className="mt-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Containers JSON</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-96 overflow-auto rounded bg-gray-900 p-4 text-xs text-green-400">
                    {JSON.stringify(containers, null, 2)}
                  </pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Statistics JSON</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-96 overflow-auto rounded bg-gray-900 p-4 text-xs text-green-400">
                    {JSON.stringify(stats, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* API Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Backend Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>API URL:</strong>{" "}
              <a
                href="http://localhost:8000"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                http://localhost:8000
              </a>
            </p>
            <p>
              <strong>Swagger Docs:</strong>{" "}
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                http://localhost:8000/docs
              </a>
            </p>
            <p>
              <strong>Database File:</strong>{" "}
              <code className="rounded bg-gray-100 px-2 py-1">
                backend/yard_optimization.db
              </code>
            </p>
            <p>
              <strong>Database Type:</strong> SQLite
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
