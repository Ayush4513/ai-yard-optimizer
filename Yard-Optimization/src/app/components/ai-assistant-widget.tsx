import { useEffect, useRef, useState } from "react";
import { useAIAssistant } from "@/app/contexts/AIAssistantContext";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Badge } from "@/app/components/ui/badge";
import {
  Sparkles,
  X,
  Minimize2,
  Send,
  FileText,
  CheckCircle2,
  HelpCircle,
  Maximize2,
  Paperclip,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { toast } from "sonner";

export function AIAssistantWidget() {
  const {
    state,
    messages,
    currentScreen,
    isInspectMode,
    openAssistant,
    minimizeAssistant,
    closeAssistant,
    toggleInspectMode,
    sendMessage,
  } = useAIAssistant();

  const [inputValue, setInputValue] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (state === "open") {
      inputRef.current?.focus();
    }
  }, [state]);

  const handleSend = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast.success(`File "${file.name}" uploaded successfully!`, {
        description: "AI is extracting container data from your document...",
      });

      // Read and parse CSV file
      if (file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const csvContent = event.target?.result as string;
          sendMessage(`I've uploaded ${file.name}. Here's the CSV content:\n\n${csvContent}\n\nPlease extract container information and help me add the containers to the system.`);
          setUploadedFile(null);
        };
        reader.readAsText(file);
      } else {
        // For non-CSV files, simulate processing
        setTimeout(() => {
          sendMessage(`I've uploaded ${file.name}. Please extract container information and help me add the containers to the system.`);
          setUploadedFile(null);
        }, 1500);
      }
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  // Quick action buttons
  const quickActions = [
    {
      label: "Explain AI recommendation",
      icon: Sparkles,
      action: () => sendMessage("Explain the AI recommendations for container placement"),
    },
    {
      label: "Check compliance",
      icon: ShieldCheck,
      action: () => sendMessage("Check compliance for my containers"),
    },
    {
      label: "Optimize workflow",
      icon: Zap,
      action: () => sendMessage("How can I optimize my workflow?"),
    },
  ];

  // Floating Action Button (when hidden)
  if (state === "hidden") {
    return (
      <button
        onClick={openAssistant}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
      </button>
    );
  }

  // Minimized state
  if (state === "minimized") {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={openAssistant}
          className="flex items-center gap-3 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          <Sparkles className="h-5 w-5" />
          <span className="font-medium">AI Assistant</span>
          {messages.length > 0 && (
            <Badge variant="secondary" className="bg-white/20 text-white">
              {messages.filter((m) => m.role === "assistant").length}
            </Badge>
          )}
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Open state - Full chat widget
  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-[400px] max-h-[600px] flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 rounded-t-2xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">AI Assistant</div>
            <div className="text-xs text-white/80">{currentScreen} Help</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Inspect Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleInspectMode}
            className={cn(
              "h-8 w-8 text-white hover:bg-white/20",
              isInspectMode && "bg-white/20"
            )}
            title={isInspectMode ? "Disable Inspect Mode" : "Enable Inspect Mode"}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={minimizeAssistant}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeAssistant}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Welcome Message / Messages */}
      <ScrollArea className="flex-1 overflow-y-auto p-4" style={{ maxHeight: "400px" }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100">
              <Sparkles className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Welcome to AI Assistant
              </h3>
              <p className="mb-4 text-sm text-gray-600">
                I can help you with managing container movements and optimizing workflows
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex w-full flex-col gap-2">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={action.action}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:border-purple-300"
                  >
                    <Icon className="h-4 w-4 text-purple-600" />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                    message.role === "user"
                      ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="mb-1 flex items-center gap-1 text-xs text-gray-500">
                      <Sparkles className="h-3 w-3" />
                      <span>AI Assistant</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Attachment button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleAttachmentClick}
            className="shrink-0 text-gray-600 hover:text-purple-600"
            title="Attach document to extract container data"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            size="icon"
            className="bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Inspect Mode Indicator */}
        {isInspectMode && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-xs text-purple-700">
            <HelpCircle className="h-3 w-3" />
            <span>
              Inspect mode active - Hover over form fields for guidance
            </span>
            <button
              onClick={toggleInspectMode}
              className="ml-auto text-purple-600 hover:text-purple-800"
            >
              Turn off
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
