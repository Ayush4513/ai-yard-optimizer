import { useState, useEffect } from "react";
import { containerAPI } from "@/services/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Separator } from "@/app/components/ui/separator";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import {
  Container,
  Ship,
  MapPin,
  Package,
  AlertTriangle,
  Snowflake,
  Clock,
  Truck,
  Activity,
  TrendingUp,
  Users,
  Settings,
  FileText,
  X,
  ExternalLink,
  Download,
  Flame,
  Calendar,
  Navigation,
  Gauge,
  ArrowRightLeft,
} from "lucide-react";
import { cn } from "@/app/components/ui/utils";

interface ContainerDetailsModalProps {
  containerId: string | null;
  open: boolean;
  onClose: () => void;
}

interface ContainerData {
  container_id: string;
  container_number: string;
  iso_code: string;
  size_teu: number;
  container_type: string;
  load_status: string;
  weight_mt: number;
  weight_class: string;
  cargo_description: string;
  seal_number: string | null;
  type: string;
  shipping_bill_number: string | null;
  bill_of_lading: string | null;
  customs_status: string;
  shipping_line: string | null;
  consignee: string | null;
  vessel_id: string | null;
  voyage_id: string | null;
  pod: string | null;
  pod_priority: number | null;
  cutoff_datetime: string | null;
  hazmat_flag: boolean | null;
  imdg_class: string | null;
  un_number: string | null;
  hazmat_segregation: string | null;
  reefer_flag: boolean | null;
  set_temperature: number | null;
  current_temperature: number | null;
  ventilation_setting: string | null;
  humidity_setting: number | null;
  current_location_id: string | null;
  block_id: string | null;
  bay: number | null;
  row: number | null;
  tier: number | null;
  gate_in_time: string | null;
  expected_pickup_time: string | null;
  dwell_time_hours: number | null;
  event_sequence_number: number | null;
  movement_id: string | null;
  event_type: string | null;
  actual_voyage_datetime: string | null;
  movement_type: string | null;
  yard_zone_type: string | null;
  from_location_type: string | null;
  from_location_id: string | null;
  to_location_type: string | null;
  to_location_id: string | null;
  stack_id: string | null;
  stack_height_after_move: number | null;
  equipment_id: string | null;
  equipment_type: string | null;
  operator_id: string | null;
  job_id: string | null;
  planned_timestamp: string | null;
  actual_timestamp: string | null;
  delay_minutes: number | null;
  dwell_time_since_last_event_min: number | null;
  exception_flag: boolean | null;
  exception_reason: string | null;
  reason_for_movement: string | null;
  container_status_after_event: string | null;
  move_intent: string | null;
  optimality_tag: string | null;
  rehandle_flag: boolean | null;
  rehandle_count: number | null;
  total_dwell_time_min: number | null;
  yard_utilization_percent: number | null;
  block_utilization_percent: number | null;
  congestion_level: string | null;
}

