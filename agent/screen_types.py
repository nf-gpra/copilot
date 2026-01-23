"""
Type definitions for screen widgets and props.
"""

from typing import List, Union, Literal, TypedDict


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


ScreenWidget = Union[
    StatWidget,
    ChartWidget,
    PieWidget,
    TableWidget,
    ListWidget,
    MarkdownWidget,
]


class ScreenProps(TypedDict, total=False):
    title: str
    subtitle: str
    updatedAt: str
    columns: int
    widgets: List[ScreenWidget]
