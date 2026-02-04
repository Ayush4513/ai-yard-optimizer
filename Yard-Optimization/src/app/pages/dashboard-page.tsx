import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Container,
  Clock,
  Shuffle,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Ship,
  Truck,
  Package,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Progress } from "@/app/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useLocationContext } from "@/app/contexts/LocationContext";
import { getLocationData, isCFS, isTICT } from "@/app/utils/location-data";

// Mock data for charts
const throughputData = [
  { time: "00:00", import: 12, export: 18, empty: 5 },
  { time: "04:00", import: 15, export: 22, empty: 8 },
  { time: "08:00", import: 28, export: 35, empty: 12 },
  { time: "12:00", import: 32, export: 42, empty: 15 },
  { time: "16:00", import: 25, export: 38, empty: 10 },
  { time: "20:00", import: 18, export: 28, empty: 7 },
];

const rehandlingData = [
  { day: "Mon", planned: 45, actual: 28, saved: 17 },
  { day: "Tue", planned: 52, actual: 31, saved: 21 },
  { day: "Wed", planned: 48, actual: 25, saved: 23 },
  { day: "Thu", planned: 55, actual: 33, saved: 22 },
  { day: "Fri", planned: 50, actual: 29, saved: 21 },
  { day: "Sat", planned: 42, actual: 24, saved: 18 },
  { day: "Sun", planned: 38, actual: 22, saved: 16 },
];

