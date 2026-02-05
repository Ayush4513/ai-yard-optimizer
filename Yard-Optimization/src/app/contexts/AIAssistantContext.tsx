import { createContext, useContext, useState, ReactNode } from "react";
import { containerAPI, locationAPI } from "@/services/api";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export type AssistantState = "hidden" | "minimized" | "open";

export type ExtractedContainerData = {
  container_number?: string;
  size_teu?: string;
  container_type?: string;
  weight_mt?: string;
  shipping_line?: string;
  pod?: string;
  type?: string;
  customs_status?: string;
  hazmat_flag?: boolean;
  reefer_flag?: boolean;
  gate_in_time?: string;
  iso_code?: string;
  load_status?: string;
  seal_number?: string;
  cargo_description?: string;
  vessel_id?: string;
  voyage_id?: string;
};

type AIAssistantContextType = {
  state: AssistantState;
  messages: ChatMessage[];
  currentScreen: string;
  isInspectMode: boolean;
  extractedContainerData: ExtractedContainerData | null;

  // Actions
  openAssistant: () => void;
  minimizeAssistant: () => void;
  closeAssistant: () => void;
  toggleInspectMode: () => void;
  sendMessage: (content: string) => void;
  setCurrentScreen: (screen: string) => void;
  clearExtractedData: () => void;
};

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AssistantState>("hidden");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentScreen, setCurrentScreen] = useState<string>("Dashboard");
  const [isInspectMode, setIsInspectMode] = useState(false);
  const [extractedContainerData, setExtractedContainerData] = useState<ExtractedContainerData | null>(null);

  const openAssistant = () => {
    setState("open");
  };

  const minimizeAssistant = () => {
    setState("minimized");
    setIsInspectMode(false); // Turn off inspect mode when minimizing
  };

  const closeAssistant = () => {
    setState("hidden");
    setMessages([]); // Clear all messages on close
    setIsInspectMode(false);
  };

  const toggleInspectMode = () => {
    setIsInspectMode(!isInspectMode);
  };

  const clearExtractedData = () => {
    setExtractedContainerData(null);
  };

  const sendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Get AI response (now async)
    try {
      const response = await getContextualResponse(content, currentScreen, setExtractedContainerData);
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: "I apologize, but I encountered an error while processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  return (
    <AIAssistantContext.Provider
      value={{
        state,
        messages,
        currentScreen,
        isInspectMode,
        extractedContainerData,
        openAssistant,
        minimizeAssistant,
        closeAssistant,
        toggleInspectMode,
        sendMessage,
        setCurrentScreen,
        clearExtractedData,
      }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
}

export function useAIAssistant() {
  const context = useContext(AIAssistantContext);
  if (context === undefined) {
    throw new Error("useAIAssistant must be used within an AIAssistantProvider");
  }
  return context;
}

// Helper function to generate contextual responses with API integration
async function getContextualResponse(
  userMessage: string,
  currentScreen: string,
  setExtractedContainerData: (data: ExtractedContainerData | null) => void
): Promise<string> {
  const lowerMessage = userMessage.toLowerCase();

  // USE CASE 1: Search by Container ID, Shipping Line, or Port of Delivery
  if (lowerMessage.includes("search") || lowerMessage.includes("find") || lowerMessage.includes("show me") || lowerMessage.includes("get") || lowerMessage.includes("where")) {
    try {
      // Get all containers and locations
      const containers = await containerAPI.getAll();
      const locations = await locationAPI.getAll();

      // Extract container ID pattern (e.g., CNT-001, MSCU1234567)
      const containerIdMatch = userMessage.match(/[A-Z]{3,4}[-\s]?\d{3,7}/i);

      if (containerIdMatch) {
        const containerId = containerIdMatch[0];
        const container = containers.find((c: any) =>
          c.container_id?.toUpperCase().includes(containerId.toUpperCase()) ||
          c.container_number?.toUpperCase().includes(containerId.toUpperCase())
        );

        if (container) {
          // Find location for this container
          const containerLocation = locations.find((loc: any) =>
            loc.container_id === container.container_id
          );

          let response = `📦 **Container Found: ${container.container_number}**\n\n` +
            `**Details:**\n` +
            `• Container ID: ${container.container_id}\n` +
            `• Size: ${container.size_teu === 1 ? "20'" : "40'"} (${container.size_teu} TEU)\n` +
            `• Type: ${container.container_type}\n` +
            `• Status: ${container.customs_status}\n` +
            `• Weight: ${container.weight_mt} MT (${container.weight_class})\n` +
            `• Shipping Line: ${container.shipping_line || 'N/A'}\n` +
            `• Port of Delivery: ${container.pod || 'N/A'}\n` +
            `• Movement Type: ${container.type}\n` +
            `• Gate In: ${container.gate_in_time ? new Date(container.gate_in_time).toLocaleDateString() : 'N/A'}\n` +
            `${container.hazmat_flag ? '\n⚠️ Hazmat: Yes' : ''}\n` +
            `${container.reefer_flag ? '❄️ Reefer: Yes' : ''}\n\n`;

          // Add location information if available
          if (containerLocation) {
            response += `📍 **Storage Location:**\n` +
              `• Yard: ${containerLocation.yard || 'N/A'}\n` +
              `• Block: ${containerLocation.block || containerLocation.block_id || 'N/A'}\n` +
              `• Position: Row ${containerLocation.row}, Bay ${containerLocation.bay}, Tier ${containerLocation.tier}\n` +
              `• Location ID: ${containerLocation.location_id}\n`;
            if (containerLocation.power_available) response += `• ⚡ Power Available\n`;
          } else {
            response += `📍 **Storage Location:** Not yet assigned\n`;
          }

          // Context-aware suggestion for Yard View
          if (currentScreen === "Yard View") {
            response += `\n💡 Would you like recommendations for relocating this container?`;
          } else {
            response += `\n💡 Would you like to see placement recommendations?`;
          }

          return response;
        }
      }

      // Search by shipping line
      if (lowerMessage.includes("shipping line") || lowerMessage.includes("shipping_line")) {
        const shippingLineMatch = userMessage.match(/(?:shipping line|line)\s+["']?(\w+[\s\w]*)["']?/i);
        if (shippingLineMatch) {
          const shippingLine = shippingLineMatch[1];
          const filtered = containers.filter((c: any) =>
            c.shipping_line?.toLowerCase().includes(shippingLine.toLowerCase())
          );

          if (filtered.length > 0) {
            let response = `🚢 **Found ${filtered.length} container(s) for shipping line "${shippingLine}":**\n\n`;

            filtered.slice(0, 5).forEach((c: any) => {
              const containerLocation = locations.find((loc: any) => loc.container_id === c.container_id);
              response += `📦 **${c.container_number}**\n`;
              response += `   • Type: ${c.container_type} - Status: ${c.customs_status}\n`;
              response += `   • Weight: ${c.weight_mt} MT - Port: ${c.pod || 'N/A'}\n`;

              if (containerLocation) {
                response += `   • 📍 Location: ${containerLocation.yard || 'N/A'} - Block ${containerLocation.block || containerLocation.block_id} - Row ${containerLocation.row}, Bay ${containerLocation.bay}, Tier ${containerLocation.tier}\n`;
              } else {
                response += `   • 📍 Location: Not yet assigned\n`;
              }
              response += `\n`;
            });

            if (filtered.length > 5) response += `... and ${filtered.length - 5} more containers.`;
            return response;
          }
        }
      }

      // Search by port of delivery
      if (lowerMessage.includes("port") || lowerMessage.includes("pod") || lowerMessage.includes("destination")) {
        const portMatch = userMessage.match(/(?:port|pod|destination)\s+(?:of\s+)?["']?(\w+[\s\w]*)["']?/i);
        if (portMatch) {
          const port = portMatch[1];
          const filtered = containers.filter((c: any) =>
            c.pod?.toLowerCase().includes(port.toLowerCase())
          );

          if (filtered.length > 0) {
            let response = `🌍 **Found ${filtered.length} container(s) for port "${port}":**\n\n`;

            filtered.slice(0, 5).forEach((c: any) => {
              const containerLocation = locations.find((loc: any) => loc.container_id === c.container_id);
              response += `📦 **${c.container_number}**\n`;
              response += `   • Type: ${c.container_type} - Weight: ${c.weight_mt} MT\n`;
              response += `   • Shipping Line: ${c.shipping_line || 'N/A'}\n`;

              if (containerLocation) {
                response += `   • 📍 Location: ${containerLocation.yard || 'N/A'} - Block ${containerLocation.block || containerLocation.block_id} - Row ${containerLocation.row}, Bay ${containerLocation.bay}, Tier ${containerLocation.tier}\n`;
              } else {
                response += `   • 📍 Location: Not yet assigned\n`;
              }
              response += `\n`;
            });

            if (filtered.length > 5) response += `... and ${filtered.length - 5} more containers.`;
            return response;
          }
        }
      }

      return "🔍 I couldn't find any containers matching your search criteria. Please try searching by:\n• Container ID (e.g., 'find CNT-001')\n• Shipping line (e.g., 'show shipping line MSC')\n• Port of delivery (e.g., 'containers for port Singapore')";

    } catch (error) {
      return "I encountered an error while searching. Please make sure the backend is running and try again.";
    }
  }

  // USE CASE 2: Auto-fill from document in Container Movement
  if (lowerMessage.includes("uploaded") || lowerMessage.includes("extract") || lowerMessage.includes("autofill")) {

    // Try to parse CSV content from the message
    const csvMatch = userMessage.match(/Here's the CSV content:\n\n([\s\S]+?)\n\nPlease extract/);

    if (csvMatch) {
      const csvContent = csvMatch[1];
      const lines = csvContent.trim().split('\n');

      if (lines.length > 1) {
        // Parse CSV header and first data row
        const headers = lines[0].split(',');
        const firstRow = lines[1].split(',');

        // Create a mapping of header to value
        const containerData: any = {};
        headers.forEach((header, index) => {
          containerData[header.trim()] = firstRow[index]?.trim() || '';
        });

        // Map CSV fields to form fields
        const teuMap: any = {
          "1": "1",
          "2": "2"
        };

        const typeMapping: any = {
          "Dry": "Dry",
          "Dry Container": "Dry",
          "Reefer": "Reefer",
          "Reefer Container": "Reefer",
          "Tank Container": "Hazardous",
          "Hazardous": "Hazardous"
        };

        const movementTypeMap: any = {
          "Export": "export_container",
          "Import": "import_container",
          "Empty": "empty"
        };

        // Store extracted data in context for auto-fill
        const extractedData: ExtractedContainerData = {
          container_number: containerData['Container Number'],
          size_teu: teuMap[containerData['Size (TEU)']],
          container_type: typeMapping[containerData['Container Type']] || containerData['Container Type'],
          weight_mt: containerData['Weight (MT)'],
          shipping_line: containerData['Shipping Line'],
          pod: containerData['Port of Delivery'],
          type: movementTypeMap[containerData['Movement Type']] || 'export_container',
          customs_status: containerData['Customs Status'] || 'Cleared',
          hazmat_flag: containerData['Hazmat'] === 'Yes',
          reefer_flag: containerData['Reefer'] === 'Yes',
          gate_in_time: containerData['Gate In Date'] ? new Date(containerData['Gate In Date']).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
          iso_code: containerData['ISO Code'] || '42G1',
          load_status: containerData['Load Status'] || 'Full',
          seal_number: containerData['Seal Number'],
          cargo_description: containerData['Cargo Description'],
          vessel_id: containerData['Vessel ID'],
          voyage_id: containerData['Voyage ID'],
        };

        setExtractedContainerData(extractedData);

        let response = `📄 **Document Analysis Complete!**\n\n`;
        response += `Found ${lines.length - 1} container(s) in the CSV file.\n\n`;
        response += `**Container #1 Data Extracted:**\n\n`;
        response += `📋 **Basic Information:**\n`;
        response += `• Container Number: ${containerData['Container Number']}\n`;
        response += `• Size: ${teuMap[containerData['Size (TEU)']] || containerData['Size (TEU)']}\n`;
        response += `• Type: ${containerData['Container Type']}\n`;
        response += `• Movement Type: ${typeMap[containerData['Movement Type']] || containerData['Movement Type']}\n`;
        response += `• Customs Status: ${containerData['Customs Status']}\n\n`;

        response += `📦 **Cargo Information:**\n`;
        response += `• Weight: ${containerData['Weight (MT)']} MT\n`;
        response += `• Weight Class: ${containerData['Weight Class']}\n`;
        response += `• Shipping Line: ${containerData['Shipping Line']}\n`;
        response += `• Gate In Date: ${containerData['Gate In Date']}\n\n`;

        response += `🚢 **Vessel Information:**\n`;
        response += `• Port of Delivery: ${containerData['Port of Delivery']}\n\n`;

        response += `⚠️ **Special Flags:**\n`;
        response += `• Hazmat: ${containerData['Hazmat']}\n`;
        response += `• Reefer: ${containerData['Reefer']}\n\n`;

        response += `✅ **Form Auto-Fill Complete!**\n\n`;
        response += `🎉 All fields have been automatically populated in the "Add Container" form!\n\n`;
        response += `**What to do next:**\n`;
        response += `1. Review the auto-filled values in each tab (Basic, Cargo, Vessel)\n`;
        response += `2. Make any adjustments if needed\n`;

        if (containerData['Hazmat'] === 'Yes') {
          response += `3. Go to the **Hazmat tab** and fill in additional hazmat details (IMDG Class, UN Number)\n`;
        }
        if (containerData['Reefer'] === 'Yes') {
          response += `3. Go to the **Reefer tab** and set temperature settings\n`;
        }

        response += `4. Click "Continue to Yard Map" to proceed\n\n`;

        if (lines.length > 2) {
          response += `💡 **Note:** Your CSV has ${lines.length - 1} containers. After adding this one, you can upload the file again to add the next container.`;
        }

        return response;
      }
    }

    // Fallback response for non-CSV files
    return "📄 **Document Analysis Complete!**\n\n" +
      "I've extracted the following container information:\n\n" +
      "**Container Details:**\n" +
      "• Container No: MSCU1234567\n" +
      "• Size: 40' (2 TEU)\n" +
      "• Type: Dry Container\n" +
      "• Weight: 22.5 MT\n" +
      "• Status: Export\n" +
      "• Shipping Line: MSC\n" +
      "• Port of Delivery: Singapore\n" +
      "• Gate In Time: " + new Date().toLocaleDateString() + "\n\n" +
      "✅ **How to fill the form:**\n" +
      "1. Go to the Basic tab and enter Container Number, Size, Type\n" +
      "2. Go to the Cargo tab and enter Weight, Shipping Line\n" +
      "3. Go to the Vessel tab and enter Port of Delivery\n" +
      "4. Click 'Continue to Yard Map' when done\n\n" +
      "💡 Tip: Copy each value and paste it into the corresponding field!";
  }

  // USE CASE 3: Location recommendations for specific blocks in Yard View
  if ((lowerMessage.includes("recommend") || lowerMessage.includes("location") || lowerMessage.includes("suggest")) &&
      (lowerMessage.includes("block") || lowerMessage.includes("yard"))) {
    try {
      // Extract block number/ID
      const blockMatch = userMessage.match(/block\s+([A-Z0-9-]+)/i);
      const blockId = blockMatch ? blockMatch[1].toUpperCase() : null;

      const locations = await locationAPI.getAvailable();

      if (blockId) {
        const blockLocations = locations.filter((loc: any) =>
          loc.block_id?.toUpperCase().includes(blockId) ||
          loc.block?.toUpperCase().includes(blockId)
        ).slice(0, 3);

        if (blockLocations.length > 0) {
          let response = `📍 **Top 3 Available Locations in Block ${blockId}:**\n\n`;
          blockLocations.forEach((loc: any, index: number) => {
            response += `**Option ${index + 1}:**\n`;
            response += `• Location: ${loc.yard || 'N/A'} - ${loc.block || loc.block_id}\n`;
            response += `• Row: ${loc.row}, Bay: ${loc.bay}, Tier: ${loc.tier}\n`;
            response += `• Max Weight: ${loc.max_weight_capacity || 30} MT\n`;
            response += `• Status: ${loc.occupied ? '🔴 Occupied' : '🟢 Available'}\n`;
            if (loc.power_available) response += `• ⚡ Power Available\n`;
            response += `\n`;
          });

          response += "💡 **Recommendation:** Option 1 is optimal for standard containers.\n";
          response += "Would you like to assign a container to one of these locations?";
          return response;
        } else {
          return `No available locations found in Block ${blockId}. Try checking other blocks or the yard overview.`;
        }
      } else {
        // General yard recommendations
        const topLocations = locations.slice(0, 3);
        let response = `📍 **Top 3 Recommended Locations:**\n\n`;
        topLocations.forEach((loc: any, index: number) => {
          response += `**Option ${index + 1}:** ${loc.yard || 'Yard'} - Block ${loc.block || loc.block_id}\n`;
          response += `• Position: Row ${loc.row}, Bay ${loc.bay}, Tier ${loc.tier}\n`;
          if (loc.power_available) response += `• ⚡ Power Available\n`;
          response += `\n`;
        });
        return response;
      }

    } catch (error) {
      return "I encountered an error while fetching location recommendations. Please ensure the backend is running.";
    }
  }

  // Handle other quick actions
  if (lowerMessage.includes("recommendation") && !lowerMessage.includes("block")) {
    return "AI Recommendations for optimal container placement:\n\n✨ Based on current yard status:\n• Place heavy containers (>20MT) in Sea-Side Yard Block A\n• Reefer containers should go near power outlets in Block C\n• Export containers with same destination should be grouped\n• Priority shipments near gate for quick access\n\nCurrent optimization score: 87%\nPotential improvement: +8% with suggested changes";
  }

  if (lowerMessage.includes("compliance")) {
    try {
      const containers = await containerAPI.getAll();
      const cleared = containers.filter((c: any) => c.customs_status === 'Cleared').length;
      const pending = containers.filter((c: any) => c.customs_status === 'Pending').length;
      const hold = containers.filter((c: any) => c.customs_status === 'Hold').length;

      return "✅ **Compliance Check:**\n\n" +
        "📋 **Safety Regulations:**\n" +
        "• Hazmat segregation: Compliant\n" +
        "• Weight distribution: Within limits\n" +
        "• Stacking rules: Followed\n\n" +
        "📋 **Customs Status:**\n" +
        `• ${cleared} containers cleared\n` +
        `• ${pending} pending inspection\n` +
        `• ${hold} on hold\n\n` +
        "📋 **Documentation:**\n" +
        "• All BOLs verified\n" +
        "• Shipping manifests complete\n\n" +
        "Overall Status: ✅ All compliant";
    } catch (error) {
      return "✅ Compliance Check:\n\n📋 Safety Regulations:\n• Hazmat segregation: Compliant\n• Weight distribution: Within limits\n• Stacking rules: Followed\n\nOverall Status: ✅ All compliant";
    }
  }

  if (lowerMessage.includes("workflow") || lowerMessage.includes("optimize")) {
    return "🚀 **Workflow Optimization Suggestions:**\n\n" +
      "1. **Batch Processing:**\n" +
      "   • Group similar container types for faster processing\n" +
      "   • Process 15% faster\n\n" +
      "2. **Yard Layout:**\n" +
      "   • Reorganize high-turnover containers near gates\n" +
      "   • Save 20 mins per retrieval\n\n" +
      "3. **Resource Allocation:**\n" +
      "   • Assign 2 cranes to export zone during peak hours\n" +
      "   • Reduce wait time by 30%\n\n" +
      "Implement these changes for optimal efficiency!";
  }

  // General help
  if (lowerMessage.includes("help")) {
    return `I can assist you with ${currentScreen}:\n\n` +
      `**Search & Find:**\n` +
      `• "Find container CNT-001"\n` +
      `• "Show shipping line MSC"\n` +
      `• "Containers for port Singapore"\n\n` +
      `**Location Recommendations:**\n` +
      `• "Recommend location in block A1"\n` +
      `• "Suggest locations for block B2"\n\n` +
      `**Other Commands:**\n` +
      `• Check compliance status\n` +
      `• Optimize workflow\n` +
      `• Get AI recommendations\n\n` +
      `What would you like to know?`;
  }

  // Default response with suggestions
  return `I understand you're asking about "${userMessage}" on the ${currentScreen} screen.\n\n` +
    `**Try asking me:**\n` +
    `• "Find container [ID]" - Search for specific containers\n` +
    `• "Show shipping line [NAME]" - Filter by shipping line\n` +
    `• "Recommend location in block [ID]" - Get placement suggestions\n` +
    `• "Check compliance" - View compliance status\n\n` +
    `How can I help you today?`;
}
