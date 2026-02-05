/**
 * Example: How to use InspectModeTooltip in your forms
 *
 * This example demonstrates how to wrap form fields with AI-powered tooltips
 * that appear when the user activates "Inspect Mode" in the AI Assistant.
 *
 * To use in your existing forms:
 * 1. Import InspectModeTooltip
 * 2. Wrap your form fields (Input, Select, etc.) with the tooltip
 * 3. Provide field metadata (name, description, example, validation)
 *
 * The AI Assistant will automatically show these tooltips when inspect mode is enabled.
 */

import { InspectModeTooltip } from "./inspect-mode-tooltip";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function ExampleInspectModeForm() {
  return (
    <div className="space-y-4">
      {/* Example 1: Container Number Field */}
      <div className="space-y-2">
        <Label htmlFor="container_number">Container Number *</Label>
        <InspectModeTooltip
          fieldName="Container Number"
          description="Unique identifier for the shipping container following ISO 6346 standard format"
          example="MSCU1234567"
          required={true}
          validation="11 characters: 4 letters (owner code) + 6 digits + 1 check digit"
        >
          <Input
            id="container_number"
            name="container_number"
            placeholder="Enter container number"
          />
        </InspectModeTooltip>
      </div>

      {/* Example 2: Size TEU Field */}
      <div className="space-y-2">
        <Label htmlFor="size_teu">Size (TEU) *</Label>
        <InspectModeTooltip
          fieldName="Container Size"
          description="Twenty-foot Equivalent Unit - standard measure for container capacity"
          example="1 TEU = 20' container, 2 TEU = 40' container"
          required={true}
          validation="Must be 1 or 2"
        >
          <Select name="size_teu">
            <SelectTrigger>
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">20' (1 TEU)</SelectItem>
              <SelectItem value="2">40' (2 TEU)</SelectItem>
            </SelectContent>
          </Select>
        </InspectModeTooltip>
      </div>

      {/* Example 3: Container Type Field */}
      <div className="space-y-2">
        <Label htmlFor="container_type">Container Type *</Label>
        <InspectModeTooltip
          fieldName="Container Type"
          description="Classification of container based on cargo requirements and equipment"
          example="Dry for general cargo, Reefer for temperature-controlled goods"
          required={true}
        >
          <Select name="container_type">
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Dry">Dry Container</SelectItem>
              <SelectItem value="Reefer">Reefer (Refrigerated)</SelectItem>
              <SelectItem value="Open Top">Open Top</SelectItem>
              <SelectItem value="Flat Rack">Flat Rack</SelectItem>
              <SelectItem value="Tank">Tank Container</SelectItem>
              <SelectItem value="Hazardous">Hazardous Materials</SelectItem>
            </SelectContent>
          </Select>
        </InspectModeTooltip>
      </div>

      {/* Example 4: Weight Field */}
      <div className="space-y-2">
        <Label htmlFor="weight_mt">Weight (MT) *</Label>
        <InspectModeTooltip
          fieldName="Container Weight"
          description="Gross weight of the container including cargo in Metric Tons"
          example="22.5"
          required={true}
          validation="Must be between 2 and 30 MT for standard containers"
        >
          <Input
            id="weight_mt"
            name="weight_mt"
            type="number"
            step="0.1"
            placeholder="Enter weight in metric tons"
          />
        </InspectModeTooltip>
      </div>

      {/* Example 5: Movement Type Field */}
      <div className="space-y-2">
        <Label htmlFor="type">Movement Type *</Label>
        <InspectModeTooltip
          fieldName="Movement Type"
          description="Indicates whether the container is being imported, exported, or repositioned"
          example="Export for outbound shipments, Import for inbound cargo"
          required={true}
        >
          <Select name="type">
            <SelectTrigger>
              <SelectValue placeholder="Select movement type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="export_container">Export Container</SelectItem>
              <SelectItem value="import_container">Import Container</SelectItem>
              <SelectItem value="transshipment">Transshipment</SelectItem>
              <SelectItem value="empty_repositioning">Empty Repositioning</SelectItem>
            </SelectContent>
          </Select>
        </InspectModeTooltip>
      </div>

      {/* Example 6: Customs Status Field */}
      <div className="space-y-2">
        <Label htmlFor="customs_status">Customs Status *</Label>
        <InspectModeTooltip
          fieldName="Customs Status"
          description="Current status of customs clearance for the container"
          example="Cleared for released cargo, Hold for pending inspection"
          required={true}
          validation="Status must match customs documentation"
        >
          <Select name="customs_status">
            <SelectTrigger>
              <SelectValue placeholder="Select customs status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Cleared">Cleared</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Hold">Hold</SelectItem>
              <SelectItem value="Examination">Under Examination</SelectItem>
              <SelectItem value="Released">Released</SelectItem>
            </SelectContent>
          </Select>
        </InspectModeTooltip>
      </div>
    </div>
  );
}

/**
 * INTEGRATION NOTES:
 *
 * 1. To add inspect mode to existing forms, wrap each form field:
 *
 *    Before:
 *    <Input name="container_number" />
 *
 *    After:
 *    <InspectModeTooltip
 *      fieldName="Container Number"
 *      description="..."
 *      example="..."
 *      required={true}
 *    >
 *      <Input name="container_number" />
 *    </InspectModeTooltip>
 *
 * 2. The tooltips only appear when inspect mode is enabled via the AI Assistant
 * 3. A purple sparkle icon appears on the field to indicate help is available
 * 4. Hover over the field to see the contextual guidance
 */
