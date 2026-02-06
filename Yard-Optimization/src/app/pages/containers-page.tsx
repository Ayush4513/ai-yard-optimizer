import { useState, useEffect } from "react";
import { containerAPI } from "@/services/api";
import { toast } from "sonner";
import {
  Clock,
  MapPin,
  AlertCircle,
  Package,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Flame,
  Snowflake,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { cn } from "@/app/components/ui/utils";
import { ContainerStackingWorkflow } from "@/app/components/container-stacking-workflow";
import { ContainerDetailsModal } from "@/app/components/container-details-modal";

// Mock container data
const incomingContainers = [
  {
    id: "MSCU2847563",
    size: "40' HC",
    type: "Export",
    weight: "24,500 kg",
    vessel: "MSC MIRNA",
    voyage: "FE423W",
    eta: "2h 30m",
    status: "In Transit",
    priority: "High",
    hazard: false,
    reefer: false,
    origin: "Factory Gate Mumbai",
  },
  {
    id: "MAEU8734521",
    size: "20' STD",
    type: "Export",
    weight: "18,200 kg",
    vessel: "MAERSK LIMA",
    voyage: "433N",
    eta: "45m",
    status: "Gate Queue",
    priority: "Normal",
    hazard: false,
    reefer: false,
    origin: "CFS Warehouse",
  },
  {
    id: "CMAU5632478",
    size: "40' RF",
    type: "Export",
    weight: "22,800 kg",
    vessel: "CMA CGM NEVA",
    voyage: "0FRFD1MA1",
    eta: "1h 15m",
    status: "In Transit",
    priority: "High",
    hazard: false,
    reefer: true,
    origin: "Cold Storage",
  },
  {
    id: "HLCU9847562",
    size: "40' HC",
    type: "Export",
    weight: "26,100 kg",
    vessel: "MSC MIRNA",
    voyage: "FE423W",
    eta: "3h 20m",
    status: "Scheduled",
    priority: "Normal",
    hazard: true,
    reefer: false,
    origin: "Chemical Plant",
  },
];

const inYardContainers = [
  {
    id: "TCLU4563829",
    size: "40' HC",
    type: "Import",
    weight: "25,300 kg",
    vessel: "ONE TRUST",
    voyage: "0FL8CE1MA",
    location: "C-14-A-03",
    dwellDays: 4.2,
    status: "Customs Pending",
    priority: "Normal",
    hazard: false,
    reefer: false,
    lastMove: "2 days ago",
  },
  {
    id: "MSKU7834562",
    size: "20' STD",
    type: "Export",
    weight: "19,500 kg",
    vessel: "MSC MIRNA",
    voyage: "FE423W",
    location: "A-03-B-12",
    dwellDays: 1.8,
    status: "Load Ready",
    priority: "High",
    hazard: false,
    reefer: false,
    lastMove: "6 hours ago",
  },
  {
    id: "CGMU9234567",
    size: "40' RF",
    type: "Export",
    weight: "23,100 kg",
    vessel: "MAERSK LIMA",
    voyage: "433N",
    location: "R-01-C-05",
    dwellDays: 2.3,
    status: "In Yard",
    priority: "Normal",
    hazard: false,
    reefer: true,
    lastMove: "1 day ago",
  },
  {
    id: "TEMU5632894",
    size: "40' HC",
    type: "Import",
    weight: "27,200 kg",
    vessel: "EVERGREEN",
    voyage: "0FEBZ1MA1",
    location: "D-02-A-08",
    dwellDays: 6.7,
    status: "Exam Selected",
    priority: "High",
    hazard: true,
    reefer: false,
    lastMove: "3 days ago",
  },
  {
    id: "OOLU4523678",
    size: "20' STD",
    type: "Import",
    weight: "16,800 kg",
    vessel: "OOCL TOKYO",
    voyage: "043W",
    location: "C-02-D-15",
    dwellDays: 2.1,
    status: "Cleared",
    priority: "Normal",
    hazard: false,
    reefer: false,
    lastMove: "12 hours ago",
  },
];

const outgoingContainers = [
  {
    id: "MSKU2938475",
    size: "40' HC",
    type: "Export",
    weight: "24,900 kg",
    vessel: "MSC MIRNA",
    voyage: "FE423W",
    etd: "1h 45m",
    status: "Loading",
    priority: "High",
    hazard: false,
    reefer: false,
    destination: "Quay Crane 3",
  },
  {
    id: "HLCU8563920",
    size: "20' STD",
    type: "Import",
    weight: "18,600 kg",
    vessel: "ONE TRUST",
    voyage: "0FL8CE1MA",
    etd: "30m",
    status: "Gate Out Queue",
    priority: "Normal",
    hazard: false,
    reefer: false,
    destination: "Delivery - Truck",
  },
  {
    id: "CMAU7834521",
    size: "40' RF",
    type: "Export",
    weight: "22,400 kg",
    vessel: "MAERSK LIMA",
    voyage: "433N",
    etd: "2h 15m",
    status: "Staged",
    priority: "Normal",
    hazard: false,
    reefer: true,
    destination: "Quay Crane 1",
  },
];

export function ContainersPage() {
  const [containerIdFilter, setContainerIdFilter] = useState("");
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
  const [mainTab, setMainTab] = useState("incoming");
  const [incomingSubTab, setIncomingSubTab] = useState("all");
  const [yardSubTab, setYardSubTab] = useState("all");
  const [retrievalSubTab, setRetrievalSubTab] = useState("all");
  const [filterFlow, setFilterFlow] = useState("all");
  const [filterETA, setFilterETA] = useState("all");
  const [filterPlanStatus, setFilterPlanStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterSource, setFilterSource] = useState("all");

  // Container details modal state
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Real data from database
  const [allContainers, setAllContainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load containers from database
  useEffect(() => {
    loadContainers();
  }, []);

  const loadContainers = async () => {
    try {
      setLoading(true);
      // Load up to 10,000 containers to see real data
      const response = await containerAPI.getAll({ limit: 10000 });
      setAllContainers(response.data);
      console.log("✅ Loaded containers from database:", response.data.length, "of", response.pagination.total);
    } catch (error) {
      console.error("❌ Failed to load containers:", error);
      toast.error("Failed to load containers from database");
    } finally {
      setLoading(false);
    }
  };

  // Refresh after workflow closes
  const handleWorkflowClose = () => {
    setIsWorkflowOpen(false);
    loadContainers();
  };

  // Filter containers by status, type and container ID
  const filterContainers = (containers: any[], subTab: string) => {
    let filtered = containers;

    // Filter by container ID
    if (containerIdFilter.trim()) {
      filtered = filtered.filter((c: any) =>
        c.container_number?.toLowerCase().includes(containerIdFilter.toLowerCase())
      );
    }

    // Filter by sub-tab (type: all, import, export, empties)
    if (subTab === "import") {
      filtered = filtered.filter((c: any) => c.flow_type === "Import");
    } else if (subTab === "export") {
      filtered = filtered.filter((c: any) => c.flow_type === "Export");
    } else if (subTab === "empties") {
      filtered = filtered.filter((c: any) => c.is_empty === true || c.is_empty === 1);
    }
    // "all" shows everything, no additional filter needed

    // Filter by priority
    if (filterPriority !== "all") {
      filtered = filtered.filter((c: any) =>
        c.pod_priority?.toLowerCase() === filterPriority.toLowerCase()
      );
    }

    return filtered;
  };

  // Categorize containers
  const incomingContainers = allContainers.filter((c: any) => !c.current_location_id);
  const inYardContainers = allContainers.filter((c: any) => c.current_location_id && c.customs_status !== 'Cleared');
  const outgoingContainers = allContainers.filter((c: any) => c.customs_status === 'Cleared' && c.current_location_id);

  // Apply filters based on active tab
  const filteredIncoming = filterContainers(incomingContainers, incomingSubTab);
  const filteredYard = filterContainers(inYardContainers, yardSubTab);
  const filteredRetrieval = filterContainers(outgoingContainers, retrievalSubTab);

  // Show workflow instead of main page when open
  if (isWorkflowOpen) {
    return <ContainerStackingWorkflow onClose={handleWorkflowClose} />;
  }

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Container Management</h2>
            <p className="text-sm text-gray-600">Track and manage all containers across the yard</p>
          </div>
          <Button onClick={() => setIsWorkflowOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Container
          </Button>
        </div>


        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
            <TabsTrigger value="incoming">
              Incoming Containers ({incomingContainers.length})
            </TabsTrigger>
            <TabsTrigger value="yard">
              Container Retrieval ({inYardContainers.length})
            </TabsTrigger>
            <TabsTrigger value="retrieval">
              Yard Inventory ({outgoingContainers.length})
            </TabsTrigger>
          </TabsList>

          {/* Incoming Containers Tab */}
          <TabsContent value="incoming" className="mt-0">
            {/* Search and Filters Row */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[250px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search by container ID, Shipping Bill..."
                      className="pl-9"
                      value={containerIdFilter}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContainerIdFilter(e.target.value)}
                    />
                  </div>

                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Flow
                  </Button>

                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    ETA
                  </Button>

                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Plan Status
                  </Button>

                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Priority
                  </Button>

                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Source
                  </Button>

                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Columns
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sub-tabs for Incoming Containers */}
            <Tabs value={incomingSubTab} onValueChange={setIncomingSubTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all">
                  All ({filterContainers(incomingContainers, "all").length})
                </TabsTrigger>
                <TabsTrigger value="import">
                  Import ({filterContainers(incomingContainers, "import").length})
                </TabsTrigger>
                <TabsTrigger value="export">
                  Export ({filterContainers(incomingContainers, "export").length})
                </TabsTrigger>
                <TabsTrigger value="empties">
                  Empties ({filterContainers(incomingContainers, "empties").length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-0">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Container ID</TableHead>
                      <TableHead>Size/Type</TableHead>
                      <TableHead>Vessel/Voyage</TableHead>
                      <TableHead>Origin</TableHead>
                      <TableHead>ETA</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomingContainers.map((container) => (
                      <TableRow
                        key={container.container_id}
                        className="hover:bg-gray-50"
                      >
                        <TableCell className="font-mono text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {container.container_number}
                            {container.hazmat_flag && <Flame className="h-4 w-4 text-red-600" />}
                            {container.reefer_flag && <Snowflake className="h-4 w-4 text-cyan-600" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{container.size_teu === 1 ? "20' STD" : "40' HC"}</div>
                            <div className="text-gray-600">{container.weight_mt} MT</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{container.vessel_id || "-"}</div>
                            <div className="text-gray-600">{container.voyage_id || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{container.shipping_line || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {container.expected_pickup_time ? new Date(container.expected_pickup_time).toLocaleString() : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              container.customs_status === "Pending" && "bg-orange-100 text-orange-700",
                              container.customs_status === "Cleared" && "bg-green-100 text-green-700",
                              container.customs_status === "Hold" && "bg-red-100 text-red-700"
                            )}
                          >
                            {container.customs_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={container.pod_priority === "High" ? "destructive" : "secondary"}
                          >
                            {container.pod_priority || "Normal"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedContainerId(container.container_id);
                                  setDetailsModalOpen(true);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <MapPin className="mr-2 h-4 w-4" />
                                Pre-assign Location
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <AlertCircle className="mr-2 h-4 w-4" />
                                Change Priority
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="mt-0">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Container ID</TableHead>
                      <TableHead>Size/Type</TableHead>
                      <TableHead>Vessel/Voyage</TableHead>
                      <TableHead>Origin</TableHead>
                      <TableHead>ETA</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncoming.map((container) => (
                      <TableRow key={container.container_id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {container.container_number}
                            {container.hazmat_flag && <Flame className="h-4 w-4 text-red-600" />}
                            {container.reefer_flag && <Snowflake className="h-4 w-4 text-cyan-600" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{container.size_teu === 1 ? "20' STD" : "40' HC"}</div>
                            <div className="text-gray-600">{container.weight_mt} MT</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{container.vessel_id || "-"}</div>
                            <div className="text-gray-600">{container.voyage_id || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{container.shipping_line || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {container.expected_pickup_time ? new Date(container.expected_pickup_time).toLocaleString() : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              container.customs_status === "Pending" && "bg-orange-100 text-orange-700",
                              container.customs_status === "Cleared" && "bg-green-100 text-green-700",
                              container.customs_status === "Hold" && "bg-red-100 text-red-700"
                            )}
                          >
                            {container.customs_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={container.pod_priority === "High" ? "destructive" : "secondary"}>
                            {container.pod_priority || "Normal"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setSelectedContainerId(container.container_id); setDetailsModalOpen(true); }}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <MapPin className="mr-2 h-4 w-4" />
                                Pre-assign Location
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <AlertCircle className="mr-2 h-4 w-4" />
                                Change Priority
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="mt-0">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Container ID</TableHead>
                      <TableHead>Size/Type</TableHead>
                      <TableHead>Vessel/Voyage</TableHead>
                      <TableHead>Origin</TableHead>
                      <TableHead>ETA</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncoming.map((container) => (
                      <TableRow key={container.container_id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {container.container_number}
                            {container.hazmat_flag && <Flame className="h-4 w-4 text-red-600" />}
                            {container.reefer_flag && <Snowflake className="h-4 w-4 text-cyan-600" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{container.size_teu === 1 ? "20' STD" : "40' HC"}</div>
                            <div className="text-gray-600">{container.weight_mt} MT</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{container.vessel_id || "-"}</div>
                            <div className="text-gray-600">{container.voyage_id || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{container.shipping_line || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {container.expected_pickup_time ? new Date(container.expected_pickup_time).toLocaleString() : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              container.customs_status === "Pending" && "bg-orange-100 text-orange-700",
                              container.customs_status === "Cleared" && "bg-green-100 text-green-700",
                              container.customs_status === "Hold" && "bg-red-100 text-red-700"
                            )}
                          >
                            {container.customs_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={container.pod_priority === "High" ? "destructive" : "secondary"}>
                            {container.pod_priority || "Normal"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setSelectedContainerId(container.container_id); setDetailsModalOpen(true); }}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="empties" className="mt-0">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Container ID</TableHead>
                      <TableHead>Size/Type</TableHead>
                      <TableHead>Vessel/Voyage</TableHead>
                      <TableHead>Origin</TableHead>
                      <TableHead>ETA</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncoming.map((container) => (
                      <TableRow key={container.container_id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {container.container_number}
                            {container.hazmat_flag && <Flame className="h-4 w-4 text-red-600" />}
                            {container.reefer_flag && <Snowflake className="h-4 w-4 text-cyan-600" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{container.size_teu === 1 ? "20' STD" : "40' HC"}</div>
                            <div className="text-gray-600">{container.weight_mt} MT</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{container.vessel_id || "-"}</div>
                            <div className="text-gray-600">{container.voyage_id || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{container.shipping_line || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {container.expected_pickup_time ? new Date(container.expected_pickup_time).toLocaleString() : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              container.customs_status === "Pending" && "bg-orange-100 text-orange-700",
                              container.customs_status === "Cleared" && "bg-green-100 text-green-700",
                              container.customs_status === "Hold" && "bg-red-100 text-red-700"
                            )}
                          >
                            {container.customs_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={container.pod_priority === "High" ? "destructive" : "secondary"}>
                            {container.pod_priority || "Normal"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setSelectedContainerId(container.container_id); setDetailsModalOpen(true); }}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Yard Inventory Tab */}
          <TabsContent value="yard" className="mt-0">
            {/* Search and Filters Row */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[250px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search by container ID, Shipping Bill..."
                      className="pl-9"
                      value={containerIdFilter}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContainerIdFilter(e.target.value)}
                    />
                  </div>

                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Flow
                  </Button>

                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    ETA
                  </Button>

                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Plan Status
                  </Button>

                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Priority
                  </Button>

                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Source
                  </Button>

                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Columns
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sub-tabs for Yard Inventory */}
            <Tabs value={yardSubTab} onValueChange={setYardSubTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all">
                  All ({filterContainers(inYardContainers, "all").length})
                </TabsTrigger>
                <TabsTrigger value="import">
                  Import ({filterContainers(inYardContainers, "import").length})
                </TabsTrigger>
                <TabsTrigger value="export">
                  Export ({filterContainers(inYardContainers, "export").length})
                </TabsTrigger>
                <TabsTrigger value="empties">
                  Empties ({filterContainers(inYardContainers, "empties").length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-0">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Container ID</TableHead>
                          <TableHead>Size/Type</TableHead>
                          <TableHead>Vessel/Voyage</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Dwell Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Move</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredYard.map((container) => (
                      <TableRow
                        key={container.container_id}
                        className="hover:bg-gray-50"
                      >
                        <TableCell className="font-mono text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {container.container_number}
                            {container.hazmat_flag && <Flame className="h-4 w-4 text-red-600" />}
                            {container.reefer_flag && <Snowflake className="h-4 w-4 text-cyan-600" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{container.size_teu === 1 ? "20' STD" : "40' HC"}</div>
                            <div className="text-gray-600">{container.weight_mt} MT</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{container.vessel_id || "-"}</div>
                            <div className="text-gray-600">{container.voyage_id || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="font-mono">{container.current_location_id}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className={cn(
                              "font-semibold",
                              container.dwell_time_days > 5 && "text-red-600",
                              container.dwell_time_days > 3 && container.dwell_time_days <= 5 && "text-orange-600"
                            )}>
                              {container.dwell_time_days || 0} days
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              container.customs_status === "Cleared" && "bg-green-100 text-green-700",
                              container.customs_status === "Pending" && "bg-orange-100 text-orange-700",
                              container.customs_status === "Hold" && "bg-red-100 text-red-700"
                            )}
                          >
                            {container.customs_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {container.updated_at ? new Date(container.updated_at).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedContainerId(container.container_id);
                                  setDetailsModalOpen(true);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <MapPin className="mr-2 h-4 w-4" />
                                Relocate Container
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Package className="mr-2 h-4 w-4" />
                                Movement History
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Import, Export, Empties tabs for Yard - same structure */}
              <TabsContent value="import" className="mt-0">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Container ID</TableHead>
                          <TableHead>Size/Type</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Dwell Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredYard.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No containers found</TableCell></TableRow>
                        ) : (
                          filteredYard.map((container) => (
                            <TableRow key={container.container_id} className="hover:bg-gray-50">
                              <TableCell className="font-mono text-sm font-medium">
                                {container.container_number}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{container.size_teu === 1 ? "20' STD" : "40' HC"}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-sm">{container.current_location_id}</span>
                              </TableCell>
                              <TableCell className="text-sm">{container.dwell_time_days || 0} days</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{container.customs_status}</Badge>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => { setSelectedContainerId(container.container_id); setDetailsModalOpen(true); }}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="export" className="mt-0">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Container ID</TableHead>
                          <TableHead>Size/Type</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Dwell Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredYard.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No containers found</TableCell></TableRow>
                        ) : (
                          filteredYard.map((container) => (
                            <TableRow key={container.container_id} className="hover:bg-gray-50">
                              <TableCell className="font-mono text-sm font-medium">
                                {container.container_number}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{container.size_teu === 1 ? "20' STD" : "40' HC"}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-sm">{container.current_location_id}</span>
                              </TableCell>
                              <TableCell className="text-sm">{container.dwell_time_days || 0} days</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{container.customs_status}</Badge>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => { setSelectedContainerId(container.container_id); setDetailsModalOpen(true); }}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="empties" className="mt-0">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Container ID</TableHead>
                          <TableHead>Size/Type</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Dwell Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredYard.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No containers found</TableCell></TableRow>
                        ) : (
                          filteredYard.map((container) => (
                            <TableRow key={container.container_id} className="hover:bg-gray-50">
                              <TableCell className="font-mono text-sm font-medium">
                                {container.container_number}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{container.size_teu === 1 ? "20' STD" : "40' HC"}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-sm">{container.current_location_id}</span>
                              </TableCell>
                              <TableCell className="text-sm">{container.dwell_time_days || 0} days</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{container.customs_status}</Badge>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => { setSelectedContainerId(container.container_id); setDetailsModalOpen(true); }}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Container Retrieval Tab */}
          <TabsContent value="retrieval" className="mt-0">
            {/* Search and Filters Row */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[250px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search by container ID, Shipping Bill..."
                      className="pl-9"
                      value={containerIdFilter}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContainerIdFilter(e.target.value)}
                    />
                  </div>

                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Flow
                  </Button>

                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    ETA
                  </Button>

                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Plan Status
                  </Button>

                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Priority
                  </Button>

                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Source
                  </Button>

                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Columns
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sub-tabs for Container Retrieval */}
            <Tabs value={retrievalSubTab} onValueChange={setRetrievalSubTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all">
                  All ({filterContainers(outgoingContainers, "all").length})
                </TabsTrigger>
                <TabsTrigger value="import">
                  Import ({filterContainers(outgoingContainers, "import").length})
                </TabsTrigger>
                <TabsTrigger value="export">
                  Export ({filterContainers(outgoingContainers, "export").length})
                </TabsTrigger>
                <TabsTrigger value="empties">
                  Empties ({filterContainers(outgoingContainers, "empties").length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-0">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Container ID</TableHead>
                          <TableHead>Size/Type</TableHead>
                          <TableHead>Vessel/Voyage</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>ETD</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRetrieval.map((container) => (
                          <TableRow
                            key={container.container_id}
                            className="hover:bg-gray-50"
                          >
                        <TableCell className="font-mono text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {container.container_number}
                            {container.hazmat_flag && <Flame className="h-4 w-4 text-red-600" />}
                            {container.reefer_flag && <Snowflake className="h-4 w-4 text-cyan-600" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{container.size_teu === 1 ? "20' STD" : "40' HC"}</div>
                            <div className="text-gray-600">{container.weight_mt} MT</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{container.vessel_id || "-"}</div>
                            <div className="text-gray-600">{container.voyage_id || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{container.pod || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {container.expected_delivery_time ? new Date(container.expected_delivery_time).toLocaleString() : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              container.customs_status === "Cleared" && "bg-green-100 text-green-700",
                              container.customs_status === "Pending" && "bg-orange-100 text-orange-700",
                              container.customs_status === "Hold" && "bg-red-100 text-red-700"
                            )}
                          >
                            {container.customs_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={container.pod_priority === "High" ? "destructive" : "secondary"}
                          >
                            {container.pod_priority || "Normal"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedContainerId(container.container_id);
                                  setDetailsModalOpen(true);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Package className="mr-2 h-4 w-4" />
                                Track Status
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="import" className="mt-0">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Container ID</TableHead>
                          <TableHead>Size/Type</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>ETD</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRetrieval.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No containers found</TableCell></TableRow>
                        ) : (
                          filteredRetrieval.map((container) => (
                            <TableRow key={container.container_id} className="hover:bg-gray-50">
                              <TableCell className="font-mono text-sm font-medium">
                                {container.container_number}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{container.size_teu === 1 ? "20' STD" : "40' HC"}</div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{container.pod || "-"}</TableCell>
                              <TableCell className="text-sm">
                                {container.expected_delivery_time ? new Date(container.expected_delivery_time).toLocaleString() : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{container.customs_status}</Badge>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => { setSelectedContainerId(container.container_id); setDetailsModalOpen(true); }}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="export" className="mt-0">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Container ID</TableHead>
                          <TableHead>Size/Type</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>ETD</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRetrieval.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No containers found</TableCell></TableRow>
                        ) : (
                          filteredRetrieval.map((container) => (
                            <TableRow key={container.container_id} className="hover:bg-gray-50">
                              <TableCell className="font-mono text-sm font-medium">
                                {container.container_number}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{container.size_teu === 1 ? "20' STD" : "40' HC"}</div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{container.pod || "-"}</TableCell>
                              <TableCell className="text-sm">
                                {container.expected_delivery_time ? new Date(container.expected_delivery_time).toLocaleString() : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{container.customs_status}</Badge>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => { setSelectedContainerId(container.container_id); setDetailsModalOpen(true); }}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="empties" className="mt-0">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Container ID</TableHead>
                          <TableHead>Size/Type</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>ETD</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRetrieval.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No containers found</TableCell></TableRow>
                        ) : (
                          filteredRetrieval.map((container) => (
                            <TableRow key={container.container_id} className="hover:bg-gray-50">
                              <TableCell className="font-mono text-sm font-medium">
                                {container.container_number}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{container.size_teu === 1 ? "20' STD" : "40' HC"}</div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{container.pod || "-"}</TableCell>
                              <TableCell className="text-sm">
                                {container.expected_delivery_time ? new Date(container.expected_delivery_time).toLocaleString() : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{container.customs_status}</Badge>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => { setSelectedContainerId(container.container_id); setDetailsModalOpen(true); }}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>

      {/* Container Details Modal */}
      <ContainerDetailsModal
        containerId={selectedContainerId}
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedContainerId(null);
        }}
      />
    </div>
  );
}