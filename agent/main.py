"""
This is the main entry point for the agent.
It defines the workflow graph, state, tools, nodes and edges.
"""

import datetime
from typing import List, Optional, Union, Literal, TypedDict, Any

from copilotkit import CopilotKitState
from langchain.tools import tool
from langchain_core.messages import BaseMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import ToolNode
from langgraph.types import Command

from data_prompt import (
    STACKING_PLAN_99CR,
    STACKING_PLAN_138CS,
    STACKING_PLAN_108CS,
    POTENTIAL_TENANTS_99CR_FROM_BROKER,
    PRIORITY_LIST_99CR_50K_SQFT,
    OUTREACH_ACTIVITIES_99CR,
)


class StatData(TypedDict, total=False):
    value: float
    change: float
    trend: Literal["up", "down", "neutral"]


class StatConfig(TypedDict, total=False):
    prefix: str
    suffix: str
    icon: Literal["users", "dollar", "activity", "alert", "info"]
    color: str


class StatWidget(TypedDict, total=False):
    id: str
    type: Literal["stat"]
    title: str
    description: str
    colSpan: Literal[1, 2, 3, 4]
    data: StatData
    config: StatConfig


class ChartConfig(TypedDict, total=False):
    showLegend: bool
    showGrid: bool
    colors: List[str]
    prefix: str


class ChartWidget(TypedDict, total=False):
    id: str
    type: Literal["line", "bar", "area"]
    title: str
    description: str
    colSpan: Literal[1, 2, 3, 4]
    data: List[dict]
    config: ChartConfig


class PiePoint(TypedDict, total=False):
    name: str
    value: float


class PieWidget(TypedDict, total=False):
    id: str
    type: Literal["pie"]
    title: str
    description: str
    colSpan: Literal[1, 2, 3, 4]
    data: List[PiePoint]
    config: ChartConfig


class TableWidget(TypedDict, total=False):
    id: str
    type: Literal["table"]
    title: str
    description: str
    colSpan: Literal[1, 2, 3, 4]
    data: List[dict]
    config: dict


class ListItem(TypedDict, total=False):
    title: str
    subtitle: str
    value: Union[str, float]
    status: Literal["success", "warning", "error", "neutral"]
    timestamp: str


class ListWidget(TypedDict, total=False):
    id: str
    type: Literal["list"]
    title: str
    description: str
    colSpan: Literal[1, 2, 3, 4]
    data: List[ListItem]
    config: dict


class MarkdownData(TypedDict, total=False):
    content: str


class MarkdownWidget(TypedDict, total=False):
    id: str
    type: Literal["markdown"]
    title: str
    description: str
    colSpan: Literal[1, 2, 3, 4]
    data: MarkdownData


class MapMarkerData(TypedDict, total=False):
    lat: float
    lng: float
    label: str


class MapWidgetConfig(TypedDict, total=False):
    center: dict  # { lat: float, lng: float }
    zoom: int
    mapId: str


class MapWidgetData(TypedDict, total=False):
    markers: List[MapMarkerData]


class MapWidget(TypedDict, total=False):
    id: str
    type: Literal["map"]
    title: str
    description: str
    colSpan: Literal[1, 2, 3, 4]
    data: MapWidgetData
    config: MapWidgetConfig


ScreenWidget = Union[
    StatWidget,
    ChartWidget,
    PieWidget,
    TableWidget,
    ListWidget,
    MarkdownWidget,
    MapWidget,
]


class ScreenProps(TypedDict, total=False):
    title: str
    subtitle: str
    updatedAt: str
    columns: int
    widgets: List[ScreenWidget]


class AgentState(CopilotKitState):
    interaction_mode: Literal["thought-partner", "presentation"]
    screen_state: ScreenProps


# Extract tool names from backend_tools for comparison
backend_tools = []
backend_tool_names = [tool.name for tool in backend_tools]


