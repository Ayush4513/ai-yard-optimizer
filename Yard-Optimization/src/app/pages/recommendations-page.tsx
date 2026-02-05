import { useState } from "react";
import {
  Sparkles,
  TrendingDown,
  Clock,
  Shuffle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Play,
  MapPin,
  Container,
  BarChart3,
  Lightbulb,
  Target,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import { Separator } from "@/app/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { cn } from "@/app/components/ui/utils";

// Mock recommendation data
const recommendations = [
  {
    id: "REC-001",
    type: "placement",
    priority: "high",
    container: "MSCU2847563",
    containerType: "Export - 40' HC",
    vessel: "MSC MIRNA",
    voyage: "FE423W",
    currentPlan: "Block C-14",
    recommendedPlan: "Block A-03",
    confidence: 94,
    impact: {
      rehandlingSaved: 3,
      timeSaved: "45 mins",
      costSaved: "$180",
    },
    reasoning: {
      primary: "Vessel cutoff in 2h 15m - Block A-03 provides direct quay access",
      factors: [
        "Minimizes re-handling for loading sequence",
        "Vessel bay plan alignment (Bay 14-16)",
        "Avoids congested C-14 (95% full)",
        "Equipment availability: RTG-4 idle near A-03",
      ],
      constraints: [
        "Stack height limit: 4 tiers (compliant)",
        "Weight distribution: Within limits",
        "No hazard segregation issues",
      ],
      alternatives: [
        { block: "B-02", score: 87, reason: "Good access but higher re-handle risk" },
        { block: "A-04", score: 82, reason: "Available but further from quay" },
      ],
    },
    status: "pending",
  },
  {
    id: "REC-002",
    type: "rehandling",
    priority: "high",
    container: "TEMU5632894",
    containerType: "Import - 40' HC (DG)",
    vessel: "EVERGREEN",
    voyage: "0FEBZ1MA1",
    currentPlan: "D-02 (Exam Selected)",
    recommendedPlan: "Relocate to E-01 (DG Zone)",
    confidence: 91,
    impact: {
      rehandlingSaved: 2,
      timeSaved: "30 mins",
      costSaved: "$120",
    },
    reasoning: {
      primary: "Customs exam completed - relocate from mixed zone to optimize space",
      factors: [
        "Frees up prime import zone capacity",
        "Proper DG segregation in E-01",
        "Long dwell expected (cleared but not picked up)",
        "Prevents future blocking of fast-moving cargo",
      ],
      constraints: [
        "DG Class 3 segregation rules enforced",
        "Minimum 10m distance from reefer maintained",
        "Equipment: Reach stacker required for DG",
      ],
      alternatives: [
        { block: "E-02", score: 85, reason: "Also DG-compliant but less accessible" },
        { block: "D-04", score: 78, reason: "No DG zone designation" },
      ],
    },
    status: "pending",
  },
  {
    id: "REC-003",
    type: "sequencing",
    priority: "medium",
    container: "MSKU7834562",
    containerType: "Export - 20' STD",
    vessel: "MSC MIRNA",
    voyage: "FE423W",
    currentPlan: "A-03-B-12",
    recommendedPlan: "Stage for loading in next 30 mins",
    confidence: 88,
    impact: {
      rehandlingSaved: 0,
      timeSaved: "15 mins",
      costSaved: "$60",
    },
    reasoning: {
      primary: "Container is load-ready and vessel loading has begun",
      factors: [
        "Bay plan shows this container loads in current phase",
        "Prevents crane starvation",
        "Weather window optimal for next 4 hours",
        "Trucking to quay takes 12 mins from current position",
      ],
      constraints: [
        "Crane 3 currently active on this vessel",
        "Road traffic clear",
        "No equipment conflicts",
      ],
      alternatives: [
        { block: "Wait 1 hour", score: 72, reason: "Increases crane idle risk" },
      ],
    },
    status: "pending",
  },
  {
    id: "REC-004",
    type: "placement",
    priority: "medium",
    container: "CMAU5632478",
    containerType: "Export - 40' RF",
    vessel: "CMA CGM NEVA",
    voyage: "0FRFD1MA1",
    currentPlan: "R-02",
    recommendedPlan: "Keep in R-01 (Reefer Zone)",
    confidence: 96,
    impact: {
      rehandlingSaved: 1,
      timeSaved: "20 mins",
      costSaved: "$80",
    },
    reasoning: {
      primary: "Reefer power plug availability and vessel loading sequence",
      factors: [
        "R-01 has available power outlets (2 of 40)",
        "Better alignment with vessel reefer bay positions",
        "Temperature monitoring optimal in R-01",
        "Reduces reefer cable distance by 15m",
      ],
      constraints: [
        "Reefer power limit: 38/40 used (within capacity)",
        "Generator backup available",
        "Temp set point: -18°C maintained",
      ],
      alternatives: [
        { block: "R-02", score: 84, reason: "Also viable but power farther" },
      ],
    },
    status: "pending",
  },
];

const impactMetrics = {
  totalRecommendations: 12,
  accepted: 8,
  pending: 4,
  rejected: 0,
  estimatedSavings: {
    rehandling: 18,
    time: "3.2 hours",
    cost: "$1,240",
  },
};

export function RecommendationsPage() {
  const [selectedRec, setSelectedRec] = useState<string | null>(null);
  const [showExplain, setShowExplain] = useState(false);

  const selectedRecData = recommendations.find((r) => r.id === selectedRec);

  const handleAccept = (id: string) => {
    console.log("Accepted:", id);
    // In real app, this would call API to accept recommendation
  };

  const handleReject = (id: string) => {
    console.log("Rejected:", id);
    // In real app, this would call API to reject recommendation
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Recommendations</h2>
          <p className="text-sm text-gray-600">
            Intelligent placement and sequencing suggestions powered by optimization AI
          </p>
        </div>
        <Button>
          <Play className="mr-2 h-4 w-4" />
          Auto-Apply High Confidence
        </Button>
      </div>

      {/* Info Banner */}
      <Alert className="border-blue-200 bg-blue-50">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">AI Optimization Active</AlertTitle>
        <AlertDescription className="text-blue-700">
          {impactMetrics.totalRecommendations} recommendations available. Estimated savings: {impactMetrics.estimatedSavings.rehandling} re-handles, {impactMetrics.estimatedSavings.time}, ${impactMetrics.estimatedSavings.cost}
        </AlertDescription>
      </Alert>

      {/* Impact Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{impactMetrics.pending}</div>
            <p className="text-xs text-gray-600">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Re-handles Saved</CardTitle>
            <Shuffle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{impactMetrics.estimatedSavings.rehandling}</div>
            <p className="text-xs text-gray-600">If all accepted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{impactMetrics.estimatedSavings.time}</div>
            <p className="text-xs text-gray-600">Operational efficiency</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${impactMetrics.estimatedSavings.cost}</div>
            <p className="text-xs text-gray-600">Estimated reduction</p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations List */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({recommendations.length})</TabsTrigger>
          <TabsTrigger value="placement">Placement ({recommendations.filter(r => r.type === "placement").length})</TabsTrigger>
          <TabsTrigger value="rehandling">Re-handling ({recommendations.filter(r => r.type === "rehandling").length})</TabsTrigger>
          <TabsTrigger value="sequencing">Sequencing ({recommendations.filter(r => r.type === "sequencing").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-4">
          {recommendations.map((rec) => (
            <Card key={rec.id} className={cn(
              "transition-all hover:shadow-md",
              rec.priority === "high" && "border-l-4 border-l-orange-500"
            )}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  {/* Left Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge
                        variant={rec.priority === "high" ? "destructive" : "secondary"}
                        className="uppercase"
                      >
                        {rec.priority}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {rec.type}
                      </Badge>
                      <span className="text-xs text-gray-500">ID: {rec.id}</span>
                    </div>

                    {/* Container Info */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Container className="h-4 w-4 text-gray-600" />
                        <span className="font-mono font-semibold">{rec.container}</span>
                        <span className="text-sm text-gray-600">• {rec.containerType}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {rec.vessel} • {rec.voyage}
                      </div>
                    </div>

                    {/* Recommendation */}
                    <div className="mb-4 rounded-lg bg-blue-50 p-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-semibold text-blue-900 mb-2">
                            {rec.reasoning.primary}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Current: </span>
                              <span className="font-semibold">{rec.currentPlan}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                            <div>
                              <span className="text-gray-600">Recommended: </span>
                              <span className="font-semibold text-blue-700">{rec.recommendedPlan}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Impact Metrics */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Shuffle className="h-4 w-4 text-green-600" />
                          <span className="text-xs text-gray-600">Re-handles Saved</span>
                        </div>
                        <div className="text-xl font-bold text-green-600">
                          {rec.impact.rehandlingSaved}
                        </div>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-xs text-gray-600">Time Saved</span>
                        </div>
                        <div className="text-xl font-bold text-blue-600">
                          {rec.impact.timeSaved}
                        </div>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingDown className="h-4 w-4 text-green-600" />
                          <span className="text-xs text-gray-600">Cost Saved</span>
                        </div>
                        <div className="text-xl font-bold text-green-600">
                          {rec.impact.costSaved}
                        </div>
                      </div>
                    </div>

                    {/* Confidence Score */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2 text-sm">
                        <span className="text-gray-600">AI Confidence Score</span>
                        <span className="font-semibold text-gray-900">{rec.confidence}%</span>
                      </div>
                      <Progress value={rec.confidence} className="h-2" />
                    </div>

                    {/* Explain Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRec(rec.id);
                        setShowExplain(true);
                      }}
                    >
                      <Info className="mr-2 h-4 w-4" />
                      View Full Explanation
                    </Button>
                  </div>

                  {/* Right Actions */}
                  <div className="ml-6 flex flex-col gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleAccept(rec.id)}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(rec.id)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="placement" className="mt-6">
          <div className="text-center text-gray-600 py-8">
            Filter: Placement recommendations would be shown here
          </div>
        </TabsContent>

        <TabsContent value="rehandling" className="mt-6">
          <div className="text-center text-gray-600 py-8">
            Filter: Re-handling recommendations would be shown here
          </div>
        </TabsContent>

        <TabsContent value="sequencing" className="mt-6">
          <div className="text-center text-gray-600 py-8">
            Filter: Sequencing recommendations would be shown here
          </div>
        </TabsContent>
      </Tabs>

      {/* Explanation Dialog */}
      <Dialog open={showExplain} onOpenChange={setShowExplain}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              AI Recommendation Explanation
            </DialogTitle>
            <DialogDescription>
              {selectedRecData?.id} • Container {selectedRecData?.container}
            </DialogDescription>
          </DialogHeader>

          {selectedRecData && (
            <div className="space-y-6 py-4">
              {/* Primary Reasoning */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <Target className="h-5 w-5 text-blue-600" />
                  Primary Reasoning
                </h4>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm text-blue-900">{selectedRecData.reasoning.primary}</p>
                </div>
              </div>

              {/* Contributing Factors */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Contributing Factors
                </h4>
                <div className="space-y-2">
                  {selectedRecData.reasoning.factors.map((factor, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Constraints Validated */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Constraints Validated
                </h4>
                <div className="space-y-2">
                  {selectedRecData.reasoning.constraints.map((constraint, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{constraint}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alternative Options */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <MapPin className="h-5 w-5 text-gray-600" />
                  Alternative Options Considered
                </h4>
                <div className="space-y-3">
                  {selectedRecData.reasoning.alternatives.map((alt, i) => (
                    <div key={i} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">{alt.block}</span>
                        <Badge variant="secondary">Score: {alt.score}/100</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{alt.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impact Summary */}
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                <h4 className="mb-3 font-semibold text-blue-900">Expected Impact</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-blue-700">Re-handles Saved</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {selectedRecData.impact.rehandlingSaved}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-700">Time Saved</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {selectedRecData.impact.timeSaved}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-700">Cost Saved</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {selectedRecData.impact.costSaved}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExplain(false)}>
              Close
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (selectedRecData) {
                  handleAccept(selectedRecData.id);
                  setShowExplain(false);
                }
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Accept Recommendation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
