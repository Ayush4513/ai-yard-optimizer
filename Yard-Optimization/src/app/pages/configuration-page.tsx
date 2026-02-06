import { useState } from "react";
import {
  Settings,
  Save,
  RotateCcw,
  Layers,
  Shield,
  Zap,
  Database,
  Bell,
  Users,
  Download,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Switch } from "@/app/components/ui/switch";
import { Slider } from "@/app/components/ui/slider";
import { Separator } from "@/app/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { StackingRulesSection } from "@/app/components/stacking-rules-section";

export function ConfigurationPage() {
  const [saved, setSaved] = useState(false);

  // Yard Configuration
  const [yardConfig, setYardConfig] = useState({
    totalCapacity: 3500,
    maxStackHeight: 4,
    equipmentType: "rtg",
    reeferPlugs: 40,
  });

  // AI Configuration
  const [aiConfig, setAiConfig] = useState({
    autoOptimization: true,
    confidenceThreshold: 85,
    planningHorizon: 24,
    reoptimizeInterval: 60,
  });

  // Segregation Rules
  const [segregationRules, setSegregationRules] = useState({
    exportImportSeparate: true,
    dgSegregation: true,
    minDgDistance: 10,
    reeferZoneOnly: true,
  });

  // Notification Settings
  const [notifications, setNotifications] = useState({
    congestionAlerts: true,
    rehandlingWarnings: true,
    cutoffReminders: true,
    performanceReports: true,
  });

  // Stacking Rules
  const [stackingRules, setStackingRules] = useState({
    // Size Compatibility
    likeOnLikeStacking: true,
    allow20on40: false,
    allow40on20: false,
    
    // Weight
    heavyAtBottom: true,
    maxWeightPerTier: 30000,
    
    // Height Limits
    maxTierPerBlock: 5,
    
    // Load Status
    fullEmptySegregation: true,
    emptyManualStack: false,
    
    // Container Type
    reeferInReeferBlocksOnly: true,
    hazardousSegregation: true,
    oogSegregation: true,
    customsClearedSegregation: false,
    
    // Movement Priority
    examHoldContainers: true,
    vesselCutoffPriority: true,
    earlyDeliveryOnTop: false,
    
    // Inbound/Outbound Mode
    exportNearSeaside: true,
    importNearLandside: true,
    railBoundStacking: false,
    
    // Vessel Planning
    sameVesselGrouping: true,
    sameBayGrouping: false,
    
    // Equipment Constraints
    equipmentReach: true,
    turningRadius: true,
    
    // Safety & Access
    fireLanesClear: true,
    visibilityRules: true,
    
    // Operational Efficiency
    minimizeRehandles: true,
    balanceBlockUtilization: true,
    
    // Policy Rules
    lineWiseStacking: false,
    customerPriority: true,
    dontStackUnknownDeep: true,
    
    // Priority Handling
    lateArrivalsOnTop: true,
    earlyCutoffOnTop: true,
    expressVipLanes: false,
    
    // Yard Zoning
    dynamicBlockReassignment: false,
    
    // Stack Evolution
    overflowRules: true,
    neverFreezeStackEarly: false,
    closeStackPostCutoff: true,
    
    // Equipment Ops
    oneEquipmentPerBlock: false,
    noLongTravelLifts: true,
    quickAccess: true,
    timeSlotProtection: false,
    
    // Shift Planning
    nightShiftStacking: false,
    
    // Gate Operations
    gateFreezeProtection: true,
    preAdvisedPrioritization: true,
    
    // Customs & Holds
    holdFirstStacking: true,
    releaseBasedPromotion: false,
    
    // Warehouse Sync
    stuffingCompleteSignal: false,
    partialStuffingBuffers: false,
    
    // Vessel Ops
    bayWiseStacking: false,
    loadWindowAlignment: true,
    
    // Rehandle Control
    maxRehandleThreshold: 3,
    rehandleBatching: false,
    
    // Empty Ops
    emptyConsolidation: true,
    agileWiseStacking: false,
    
    // Weather Rules
    windLimitStacking: false,
    rainBuffer: false,
    
    // Exception Handling
    breakRuleForCutoff: true,
    supervisorOverride: true,
    familiarStacks: false,
    visualSimplicity: true,
    
    // Cost Control
    costAwareStacking: false,
    fuelOptimization: false,
    
    // Learning Rules
    historicalPatternReuse: false,
    lowRiskTaggedForFuture: false,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configuration</h2>
          <p className="text-sm text-gray-600">
            Manage yard settings, optimization parameters, and system preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import Config
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Config
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Success Message */}
      {saved && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">Configuration Saved</AlertTitle>
          <AlertDescription className="text-green-700">
            Your changes have been successfully saved and will take effect immediately.
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration Tabs */}
      <Tabs defaultValue="yard" className="w-full">
        <TabsList className="grid w-full max-w-4xl grid-cols-6">
          <TabsTrigger value="yard">
            <Layers className="mr-2 h-4 w-4" />
            Yard
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Zap className="mr-2 h-4 w-4" />
            AI Engine
          </TabsTrigger>
          <TabsTrigger value="stacking">
            <Layers className="mr-2 h-4 w-4" />
            Stacking Rules
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Shield className="mr-2 h-4 w-4" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Database className="mr-2 h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Yard Configuration */}
        <TabsContent value="yard" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Yard Layout</CardTitle>
              <CardDescription>
                Configure physical yard parameters and capacity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Total Capacity (TEU)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={yardConfig.totalCapacity}
                    onChange={(e) =>
                      setYardConfig({ ...yardConfig, totalCapacity: parseInt(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-gray-600">Maximum container storage capacity</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stackheight">Max Stack Height (tiers)</Label>
                  <Select
                    value={yardConfig.maxStackHeight.toString()}
                    onValueChange={(value) =>
                      setYardConfig({ ...yardConfig, maxStackHeight: parseInt(value) })
                    }
                  >
                    <SelectTrigger id="stackheight">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 tiers</SelectItem>
                      <SelectItem value="4">4 tiers</SelectItem>
                      <SelectItem value="5">5 tiers</SelectItem>
                      <SelectItem value="6">6 tiers</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600">Maximum container stacking height</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment">Primary Equipment Type</Label>
                  <Select
                    value={yardConfig.equipmentType}
                    onValueChange={(value) => setYardConfig({ ...yardConfig, equipmentType: value })}
                  >
                    <SelectTrigger id="equipment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rtg">RTG (Rubber Tyred Gantry)</SelectItem>
                      <SelectItem value="rmg">RMG (Rail Mounted Gantry)</SelectItem>
                      <SelectItem value="reachstacker">Reach Stacker</SelectItem>
                      <SelectItem value="mixed">Mixed Equipment</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600">Primary yard handling equipment</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reefer">Reefer Power Plugs</Label>
                  <Input
                    id="reefer"
                    type="number"
                    value={yardConfig.reeferPlugs}
                    onChange={(e) =>
                      setYardConfig({ ...yardConfig, reeferPlugs: parseInt(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-gray-600">Available reefer container plugs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Zone Configuration</CardTitle>
              <CardDescription>
                Manage yard zones and block assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Export Zone</div>
                    <div className="mt-1 text-2xl font-bold text-blue-600">8</div>
                    <div className="text-xs text-gray-600">blocks</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Import Zone</div>
                    <div className="mt-1 text-2xl font-bold text-green-600">8</div>
                    <div className="text-xs text-gray-600">blocks</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Empty Zone</div>
                    <div className="mt-1 text-2xl font-bold text-gray-600">4</div>
                    <div className="text-xs text-gray-600">blocks</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Reefer Zone</div>
                    <div className="mt-1 text-2xl font-bold text-cyan-600">2</div>
                    <div className="text-xs text-gray-600">blocks</div>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Configure Zones & Blocks
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Engine Configuration */}
        <TabsContent value="ai" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Optimization Settings</CardTitle>
              <CardDescription>
                Configure AI engine behavior and automation levels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-opt" className="text-base font-semibold">
                    Auto-Optimization
                  </Label>
                  <p className="text-sm text-gray-600">
                    Automatically apply high-confidence recommendations
                  </p>
                </div>
                <Switch
                  id="auto-opt"
                  checked={aiConfig.autoOptimization}
                  onCheckedChange={(checked) =>
                    setAiConfig({ ...aiConfig, autoOptimization: checked })
                  }
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    AI Confidence Threshold
                  </Label>
                  <span className="text-sm font-semibold text-blue-600">
                    {aiConfig.confidenceThreshold}%
                  </span>
                </div>
                <Slider
                  value={[aiConfig.confidenceThreshold]}
                  onValueChange={(value) =>
                    setAiConfig({ ...aiConfig, confidenceThreshold: value[0] })
                  }
                  min={70}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">
                  Minimum confidence score for auto-applying recommendations
                </p>
              </div>

              <Separator />

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="horizon">Planning Horizon (hours)</Label>
                  <Select
                    value={aiConfig.planningHorizon.toString()}
                    onValueChange={(value) =>
                      setAiConfig({ ...aiConfig, planningHorizon: parseInt(value) })
                    }
                  >
                    <SelectTrigger id="horizon">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="48">48 hours</SelectItem>
                      <SelectItem value="72">72 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600">Forward-looking optimization window</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interval">Re-optimize Interval (minutes)</Label>
                  <Select
                    value={aiConfig.reoptimizeInterval.toString()}
                    onValueChange={(value) =>
                      setAiConfig({ ...aiConfig, reoptimizeInterval: parseInt(value) })
                    }
                  >
                    <SelectTrigger id="interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="120">120 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600">How often to recalculate plans</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Optimization Objectives</CardTitle>
              <CardDescription>
                Set default weights for optimization goals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Minimize Re-handling</span>
                    <Badge variant="secondary">80%</Badge>
                  </div>
                  <Slider value={[80]} max={100} className="w-full" />
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Minimize Dwell Time</span>
                    <Badge variant="secondary">60%</Badge>
                  </div>
                  <Slider value={[60]} max={100} className="w-full" />
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Maximize Throughput</span>
                    <Badge variant="secondary">70%</Badge>
                  </div>
                  <Slider value={[70]} max={100} className="w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stacking Rules */}
        <TabsContent value="stacking" className="mt-6">
          <StackingRulesSection 
            stackingRules={stackingRules}
            setStackingRules={setStackingRules}
          />
        </TabsContent>

        {/* Rules & Constraints */}
        <TabsContent value="rules" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Segregation Rules</CardTitle>
              <CardDescription>
                Configure container segregation and safety constraints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">
                    Separate Export & Import Zones
                  </Label>
                  <p className="text-sm text-gray-600">
                    Enforce strict separation between export and import containers
                  </p>
                </div>
                <Switch
                  checked={segregationRules.exportImportSeparate}
                  onCheckedChange={(checked) =>
                    setSegregationRules({ ...segregationRules, exportImportSeparate: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">
                    DG Segregation Enforcement
                  </Label>
                  <p className="text-sm text-gray-600">
                    Automatically enforce hazardous cargo segregation rules
                  </p>
                </div>
                <Switch
                  checked={segregationRules.dgSegregation}
                  onCheckedChange={(checked) =>
                    setSegregationRules({ ...segregationRules, dgSegregation: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">
                    Reefer Zone Only
                  </Label>
                  <p className="text-sm text-gray-600">
                    Keep reefer containers in designated power-enabled blocks
                  </p>
                </div>
                <Switch
                  checked={segregationRules.reeferZoneOnly}
                  onCheckedChange={(checked) =>
                    setSegregationRules({ ...segregationRules, reeferZoneOnly: checked })
                  }
                />
              </div>

              <div className="space-y-2 rounded-lg border border-gray-200 p-4">
                <Label htmlFor="dgdistance">Minimum DG Distance (meters)</Label>
                <Input
                  id="dgdistance"
                  type="number"
                  value={segregationRules.minDgDistance}
                  onChange={(e) =>
                    setSegregationRules({
                      ...segregationRules,
                      minDgDistance: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>TOS Integration</CardTitle>
              <CardDescription>
                Connect to your Terminal Operating System
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tos-endpoint">TOS API Endpoint</Label>
                <Input
                  id="tos-endpoint"
                  type="url"
                  placeholder="https://your-tos-system.com/api"
                />
                <p className="text-xs text-gray-600">URL endpoint for TOS API integration</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tos-key">API Key</Label>
                <Input
                  id="tos-key"
                  type="password"
                  placeholder="Enter your API key"
                />
                <p className="text-xs text-gray-600">Authentication key for TOS system</p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">
                    Sync Status
                  </Label>
                  <p className="text-sm text-gray-600">
                    Last synchronized: Never
                  </p>
                </div>
                <Button variant="outline">Test Connection</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ERP Integration</CardTitle>
              <CardDescription>
                Connect to your Enterprise Resource Planning system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="erp-endpoint">ERP API Endpoint</Label>
                <Input
                  id="erp-endpoint"
                  type="url"
                  placeholder="https://your-erp-system.com/api"
                />
                <p className="text-xs text-gray-600">URL endpoint for ERP API integration</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="erp-key">API Key</Label>
                <Input
                  id="erp-key"
                  type="password"
                  placeholder="Enter your API key"
                />
                <p className="text-xs text-gray-600">Authentication key for ERP system</p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">
                    Sync Status
                  </Label>
                  <p className="text-sm text-gray-600">
                    Last synchronized: Never
                  </p>
                </div>
                <Button variant="outline">Test Connection</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure notification rules and alert settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">
                    Congestion Alerts
                  </Label>
                  <p className="text-sm text-gray-600">
                    Get notified when yard reaches critical capacity levels
                  </p>
                </div>
                <Switch
                  checked={notifications.congestionAlerts}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, congestionAlerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">
                    Re-handling Warnings
                  </Label>
                  <p className="text-sm text-gray-600">
                    Alert when re-handling exceeds acceptable thresholds
                  </p>
                </div>
                <Switch
                  checked={notifications.rehandlingWarnings}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, rehandlingWarnings: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">
                    Cutoff Reminders
                  </Label>
                  <p className="text-sm text-gray-600">
                    Receive reminders for approaching vessel cutoff times
                  </p>
                </div>
                <Switch
                  checked={notifications.cutoffReminders}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, cutoffReminders: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">
                    Performance Reports
                  </Label>
                  <p className="text-sm text-gray-600">
                    Receive daily performance summary reports
                  </p>
                </div>
                <Switch
                  checked={notifications.performanceReports}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, performanceReports: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>
                Configure how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="notifications@yourcompany.com"
                />
                <p className="text-xs text-gray-600">Email address for notifications</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook">Webhook URL</Label>
                <Input
                  id="webhook"
                  type="url"
                  placeholder="https://your-webhook-endpoint.com"
                />
                <p className="text-xs text-gray-600">Webhook endpoint for real-time alerts</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4 pt-6">
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