export function ContainerDetailsModal({
  containerId,
  open,
  onClose,
}: ContainerDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [containerData, setContainerData] = useState<ContainerData | null>(null);

  useEffect(() => {
    if (open && containerId) {
      fetchContainerDetails();
    }
  }, [open, containerId]);

  const fetchContainerDetails = async () => {
    if (!containerId) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/containers/${containerId}`);
      if (!response.ok) throw new Error("Failed to fetch container details");
      const data = await response.json();
      setContainerData(data);
    } catch (error) {
      toast.error("Failed to load container details");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Dry":
        return <Container className="h-4 w-4" />;
      case "Reefer":
        return <Snowflake className="h-4 w-4" />;
      case "Hazardous":
        return <Flame className="h-4 w-4" />;
      case "OOG":
        return <Package className="h-4 w-4" />;
      default:
        return <Container className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "cleared":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "hold":
        return "bg-red-500/10 text-red-700 border-red-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    }
  };

  const getPriorityColor = (priority: number | null) => {
    if (!priority) return "bg-gray-500/10 text-gray-700";
    if (priority === 1) return "bg-red-500/10 text-red-700";
    if (priority === 2) return "bg-orange-500/10 text-orange-700";
    if (priority === 3) return "bg-yellow-500/10 text-yellow-700";
    return "bg-green-500/10 text-green-700";
  };

  const getCongestionColor = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case "high":
        return "bg-red-500/10 text-red-700 border-red-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      case "low":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    }
  };

  const formatDateTime = (datetime: string | null) => {
    if (!datetime) return "N/A";
    return new Date(datetime).toLocaleString();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[85vh] p-0 flex flex-col gap-0">
        {/* Fixed Header */}
        <div className="p-6 pb-4 border-b">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  {loading ? (
                    "Loading..."
                  ) : (
                    <>
                      {containerData && getTypeIcon(containerData.container_type)}
                      {containerData?.container_number || "Container Details"}
                    </>
                  )}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {containerData?.container_id}
                  </span>
                  {containerData?.event_sequence_number && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <Badge variant="outline" className="text-xs">
                        Event #{containerData.event_sequence_number}
                      </Badge>
                    </>
                  )}
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-6 py-4 pb-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : containerData ? (
                <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-1 h-auto p-1">
                  <TabsTrigger value="basic" className="text-xs sm:text-sm px-2 py-2">
                    Basic Info
                  </TabsTrigger>
                  <TabsTrigger value="vessel" className="text-xs sm:text-sm px-2 py-2">
                    Vessel
                  </TabsTrigger>
                  <TabsTrigger value="location" className="text-xs sm:text-sm px-2 py-2">
                    Location
                  </TabsTrigger>
                  <TabsTrigger value="event" className="text-xs sm:text-sm px-2 py-2">
                    Event
                  </TabsTrigger>
                  <TabsTrigger value="operations" className="text-xs sm:text-sm px-2 py-2">
                    Operations
                  </TabsTrigger>
                  <TabsTrigger value="metrics" className="text-xs sm:text-sm px-2 py-2">
                    Metrics
                  </TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="mt-6">
                  <Card>
                    <div className="p-6 space-y-6">
                      {/* Status Badges */}
                      <div className="flex flex-wrap gap-2">
                        <Badge className={cn("border", getStatusColor(containerData.customs_status))}>
                          {containerData.customs_status}
                        </Badge>
                        <Badge className={cn("border", getPriorityColor(containerData.pod_priority))}>
                          Priority {containerData.pod_priority || "N/A"}
                        </Badge>
                        {containerData.hazmat_flag && (
                          <Badge className="bg-red-500/10 text-red-700 border border-red-500/20">
                            <Flame className="h-3 w-3 mr-1" />
                            Hazmat
                          </Badge>
                        )}
                        {containerData.reefer_flag && (
                          <Badge className="bg-blue-500/10 text-blue-700 border border-blue-500/20">
                            <Snowflake className="h-3 w-3 mr-1" />
                            Reefer
                          </Badge>
                        )}
                        {containerData.rehandle_flag && (
                          <Badge variant="destructive">
                            <ArrowRightLeft className="h-3 w-3 mr-1" />
                            Rehandled
                          </Badge>
                        )}
                      </div>

                      <Separator />

                      {/* Container Specifications */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Container Specifications
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <InfoItem label="Container Number" value={containerData.container_number} />
                          <InfoItem label="ISO Code" value={containerData.iso_code} />
                          <InfoItem label="Size (TEU)" value={`${containerData.size_teu} TEU`} />
                          <InfoItem label="Container Type" value={containerData.container_type} />
                          <InfoItem label="Load Status" value={containerData.load_status} />
                          <InfoItem label="Type" value={containerData.type.replace("_", " ")} />
                        </div>
                      </div>

                      <Separator />

                      {/* Weight & Cargo */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Gauge className="h-5 w-5" />
                          Weight & Cargo
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <InfoItem label="Weight" value={`${containerData.weight_mt} MT`} />
                          <InfoItem label="Weight Class" value={containerData.weight_class} />
                          <InfoItem label="Cargo Description" value={containerData.cargo_description} />
                          <InfoItem label="Seal Number" value={containerData.seal_number || "N/A"} />
                        </div>
                      </div>

                      <Separator />

                      {/* Shipping Details */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Shipping Documentation
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <InfoItem label="Shipping Bill" value={containerData.shipping_bill_number || "N/A"} />
                          <InfoItem label="Bill of Lading" value={containerData.bill_of_lading || "N/A"} />
                          <InfoItem label="Customs Status" value={containerData.customs_status} />
                          <InfoItem label="Shipping Line" value={containerData.shipping_line || "N/A"} />
                          <InfoItem label="Consignee" value={containerData.consignee || "N/A"} />
                        </div>
                      </div>

                      {/* Special Handling */}
                      {(containerData.hazmat_flag || containerData.reefer_flag) && (
                        <>
                          <Separator />
                          <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5" />
                              Special Handling Requirements
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {containerData.hazmat_flag && (
                                <>
                                  <InfoItem label="IMDG Class" value={containerData.imdg_class || "N/A"} />
                                  <InfoItem label="UN Number" value={containerData.un_number || "N/A"} />
                                  <InfoItem label="Segregation" value={containerData.hazmat_segregation || "N/A"} />
                                </>
                              )}
                              {containerData.reefer_flag && (
                                <>
                                  <InfoItem label="Set Temperature" value={containerData.set_temperature ? `${containerData.set_temperature}°C` : "N/A"} />
                                  <InfoItem label="Current Temperature" value={containerData.current_temperature ? `${containerData.current_temperature}°C` : "N/A"} />
                                  <InfoItem label="Ventilation" value={containerData.ventilation_setting || "N/A"} />
                                  <InfoItem label="Humidity" value={containerData.humidity_setting ? `${containerData.humidity_setting}%` : "N/A"} />
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                {/* Vessel & Voyage Tab */}
                <TabsContent value="vessel" className="mt-6">
                  <Card>
                    <div className="p-6 space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Ship className="h-5 w-5" />
                          Vessel Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <InfoItem label="Vessel ID" value={containerData.vessel_id || "N/A"} />
                          <InfoItem label="Voyage ID" value={containerData.voyage_id || "N/A"} />
                          <InfoItem label="Port of Discharge" value={containerData.pod || "N/A"} />
                          <InfoItem label="POD Priority" value={containerData.pod_priority?.toString() || "N/A"} />
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Voyage Timing
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <InfoItem label="Expected Pickup" value={formatDateTime(containerData.expected_pickup_time)} />
                          <InfoItem label="Actual Voyage DateTime" value={formatDateTime(containerData.actual_voyage_datetime)} />
                          <InfoItem label="Cutoff DateTime" value={formatDateTime(containerData.cutoff_datetime)} />
                          <InfoItem label="Gate In Time" value={formatDateTime(containerData.gate_in_time)} />
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* Location Tab */}
                <TabsContent value="location" className="mt-6">
                  <Card>
                    <div className="p-6 space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <MapPin className="h-5 w-5" />
                          Current Location
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <InfoItem label="Location ID" value={containerData.current_location_id || "N/A"} />
                          <InfoItem label="Block ID" value={containerData.block_id || "N/A"} />
                          <InfoItem label="Stack ID" value={containerData.stack_id || "N/A"} />
                          <InfoItem label="Bay" value={containerData.bay?.toString() || "N/A"} />
                          <InfoItem label="Row" value={containerData.row?.toString() || "N/A"} />
                          <InfoItem label="Tier" value={containerData.tier?.toString() || "N/A"} />
                          <InfoItem label="Yard Zone" value={containerData.yard_zone_type || "N/A"} />
                          <InfoItem label="Stack Height After Move" value={containerData.stack_height_after_move?.toString() || "N/A"} />
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Navigation className="h-5 w-5" />
                          Movement Details
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">From Location</p>
                            <div className="p-3 bg-muted rounded-md">
                              <p className="text-sm">{containerData.from_location_type || "N/A"}</p>
                              <p className="text-xs text-muted-foreground">{containerData.from_location_id || "N/A"}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">To Location</p>
                            <div className="p-3 bg-muted rounded-md">
                              <p className="text-sm">{containerData.to_location_type || "N/A"}</p>
                              <p className="text-xs text-muted-foreground">{containerData.to_location_id || "N/A"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* Event Details Tab */}
                <TabsContent value="event" className="mt-6">
                  <Card>
                    <div className="p-6 space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Event Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <InfoItem label="Event Sequence" value={containerData.event_sequence_number?.toString() || "N/A"} />
                          <InfoItem label="Movement ID" value={containerData.movement_id || "N/A"} />
                          <InfoItem label="Event Type" value={containerData.event_type || "N/A"} />
                          <InfoItem label="Movement Type" value={containerData.movement_type || "N/A"} />
                          <InfoItem label="Container Status" value={containerData.container_status_after_event || "N/A"} />
                          <InfoItem label="Reason for Movement" value={containerData.reason_for_movement || "N/A"} />
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Timing & Delays
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <InfoItem label="Planned Timestamp" value={formatDateTime(containerData.planned_timestamp)} />
                          <InfoItem label="Actual Timestamp" value={formatDateTime(containerData.actual_timestamp)} />
                          <InfoItem label="Delay" value={containerData.delay_minutes ? `${containerData.delay_minutes} min` : "None"} />
                          <InfoItem label="Dwell Time" value={containerData.dwell_time_hours ? `${containerData.dwell_time_hours.toFixed(1)} hrs` : "N/A"} />
                          <InfoItem label="Dwell Since Last Event" value={containerData.dwell_time_since_last_event_min ? `${containerData.dwell_time_since_last_event_min} min` : "N/A"} />
                          <InfoItem label="Total Dwell Time" value={containerData.total_dwell_time_min ? `${containerData.total_dwell_time_min} min` : "N/A"} />
                        </div>
                      </div>

                      {containerData.exception_flag && (
                        <>
                          <Separator />
                          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-destructive">
                              <AlertTriangle className="h-4 w-4" />
                              Exception Reported
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {containerData.exception_reason || "No reason provided"}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                {/* Operations Tab */}
                <TabsContent value="operations" className="mt-6">
                  <Card>
                    <div className="p-6 space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Truck className="h-5 w-5" />
                          Equipment & Personnel
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <InfoItem label="Equipment ID" value={containerData.equipment_id || "N/A"} />
                          <InfoItem label="Equipment Type" value={containerData.equipment_type || "N/A"} />
                          <InfoItem label="Operator ID" value={containerData.operator_id || "N/A"} />
                          <InfoItem label="Job ID" value={containerData.job_id || "N/A"} />
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          Optimization Status
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <InfoItem label="Move Intent" value={containerData.move_intent || "N/A"} />
                          <InfoItem label="Optimality Tag" value={containerData.optimality_tag || "N/A"} />
                          <InfoItem label="Rehandle Count" value={containerData.rehandle_count?.toString() || "0"} />
                          <InfoItem label="Rehandle Flag" value={containerData.rehandle_flag ? "Yes" : "No"} />
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* Metrics Tab */}
                <TabsContent value="metrics" className="mt-6">
                  <Card>
                    <div className="p-6 space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Yard Metrics
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <MetricCard
                            label="Yard Utilization"
                            value={containerData.yard_utilization_percent || 0}
                            unit="%"
                            color={getUtilizationColor(containerData.yard_utilization_percent)}
                          />
                          <MetricCard
                            label="Block Utilization"
                            value={containerData.block_utilization_percent || 0}
                            unit="%"
                            color={getUtilizationColor(containerData.block_utilization_percent)}
                          />
                          <div className="p-4 border rounded-md space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Congestion Level</p>
                            <Badge className={cn("text-lg", getCongestionColor(containerData.congestion_level))}>
                              {containerData.congestion_level || "N/A"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-lg font-semibold mb-4">Performance Summary</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                            <span className="text-sm font-medium">Total Dwell Time</span>
                            <span className="text-sm font-bold">
                              {containerData.total_dwell_time_min ? `${(containerData.total_dwell_time_min / 60).toFixed(1)} hrs` : "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                            <span className="text-sm font-medium">Rehandle Operations</span>
                            <span className="text-sm font-bold">{containerData.rehandle_count}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                            <span className="text-sm font-medium">Optimization Status</span>
                            <Badge variant={containerData.optimality_tag === "Optimal" ? "default" : "destructive"}>
                              {containerData.optimality_tag || "N/A"}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                            <span className="text-sm font-medium">Movement Plan</span>
                            <Badge variant="outline">{containerData.move_intent || "N/A"}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No container data available</p>
              </div>
            )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper Components
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold break-words">{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="p-4 border rounded-md space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-2xl font-bold", color)}>{value.toFixed(1)}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className={cn("h-2 rounded-full transition-all", color.replace("text", "bg"))}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

function getUtilizationColor(value: number | null) {
  if (!value) return "text-gray-500";
  if (value >= 80) return "text-red-600";
  if (value >= 60) return "text-yellow-600";
  return "text-green-600";
}
