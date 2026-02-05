import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import {
  Package,
  Truck,
  Ship,
  AlertTriangle,
  Snowflake,
  MapIcon,
  Sparkles,
} from "lucide-react";
import { useAIAssistant } from "@/app/contexts/AIAssistantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Switch } from "@/app/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { toast } from "sonner";
import type { Container } from "@/app/types/yard-optimization";
import { containerAPI } from "@/services/api";
import { InspectModeTooltip } from "@/app/components/inspect-mode-tooltip";

interface ContainerEntryFormProps {
  onSubmit: (container: Container) => void;
  onCancel?: () => void;
}

export function ContainerEntryForm({ onSubmit, onCancel }: ContainerEntryFormProps) {
  const [hazmatEnabled, setHazmatEnabled] = useState(false);
  const [reeferEnabled, setReeferEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  const { extractedContainerData, clearExtractedData } = useAIAssistant();

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      container_number: "",
      iso_code: "42G1",
      size_teu: "2",
      container_type: "Dry",
      load_status: "Full",
      type: "export_container",
      customs_status: "Cleared",
      weight_mt: "",
      seal_number: "",
      cargo_description: "",
      shipping_bill_number: "",
      bill_of_lading: "",
      gate_in_time: new Date().toISOString().slice(0, 16),
      vessel_id: "",
      voyage_id: "",
      pod: "",
      pod_priority: "2",
      cutoff_datetime: "",
      expected_pickup_time: "",
      shipping_line: "",
      consignee: "",
      hazmat_flag: false,
      imdg_class: "",
      un_number: "",
      hazmat_segregation: "",
      reefer_flag: false,
      set_temperature: "",
      current_temperature: "",
      ventilation_setting: "",
      humidity_setting: "",
    },
  });

  const containerType = watch("container_type");
  const hazmatFlag = watch("hazmat_flag");
  const reeferFlag = watch("reefer_flag");
  const weightMt = watch("weight_mt");

  // Auto-fill form from extracted data
  useEffect(() => {
    if (extractedContainerData && !isAutoFilled) {
      // Populate all fields
      if (extractedContainerData.container_number) setValue("container_number", extractedContainerData.container_number);
      if (extractedContainerData.iso_code) setValue("iso_code", extractedContainerData.iso_code);
      if (extractedContainerData.size_teu) setValue("size_teu", extractedContainerData.size_teu);
      if (extractedContainerData.container_type) setValue("container_type", extractedContainerData.container_type);
      if (extractedContainerData.load_status) setValue("load_status", extractedContainerData.load_status);
      if (extractedContainerData.type) setValue("type", extractedContainerData.type);
      if (extractedContainerData.customs_status) setValue("customs_status", extractedContainerData.customs_status);
      if (extractedContainerData.weight_mt) setValue("weight_mt", extractedContainerData.weight_mt);
      if (extractedContainerData.seal_number) setValue("seal_number", extractedContainerData.seal_number);
      if (extractedContainerData.cargo_description) setValue("cargo_description", extractedContainerData.cargo_description);
      if (extractedContainerData.shipping_line) setValue("shipping_line", extractedContainerData.shipping_line);
      if (extractedContainerData.vessel_id) setValue("vessel_id", extractedContainerData.vessel_id);
      if (extractedContainerData.voyage_id) setValue("voyage_id", extractedContainerData.voyage_id);
      if (extractedContainerData.pod) setValue("pod", extractedContainerData.pod);
      if (extractedContainerData.gate_in_time) setValue("gate_in_time", extractedContainerData.gate_in_time);

      // Set flags
      if (extractedContainerData.hazmat_flag !== undefined) {
        setValue("hazmat_flag", extractedContainerData.hazmat_flag);
        setHazmatEnabled(extractedContainerData.hazmat_flag);
      }
      if (extractedContainerData.reefer_flag !== undefined) {
        setValue("reefer_flag", extractedContainerData.reefer_flag);
        setReeferEnabled(extractedContainerData.reefer_flag);
      }

      setIsAutoFilled(true);
      toast.success("Form auto-filled from document!", {
        description: "All container details have been populated. Review and submit."
      });

      // Clear extracted data after use
      clearExtractedData();
    }
  }, [extractedContainerData, isAutoFilled, setValue, clearExtractedData]);

  // Auto-enable tabs based on container type
  useEffect(() => {
    if (containerType === "Reefer") {
      setReeferEnabled(true);
      setValue("reefer_flag", true);
    } else if (containerType !== "Reefer" && reeferEnabled && !reeferFlag) {
      setReeferEnabled(false);
    }

    if (containerType === "Hazardous") {
      setHazmatEnabled(true);
      setValue("hazmat_flag", true);
    } else if (containerType !== "Hazardous" && hazmatEnabled && !hazmatFlag) {
      setHazmatEnabled(false);
    }
  }, [containerType, reeferEnabled, hazmatEnabled, reeferFlag, hazmatFlag, setValue]);

  // Calculate weight class
  const getWeightClass = (weight: string): "Heavy" | "Medium" | "Light" => {
    const w = parseFloat(weight);
    if (isNaN(w)) return "Medium";
    if (w >= 20) return "Heavy";
    if (w >= 10) return "Medium";
    return "Light";
  };

  const onFormSubmit = async (data: any) => {
    setIsSubmitting(true);

    try {
      // Generate container ID
      const containerId = `CNT-${Date.now()}`;

      // Calculate weight class
      const weight_class = getWeightClass(data.weight_mt);

      const container: Container = {
        container_id: containerId,
        container_number: data.container_number,
        iso_code: data.iso_code,
        size_teu: parseInt(data.size_teu) as 1 | 2,
        container_type: data.container_type,
        load_status: data.load_status,
        weight_mt: parseFloat(data.weight_mt),
        weight_class,
        cargo_description: data.cargo_description || "",
        seal_number: data.seal_number || undefined,
        type: data.type,
        shipping_bill_number: data.shipping_bill_number || undefined,
        bill_of_lading: data.bill_of_lading || undefined,
        customs_status: data.customs_status,
        shipping_line: data.shipping_line || undefined,
        consignee: data.consignee || undefined,
        vessel_id: data.vessel_id || undefined,
        voyage_id: data.voyage_id || undefined,
        pod: data.pod || undefined,
        pod_priority: data.pod ? parseInt(data.pod_priority) as 1 | 2 | 3 | 4 : undefined,
        cutoff_datetime: data.cutoff_datetime || undefined,
        expected_pickup_time: data.expected_pickup_time || undefined,
        hazmat_flag: data.hazmat_flag,
        imdg_class: data.hazmat_flag ? data.imdg_class : undefined,
        un_number: data.hazmat_flag ? data.un_number : undefined,
        hazmat_segregation: data.hazmat_flag ? data.hazmat_segregation : undefined,
        reefer_flag: data.reefer_flag,
        set_temperature: data.reefer_flag && data.set_temperature ? parseFloat(data.set_temperature) : undefined,
        current_temperature: data.reefer_flag && data.current_temperature ? parseFloat(data.current_temperature) : undefined,
        ventilation_setting: data.reefer_flag ? data.ventilation_setting : undefined,
        humidity_setting: data.reefer_flag && data.humidity_setting ? parseFloat(data.humidity_setting) : undefined,
        gate_in_time: data.gate_in_time,
      };

      // Save to database
      console.log("💾 Saving container to database...", container);
      const savedContainer = await containerAPI.create(container);
      console.log("✅ Container saved successfully!", savedContainer);

      toast.success(`Container ${data.container_number} saved to database!`, {
        description: "Proceed to select a stacking location."
      });
      onSubmit(savedContainer);

    } catch (error: any) {
      console.error("❌ Failed to save container:", error);
      toast.error("Failed to save container to database", {
        description: error.response?.data?.detail || error.message || "Please try again"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipToYardMap = () => {
    // Generate mock container
    const mockContainer: Container = {
      container_id: `CNT-${Date.now()}`,
      container_number: "MSCU1234567",
      iso_code: "42G1",
      size_teu: 2,
      container_type: "Dry",
      load_status: "Full",
      weight_mt: 22,
      weight_class: "Heavy",
      cargo_description: "Electronics",
      type: "export_container",
      customs_status: "Cleared",
      shipping_line: "Maersk",
      consignee: "ABC Corp",
      pod: "Singapore",
      pod_priority: 1,
      hazmat_flag: false,
      reefer_flag: false,
      gate_in_time: new Date().toISOString(),
    };

    toast.success("Viewing yard map with sample container data");
    onSubmit(mockContainer);
  };

  return (
    <Card className="mx-auto max-w-5xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Step 1: Enter Container Details</CardTitle>
            <CardDescription>
              Manually enter container information or receive from integration systems (IAL/EAL, TSM, Form 20/13)
            </CardDescription>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleSkipToYardMap}
          >
            <MapIcon className="h-4 w-4" />
            Skip to Yard Map
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Auto-fill success banner */}
        {isAutoFilled && (
          <div className="mb-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-purple-900">AI Auto-Fill Complete!</h4>
                <p className="text-sm text-purple-700">
                  All fields have been populated from your document. Review the details below and make any adjustments if needed.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onFormSubmit)}>
          <Tabs defaultValue="basic">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic" className="gap-2">
                <Package className="h-4 w-4" />
                Basic
              </TabsTrigger>
              <TabsTrigger value="cargo" className="gap-2">
                <Truck className="h-4 w-4" />
                Cargo
              </TabsTrigger>
              <TabsTrigger value="vessel" className="gap-2">
                <Ship className="h-4 w-4" />
                Vessel
              </TabsTrigger>
              <TabsTrigger
                value="hazmat"
                disabled={!hazmatEnabled && !hazmatFlag}
                className="gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Hazmat
              </TabsTrigger>
              <TabsTrigger
                value="reefer"
                disabled={!reeferEnabled && !reeferFlag}
                className="gap-2"
              >
                <Snowflake className="h-4 w-4" />
                Reefer
              </TabsTrigger>
            </TabsList>

            {/* BASIC TAB */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Container Identification</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="container_number">Container Number *</Label>
                    <InspectModeTooltip
                      fieldName="Container Number"
                      description="Unique identifier for the shipping container. This is the most important field and must be unique across all containers in the system."
                      example="MSCU1234567, MAEU9876543"
                      required={true}
                      validation="Typically 11 characters: 4 letters (owner code) + 6 digits + 1 check digit"
                    >
                      <Input
                        id="container_number"
                        placeholder="MSCU1234567"
                        {...register("container_number", { required: true })}
                      />
                    </InspectModeTooltip>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iso_code">ISO Code</Label>
                    <InspectModeTooltip
                      fieldName="ISO Code"
                      description="International standard code that identifies the container's size and type according to ISO 6346 standards."
                      example="42G1 (40ft general purpose)"
                      validation="4 characters: 2 digits + 1 letter + 1 digit"
                    >
                      <Input
                        id="iso_code"
                        placeholder="42G1"
                        {...register("iso_code")}
                      />
                    </InspectModeTooltip>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="size_teu">Size (TEU) *</Label>
                    <Select
                      defaultValue="2"
                      onValueChange={(value) => setValue("size_teu", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">20' (1 TEU)</SelectItem>
                        <SelectItem value="2">40' (2 TEU)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="container_type">Type *</Label>
                    <Select
                      defaultValue="Dry"
                      onValueChange={(value) => setValue("container_type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dry">Dry</SelectItem>
                        <SelectItem value="Reefer">Reefer</SelectItem>
                        <SelectItem value="Hazardous">Hazardous</SelectItem>
                        <SelectItem value="OOG">OOG (Out of Gauge)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="load_status">Load Status *</Label>
                    <Select
                      defaultValue="Full"
                      onValueChange={(value) => setValue("load_status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full">Full</SelectItem>
                        <SelectItem value="Empty">Empty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Movement Type *</Label>
                    <Select
                      defaultValue="export_container"
                      onValueChange={(value) => setValue("type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="export_container">Export Container</SelectItem>
                        <SelectItem value="import_container">Import Container</SelectItem>
                        <SelectItem value="empty">Empty Movement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customs_status">Customs Status</Label>
                    <Select
                      defaultValue="Cleared"
                      onValueChange={(value) => setValue("customs_status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cleared">Cleared</SelectItem>
                        <SelectItem value="Hold">Hold</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* CARGO TAB */}
            <TabsContent value="cargo" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Cargo & Weight Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight_mt">Gross Weight (MT) *</Label>
                    <InspectModeTooltip
                      fieldName="Gross Weight"
                      description="Total weight of the container including cargo and tare weight, measured in Metric Tons. This affects stacking decisions and equipment selection."
                      example="22.5 MT, 15.8 MT"
                      required={true}
                      validation="Heavy: ≥20MT | Medium: 10-20MT | Light: <10MT"
                    >
                      <Input
                        id="weight_mt"
                        type="number"
                        step="0.1"
                        placeholder="24.5"
                        {...register("weight_mt", { required: true })}
                      />
                    </InspectModeTooltip>
                    <p className="text-xs text-muted-foreground">
                      Heavy: ≥20MT | Medium: 10-20MT | Light: &lt;10MT
                      {weightMt && ` | Current: ${getWeightClass(weightMt)}`}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seal_number">Seal Number</Label>
                    <InspectModeTooltip
                      fieldName="Seal Number"
                      description="Security seal identifier used to verify container hasn't been tampered with during transit."
                      example="SL123456, SEAL789012"
                    >
                      <Input
                        id="seal_number"
                        placeholder="SL123456"
                        {...register("seal_number")}
                      />
                    </InspectModeTooltip>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo_description">Cargo Description</Label>
                  <Textarea
                    id="cargo_description"
                    rows={3}
                    placeholder="Describe the cargo contents..."
                    {...register("cargo_description")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shipping_bill_number">Shipping Bill Number</Label>
                    <Input
                      id="shipping_bill_number"
                      placeholder="SB123456"
                      {...register("shipping_bill_number")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bill_of_lading">Bill of Lading</Label>
                    <Input
                      id="bill_of_lading"
                      placeholder="BL987654"
                      {...register("bill_of_lading")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gate_in_time">Gate In Time</Label>
                  <Input
                    id="gate_in_time"
                    type="datetime-local"
                    {...register("gate_in_time")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shipping_line">Shipping Line</Label>
                    <InspectModeTooltip
                      fieldName="Shipping Line"
                      description="The ocean carrier company responsible for shipping this container. Used for grouping and billing purposes."
                      example="Maersk, MSC, CMA CGM, Hapag-Lloyd, OOCL"
                    >
                      <Input
                        id="shipping_line"
                        placeholder="e.g., Maersk, MSC, CMA CGM"
                        {...register("shipping_line")}
                      />
                    </InspectModeTooltip>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consignee">Consignee</Label>
                    <InspectModeTooltip
                      fieldName="Consignee"
                      description="The party receiving the cargo at destination. Important for customs clearance and delivery coordination."
                      example="ABC Corp, XYZ Trading Ltd"
                    >
                      <Input
                        id="consignee"
                        placeholder="e.g., ABC Corp"
                        {...register("consignee")}
                      />
                    </InspectModeTooltip>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* VESSEL TAB */}
            <TabsContent value="vessel" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Vessel & Voyage Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vessel_id">Vessel ID</Label>
                    <Input
                      id="vessel_id"
                      placeholder="V042"
                      {...register("vessel_id")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="voyage_id">Voyage ID</Label>
                    <Input
                      id="voyage_id"
                      placeholder="VOY-2503-CLB-12"
                      {...register("voyage_id")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pod">Port of Destination</Label>
                    <InspectModeTooltip
                      fieldName="Port of Destination"
                      description="Final destination port where the container will be discharged. Containers going to the same port should be grouped together for efficient loading."
                      example="Colombo, Singapore, Dubai, Rotterdam"
                    >
                      <Input
                        id="pod"
                        placeholder="e.g., Colombo, Singapore, Dubai"
                        {...register("pod")}
                      />
                    </InspectModeTooltip>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pod_priority">POD Priority (1-4)</Label>
                    <InspectModeTooltip
                      fieldName="POD Priority"
                      description="Loading sequence priority. Priority 1 containers are loaded last (first out), Priority 4 loaded first (last out). This determines stacking order."
                      example="1 = First Out, 4 = Last Out"
                      validation="1-4, where 1 is highest priority"
                    >
                      <Select
                        defaultValue="2"
                        onValueChange={(value) => setValue("pod_priority", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - First Out</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4 - Last Out</SelectItem>
                        </SelectContent>
                      </Select>
                    </InspectModeTooltip>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cutoff_datetime">Cutoff Date & Time</Label>
                  <Input
                    id="cutoff_datetime"
                    type="datetime-local"
                    {...register("cutoff_datetime")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expected_pickup_time">Expected Pickup Time</Label>
                  <Input
                    id="expected_pickup_time"
                    type="datetime-local"
                    {...register("expected_pickup_time")}
                  />
                </div>
              </div>
            </TabsContent>

            {/* HAZMAT TAB */}
            <TabsContent value="hazmat" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Hazardous Material Information</h3>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="hazmat_flag"
                    checked={hazmatFlag}
                    onCheckedChange={(checked) => {
                      setValue("hazmat_flag", checked);
                      setHazmatEnabled(checked);
                    }}
                  />
                  <Label htmlFor="hazmat_flag">This is hazardous cargo</Label>
                </div>

                {hazmatFlag && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="imdg_class">IMDG Class</Label>
                        <Input
                          id="imdg_class"
                          placeholder="3"
                          {...register("imdg_class")}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="un_number">UN Number</Label>
                        <Input
                          id="un_number"
                          placeholder="UN1203"
                          {...register("un_number")}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hazmat_segregation">Segregation Requirements</Label>
                      <Textarea
                        id="hazmat_segregation"
                        rows={2}
                        placeholder="Away from Class 1,2"
                        {...register("hazmat_segregation")}
                      />
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* REEFER TAB */}
            <TabsContent value="reefer" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Refrigerated Container Settings</h3>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="reefer_flag"
                    checked={reeferFlag}
                    onCheckedChange={(checked) => {
                      setValue("reefer_flag", checked);
                      setReeferEnabled(checked);
                    }}
                  />
                  <Label htmlFor="reefer_flag">This is a refrigerated container</Label>
                </div>

                {reeferFlag && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="set_temperature">Set Temperature (°C)</Label>
                        <Input
                          id="set_temperature"
                          type="number"
                          step="0.1"
                          placeholder="-18.0"
                          {...register("set_temperature")}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="current_temperature">Current Temperature (°C)</Label>
                        <Input
                          id="current_temperature"
                          type="number"
                          step="0.1"
                          placeholder="-17.8"
                          {...register("current_temperature")}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ventilation_setting">Ventilation Setting</Label>
                        <Input
                          id="ventilation_setting"
                          placeholder="25 CBM/hr"
                          {...register("ventilation_setting")}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="humidity_setting">Humidity (%)</Label>
                        <Input
                          id="humidity_setting"
                          type="number"
                          placeholder="85"
                          {...register("humidity_setting")}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <div className="mt-6 flex justify-end gap-3">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving to Database..." : "Continue to Yard Map"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}