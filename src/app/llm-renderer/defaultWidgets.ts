import { ScreenWidget } from "./WidgetCard";

export const defaultWidgets: ScreenWidget[] = [
  {
    id: "w0",
    type: "markdown",
    title: "Welcome",
    colSpan: 4,
    data: {
      content: `
This dashboard provides a comprehensive overview of your business metrics and system health.

Key features include:
- **Real-time analytics** with interactive charts
- **Transaction monitoring** for financial oversight
- **System health tracking** to ensure uptime
- **Performance trends** to identify growth opportunities
      `,
    },
  },
  {
    id: "w1",
    type: "stat",
    title: "Total Revenue",
    colSpan: 2,
    data: { value: 45231, change: 12.5 },
    config: {
      prefix: "$",
      icon: "dollar",
      color: "bg-emerald-50 text-emerald-600",
    },
  },
  {
    id: "w2",
    type: "stat",
    title: "Active Users",
    colSpan: 1,
    data: { value: 2450, change: -2.1 },
    config: { icon: "users", color: "bg-blue-50 text-blue-600" },
  },
  {
    id: "w3",
    type: "stat",
    title: "System Health",
    colSpan: 1,
    data: { value: 98.2, change: 0.4 },
    config: {
      suffix: "%",
      icon: "activity",
      color: "bg-purple-50 text-purple-600",
    },
  },
  {
    id: "w4",
    type: "area",
    title: "Traffic Overview",
    description: "Daily unique visitors over the last 7 days",
    colSpan: 2,
    data: [
      { name: "Mon", value: 4000 },
      { name: "Tue", value: 3000 },
      { name: "Wed", value: 2000 },
      { name: "Thu", value: 2780 },
      { name: "Fri", value: 1890 },
      { name: "Sat", value: 2390 },
      { name: "Sun", value: 3490 },
    ],
  },
  {
    id: "w5",
    type: "line",
    title: "Monthly Performance",
    description: "Revenue vs Expenses trend",
    colSpan: 2,
    data: [
      { name: "Jan", Revenue: 4000, Expenses: 2400 },
      { name: "Feb", Revenue: 3000, Expenses: 1398 },
      { name: "Mar", Revenue: 2000, Expenses: 9800 },
      { name: "Apr", Revenue: 2780, Expenses: 3908 },
      { name: "May", Revenue: 1890, Expenses: 4800 },
      { name: "Jun", Revenue: 2390, Expenses: 3800 },
    ],
  },
  {
    id: "w6",
    type: "bar",
    title: "Sales by Category",
    colSpan: 2,
    data: [
      { name: "Electronics", Sales: 4000, Returns: 400 },
      { name: "Clothing", Sales: 3000, Returns: 300 },
      { name: "Home", Sales: 2000, Returns: 900 },
      { name: "Sports", Sales: 2780, Returns: 200 },
    ],
  },
  {
    id: "w7",
    type: "pie",
    title: "Market Share",
    description: "Distribution by segment",
    colSpan: 2,
    data: [
      { name: "Enterprise", value: 400 },
      { name: "SMB", value: 300 },
      { name: "Startup", value: 200 },
      { name: "Consumer", value: 278 },
    ],
  },
  {
    id: "w8",
    type: "table",
    title: "Recent Transactions",
    colSpan: 4,
    data: [
      {
        ID: "#TRX-9821",
        User: "Alice Smith",
        Amount: "$120.00",
        Status: "Completed",
      },
      {
        ID: "#TRX-9822",
        User: "Bob Jones",
        Amount: "$45.50",
        Status: "Pending",
      },
      {
        ID: "#TRX-9823",
        User: "Charlie Day",
        Amount: "$950.00",
        Status: "Completed",
      },
    ],
  },
  {
    id: "w9",
    type: "list",
    title: "System Logs",
    colSpan: 2,
    data: [
      {
        title: "Database Backup",
        subtitle: "Backup completed successfully",
        status: "success",
        timestamp: "10:00 AM",
      },
      {
        title: "High Memory Usage",
        subtitle: "Server instance i-0982",
        status: "warning",
        timestamp: "11:30 AM",
      },
      {
        title: "API Latency",
        subtitle: "Endpoint /v1/users",
        status: "error",
        timestamp: "12:15 PM",
      },
    ],
  },
];
