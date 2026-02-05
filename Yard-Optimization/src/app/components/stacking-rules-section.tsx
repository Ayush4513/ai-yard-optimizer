import { useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Package,
  Weight,
  Maximize2,
  Truck,
  Ship,
  AlertTriangle,
  Clock,
  Target,
  Cloud,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Shield,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { cn } from "@/app/components/ui/utils";

interface StackingRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (checked: boolean) => void;
}

interface StackingRuleCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  rules: StackingRule[];
  numericRules?: Array<{
    id: string;
    label: string;
    value: number;
    onChange: (value: number) => void;
    unit?: string;
  }>;
}

interface StackingRulesSectionProps {
  stackingRules: any;
  setStackingRules: (rules: any) => void;
}

export function StackingRulesSection({ stackingRules, setStackingRules }: StackingRulesSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(section)) {
      newCollapsed.delete(section);
    } else {
      newCollapsed.add(section);
    }
    setCollapsedSections(newCollapsed);
  };

  const categories: StackingRuleCategory[] = [
    {
      id: "size-weight",
      title: "Size & Weight Rules",
      icon: Weight,
      color: "blue",
      rules: [
        {
          id: "likeOnLikeStacking",
          label: "Like-on-Like Stacking",
          description: "Only allow containers of same size to stack",
          enabled: stackingRules.likeOnLikeStacking,
          onChange: (checked) => setStackingRules({ ...stackingRules, likeOnLikeStacking: checked }),
        },
        {
          id: "allow20on40",
          label: "Allow 20' on 40'",
          description: "Permit 20ft containers to be stacked on top of 40ft containers",
          enabled: stackingRules.allow20on40,
          onChange: (checked) => setStackingRules({ ...stackingRules, allow20on40: checked }),
        },
        {
          id: "allow40on20",
          label: "Allow 40' on 20'",
          description: "Permit 40ft containers to be stacked on top of 20ft containers",
          enabled: stackingRules.allow40on20,
          onChange: (checked) => setStackingRules({ ...stackingRules, allow40on20: checked }),
        },
        {
          id: "heavyAtBottom",
          label: "Heavy Containers at Bottom",
          description: "Ensure heavier containers are placed at lower tiers",
          enabled: stackingRules.heavyAtBottom,
          onChange: (checked) => setStackingRules({ ...stackingRules, heavyAtBottom: checked }),
        },
      ],
      numericRules: [
        {
          id: "maxWeightPerTier",
          label: "Max Weight per Tier",
          value: stackingRules.maxWeightPerTier,
          onChange: (value) => setStackingRules({ ...stackingRules, maxWeightPerTier: value }),
          unit: "kg",
        },
        {
          id: "maxTierPerBlock",
          label: "Max Tier per Block",
          value: stackingRules.maxTierPerBlock,
          onChange: (value) => setStackingRules({ ...stackingRules, maxTierPerBlock: value }),
          unit: "tiers",
        },
      ],
    },
    {
      id: "container-type",
      title: "Container Type & Segregation",
      icon: Package,
      color: "green",
      rules: [
        {
          id: "fullEmptySegregation",
          label: "Full/Empty Segregation",
          description: "Separate full and empty containers in different stacks",
          enabled: stackingRules.fullEmptySegregation,
          onChange: (checked) => setStackingRules({ ...stackingRules, fullEmptySegregation: checked }),
        },
        {
          id: "reeferInReeferBlocksOnly",
          label: "Reefer Containers in Reefer Blocks Only",
          description: "Restrict reefer containers to designated power-enabled blocks",
          enabled: stackingRules.reeferInReeferBlocksOnly,
          onChange: (checked) => setStackingRules({ ...stackingRules, reeferInReeferBlocksOnly: checked }),
        },
        {
          id: "hazardousSegregation",
          label: "Hazardous Cargo Segregation",
          description: "Enforce DG class separation and safety distances",
          enabled: stackingRules.hazardousSegregation,
          onChange: (checked) => setStackingRules({ ...stackingRules, hazardousSegregation: checked }),
        },
        {
          id: "oogSegregation",
          label: "Out of Gauge Segregation",
          description: "Separate oversized cargo from standard containers",
          enabled: stackingRules.oogSegregation,
          onChange: (checked) => setStackingRules({ ...stackingRules, oogSegregation: checked }),
        },
        {
          id: "customsClearedSegregation",
          label: "Customs Cleared Segregation",
          description: "Separate customs-cleared from pending containers",
          enabled: stackingRules.customsClearedSegregation,
          onChange: (checked) => setStackingRules({ ...stackingRules, customsClearedSegregation: checked }),
        },
      ],
    },
    {
      id: "movement-priority",
      title: "Movement & Priority Rules",
      icon: Target,
      color: "orange",
      rules: [
        {
          id: "vesselCutoffPriority",
          label: "Vessel Cutoff Priority",
          description: "Prioritize containers with approaching vessel cutoffs",
          enabled: stackingRules.vesselCutoffPriority,
          onChange: (checked) => setStackingRules({ ...stackingRules, vesselCutoffPriority: checked }),
        },
        {
          id: "earlyDeliveryOnTop",
          label: "Early Delivery on Top",
          description: "Place containers with early delivery dates at top tiers",
          enabled: stackingRules.earlyDeliveryOnTop,
          onChange: (checked) => setStackingRules({ ...stackingRules, earlyDeliveryOnTop: checked }),
        },
        {
          id: "lateArrivalsOnTop",
          label: "Late Arrivals on Top",
          description: "Stack recently arrived containers at accessible positions",
          enabled: stackingRules.lateArrivalsOnTop,
          onChange: (checked) => setStackingRules({ ...stackingRules, lateArrivalsOnTop: checked }),
        },
        {
          id: "earlyCutoffOnTop",
          label: "Early Cutoff on Top",
          description: "Keep urgent cutoff containers easily accessible",
          enabled: stackingRules.earlyCutoffOnTop,
          onChange: (checked) => setStackingRules({ ...stackingRules, earlyCutoffOnTop: checked }),
        },
        {
          id: "examHoldContainers",
          label: "Exam/Hold Container Handling",
          description: "Stack containers under hold separately for easy access",
          enabled: stackingRules.examHoldContainers,
          onChange: (checked) => setStackingRules({ ...stackingRules, examHoldContainers: checked }),
        },
      ],
    },
    {
      id: "yard-positioning",
      title: "Yard Positioning & Zones",
      icon: Maximize2,
      color: "purple",
      rules: [
        {
          id: "exportNearSeaside",
          label: "Export Containers Near Seaside",
          description: "Position export containers closer to vessel loading areas",
          enabled: stackingRules.exportNearSeaside,
          onChange: (checked) => setStackingRules({ ...stackingRules, exportNearSeaside: checked }),
        },
        {
          id: "importNearLandside",
          label: "Import Containers Near Landside",
          description: "Position import containers closer to gate for delivery",
          enabled: stackingRules.importNearLandside,
          onChange: (checked) => setStackingRules({ ...stackingRules, importNearLandside: checked }),
        },
        {
          id: "railBoundStacking",
          label: "Rail-Bound Container Stacking",
          description: "Group rail-bound containers in dedicated areas",
          enabled: stackingRules.railBoundStacking,
          onChange: (checked) => setStackingRules({ ...stackingRules, railBoundStacking: checked }),
        },
        {
          id: "dynamicBlockReassignment",
          label: "Dynamic Block Reassignment",
          description: "Allow AI to reassign blocks based on real-time demand",
          enabled: stackingRules.dynamicBlockReassignment,
          onChange: (checked) => setStackingRules({ ...stackingRules, dynamicBlockReassignment: checked }),
        },
      ],
    },
    {
      id: "vessel-planning",
      title: "Vessel Planning & Grouping",
      icon: Ship,
      color: "cyan",
      rules: [
        {
          id: "sameVesselGrouping",
          label: "Same Vessel Grouping",
          description: "Stack containers for same vessel together",
          enabled: stackingRules.sameVesselGrouping,
          onChange: (checked) => setStackingRules({ ...stackingRules, sameVesselGrouping: checked }),
        },
        {
          id: "sameBayGrouping",
          label: "Same Bay Grouping",
          description: "Group containers destined for same vessel bay",
          enabled: stackingRules.sameBayGrouping,
          onChange: (checked) => setStackingRules({ ...stackingRules, sameBayGrouping: checked }),
        },
        {
          id: "bayWiseStacking",
          label: "Bay-Wise Stacking",
          description: "Organize stacks by vessel bay plan for efficient loading",
          enabled: stackingRules.bayWiseStacking,
          onChange: (checked) => setStackingRules({ ...stackingRules, bayWiseStacking: checked }),
        },
        {
          id: "loadWindowAlignment",
          label: "Load Window Alignment",
          description: "Align stacking with vessel loading sequence windows",
          enabled: stackingRules.loadWindowAlignment,
          onChange: (checked) => setStackingRules({ ...stackingRules, loadWindowAlignment: checked }),
        },
      ],
    },
    {
      id: "operational-efficiency",
      title: "Operational Efficiency",
      icon: TrendingUp,
      color: "indigo",
      rules: [
        {
          id: "minimizeReshuffles",
          label: "Minimize Reshuffles",
          description: "Optimize stacking to reduce future container re-handling",
          enabled: stackingRules.minimizeReshuffles,
          onChange: (checked) => setStackingRules({ ...stackingRules, minimizeReshuffles: checked }),
        },
        {
          id: "balanceBlockUtilization",
          label: "Balance Block Utilization",
          description: "Distribute containers evenly across available blocks",
          enabled: stackingRules.balanceBlockUtilization,
          onChange: (checked) => setStackingRules({ ...stackingRules, balanceBlockUtilization: checked }),
        },
        {
          id: "quickAccess",
          label: "Quick Access Priority",
          description: "Ensure frequently accessed containers are easily reachable",
          enabled: stackingRules.quickAccess,
          onChange: (checked) => setStackingRules({ ...stackingRules, quickAccess: checked }),
        },
        {
          id: "noLongTravelLifts",
          label: "Minimize Equipment Travel",
          description: "Reduce long-distance equipment movements",
          enabled: stackingRules.noLongTravelLifts,
          onChange: (checked) => setStackingRules({ ...stackingRules, noLongTravelLifts: checked }),
        },
        {
          id: "emptyConsolidation",
          label: "Empty Container Consolidation",
          description: "Consolidate empty containers in dedicated zones",
          enabled: stackingRules.emptyConsolidation,
          onChange: (checked) => setStackingRules({ ...stackingRules, emptyConsolidation: checked }),
        },
      ],
      numericRules: [
        {
          id: "maxReshuffleThreshold",
          label: "Max Reshuffle Threshold",
          value: stackingRules.maxReshuffleThreshold,
          onChange: (value) => setStackingRules({ ...stackingRules, maxReshuffleThreshold: value }),
          unit: "moves",
        },
      ],
    },
    {
      id: "safety-compliance",
      title: "Safety & Compliance",
      icon: AlertTriangle,
      color: "red",
      rules: [
        {
          id: "fireLanesClear",
          label: "Fire Lanes Clear",
          description: "Maintain clear fire lanes and emergency access routes",
          enabled: stackingRules.fireLanesClear,
          onChange: (checked) => setStackingRules({ ...stackingRules, fireLanesClear: checked }),
        },
        {
          id: "visibilityRules",
          label: "Visibility Rules",
          description: "Ensure operator visibility and safe sightlines",
          enabled: stackingRules.visibilityRules,
          onChange: (checked) => setStackingRules({ ...stackingRules, visibilityRules: checked }),
        },
        {
          id: "equipmentReach",
          label: "Equipment Reach Constraints",
          description: "Respect equipment reach and lifting capacity limits",
          enabled: stackingRules.equipmentReach,
          onChange: (checked) => setStackingRules({ ...stackingRules, equipmentReach: checked }),
        },
        {
          id: "turningRadius",
          label: "Turning Radius Compliance",
          description: "Account for equipment turning radius in tight spaces",
          enabled: stackingRules.turningRadius,
          onChange: (checked) => setStackingRules({ ...stackingRules, turningRadius: checked }),
        },
      ],
    },
    {
      id: "policy-business",
      title: "Policy & Business Rules",
      icon: Target,
      color: "amber",
      rules: [
        {
          id: "lineWiseStacking",
          label: "Line-Wise Stacking",
          description: "Separate containers by shipping line",
          enabled: stackingRules.lineWiseStacking,
          onChange: (checked) => setStackingRules({ ...stackingRules, lineWiseStacking: checked }),
        },
        {
          id: "customerPriority",
          label: "Customer Priority Handling",
          description: "Give preferential treatment to priority customers",
          enabled: stackingRules.customerPriority,
          onChange: (checked) => setStackingRules({ ...stackingRules, customerPriority: checked }),
        },
        {
          id: "dontStackUnknownDeep",
          label: "Don't Stack Unknown Deep",
          description: "Avoid deep stacking of containers with uncertain delivery dates",
          enabled: stackingRules.dontStackUnknownDeep,
          onChange: (checked) => setStackingRules({ ...stackingRules, dontStackUnknownDeep: checked }),
        },
        {
          id: "expressVipLanes",
          label: "Express/VIP Lanes",
          description: "Maintain dedicated fast lanes for express cargo",
          enabled: stackingRules.expressVipLanes,
          onChange: (checked) => setStackingRules({ ...stackingRules, expressVipLanes: checked }),
        },
      ],
    },
    {
      id: "gate-customs",
      title: "Gate & Customs Operations",
      icon: Truck,
      color: "teal",
      rules: [
        {
          id: "gateFreezeProtection",
          label: "Gate Freeze Protection",
          description: "Prevent gate congestion during peak hours",
          enabled: stackingRules.gateFreezeProtection,
          onChange: (checked) => setStackingRules({ ...stackingRules, gateFreezeProtection: checked }),
        },
        {
          id: "preAdvisedPrioritization",
          label: "Pre-Advised Prioritization",
          description: "Prioritize pre-advised container arrivals",
          enabled: stackingRules.preAdvisedPrioritization,
          onChange: (checked) => setStackingRules({ ...stackingRules, preAdvisedPrioritization: checked }),
        },
        {
          id: "holdFirstStacking",
          label: "Hold-First Stacking",
          description: "Stack held containers separately for inspection access",
          enabled: stackingRules.holdFirstStacking,
          onChange: (checked) => setStackingRules({ ...stackingRules, holdFirstStacking: checked }),
        },
        {
          id: "releaseBasedPromotion",
          label: "Release-Based Promotion",
          description: "Move released containers to accessible positions",
          enabled: stackingRules.releaseBasedPromotion,
          onChange: (checked) => setStackingRules({ ...stackingRules, releaseBasedPromotion: checked }),
        },
      ],
    },
    {
      id: "advanced",
      title: "Advanced & AI Learning",
      icon: Zap,
      color: "violet",
      rules: [
        {
          id: "costAwareStacking",
          label: "Cost-Aware Stacking",
          description: "Optimize stacking considering operational costs",
          enabled: stackingRules.costAwareStacking,
          onChange: (checked) => setStackingRules({ ...stackingRules, costAwareStacking: checked }),
        },
        {
          id: "fuelOptimization",
          label: "Fuel Optimization",
          description: "Minimize fuel consumption in equipment movements",
          enabled: stackingRules.fuelOptimization,
          onChange: (checked) => setStackingRules({ ...stackingRules, fuelOptimization: checked }),
        },
        {
          id: "historicalPatternReuse",
          label: "Historical Pattern Reuse",
          description: "Learn from past successful stacking patterns",
          enabled: stackingRules.historicalPatternReuse,
          onChange: (checked) => setStackingRules({ ...stackingRules, historicalPatternReuse: checked }),
        },
        {
          id: "supervisorOverride",
          label: "Supervisor Override Allowed",
          description: "Allow supervisors to manually override AI recommendations",
          enabled: stackingRules.supervisorOverride,
          onChange: (checked) => setStackingRules({ ...stackingRules, supervisorOverride: checked }),
        },
        {
          id: "breakRuleForCutoff",
          label: "Break Rules for Urgent Cutoffs",
          description: "Allow rule exceptions for critical vessel cutoffs",
          enabled: stackingRules.breakRuleForCutoff,
          onChange: (checked) => setStackingRules({ ...stackingRules, breakRuleForCutoff: checked }),
        },
      ],
    },
  ];

  const filteredCategories = categories.map((category) => ({
    ...category,
    rules: category.rules.filter(
      (rule) =>
        rule.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((category) => category.rules.length > 0 || !searchQuery);

  const enabledRulesCount = Object.values(stackingRules).filter(v => v === true).length;
  const totalBooleanRules = Object.values(stackingRules).filter(v => typeof v === 'boolean').length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Rules</p>
                <p className="text-2xl font-bold">{enabledRulesCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Rules</p>
                <p className="text-2xl font-bold">{totalBooleanRules}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Compliance</p>
                <p className="text-2xl font-bold">{Math.round((enabledRulesCount / totalBooleanRules) * 100)}%</p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search stacking rules..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const allEnabled = Object.fromEntries(
              Object.keys(stackingRules).map((key) => [
                key,
                typeof stackingRules[key] === 'boolean' ? true : stackingRules[key],
              ])
            );
            setStackingRules(allEnabled);
          }}
        >
          Enable All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const allDisabled = Object.fromEntries(
              Object.keys(stackingRules).map((key) => [
                key,
                typeof stackingRules[key] === 'boolean' ? false : stackingRules[key],
              ])
            );
            setStackingRules(allDisabled);
          }}
        >
          Disable All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (collapsedSections.size === 0) {
              setCollapsedSections(new Set(categories.map(c => c.id)));
            } else {
              setCollapsedSections(new Set());
            }
          }}
        >
          {collapsedSections.size === 0 ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>

      {/* Rule Categories */}
      <div className="space-y-4">
        {filteredCategories.map((category) => {
          const isCollapsed = collapsedSections.has(category.id);
          const Icon = category.icon;
          const categoryEnabledCount = category.rules.filter(r => r.enabled).length;

          return (
            <Card key={category.id}>
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection(category.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      `bg-${category.color}-100`
                    )}>
                      <Icon className={cn("h-5 w-5", `text-${category.color}-600`)} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{category.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {categoryEnabledCount} of {category.rules.length} enabled
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {categoryEnabledCount}/{category.rules.length}
                    </Badge>
                    {isCollapsed ? (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {!isCollapsed && (
                <CardContent className="space-y-3 pt-0">
                  {category.rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-start justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Label htmlFor={rule.id} className="font-medium cursor-pointer">
                            {rule.label}
                          </Label>
                          {rule.enabled && (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600">{rule.description}</p>
                      </div>
                      <Switch
                        id={rule.id}
                        checked={rule.enabled}
                        onCheckedChange={rule.onChange}
                      />
                    </div>
                  ))}

                  {category.numericRules && category.numericRules.length > 0 && (
                    <>
                      <div className="my-3 border-t border-gray-200" />
                      {category.numericRules.map((numRule) => (
                        <div key={numRule.id} className="rounded-lg border border-gray-200 p-3">
                          <Label htmlFor={numRule.id} className="text-sm font-medium">
                            {numRule.label}
                          </Label>
                          <div className="mt-2 flex items-center gap-2">
                            <Input
                              id={numRule.id}
                              type="number"
                              value={numRule.value}
                              onChange={(e) => numRule.onChange(parseInt(e.target.value) || 0)}
                              className="w-32"
                            />
                            {numRule.unit && (
                              <span className="text-sm text-gray-600">{numRule.unit}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {searchQuery && filteredCategories.every(c => c.rules.length === 0) && (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600">No rules found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}