async def chat_node(state: AgentState, config: RunnableConfig) -> Command[str]:
    # 1. Define the model
    model = ChatOpenAI(model="gpt-4.1")

    # 2. Bind the tools to the model
    model_with_tools = model.bind_tools(
        [
            *state.get("copilotkit", {}).get("actions", []),
            *backend_tools,
        ],
        parallel_tool_calls=False,
    )

    # 3. Define the system message by which the chat model will be run

    now = datetime.datetime.now()
    formatted_time = now.strftime("%Y-%m-%d %H:%M:%S")

    interaction_mode = state.get("interaction_mode", "thought-partner")

    system_message = SystemMessage(
        content=(
            f"""You are an expert Commercial Real Estate (CRE) Asset Management Analyst and UI Architect.
You interact with user in either "Thought-Partner" mode or "Presentation Mode".
Follow the instructions from the corresponding section.

CURRENT INTERACTION MODE: {interaction_mode.upper()}


## Thought-Partner Mode

Your objective is to act as a high-level strategic advisor and collaborator for CRE asset managers. Instead of just answering questions, you should engage in a dynamic dialogue to help the user uncover deeper insights and make better decisions.

**Response Format (CRITICAL):**
1. Keep your messages short and concise
2. Write your analysis, insights, and questions as a normal text response in the chat
3. OPTIONALLY, if you want to show a data visualization (chart, stat, table, etc.), call the `thoughtPartnerResponse` tool with ONLY the widget
4. The tool is ONLY for rendering widgets - your text response should NOT go through the tool
5. You can respond with just text (no tool call), or text + a widget (tool call for the widget only)

**Core Principles:**
1. **Interactive Brainstorming:** Be a sounding board for the user's ideas. If a user proposes a strategy (e.g., "Should we renovate the 4th floor?"), provide a multi-faceted analysis of pros, cons, and data-backed alternatives.
2. **Strategic Questioning:** When a user asks a broad question, ask targeted follow-up questions to narrow down their intent and surface relevant data points they might have missed (e.g., "Are you more concerned about immediate cash flow or long-term valuation for this asset?").
3. **Hypothesis Generation:** Based on the data (Stacking Plans, Outreach Logs, etc.), proactively suggest hypotheses for the user to consider (e.g., "I noticed a cluster of lease expires in Q3 2026. This might be an opportunity to consolidate those units for a larger tenant. Should we explore that scenario?").
4. **Contextual Awareness:** Connect disparate data sources. Relate leasing velocity from the outreach logs to vacancy rates in the stacking plan to provide a holistic view of asset health.
5. **Constructive Friction:** Don't just agree with the user. If the data suggests a different path or highlights a risk the user hasn't mentioned, point it out respectfully.

**Style of Interaction:**
*   Keep your messages short and concise
*   Use a conversational yet professional and intellectually rigorous tone.
*   Structure your responses to encourage further exploration. Use phrases like "Looking at the data, one possibility is...", "What if we considered...", or "To give you a better recommendation, I'd like to know more about..."

**Widget Usage Guidelines:**
- Use a `stat` widget when highlighting a key metric (e.g., vacancy rate, total revenue)
- Use `bar` or `line` charts for comparisons or trends (e.g., rent by floor, lease expiry timeline)
- Use `pie` charts for categorical breakdowns (e.g., tenant industry mix)
- Use `table` for detailed data the user might want to scan
- Not every response needs a widget - only include one when it adds value to your analysis


## Presentation Mode

Your objective is to synthesize complex property data into actionable, executive-level presentations using a specific set of UI widgets.
You take user's request and maintain a 'screen state' which represents your UI Design and will be consumed by a frontend renderer.

**Response Format (CRITICAL):**
- Keep your messages short and concise.
- DO NOT return raw JSON in your message. ONLY include JSON when making tool calls.
- **Before tool call:** Briefly explain what the presentation will show (e.g., "I'll create a dashboard showing vacancy rates by floor and lease expiry timeline..."), then say "Creating your presentation now."
- **After tool call:** Keep it brief - confirm completion (e.g., "Here's your presentation.") and invite further questions or refinements (e.g., "Let me know if you'd like to adjust anything or explore other data.").

**Core Responsibilities:**
1.  **Analyze, Don't Just Display:** Do not simply dump raw data. You must interpret the provided text (Stacking Plans, Tenant Lists, Outreach Logs) to derive insights, calculate totals, identify risks (e.g., upcoming lease breaks), and highlight opportunities.
2.  **Executive Summary First:** Your first widget must always be a `markdown` widget acting as an Executive Summary. This summary should answer the "So What?" of the data, highlighting key metrics (e.g., "3 tenants have breaks in the next 12 months") rather than just describing the data structure.

**Widget Selection Strategy:**
*   Use **Markdown** for context, summaries, and strategic recommendations.
*   Use **Stats** for high-level KPIs (e.g., Total Vacant Area, Weighted Average Rent, Total Pipeline Value).
*   Use **Bar/Line/Area Charts** for comparisons (e.g., Rent per Floor) or distributions (e.g., Lease Expiry Profile by Year).
*   Use **Pie Charts** for categorical breakdowns (e.g., Building Status: Development vs. Occupied, or Tenant Industry Mix).
*   Use **Tables** for granular, row-level details that require precise reading (e.g., a full Rent Roll or Outreach Log).
*   Use **Maps** only when specific location data (addresses/postcodes) is relevant to the user's query (e.g., "Where are our target tenants currently located?").

**Tone & Style:**
Maintain a professional, data-driven, and concise tone suitable for Asset Managers. Avoid conversational filler. Focus on the asset performance and leasing velocity.
"""
            "CRITICAL: Follow these data formats for widgets:\n"
            "1. 'stat': data must be { value: number, change?: number, trend?: 'up'|'down'|'neutral' }. DO NOT use strings for value (e.g., use 1200000 instead of '$1.2M').\n"
            "2. 'line', 'bar', 'area': data must be an array of objects where each object has a 'name' key for the X-axis and other keys for data series. "
            "Example: [{'name': 'Jan', 'Revenue': 100}, {'name': 'Feb', 'Revenue': 120}].\n"
            "3. 'pie': data must be an array of objects with 'name' and 'value' keys. Example: [{'name': 'A', 'value': 10}, {'name': 'B', 'value': 20}].\n"
            "4. 'table': data must be an array of objects where keys are column names. Example: [{'Name': 'John', 'Age': 30}, {'Name': 'Jane', 'Age': 25}].\n"
            "5. 'list': data must be an array of objects with 'title', 'subtitle', 'value', 'status', and 'timestamp' keys.\n"
            "6. 'markdown': data must be { content: string } where content is a markdown string. Support common markdown syntax like bullet-points (Using '* ...' or '- ...'), paragraphs, bold/italics, etc.\n"
            "7. 'map': data must be { markers: [{ lat: number, lng: number, label?: string }] }. "
            "Optional config: { center?: { lat: number, lng: number }, zoom?: number, mapId?: string }.\n\n"
            "\n\n --- \n\n"
            "For presentation format, have 2 or more widgets."
            "Maps should typically have a colSpan of 2 or 4."
            "\n\n --- \n\n"
            "Below are some extra data for reference. Use them to design the UI if relevant.\n\n"
            f"{STACKING_PLAN_99CR}\n\n"
            f"{STACKING_PLAN_138CS}\n\n"
            f"{STACKING_PLAN_108CS}\n\n"
            f"{POTENTIAL_TENANTS_99CR_FROM_BROKER}\n\n"
            f"{PRIORITY_LIST_99CR_50K_SQFT}\n\n"
            f"{OUTREACH_ACTIVITIES_99CR}\n\n"
            "\n\n --- \n\n"
            f"Current Date and Time: {formatted_time}\n"
        )
    )

    # 4. Run the model to generate a response
    response = await model_with_tools.ainvoke(
        [
            system_message,
            *state["messages"],
        ],
        config,
    )

    # only route to tool node if tool is not in the tools list
    if route_to_tool_node(response):
        print("routing to tool node")
        return Command(
            goto="tool_node",
            update={
                "messages": [response],
            },
        )

    # 5. We've handled all tool calls, so we can end the graph.
    return Command(
        goto=END,
        update={
            "messages": [response],
        },
    )


def route_to_tool_node(response: BaseMessage):
    """
    Route to tool node if any tool call in the response matches a backend tool name.
    """
    tool_calls = getattr(response, "tool_calls", None)
    if not tool_calls:
        return False

    for tool_call in tool_calls:
        if tool_call.get("name") in backend_tool_names:
            return True
    return False


# Define the workflow graph
workflow = StateGraph(AgentState)
workflow.add_node("chat_node", chat_node)
workflow.add_node("tool_node", ToolNode(tools=backend_tools))
workflow.add_edge("tool_node", "chat_node")
workflow.set_entry_point("chat_node")

graph = workflow.compile()
