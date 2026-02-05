import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { Checkbox } from "@/app/components/ui/checkbox";
import { useContainerPlacement } from "@/app/contexts/ContainerPlacementContext";

interface AddContainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LocationSuggestion {
  yard: string;
  block: string;
  fullLocation: string;
  confidence: number;
  reason: string;
  alternativeReason?: string;
}

export function AddContainerDialog({ open, onOpenChange }: AddContainerDialogProps) {
  const navigate = useNavigate();
  const { setPlacementData } = useContainerPlacement();

  // Form state
  const [containerID, setContainerID] = useState("");
  const [containerType, setContainerType] = useState<"import" | "export" | "empty">("export");
  const [size, setSize] = useState<"20ft" | "40ft">("40ft");
  const [weight, setWeight] = useState("");
  const [consignee, setConsignee] = useState("");
  const [vessel, setVessel] = useState("");
  const [voyage, setVoyage] = useState("");
  const [isHazmat, setIsHazmat] = useState(false);
  const [isReefer, setIsReefer] = useState(false);
  const [cargoDescription, setCargoDescription] = useState("");
  const [priority, setPriority] = useState<"high" | "normal">("normal");

  const handleContinueToLocation = () => {
    if (!containerID || !consignee || !vessel || !voyage || !weight) {
      alert("Please fill in all required fields");
      return;
    }
    
    // Generate AI suggestion
    let suggestion: LocationSuggestion;

    // Logic for hazmat
    if (isHazmat) {
      const suggestedBlock = containerType === "export" 
        ? (Math.random() > 0.5 ? "S3-31" : "S4-31")
        : "L2-31";
      
      suggestion = {
        yard: suggestedBlock.split("-")[0],
        block: suggestedBlock,
        fullLocation: suggestedBlock,
        confidence: 95,
        reason: "Hazmat containers must be placed in designated hazmat blocks (Block 31) for safety compliance.",
        alternativeReason: "This block has power supply and segregation from other cargo types."
      };
    }
    // Logic for reefer
    else if (isReefer) {
      const suggestedBlock = containerType === "export"
        ? (Math.random() > 0.5 ? "S3-33" : "S4-33")
        : "L2-33";
      
      suggestion = {
        yard: suggestedBlock.split("-")[0],
        block: suggestedBlock,
        fullLocation: suggestedBlock,
        confidence: 92,
        reason: "Reefer containers should be placed in designated reefer blocks (Block 33) with power supply.",
        alternativeReason: "Temperature-controlled zone with 24/7 monitoring available."
      };
    }
    // Logic for export containers
    else if (containerType === "export") {
      const selectedYard = Math.random() > 0.5 ? "S3" : "S4";
      const row = Math.floor(Math.random() * 3) + 1;
      const col = Math.floor(Math.random() * 3) + 1;
      const block = `${selectedYard}-${row}${col}`;
      
      suggestion = {
        yard: selectedYard,
        block: block,
        fullLocation: block,
        confidence: 88,
        reason: `Sea-side yard ${selectedYard} has available capacity and is closest to the berth for export loading.`,
        alternativeReason: priority === "high" 
          ? "High priority containers are positioned for quick retrieval and minimal re-handles."
          : "Standard positioning for efficient vessel loading sequence."
      };
    }
    // Logic for import containers
    else if (containerType === "import") {
      const selectedYard = Math.random() > 0.7 ? "L2" : "S5";
      const row = selectedYard === "L2" ? "1" : (Math.floor(Math.random() * 3) + 1).toString();
      const col = Math.floor(Math.random() * 3) + 1;
      const block = `${selectedYard}-${row}${col}`;
      
      suggestion = {
        yard: selectedYard,
        block: block,
        fullLocation: block,
        confidence: 85,
        reason: selectedYard === "L2"
          ? "Land-side yard L2 provides fastest access to gate for clearance and delivery."
          : "Sea-side yard S5 is optimal for import staging before customs clearance.",
        alternativeReason: "Positioned for efficient evacuation once customs clearance is received."
      };
    }
    // Logic for empty containers
    else {
      const emptyBlock = "L1-" + Math.floor(Math.random() * 2 + 1) + Math.floor(Math.random() * 3) + 1;
      suggestion = {
        yard: "L1",
        block: emptyBlock,
        fullLocation: emptyBlock,
        confidence: 80,
        reason: "Empty containers are stored in land-side yard L1 for efficient repositioning.",
        alternativeReason: "This location balances yard utilization and minimizes movements."
      };
    }
    
    // Set placement data in context
    setPlacementData({
      container: {
        containerID,
        containerType,
        size,
        weight,
        consignee,
        vessel,
        voyage,
        isHazmat,
        isReefer,
        cargoDescription,
        priority
      },
      suggestion
    });
    
    // Close dialog and navigate to yard view
    onOpenChange(false);
    resetForm();
    navigate("/yard");
  };

  const resetForm = () => {
    setContainerID("");
    setContainerType("export");
    setSize("40ft");
    setWeight("");
    setConsignee("");
    setVessel("");
    setVoyage("");
    setIsHazmat(false);
    setIsReefer(false);
    setCargoDescription("");
    setPriority("normal");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Add New Container</DialogTitle>
          <DialogDescription>
            Enter container and shipment details below. Step 2/5
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Container ID */}
          <div className="space-y-2">
            <Label htmlFor="containerID">
              Container ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="containerID"
              placeholder="e.g., MSCU2847563"
              value={containerID}
              onChange={(e) => setContainerID(e.target.value.toUpperCase())}
              className="font-mono"
            />
          </div>

          {/* Container Type & Size */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="containerType">
                Container Type <span className="text-red-500">*</span>
              </Label>
              <Select value={containerType} onValueChange={(value: any) => setContainerType(value)}>
                <SelectTrigger id="containerType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="export">Export</SelectItem>
                  <SelectItem value="import">Import</SelectItem>
                  <SelectItem value="empty">Empty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">
                Size <span className="text-red-500">*</span>
              </Label>
              <Select value={size} onValueChange={(value: any) => setSize(value)}>
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20ft">20' Standard</SelectItem>
                  <SelectItem value="40ft">40' High Cube</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Weight */}
          <div className="space-y-2">
            <Label htmlFor="weight">
              Weight (kg) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="weight"
              type="number"
              placeholder="e.g., 24500"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>

          {/* Consignee */}
          <div className="space-y-2">
            <Label htmlFor="consignee">
              Consignee / Shipping Line <span className="text-red-500">*</span>
            </Label>
            <Select value={consignee} onValueChange={setConsignee}>
              <SelectTrigger id="consignee">
                <SelectValue placeholder="Select shipping line" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Maersk">Maersk</SelectItem>
                <SelectItem value="MSC">MSC</SelectItem>
                <SelectItem value="CMA CGM">CMA CGM</SelectItem>
                <SelectItem value="Hapag-Lloyd">Hapag-Lloyd</SelectItem>
                <SelectItem value="ONE">ONE</SelectItem>
                <SelectItem value="Evergreen">Evergreen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vessel & Voyage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vessel">
                Vessel Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="vessel"
                placeholder="e.g., MSC MIRNA"
                value={vessel}
                onChange={(e) => setVessel(e.target.value.toUpperCase())}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voyage">
                Voyage Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="voyage"
                placeholder="e.g., FE423W"
                value={voyage}
                onChange={(e) => setVoyage(e.target.value.toUpperCase())}
                className="font-mono"
              />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority Level</Label>
            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal Priority</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Special Cargo Flags */}
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <Label className="text-sm font-semibold">Special Cargo Attributes</Label>
            
            <div className="flex items-start space-x-3">
              <Checkbox
                id="hazmat"
                checked={isHazmat}
                onCheckedChange={(checked) => setIsHazmat(checked as boolean)}
              />
              <div>
                <label
                  htmlFor="hazmat"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Hazardous Material (DG Cargo)
                </label>
                <p className="mt-1 text-xs text-gray-600">
                  Will be placed in designated hazmat zones (Block 31)
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="reefer"
                checked={isReefer}
                onCheckedChange={(checked) => setIsReefer(checked as boolean)}
              />
              <div>
                <label
                  htmlFor="reefer"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Refrigerated Container
                </label>
                <p className="mt-1 text-xs text-gray-600">
                  Will be placed in reefer zones with power supply (Block 33)
                </p>
              </div>
            </div>
          </div>

          {/* Cargo Description */}
          <div className="space-y-2">
            <Label htmlFor="cargoDescription">Cargo Description (Optional)</Label>
            <Textarea
              id="cargoDescription"
              placeholder="Brief description of cargo contents..."
              value={cargoDescription}
              onChange={(e) => setCargoDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleContinueToLocation} className="bg-blue-600 hover:bg-blue-700">
            Continue to Select Location →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
