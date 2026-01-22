"use client";

import { useCoAgent, useFrontendTool } from "@copilotkit/react-core";
import { useAgent } from "@copilotkit/react-core/v2";
import {
  CopilotSidebar,
  InputProps,
  UserMessage,
  UserMessageProps,
} from "@copilotkit/react-ui";
import { AlertTriangle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useRef, useState } from "react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import LLMScreen, { ScreenProps, ScreenWidget } from "./LLMScreen";
import ThoughtPartnerCard from "./ThoughtPartnerCard";

// Error fallback for ThoughtPartnerCard rendering errors
function ThoughtPartnerErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps) {
  const errorMessage =
    error instanceof Error ? error.message : String(error ?? "Unknown error");

  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-800">
          Response Render Error
        </span>
      </div>
      <p className="text-xs text-amber-700 mb-3">
        There was an issue displaying this response. The AI may have produced an
        invalid format.
      </p>
      <p className="text-xs text-amber-600 font-mono mb-3 break-words bg-amber-100 p-2 rounded">
        {errorMessage}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-800 px-3 py-1.5 rounded transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

// Custom User Message component to handle file attachment display
function CustomUserMessage(props: UserMessageProps) {
  const { message } = props;
  const content = message?.content;

  if (typeof content === "string" && content.includes("[FILE_ATTACHMENT:")) {
    const parts = content.split(/\[FILE_ATTACHMENT:(.*?)\]/);
    if (parts.length >= 2) {
      const textBefore = parts[0].trim();
      const fileName = parts[1];

      return (
        <div className="flex flex-col gap-2 items-end mb-4 pr-1">
          {textBefore && (
            <div className="bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-2 text-sm max-w-[85%] shadow-sm">
              {textBefore}
            </div>
          )}
          <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-xl border border-gray-200 text-gray-700 w-fit shadow-sm hover:border-blue-300 transition-colors">
            <div className="p-2 bg-blue-50 rounded-lg">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="flex flex-col overflow-hidden pr-2">
              <span className="text-sm font-medium truncate max-w-[180px]">
                {fileName}
              </span>
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                Attached Data
              </span>
            </div>
          </div>
        </div>
      );
    }
  }

  return <UserMessage {...props} />;
}

// Custom Input component with attachment support
function CustomInput(props: InputProps) {
  const { inProgress, onSend } = props;
  const { state, setState } = useCoAgent({
    name: "agent_jennifer",
  });
  const [inputValue, setInputValue] = useState("");
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    summary: string;
    data: Record<string, unknown[]>;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        const result = await response.json();
        setAttachedFile({
          name: result.fileName,
          summary: result.summary,
          data: result.data,
        });
      } catch (error) {
        console.error("Upload error:", error);
        alert(error instanceof Error ? error.message : "Failed to upload file");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() && !attachedFile) return;

    let messageContent = inputValue;

    // If there's an attached file, append its summary to the message
    if (attachedFile) {
      const fileContext = `\n\n---\n**Attached File Data:**\n${
        attachedFile.summary
      }\n\n**Full Data (JSON):**\n\`\`\`json\n${JSON.stringify(
        attachedFile.data,
        null,
        2
      )}\n\`\`\``;

      // Use a marker that we can parse in CustomUserMessage
      const fileMarker = `[FILE_ATTACHMENT:${attachedFile.name}]`;

      messageContent = inputValue
        ? `${inputValue}\n\n${fileMarker}${fileContext}`
        : `${fileMarker}${fileContext}`;
    }

    // Send the message using CopilotKit's appendMessage
    onSend(messageContent);

    // Clear the input and attachment
    setInputValue("");
    setAttachedFile(null);
  }, [inputValue, attachedFile, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const removeAttachment = useCallback(() => {
    setAttachedFile(null);
  }, []);

  const isThoughtPartner = state?.interaction_mode === "thought-partner";

  return (
    <div className="flex flex-col w-full gap-2.5 p-3 bg-gradient-to-t from-gray-50 to-white border-t border-gray-100">
      {/* Attached file preview */}
      {attachedFile && (
        <div className="flex items-center gap-2.5 px-3 py-2 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-100">
          <div className="p-1.5 bg-white rounded-lg shadow-sm">
            <svg
              className="w-4 h-4 text-violet-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <span className="flex-1 text-sm font-medium text-violet-800 truncate">
            {attachedFile.name}
          </span>
          <button
            onClick={removeAttachment}
            className="p-1.5 hover:bg-violet-100 rounded-lg transition-colors"
            title="Remove attachment"
          >
            <svg
              className="w-3.5 h-3.5 text-violet-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* File attachment button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || inProgress}
          className="p-2.5 rounded-xl hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          title="Attach Excel file"
        >
          {isUploading ? (
            <svg
              className="w-5 h-5 text-violet-500 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-gray-400 hover:text-violet-500 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          )}
        </button>

        {/* Text input */}
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            attachedFile
              ? "Add a message about your file..."
              : "Ask me anything..."
          }
          disabled={inProgress}
          rows={1}
          className="flex-1 px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 focus:bg-white disabled:bg-gray-100 text-gray-700 placeholder:text-gray-400 transition-all"
          style={{ minHeight: "44px", maxHeight: "120px" }}
        />

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={inProgress || (!inputValue.trim() && !attachedFile)}
          className="p-2.5 bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-xl hover:from-violet-600 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 active:scale-95"
          title="Send message"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>

      {/* Mode Toggle & Helper Text Row */}
      <div className="flex items-center justify-between px-1 ml-10">
        {/* Modern Mode Switcher */}
        <div className="relative flex items-center p-0.5 bg-gray-100/80 rounded-full backdrop-blur-sm">
          {/* Sliding Indicator */}
          <div
            className={`absolute h-[calc(100%-4px)] top-0.5 rounded-full bg-white shadow-sm transition-all duration-300 ease-out ${
              isThoughtPartner ? "left-0.5 w-[138px]" : "left-[140px] w-[122px]"
            }`}
            style={{
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
            }}
          />
          <button
            onClick={() =>
              setState({
                ...state,
                interaction_mode: "thought-partner",
              })
            }
            className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-full transition-colors duration-200 ${
              isThoughtPartner
                ? "text-violet-700"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            Thought Partner
          </button>
          <button
            onClick={() =>
              setState({
                ...state,
                interaction_mode: "presentation",
              })
            }
            className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-full transition-colors duration-200 ${
              !isThoughtPartner
                ? "text-violet-700"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Presentation
          </button>
        </div>

        {/* Helper text */}
        <span className="text-[10px] text-gray-400 font-medium tracking-wide">
          Excel • CSV
        </span>
      </div>
    </div>
  );
}

export default function CopilotKitPage() {
  const agentHookOutput = useAgent({ agentId: "agent_jennifer" });
  console.log("agentHookOutput", agentHookOutput);

  return (
    <main>
      <CopilotSidebar
        disableSystemMessage={true}
        clickOutsideToClose={false}
        labels={{
          title: "Popup Assistant",
          initial: "👋 Hi, there! You're chatting with an agent.",
        }}
        Input={CustomInput}
        UserMessage={CustomUserMessage}
      >
        <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
          <YourMainContent />
        </Suspense>
      </CopilotSidebar>
    </main>
  );
}

function YourMainContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // 🪁 Shared State: https://docs.copilotkit.ai/pydantic-ai/shared-state
  const { state, setState } = useCoAgent<{
    screen_state: ScreenProps;
    interaction_mode: "thought-partner" | "presentation";
  }>({
    name: "agent_jennifer",
    initialState: {
      screen_state: { title: "Hello", widgets: [] },
      interaction_mode: "thought-partner",
    },
  });

  // 🪁 Frontend Tool for Thought-Partner Mode - renders widget inline in chat
  useFrontendTool({
    name: "thoughtPartnerResponse",
    description:
      "Render a data visualization widget inline in the chat. Use this in thought-partner mode ONLY when you want to display a chart, stat, table, or other visual. Your text response should be sent as a normal message, NOT through this tool.",
    parameters: [
      {
        name: "widget",
        description:
          "Widget to display in the chat. Provides visual data to support your analysis.",
        type: "object",
        required: true,
        attributes: [
          {
            name: "id",
            description: "Unique identifier for the widget",
            type: "string",
            required: true,
          },
          {
            name: "type",
            description:
              "The type of widget: 'stat' | 'line' | 'bar' | 'pie' | 'area' | 'table' | 'list' | 'markdown'",
            type: "string",
            required: true,
          },
          {
            name: "title",
            description: "The title of the widget",
            type: "string",
            required: true,
          },
          {
            name: "description",
            description: "A description of the widget",
            type: "string",
          },
          {
            name: "data",
            description:
              "The data for the widget. FORMAT VARIES BY TYPE: " +
              "1. 'stat': { value: number, change?: number, trend?: 'up'|'down'|'neutral' }. " +
              "2. 'line'|'bar'|'area': Array of objects like [{ name: 'Jan', 'Series 1': 10, 'Series 2': 20 }, ...]. " +
              "3. 'pie': Array of objects like [{ name: 'Label', value: 10 }, ...]. " +
              "4. 'table': Array of objects where keys are column names, e.g., [{ Name: 'John', Age: 30 }, ...]. " +
              "5. 'list': Array of objects like [{ title: 'Item 1', subtitle: 'Desc', value: '100', status: 'success' }, ...]. " +
              "6. 'markdown': { content: string } with markdown syntax.",
            type: "object",
            required: true,
          },
          {
            name: "config",
            description:
              "Configuration options: " +
              "1. 'stat': { prefix?: string, suffix?: string, icon?: 'users'|'dollar'|'activity'|'alert'|'info', color?: string, colorTheme?: string }. " +
              "2. 'line'|'bar'|'area'|'pie': { colors?: string[], showLegend?: boolean, showGrid?: boolean, prefix?: string, colorTheme?: string }.",
            type: "object",
          },
        ],
      },
    ],
    render: ({ args, status }) => {
      const { widget } = args as {
        widget: ScreenWidget;
      };

      // Show loading state while streaming
      if (status === "inProgress" && !widget) {
        return (
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg animate-pulse">
            <div className="w-4 h-4 bg-blue-200 rounded-full"></div>
            <span className="text-sm text-slate-500">Loading widget...</span>
          </div>
        );
      }

      if (!widget) {
        return <></>;
      }

      return (
        <ErrorBoundary FallbackComponent={ThoughtPartnerErrorFallback}>
          <ThoughtPartnerCard widget={widget} />
        </ErrorBoundary>
      );
    },
  });

  // 🪁 Frontend Tool for switching interaction mode
  useFrontendTool({
    name: "switchInteractionMode",
    description:
      "Switch the interaction mode between 'thought-partner' and 'presentation'. " +
      "Use 'thought-partner' mode for conversational, back-and-forth dialogue where you help the user think through problems with inline widgets. " +
      "Use 'presentation' mode when the user wants a full-screen dashboard or presentation view with multiple widgets displayed together.",
    parameters: [
      {
        name: "mode",
        description:
          "The interaction mode to switch to: 'thought-partner' for conversational dialogue with inline widgets, or 'presentation' for full-screen dashboard displays.",
        type: "string",
        required: true,
      },
      {
        name: "reason",
        description:
          "Brief explanation of why you're switching modes (for user awareness).",
        type: "string",
      },
    ],
    handler: ({ mode, reason }) => {
      const validModes = ["thought-partner", "presentation"];
      if (!validModes.includes(mode)) {
        console.warn(
          `Invalid mode: ${mode}. Must be one of: ${validModes.join(", ")}`
        );
        return;
      }
      setState((prevState) => {
        if (!prevState)
          return {
            screen_state: { title: "Hello", widgets: [] },
            interaction_mode: mode as "thought-partner" | "presentation",
          };
        return {
          ...prevState,
          interaction_mode: mode as "thought-partner" | "presentation",
        };
      });
      if (reason) {
        console.log(`Mode switched to ${mode}: ${reason}`);
      }
    },
    render: ({ args, status }) => {
      const { mode, reason } = args as { mode?: string; reason?: string };

      if (status === "inProgress") {
        return (
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-sm text-blue-700">
            <svg
              className="w-4 h-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Switching mode...
          </div>
        );
      }

      if (!mode) return <></>;

      return (
        <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg text-sm border border-blue-100">
          <div className="p-1.5 bg-blue-100 rounded-md">
            {mode === "presentation" ? (
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-blue-800">
              Switched to{" "}
              {mode === "presentation" ? "Presentation" : "Thought-Partner"}{" "}
              mode
            </span>
            {reason && <span className="text-xs text-blue-600">{reason}</span>}
          </div>
        </div>
      );
    },
  });

  // 🪁 Frontend Tool for update screen state
  useFrontendTool({
    name: "updateScreenState",
    parameters: [
      {
        name: "title",
        description: "The title of the screen",
        type: "string",
      },
      {
        name: "subtitle",
        description: "The subtitle of the screen",
        type: "string",
      },
      {
        name: "updatedAt",
        description: "The date the screen was last updated (ISO format)",
        type: "string",
      },
      {
        name: "columns",
        description: "The number of columns in the grid layout (1-4)",
        type: "number",
      },
      {
        name: "widgets",
        description: "The widgets to display on the screen",
        type: "object[]",
        attributes: [
          {
            name: "id",
            description: "Unique identifier for the widget",
            type: "string",
            required: true,
          },
          {
            name: "type",
            description:
              "The type of widget: 'stat' | 'line' | 'bar' | 'pie' | 'area' | 'table' | 'list' | 'markdown'",
            type: "string",
            required: true,
          },
          {
            name: "title",
            description: "The title of the widget",
            type: "string",
            required: true,
          },
          {
            name: "description",
            description: "A description of the widget",
            type: "string",
          },
          {
            name: "colSpan",
            description: "How many columns the widget should span (1-4)",
            type: "number",
          },
          {
            name: "data",
            description:
              "The data for the widget. FORMAT VARIES BY TYPE: " +
              "1. 'stat': { value: number, change?: number, trend?: 'up'|'down'|'neutral' }. " +
              "2. 'line'|'bar'|'area': Array of objects like [{ name: 'Jan', 'Series 1': 10, 'Series 2': 20 }, ...]. " +
              "3. 'pie': Array of objects like [{ name: 'Label', value: 10 }, ...]. " +
              "4. 'table': Array of objects where keys are column names, e.g., [{ Name: 'John', Age: 30 }, ...]. " +
              "5. 'list': Array of objects like [{ title: 'Item 1', subtitle: 'Desc', value: '100', status: 'success' }, ...]. " +
              "6. 'markdown': Support common markdown syntax like bullet-points (Using '* ...' or '- ...'), paragraphs, bold/italics, etc.",
            type: "object",
            required: true,
          },
          {
            name: "config",
            description:
              "Configuration options: " +
              "1. 'stat': { prefix?: string, suffix?: string, icon?: 'users'|'dollar'|'activity'|'alert'|'info', color?: string }. " +
              "2. 'line'|'bar'|'area'|'pie': { colors?: string[], showLegend?: boolean, showGrid?: boolean, prefix?: string }.",
            type: "object",
          },
        ],
      },
    ],
    handler: ({ title, subtitle, updatedAt, columns, widgets }) => {
      setState((prevState) => {
        if (!prevState)
          return {
            screen_state: { title: "Hello", widgets: [] },
            interaction_mode: "thought-partner",
          };
        return {
          ...prevState,
          interaction_mode: prevState.interaction_mode || "thought-partner",
          screen_state: {
            ...prevState.screen_state,
            ...(title !== undefined && { title }),
            ...(subtitle !== undefined && { subtitle }),
            ...(updatedAt !== undefined && { updatedAt }),
            ...(columns !== undefined && { columns }),
            ...(widgets !== undefined && {
              widgets: widgets as ScreenWidget[],
            }),
          },
        };
      });
    },
    render: ({ args, status }) => {
      const { title, widgets } = args as {
        title?: string;
        subtitle?: string;
        updatedAt?: string;
        columns?: number;
        widgets?: ScreenWidget[];
      };

      if (status === "inProgress") {
        return (
          <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg text-sm text-purple-700">
            <svg
              className="w-4 h-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Updating screen...
          </div>
        );
      }

      // Build summary of what was updated
      const updates: string[] = [];
      if (title) updates.push(`Title: "${title}"`);
      if (widgets && widgets.length > 0) {
        updates.push(
          `${widgets.length} widget${widgets.length > 1 ? "s" : ""}`
        );
      }

      if (updates.length === 0) return <></>;

      return (
        <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg text-sm border border-purple-100">
          <div className="p-1.5 bg-purple-100 rounded-md">
            <svg
              className="w-4 h-4 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-purple-800">Screen updated</span>
            <span className="text-xs text-purple-600">
              {updates.join(" • ")}
            </span>
          </div>
        </div>
      );
    },
  });

  console.log("Screen state", state);

  return (
    <div className="h-screen">
      <LLMScreen {...state.screen_state} />
      <button
        onClick={() => {
          console.log("Token from query param:", token);
          fetch(
            "https://leah-ai.uk.dev.nanfu.ng/tenants/potential-tenants/tenant-view",
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          )
            .then((res) => res.json())
            .then((out) => console.log(out));
        }}
      >
        Call HOMER API
      </button>
    </div>
  );
}
