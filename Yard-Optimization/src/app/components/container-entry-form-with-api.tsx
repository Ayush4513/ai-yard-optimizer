/**
 * EXAMPLE: Container Entry Form with API Integration
 *
 * This is an example showing how to modify your existing container-entry-form.tsx
 * to save containers to the database using the FastAPI backend.
 *
 * HOW TO USE THIS:
 * 1. Copy the relevant parts from this file
 * 2. Paste them into your existing container-entry-form.tsx
 * 3. Test with the backend running on http://localhost:8000
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { Container } from "@/app/types/yard-optimization";

// IMPORT THE API SERVICE
import { containerAPI } from "@/services/api";

interface ContainerEntryFormProps {
  onSubmit: (container: Container) => void;
  onCancel?: () => void;
}

export function ContainerEntryFormWithAPI({ onSubmit, onCancel }: ContainerEntryFormProps) {
  const [hazmatEnabled, setHazmatEnabled] = useState(false);
  const [reeferEnabled, setReeferEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state

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

  // ======================================================================
  // THIS IS THE KEY CHANGE: Save to API instead of just passing to parent
  // ======================================================================
  const onFormSubmit = async (data: any) => {
    setIsSubmitting(true);

    try {
      // Generate container ID
      const containerId = `CNT-${Date.now()}`;

      // Calculate weight class
      const weight_class = getWeightClass(data.weight_mt);

      // Build container object
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
        type: data.type,
        customs_status: data.customs_status,
        shipping_line: data.shipping_line || undefined,
        consignee: data.consignee || undefined,
        pod: data.pod || undefined,
        pod_priority: data.pod ? (parseInt(data.pod_priority) as 1 | 2 | 3 | 4) : undefined,
        hazmat_flag: data.hazmat_flag,
        imdg_class: data.hazmat_flag ? data.imdg_class : undefined,
        un_number: data.hazmat_flag ? data.un_number : undefined,
        hazmat_segregation: data.hazmat_flag ? data.hazmat_segregation : undefined,
        reefer_flag: data.reefer_flag,
        set_temperature: data.reefer_flag && data.set_temperature ? parseFloat(data.set_temperature) : undefined,
        current_temperature: data.reefer_flag && data.current_temperature ? parseFloat(data.current_temperature) : undefined,
        ventilation_setting: data.reefer_flag ? data.ventilation_setting : undefined,
        humidity_setting: data.reefer_flag && data.humidity_setting ? parseFloat(data.humidity_setting) : undefined,
        seal_number: data.seal_number || undefined,
        vessel_id: data.vessel_id || undefined,
        voyage_id: data.voyage_id || undefined,
        shipping_bill_number: data.shipping_bill_number || undefined,
        bill_of_lading: data.bill_of_lading || undefined,
        gate_in_time: data.gate_in_time,
        cutoff_datetime: data.cutoff_datetime || undefined,
        expected_pickup_time: data.expected_pickup_time || undefined,
      };

      // ========================================
      // SAVE TO DATABASE VIA API
      // ========================================
      console.log("Saving container to database...", container);

      const savedContainer = await containerAPI.create(container);

      console.log("Container saved successfully!", savedContainer);

      // Show success message
      toast.success(`Container ${data.container_number} saved to database!`, {
        description: "Proceed to select a stacking location."
      });

      // Pass the saved container to the parent component
      onSubmit(savedContainer);

    } catch (error: any) {
      console.error("Failed to save container:", error);

      // Show error message
      toast.error("Failed to save container", {
        description: error.response?.data?.detail || error.message || "Please try again"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ... rest of your form JSX stays the same ...
  // The only change in the JSX would be:

  return (
    <div>
      <form onSubmit={handleSubmit(onFormSubmit)}>
        {/* All your existing form fields... */}

        {/* Update the submit button to show loading state */}
        <div className="mt-6 flex justify-end gap-3">
          {onCancel && (
            <button type="button" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </button>
          )}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Continue to Yard Map"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// ALTERNATIVE: If you want to save in the background without blocking UI
// ============================================================================

export function ContainerEntryFormBackgroundSave({ onSubmit, onCancel }: ContainerEntryFormProps) {
  const onFormSubmitAsync = async (data: any) => {
    // Build container object (same as above)
    const container: Container = {
      // ... same as above
    } as Container;

    // Pass to parent immediately (for UI flow)
    onSubmit(container);

    // Save to database in the background
    try {
      await containerAPI.create(container);
      console.log("Container saved to database in background");
    } catch (error) {
      console.error("Background save failed:", error);
      toast.error("Failed to save to database, but you can continue");
    }
  };

  // ... rest same as above
  return null; // placeholder
}

// ============================================================================
// HOW TO UPDATE YOUR EXISTING FILE
// ============================================================================

/**
 * STEP 1: Add the import at the top of your container-entry-form.tsx
 *
 * import { containerAPI } from "@/services/api";
 *
 *
 * STEP 2: Add loading state
 *
 * const [isSubmitting, setIsSubmitting] = useState(false);
 *
 *
 * STEP 3: Replace your onFormSubmit function with this:
 *
 * const onFormSubmit = async (data: any) => {
 *   setIsSubmitting(true);
 *   try {
 *     const containerId = `CNT-${Date.now()}`;
 *     const weight_class = getWeightClass(data.weight_mt);
 *
 *     const container: Container = {
 *       // ... build container object (same as before)
 *     };
 *
 *     // SAVE TO API
 *     const savedContainer = await containerAPI.create(container);
 *
 *     toast.success(`Container ${data.container_number} saved!`);
 *     onSubmit(savedContainer);
 *   } catch (error: any) {
 *     toast.error("Failed to save container", {
 *       description: error.response?.data?.detail || "Please try again"
 *     });
 *   } finally {
 *     setIsSubmitting(false);
 *   }
 * };
 *
 *
 * STEP 4: Update your submit button
 *
 * <Button type="submit" disabled={isSubmitting}>
 *   {isSubmitting ? "Saving..." : "Continue to Yard Map"}
 * </Button>
 *
 *
 * THAT'S IT! Your form now saves to the database.
 */
