import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Copy,
  FlaskConical,
  Minus,
  Play,
  RotateCcw,
  Save,
  Sliders,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Slider } from "@/app/components/ui/slider";
import { Separator } from "@/app/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { cn } from "@/app/components/ui/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

interface ScenarioResult {
  rehandlingMoves: number;
  avgDwellTime: number;
  throughput: number;
  congestionScore: number;
  cost: number;
}

const baselineResults: ScenarioResult = {
  rehandlingMoves: 45,
  avgDwellTime: 3.2,
  throughput: 127,
  congestionScore: 68,
  cost: 2400,
};

export function SimulatorPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [scenarioName, setScenarioName] = useState("Scenario 1");

  // Constraint weights (0-100)
  const [weights, setWeights] = useState({
    rehandling: 80,
    dwellTime: 60,
    throughput: 70,
    congestion: 50,
  });

  // Scenario parameters
  const [params, setParams] = useState({
    arrivalVolume: 100, // percentage of normal
    vesselDelay: 0, // hours
    equipmentAvail: 100, // percentage
    weatherImpact: 0, // 0-100 severity
  });

  const [simulatedResults, setSimulatedResults] = useState<ScenarioResult>(baselineResults);

  const runSimulation = () => {
    setIsRunning(true);
    
    // Simulate computation delay
    setTimeout(() => {
      // Mock calculation based on weights and parameters
      const rehandlingImpact = (100 - weights.rehandling) / 100;
      const volumeImpact = params.arrivalVolume / 100;
      const equipmentImpact = params.equipmentAvail / 100;
      
      setSimulatedResults({
        rehandlingMoves: Math.round(baselineResults.rehandlingMoves * rehandlingImpact * volumeImpact),
        avgDwellTime: Number((baselineResults.avgDwellTime * (1 + params.vesselDelay / 24)).toFixed(1)),
        throughput: Math.round(baselineResults.throughput * volumeImpact * equipmentImpact),
        congestionScore: Math.min(100, Math.round(baselineResults.congestionScore * volumeImpact * (1 + params.weatherImpact / 100))),
        cost: Math.round(baselineResults.cost * rehandlingImpact * volumeImpact),
      });
      
      setIsRunning(false);
      setHasRun(true);
    }, 2000);
  };

  const resetSimulation = () => {
    setWeights({
      rehandling: 80,
      dwellTime: 60,
      throughput: 70,
      congestion: 50,
    });
    setParams({
      arrivalVolume: 100,
      vesselDelay: 0,
      equipmentAvail: 100,
      weatherImpact: 0,
    });
    setSimulatedResults(baselineResults);
    setHasRun(false);
  };

  const getComparisonBadge = (baseline: number, simulated: number, lowerIsBetter: boolean = true) => {
    const diff = simulated - baseline;
    const pct = ((diff / baseline) * 100).toFixed(1);
    const isImprovement = lowerIsBetter ? diff < 0 : diff > 0;
    
    if (Math.abs(diff) < 0.5) {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-700">
          <Minus className="mr-1 h-3 w-3" />
          No change
        </Badge>
      );
    }
    
    return (
      <Badge
        variant="secondary"
        className={cn(
          isImprovement ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        )}
      >
        {isImprovement ? (
          <TrendingDown className="mr-1 h-3 w-3" />
        ) : (
          <TrendingUp className="mr-1 h-3 w-3" />
        )}
        {diff > 0 ? "+" : ""}
        {pct}%
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">What-If Simulator</h2>
          <p className="text-sm text-gray-600">
            Test different scenarios and optimization parameters to predict yard performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetSimulation}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save Scenario
          </Button>
          <Button variant="outline">
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <FlaskConical className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Simulation Mode</AlertTitle>
        <AlertDescription className="text-blue-700">
          Adjust constraints and parameters to see predicted impact on yard operations. Results are estimates based on AI models.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Constraint Weights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="h-5 w-5" />
                Optimization Constraints
              </CardTitle>
              <CardDescription>
                Adjust weight priorities for the optimization engine
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Re-handling Weight */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rehandling" className="text-sm font-medium">
                    Minimize Re-handling
                  </Label>
                  <span className="text-sm font-semibold text-blue-600">
                    {weights.rehandling}%
                  </span>
                </div>
                <Slider
                  id="rehandling"
                  value={[weights.rehandling]}
                  onValueChange={(value) => setWeights({ ...weights, rehandling: value[0] })}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">
                  Higher weight reduces container reshuffles but may increase dwell time
                </p>
              </div>

              <Separator />

              {/* Dwell Time Weight */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="dwelltime" className="text-sm font-medium">
                    Minimize Dwell Time
                  </Label>
                  <span className="text-sm font-semibold text-blue-600">
                    {weights.dwellTime}%
                  </span>
                </div>
                <Slider
                  id="dwelltime"
                  value={[weights.dwellTime]}
                  onValueChange={(value) => setWeights({ ...weights, dwellTime: value[0] })}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">
                  Higher weight prioritizes faster container turnover
                </p>
              </div>

              <Separator />

              {/* Throughput Weight */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="throughput" className="text-sm font-medium">
                    Maximize Throughput
                  </Label>
                  <span className="text-sm font-semibold text-blue-600">
                    {weights.throughput}%
                  </span>
                </div>
                <Slider
                  id="throughput"
                  value={[weights.throughput]}
                  onValueChange={(value) => setWeights({ ...weights, throughput: value[0] })}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">
                  Higher weight optimizes for maximum container movement
                </p>
              </div>

              <Separator />

              {/* Congestion Weight */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="congestion" className="text-sm font-medium">
                    Minimize Congestion
                  </Label>
                  <span className="text-sm font-semibold text-blue-600">
                    {weights.congestion}%
                  </span>
                </div>
                <Slider
                  id="congestion"
                  value={[weights.congestion]}
                  onValueChange={(value) => setWeights({ ...weights, congestion: value[0] })}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">
                  Higher weight distributes load evenly across yard zones
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Scenario Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Scenario Parameters</CardTitle>
              <CardDescription>
                Simulate different operational conditions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Arrival Volume */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Container Arrival Volume</Label>
                  <span className="text-sm font-semibold text-blue-600">
                    {params.arrivalVolume}%
                  </span>
                </div>
                <Slider
                  value={[params.arrivalVolume]}
                  onValueChange={(value) => setParams({ ...params, arrivalVolume: value[0] })}
                  min={50}
                  max={150}
                  step={10}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">
                  Percentage of normal daily volume (100% = baseline)
                </p>
              </div>

              <Separator />

              {/* Vessel Delay */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Vessel Delay</Label>
                  <span className="text-sm font-semibold text-blue-600">
                    {params.vesselDelay}h
                  </span>
                </div>
                <Slider
                  value={[params.vesselDelay]}
                  onValueChange={(value) => setParams({ ...params, vesselDelay: value[0] })}
                  min={0}
                  max={24}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">
                  Simulated delay in vessel arrival/departure (hours)
                </p>
              </div>

              <Separator />

              {/* Equipment Availability */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Equipment Availability</Label>
                  <span className="text-sm font-semibold text-blue-600">
                    {params.equipmentAvail}%
                  </span>
                </div>
                <Slider
                  value={[params.equipmentAvail]}
                  onValueChange={(value) => setParams({ ...params, equipmentAvail: value[0] })}
                  min={50}
                  max={100}
                  step={10}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">
                  Percentage of cranes and handling equipment operational
                </p>
              </div>

              <Separator />

              {/* Weather Impact */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Weather Impact</Label>
                  <span className="text-sm font-semibold text-blue-600">
                    {params.weatherImpact}%
                  </span>
                </div>
                <Slider
                  value={[params.weatherImpact]}
                  onValueChange={(value) => setParams({ ...params, weatherImpact: value[0] })}
                  min={0}
                  max={100}
                  step={10}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">
                  Severity of weather affecting operations (0 = clear, 100 = severe)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Run Simulation Button */}
          <Button
            className="w-full h-12 text-lg"
            onClick={runSimulation}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <FlaskConical className="mr-2 h-5 w-5 animate-pulse" />
                Running Simulation...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Run Simulation
              </>
            )}
          </Button>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {/* Quick Presets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Presets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setWeights({ rehandling: 90, dwellTime: 50, throughput: 60, congestion: 40 });
                }}
              >
                Focus: Minimize Re-handling
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setWeights({ rehandling: 60, dwellTime: 90, throughput: 70, congestion: 50 });
                }}
              >
                Focus: Fast Turnover
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setWeights({ rehandling: 50, dwellTime: 50, throughput: 90, congestion: 70 });
                }}
              >
                Focus: Maximum Throughput
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setWeights({ rehandling: 70, dwellTime: 70, throughput: 70, congestion: 70 });
                }}
              >
                Balanced Optimization
              </Button>
            </CardContent>
          </Card>

          {/* Simulation Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Simulation Status</CardTitle>
            </CardHeader>
            <CardContent>
              {!hasRun ? (
                <div className="text-center text-gray-600 py-4">
                  <AlertCircle className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                  <p className="text-sm">Configure parameters and run simulation</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Simulation Complete</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Scenario: {scenarioName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Computed in 1.8 seconds
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warnings */}
          {hasRun && params.arrivalVolume > 120 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-orange-900">High Volume Alert</div>
                    <p className="mt-1 text-sm text-orange-700">
                      Arrival volume exceeds optimal capacity. Consider additional resources.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Results Comparison */}
      {hasRun && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Results Comparison
            </CardTitle>
            <CardDescription>
              Simulated results vs current baseline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Re-handling Moves */}
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-1">Re-handling Moves</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {simulatedResults.rehandlingMoves}
                    </span>
                    <span className="text-sm text-gray-500">vs {baselineResults.rehandlingMoves}</span>
                  </div>
                </div>
                {getComparisonBadge(baselineResults.rehandlingMoves, simulatedResults.rehandlingMoves, true)}
              </div>

              {/* Avg Dwell Time */}
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-1">Avg Dwell Time (days)</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {simulatedResults.avgDwellTime}
                    </span>
                    <span className="text-sm text-gray-500">vs {baselineResults.avgDwellTime}</span>
                  </div>
                </div>
                {getComparisonBadge(baselineResults.avgDwellTime, simulatedResults.avgDwellTime, true)}
              </div>

              {/* Throughput */}
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-1">Daily Throughput (TEU)</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {simulatedResults.throughput}
                    </span>
                    <span className="text-sm text-gray-500">vs {baselineResults.throughput}</span>
                  </div>
                </div>
                {getComparisonBadge(baselineResults.throughput, simulatedResults.throughput, false)}
              </div>

              {/* Congestion Score */}
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-1">Congestion Score</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {simulatedResults.congestionScore}
                    </span>
                    <span className="text-sm text-gray-500">vs {baselineResults.congestionScore}</span>
                  </div>
                </div>
                {getComparisonBadge(baselineResults.congestionScore, simulatedResults.congestionScore, true)}
              </div>

              {/* Operational Cost */}
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-1">Daily Operational Cost</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">
                      ${simulatedResults.cost}
                    </span>
                    <span className="text-sm text-gray-500">vs ${baselineResults.cost}</span>
                  </div>
                </div>
                {getComparisonBadge(baselineResults.cost, simulatedResults.cost, true)}
              </div>

              {/* Overall Impact */}
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                <div className="mb-2">
                  <div className="text-sm text-blue-700 mb-1 font-semibold">Overall Impact</div>
                  <div className="text-3xl font-bold text-blue-900">
                    {simulatedResults.cost < baselineResults.cost ? "Positive" : "Negative"}
                  </div>
                </div>
                <p className="text-sm text-blue-700">
                  {simulatedResults.cost < baselineResults.cost 
                    ? "This scenario improves operational efficiency"
                    : "This scenario may reduce efficiency"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}