import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";
import { NextRequest, NextResponse } from "next/server";

const LANGGRAPH_URL =
  process.env.LANGGRAPH_DEPLOYMENT_URL ||
  "http://localhost:8123/jennifer-langgraph";

// Debug: Log unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("[CopilotKit] Unhandled Rejection:");
  console.error("  Reason:", reason);
  console.error("  Promise:", promise);
});

// Pre-flight check function to test LangGraph connectivity
async function checkLangGraphConnection(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    // Try to reach the LangGraph server's assistants endpoint
    const response = await fetch(`${LANGGRAPH_URL}/assistants/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.LANGSMITH_API_KEY && {
          "x-api-key": process.env.LANGSMITH_API_KEY,
        }),
      },
      body: JSON.stringify({ graph_id: "agent_jennifer", limit: 1 }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `HTTP ${response.status}: ${text}` };
    }

    const data = await response.json();
    console.log(
      "[CopilotKit] LangGraph assistants found:",
      JSON.stringify(data, null, 2)
    );
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// 1. You can use any service adapter here for multi-agent support. We use
//    the empty adapter since we're only using one agent.
const serviceAdapter = new ExperimentalEmptyAdapter();

// 2. Create the CopilotRuntime instance and utilize the LangGraph AG-UI
//    integration to setup the connection.
console.log("[CopilotKit] Initializing with LangGraph URL:", LANGGRAPH_URL);

const runtime = new CopilotRuntime({
  agents: {
    agent_jennifer: new LangGraphAgent({
      deploymentUrl: LANGGRAPH_URL,
      graphId: "agent_jennifer",
      langsmithApiKey: process.env.LANGSMITH_API_KEY || "",
    }),
  },
});

// Handle preflight requests
export const OPTIONS = async () => {
  return NextResponse.json({}, { headers: corsHeaders });
};

// 3. Build a Next.js API route that handles the CopilotKit runtime requests.
export const POST = async (req: NextRequest) => {
  console.log("[CopilotKit] POST request received");

  // Pre-flight check: verify LangGraph server is reachable
  const connectionCheck = await checkLangGraphConnection();
  if (!connectionCheck.ok) {
    console.error("[CopilotKit] LangGraph connection check failed:");
    console.error("  URL:", LANGGRAPH_URL);
    console.error("  Error:", connectionCheck.error);
    return NextResponse.json(
      { error: "LangGraph server unreachable", details: connectionCheck.error },
      { status: 503, headers: corsHeaders }
    );
  }
  console.log("[CopilotKit] LangGraph connection check passed");

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  try {
    const response = await handleRequest(req);

    // Add CORS headers to the response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error("[CopilotKit] Error connecting to LangGraph agent:");
    console.error("  Deployment URL:", LANGGRAPH_URL);
    console.error("  Graph ID: agent_jennifer");
    console.error("  Error details:", error);

    if (error instanceof Error) {
      console.error("  Message:", error.message);
      console.error("  Stack:", error.stack);
    }

    return NextResponse.json(
      {
        error: "Failed to connect to agent",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: corsHeaders }
    );
  }
};
