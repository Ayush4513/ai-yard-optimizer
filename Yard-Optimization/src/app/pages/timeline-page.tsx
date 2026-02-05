import { useState } from "react";
import {
  Clock,
  TruckIcon,
  Container,
  Ship,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Circle,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { cn } from "@/app/components/ui/utils";

// Mock timeline events
const timelineEvents = [
  {
    id: "EVT-001",
    type: "arrival",
    status: "completed",
    container: "MSCU2847563",
    vessel: "MSC MIRNA",
    predictedTime: "08:30",
    actualTime: "08:25",
    variance: -5,
    description: "Container arrived at gate",
    icon: TruckIcon,
  },
  {
    id: "EVT-002",
    type: "stacking",
    status: "completed",
    container: "MSCU2847563",
    location: "A-03-B-12",
    predictedTime: "08:45",
    actualTime: "08:50",
    variance: 5,
    description: "Stacked in export zone",
    icon: Container,
  },
  {
    id: "EVT-003",
    type: "arrival",
    status: "in-progress",
    container: "MAEU8734521",
    vessel: "MAERSK LIMA",
    predictedTime: "09:15",
    actualTime: null,
    variance: 0,
    description: "Expected arrival at gate",
    icon: TruckIcon,
  },
  {
    id: "EVT-004",
    type: "exit",
    status: "upcoming",
    container: "MSKU2938475",
    vessel: "MSC MIRNA",
    destination: "Quay Crane 3",
    predictedTime: "10:30",
    actualTime: null,
    variance: 0,
    description: "Scheduled yard exit to quay",
    icon: Ship,
  },
  {
    id: "EVT-005",
    type: "arrival",
    status: "upcoming",
    container: "CMAU5632478",
    vessel: "CMA CGM NEVA",
    predictedTime: "10:45",
    actualTime: null,
    variance: 0,
    description: "Expected reefer arrival",
    icon: TruckIcon,
  },
  {
    id: "EVT-006",
    type: "rehandling",
    status: "upcoming",
    container: "TEMU5632894",
    fromLocation: "D-02",
    toLocation: "E-01",
    predictedTime: "11:15",
    actualTime: null,
    variance: 0,
    description: "Re-marshal to DG zone",
    icon: Container,
  },
  {
    id: "EVT-007",
    type: "exit",
    status: "upcoming",
    container: "HLCU8563920",
    destination: "Gate Out - Delivery",
    predictedTime: "12:00",
    actualTime: null,
    variance: 0,
    description: "Import container pickup",
    icon: TruckIcon,
  },
  {
    id: "EVT-008",
    type: "stacking",
    status: "upcoming",
    container: "CMAU5632478",
    location: "R-01-C-05",
    predictedTime: "11:00",
    actualTime: null,
    variance: 0,
    description: "Stack in reefer zone",
    icon: Container,
  },
  {
    id: "EVT-009",
    type: "exit",
    status: "delayed",
    container: "CMAU7834521",
    vessel: "MAERSK LIMA",
    destination: "Quay Crane 1",
    predictedTime: "11:30",
    actualTime: null,
    variance: 25,
    description: "Vessel loading delayed",
    icon: Ship,
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "text-green-600 bg-green-50 border-green-200";
    case "in-progress":
      return "text-blue-600 bg-blue-50 border-blue-200";
    case "upcoming":
      return "text-gray-600 bg-gray-50 border-gray-200";
    case "delayed":
      return "text-red-600 bg-red-50 border-red-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-5 w-5" />;
    case "in-progress":
      return <Clock className="h-5 w-5 animate-pulse" />;
    case "delayed":
      return <AlertCircle className="h-5 w-5" />;
    default:
      return <Circle className="h-5 w-5" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "arrival":
      return "bg-blue-500";
    case "stacking":
      return "bg-green-500";
    case "exit":
      return "bg-orange-500";
    case "rehandling":
      return "bg-purple-500";
    default:
      return "bg-gray-500";
  }
};

export function TimelinePage() {
  const [selectedDate, setSelectedDate] = useState("today");
  const [filterType, setFilterType] = useState("all");
  const [timeRange, setTimeRange] = useState("24h");

  const filteredEvents = timelineEvents.filter((event) => {
    if (filterType === "all") return true;
    return event.type === filterType;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Planning Timeline</h2>
          <p className="text-sm text-gray-600">
            Real-time and predicted container movements across the yard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Today
          </Button>
          <Button variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timelineEvents.filter((e) => e.status === "completed").length}
            </div>
            <p className="text-xs text-gray-600">events today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timelineEvents.filter((e) => e.status === "in-progress").length}
            </div>
            <p className="text-xs text-gray-600">active now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Circle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timelineEvents.filter((e) => e.status === "upcoming").length}
            </div>
            <p className="text-xs text-gray-600">scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delayed</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timelineEvents.filter((e) => e.status === "delayed").length}
            </div>
            <p className="text-xs text-gray-600">requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="arrival">Arrivals</SelectItem>
                <SelectItem value="stacking">Stacking</SelectItem>
                <SelectItem value="exit">Exits</SelectItem>
                <SelectItem value="rehandling">Re-handling</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">Next 12 Hours</SelectItem>
                <SelectItem value="24h">Next 24 Hours</SelectItem>
                <SelectItem value="48h">Next 48 Hours</SelectItem>
                <SelectItem value="week">Next Week</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Tabs */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          <TabsTrigger value="gantt">Gantt View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          {/* Timeline Visualization */}
          <Card>
            <CardContent className="p-6">
              {/* Time Header */}
              <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-4">
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i + 8; // Start from 8 AM
                  const displayHour = hour > 12 ? hour - 12 : hour;
                  const period = hour >= 12 ? "PM" : "AM";
                  return (
                    <div key={i} className="flex-shrink-0 w-24 text-center">
                      <div className="text-sm font-semibold text-gray-900">
                        {displayHour}:00
                      </div>
                      <div className="text-xs text-gray-500">{period}</div>
                    </div>
                  );
                })}
              </div>

              {/* Timeline Events */}
              <div className="relative space-y-6">
                {/* Current Time Indicator */}
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: "20%" }}>
                  <div className="absolute -top-1 -left-2 h-4 w-4 rounded-full bg-red-500 ring-4 ring-red-100" />
                  <div className="absolute -left-12 top-0 text-xs font-semibold text-red-600">
                    Now
                  </div>
                </div>

                {filteredEvents.map((event, index) => (
                  <div key={event.id} className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-0 top-6 h-full w-0.5 bg-gray-200" />

                    {/* Event Card */}
                    <div className="relative pl-12">
                      {/* Timeline dot */}
                      <div
                        className={cn(
                          "absolute left-0 top-6 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border-4",
                          getStatusColor(event.status)
                        )}
                      >
                        {getStatusIcon(event.status)}
                      </div>

                      {/* Event content */}
                      <div className={cn(
                        "rounded-lg border-2 p-4 transition-all hover:shadow-md",
                        getStatusColor(event.status)
                      )}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", getTypeColor(event.type))}>
                              <event.icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 capitalize">
                                {event.type}
                              </div>
                              <div className="text-sm text-gray-600">{event.description}</div>
                            </div>
                          </div>
                          <Badge
                            variant={event.status === "delayed" ? "destructive" : "secondary"}
                            className="capitalize"
                          >
                            {event.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Container</div>
                            <div className="font-mono text-sm font-semibold">{event.container}</div>
                          </div>
                          {event.vessel && (
                            <div>
                              <div className="text-xs text-gray-600 mb-1">Vessel</div>
                              <div className="text-sm font-medium">{event.vessel}</div>
                            </div>
                          )}
                          {event.location && (
                            <div>
                              <div className="text-xs text-gray-600 mb-1">Location</div>
                              <div className="font-mono text-sm font-medium">{event.location}</div>
                            </div>
                          )}
                          {event.destination && (
                            <div>
                              <div className="text-xs text-gray-600 mb-1">Destination</div>
                              <div className="text-sm font-medium">{event.destination}</div>
                            </div>
                          )}
                          {event.fromLocation && event.toLocation && (
                            <div className="col-span-2">
                              <div className="text-xs text-gray-600 mb-1">Move</div>
                              <div className="flex items-center gap-2 text-sm font-mono font-medium">
                                {event.fromLocation}
                                <ArrowRight className="h-4 w-4 text-gray-400" />
                                {event.toLocation}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Predicted: </span>
                              <span className="font-semibold">{event.predictedTime}</span>
                            </div>
                            {event.actualTime && (
                              <>
                                <div>
                                  <span className="text-gray-600">Actual: </span>
                                  <span className="font-semibold">{event.actualTime}</span>
                                </div>
                                <div>
                                  <Badge
                                    variant={event.variance < 0 ? "default" : "secondary"}
                                    className={cn(
                                      event.variance < 0 && "bg-green-100 text-green-700",
                                      event.variance > 10 && "bg-red-100 text-red-700"
                                    )}
                                  >
                                    {event.variance > 0 ? "+" : ""}
                                    {event.variance} mins
                                  </Badge>
                                </div>
                              </>
                            )}
                          </div>

                          {event.status === "delayed" && (
                            <Button size="sm" variant="outline">
                              Reschedule
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gantt" className="mt-6">
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-gray-600">
                <BarChart3 className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                <p>Gantt chart visualization would be displayed here</p>
                <p className="text-sm mt-2">Showing parallel operations and resource allocation</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-gray-600">
                <Clock className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                <p>List view would be displayed here</p>
                <p className="text-sm mt-2">Sortable table of all timeline events</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Accuracy Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Prediction Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">92%</div>
              <div className="text-sm text-gray-600 mt-1">Overall Accuracy</div>
              <div className="text-xs text-gray-500 mt-1">Last 7 days</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">±8 mins</div>
              <div className="text-sm text-gray-600 mt-1">Avg Variance</div>
              <div className="text-xs text-gray-500 mt-1">Predicted vs Actual</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">3</div>
              <div className="text-sm text-gray-600 mt-1">Delayed Events</div>
              <div className="text-xs text-gray-500 mt-1">Require attention</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}