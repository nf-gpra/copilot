"""
FastAPI server to host the LangGraph agent using LangGraph API (like langgraph-cli dev).

This server replicates the functionality of `langgraph-cli dev` by reading the
langgraph.json configuration and serving the LangGraph API endpoints that the
LangGraph SDK (and CopilotKit's LangGraphAgent) expects.
"""

import json
import os
import sys
from pathlib import Path

import uvicorn
from dotenv import load_dotenv

load_dotenv()


def load_config() -> dict:
    """Load the langgraph.json configuration file."""
    config_path = Path(__file__).parent / "langgraph.json"
    with open(config_path) as f:
        return json.load(f)


def setup_environment(config: dict, host: str, port: int) -> None:
    """Set up environment variables required by langgraph_api.server.

    These must be set BEFORE uvicorn imports the app module, as the config
    is read at import time in langgraph_api/config/__init__.py.
    """
    graphs = config.get("graphs", {})

    os.environ["MIGRATIONS_PATH"] = "__inmem"
    os.environ["DATABASE_URI"] = ":memory:"
    os.environ["REDIS_URI"] = "fake"
    os.environ["N_JOBS_PER_WORKER"] = "10"
    os.environ["LANGSERVE_GRAPHS"] = json.dumps(graphs)
    os.environ["LANGSMITH_LANGGRAPH_API_VARIANT"] = "local_dev"
    os.environ["LANGGRAPH_API_URL"] = f"http://{host}:{port}"
    os.environ["LANGGRAPH_RUNTIME_EDITION"] = "inmem"
    os.environ["ALLOW_PRIVATE_NETWORK"] = "true"


def main():
    """Run the LangGraph API server (like langgraph-cli dev)."""
    config = load_config()
    port = int(os.getenv("PORT", "8123"))
    host = os.getenv("HOST", "0.0.0.0")

    # Add the current directory and dependencies to sys.path (same as CLI does)
    cwd = Path(__file__).parent
    sys.path.append(str(cwd))

    dependencies = config.get("dependencies", [])
    for dep in dependencies:
        dep_path = cwd / dep
        if dep_path.is_dir() and dep_path.exists():
            sys.path.append(str(dep_path))

    graphs = config.get("graphs", {})

    print(f"Starting LangGraph API server on {host}:{port}")
    print(f"Graphs: {list(graphs.keys())}")

    # Set up environment variables before uvicorn imports the app
    setup_environment(config, host, port)

    # Run uvicorn directly with the langgraph_api.server:app
    uvicorn.run(
        "langgraph_api.server:app",
        host=host,
        port=port,
        reload=True,
    )


if __name__ == "__main__":
    main()