export function DashboardPage() {
  const { selectedLocation } = useLocationContext();
  const locData = getLocationData(selectedLocation);
  const isCFSLocation = isCFS(selectedLocation);
  const isTICTLocation = isTICT(selectedLocation);

  return (
    <div className="p-6 space-y-6">
      {/* Critical Alerts */}
      <div className="space-y-3">
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900">High Congestion Warning</AlertTitle>
          <AlertDescription className="text-orange-700">
            Block C-14 approaching 95% capacity. 3 vessel cutoffs in next 4 hours.
            <Button variant="link" className="ml-2 h-auto p-0 text-orange-700 underline">
              View recommendations →
            </Button>
          </AlertDescription>
        </Alert>

        <Alert className="border-blue-200 bg-blue-50">
          <Activity className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">AI Optimization Active</AlertTitle>
          <AlertDescription className="text-blue-700">
            12 placement recommendations available for incoming containers. Estimated 18% re-handling reduction.
          </AlertDescription>
        </Alert>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Yard Occupancy */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yard Occupancy</CardTitle>
            <Container className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locData.totalContainers.toLocaleString()}</div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>Total Containers</span>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                {locData.utilizationRate}%
              </Badge>
            </div>
            <Progress value={locData.utilizationRate} className="mt-3 h-2" />
            <p className="mt-2 text-xs text-gray-600">
              <span className="inline-flex items-center text-gray-600">
                {isCFSLocation ? "CFS Operation" : "Port Terminal"}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Avg Dwell Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Throughput</CardTitle>
            <Clock className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locData.avgTeusPerDay} TEU</div>
            <div className="text-xs text-gray-600">{locData.avgTrucksPerDay} trucks/day</div>
            <p className="mt-3 text-xs">
              <span className="inline-flex items-center text-gray-600">
                Avg daily volume
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Re-handling Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Container Stats</CardTitle>
            <Shuffle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locData.inbound}</div>
            <div className="text-xs text-gray-600">Inbound | {locData.outbound} Outbound</div>
            <p className="mt-3 text-xs">
              <span className="inline-flex items-center text-red-600">
                <AlertCircle className="mr-1 h-3 w-3" />
                {locData.overstay} overstay
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Throughput Today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empty Containers</CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locData.empty}</div>
            <div className="text-xs text-gray-600">Available for allocation</div>
            <p className="mt-3 text-xs">
              <span className="inline-flex items-center text-green-600">
                <ArrowUpRight className="mr-1 h-3 w-3" />
                Ready for pickup
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Throughput Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Container Throughput (24h)</CardTitle>
            <CardDescription>Hourly container movements by type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={throughputData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="export" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Export" />
                <Area type="monotone" dataKey="import" stackId="1" stroke="#10b981" fill="#10b981" name="Import" />
                <Area type="monotone" dataKey="empty" stackId="1" stroke="#6b7280" fill="#6b7280" name="Empty" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Re-handling Reduction */}
        <Card>
          <CardHeader>
            <CardTitle>AI Re-handling Reduction</CardTitle>
            <CardDescription>Planned vs actual moves (weekly)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rehandlingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="planned" fill="#ef4444" name="Without AI" />
                <Bar dataKey="actual" fill="#10b981" name="With AI" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Operational Overview */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Upcoming Cutoffs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Vessel Cutoffs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { vessel: "MSC MIRNA", voyage: "FE423W", cutoff: "2h 15m", containers: 42, status: "warning" },
              { vessel: "MAERSK LIMA", voyage: "433N", cutoff: "4h 30m", containers: 38, status: "ok" },
              { vessel: "CMA CGM NEVA", voyage: "0FRFD1MA1", cutoff: "6h 45m", containers: 51, status: "ok" },
            ].map((vessel, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-3">
                  <Ship className={`h-8 w-8 ${vessel.status === "warning" ? "text-orange-600" : "text-blue-600"}`} />
                  <div>
                    <div className="font-medium text-sm">{vessel.vessel}</div>
                    <div className="text-xs text-gray-600">{vessel.voyage}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${vessel.status === "warning" ? "text-orange-600" : "text-gray-900"}`}>
                    {vessel.cutoff}
                  </div>
                  <div className="text-xs text-gray-600">{vessel.containers} containers</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Gate Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gate Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Trucks in Queue</span>
                <span className="font-semibold">17</span>
              </div>
              <Progress value={42} className="h-2" />
              <p className="text-xs text-gray-600">Avg wait: 12 mins</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Processing Rate</span>
                <span className="font-semibold">23/hour</span>
              </div>
              <Progress value={76} className="h-2 bg-gray-200 [&>div]:bg-green-600" />
              <p className="text-xs text-gray-600">Target: 25/hour</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-200 p-3 text-center">
                <Truck className="mx-auto h-5 w-5 text-blue-600 mb-1" />
                <div className="text-xl font-bold">142</div>
                <div className="text-xs text-gray-600">Today's trucks</div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3 text-center">
                <Package className="mx-auto h-5 w-5 text-green-600 mb-1" />
                <div className="text-xl font-bold">89</div>
                <div className="text-xs text-gray-600">Deliveries</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Congestion Hotspots */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Congestion Hotspots</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { block: "C-14", occupancy: 95, type: "Export", severity: "high" },
              { block: "B-08", occupancy: 88, type: "Import", severity: "medium" },
              { block: "A-22", occupancy: 82, type: "Mixed", severity: "medium" },
              { block: "D-05", occupancy: 76, type: "Empty", severity: "low" },
            ].map((block, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <div className="font-medium text-sm">{block.block}</div>
                  <div className="text-xs text-gray-600">{block.type}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-semibold">{block.occupancy}%</div>
                    <Progress value={block.occupancy} className="mt-1 h-1 w-16" />
                  </div>
                  {block.severity === "high" && <XCircle className="h-5 w-5 text-red-600" />}
                  {block.severity === "medium" && <AlertCircle className="h-5 w-5 text-orange-600" />}
                  {block.severity === "low" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Container Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Container Breakdown by Status</CardTitle>
          <CardDescription>Real-time inventory across all yard zones</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="export" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="export">Export</TabsTrigger>
              <TabsTrigger value="import">Import</TabsTrigger>
              <TabsTrigger value="empty">Empty</TabsTrigger>
            </TabsList>
            <TabsContent value="export" className="mt-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-600">Awaiting Stuffing</div>
                  <div className="mt-2 text-2xl font-bold">156</div>
                  <Badge className="mt-2" variant="secondary">
                    Warehouse
                  </Badge>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-600">In Yard</div>
                  <div className="mt-2 text-2xl font-bold">842</div>
                  <Badge className="mt-2" variant="secondary">
                    Stacked
                  </Badge>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-600">Load Ready</div>
                  <div className="mt-2 text-2xl font-bold">234</div>
                  <Badge className="mt-2 bg-green-100 text-green-700">
                    Ready
                  </Badge>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-600">In Transit</div>
                  <div className="mt-2 text-2xl font-bold">67</div>
                  <Badge className="mt-2 bg-blue-100 text-blue-700">
                    Moving
                  </Badge>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="import" className="mt-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-600">Arrived</div>
                  <div className="mt-2 text-2xl font-bold">423</div>
                  <Badge className="mt-2" variant="secondary">
                    In Yard
                  </Badge>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-600">Customs Pending</div>
                  <div className="mt-2 text-2xl font-bold">267</div>
                  <Badge className="mt-2 bg-orange-100 text-orange-700">
                    Held
                  </Badge>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-600">Cleared</div>
                  <div className="mt-2 text-2xl font-bold">189</div>
                  <Badge className="mt-2 bg-green-100 text-green-700">
                    Ready
                  </Badge>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-600">Exam Selected</div>
                  <div className="mt-2 text-2xl font-bold">34</div>
                  <Badge className="mt-2 bg-red-100 text-red-700">
                    Inspection
                  </Badge>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="empty" className="mt-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-600">Available</div>
                  <div className="mt-2 text-2xl font-bold">312</div>
                  <Badge className="mt-2 bg-green-100 text-green-700">
                    Ready
                  </Badge>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-600">Awaiting Pickup</div>
                  <div className="mt-2 text-2xl font-bold">178</div>
                  <Badge className="mt-2" variant="secondary">
                    Allocated
                  </Badge>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-600">Damaged</div>
                  <div className="mt-2 text-2xl font-bold">23</div>
                  <Badge className="mt-2 bg-red-100 text-red-700">
                    M&R
                  </Badge>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-600">Off-Hire</div>
                  <div className="mt-2 text-2xl font-bold">45</div>
                  <Badge className="mt-2" variant="secondary">
                    Pending
                  </Badge>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}