import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Progress } from "@/app/components/ui/progress";
import { Badge } from "@/app/components/ui/badge";
import type { YardLocation, AIRecommendation, Block } from "@/app/types/yard-optimization";

interface MetricsPanelProps {
  location: YardLocation;
  recommendation?: AIRecommendation;
  block?: Block;
}

export function MetricsPanel({ location, recommendation, block }: MetricsPanelProps) {

  if (!recommendation) {
    // Show basic location info if not a recommended location
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="text-lg">📍</span>
            <CardTitle>{location.location_id}</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {location.block_id} • Bay {location.bay} • Row {location.row} • Tier {location.tier}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-medium">Placement Score</div>
              <div className="text-3xl font-bold">75<span className="text-lg">/100</span></div>
              <Progress value={75} className="mt-2 h-3" />
            </div>

            {block && (
              <div className="border-t pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Block Utilization</span>
                  <span className="font-semibold">
                    {Math.round((block.occupied_slots / block.total_slots) * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRehandleRiskColor = (percent: number) => {
    if (percent < 20) return "text-green-600";
    if (percent < 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getRehandleRiskLabel = (percent: number) => {
    if (percent < 20) return "LOW";
    if (percent < 40) return "MEDIUM";
    return "HIGH";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-lg">📍</span>
          <CardTitle>{location.location_id}</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          {location.block_id} • Bay {location.bay} • Row {location.row} • Tier {location.tier}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall Score */}
          <div>
            <div className="mb-2 text-sm font-medium">Placement Score</div>
            <div className="text-3xl font-bold text-orange-600">
              {recommendation.score}
              <span className="text-lg">/100</span>
            </div>
            <Progress value={recommendation.score} className="mt-2 h-3" />
          </div>

          {/* Metrics Grid */}
          <div className="space-y-3 border-t pt-4">
            {/* Rehandle Risk */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Rehandle Risk</span>
                <Badge
                  variant="outline"
                  className={getRehandleRiskColor(recommendation.metrics.rehandle_risk_percent)}
                >
                  {getRehandleRiskLabel(recommendation.metrics.rehandle_risk_percent)}
                </Badge>
              </div>
              <Progress value={recommendation.metrics.rehandle_risk_percent} className="h-2" />
              <p className="mt-1 text-xs text-muted-foreground">
                {recommendation.metrics.rehandle_risk_percent}% chance of requiring rehandle
              </p>
            </div>

            {/* Retrieval Efficiency */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Retrieval Efficiency</span>
                <Badge variant="outline" className="text-green-600">
                  HIGH
                </Badge>
              </div>
              <Progress value={85} className="h-2" />
            </div>

            {/* POD Clustering */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">POD Clustering</span>
                <span className="text-sm font-semibold">
                  {recommendation.metrics.pod_cluster_match_percent}%
                </span>
              </div>
              <Progress value={recommendation.metrics.pod_cluster_match_percent} className="h-2" />
            </div>

            {/* Weight Compliance */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Weight Compliance</span>
                {recommendation.metrics.weight_stack_compliant ? (
                  <Badge variant="outline" className="text-green-600">
                    ✓ COMPLIANT
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-600">
                    ✗ NON-COMPLIANT
                  </Badge>
                )}
              </div>
              <Progress
                value={recommendation.metrics.weight_stack_compliant ? 100 : 0}
                className="h-2"
              />
            </div>
          </div>

          {/* Detail Metrics */}
          <div className="space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. Retrieval Time</span>
              <span className="font-semibold">{recommendation.estimated_retrieval_minutes} min</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Blocking Containers</span>
              <span className="font-semibold">{recommendation.metrics.blocking_containers}</span>
            </div>

            {recommendation.metrics.distance_to_quay_m && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Distance to Quay</span>
                <span className="font-semibold">{recommendation.metrics.distance_to_quay_m}m</span>
              </div>
            )}

            {recommendation.metrics.distance_to_gate_m && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Distance to Gate</span>
                <span className="font-semibold">{recommendation.metrics.distance_to_gate_m}m</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground">Block Utilization</span>
              <span className="font-semibold">{recommendation.metrics.block_utilization_percent}%</span>
            </div>
          </div>

          {/* Warnings Section */}
          {recommendation.warnings.length > 0 && (
            <div className="border-t pt-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Warnings
              </div>
              <div className="space-y-1">
                {recommendation.warnings.map((warning, idx) => (
                  <div key={idx} className="text-sm text-amber-700">
                    • {warning}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reasons Section */}
          {recommendation.reasons.length > 0 && (
            <div className="border-t pt-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Recommendation Reasons
              </div>
              <div className="space-y-1">
                {recommendation.reasons.map((reason, idx) => (
                  <div key={idx} className="text-sm text-green-700">
                    • {reason}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
