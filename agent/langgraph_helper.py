"""
Helper module to mount LangGraph API endpoints onto a FastAPI application.

This module provides utilities to integrate the full LangGraph API (assistants,
threads, runs, store, etc.) into an existing FastAPI app, similar to what
`langgraph-cli dev` provides but with more control over configuration.

Development Usage:
    from fastapi import FastAPI
    from langgraph_helper import mount_langgraph_api

    app = FastAPI()

    @app.get("/health")
    def health():
        return {"status": "ok"}

    # Simple development setup (in-memory, no persistence)
    mount_langgraph_api(
        app,
        graphs={"agent": "main:graph"},
    )

Production Usage:
    import os
    from fastapi import FastAPI
    from langgraph_helper import mount_langgraph_api

    app = FastAPI()

    # Production setup with PostgreSQL persistence and tracing
    mount_langgraph_api(
        app,
        graphs={"agent": "main:graph"},
        # PostgreSQL for persistence
        database_uri=os.getenv("DATABASE_URI"),
        redis_uri=os.getenv("REDIS_URI"),
        runtime_edition="postgres",
        # LangSmith tracing
        langsmith_api_key=os.getenv("LANGSMITH_API_KEY"),
        tracing_enabled=True,
        # Encryption for sensitive data at rest
        aes_key=os.getenv("LANGGRAPH_AES_KEY"),
    )

Environment Variables (Production):
    DATABASE_URI: PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/db)
    REDIS_URI: Redis connection string (e.g., redis://host:6379)
    LANGSMITH_API_KEY: LangSmith API key for tracing
    LANGGRAPH_AES_KEY: 16/24/32 byte AES key for encryption
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastapi import FastAPI
    from starlette.applications import Starlette


def setup_langgraph_environment(
    graphs: dict[str, str],
    host: str = "0.0.0.0",
    port: int = 8123,
    # Storage/Persistence (production)
    database_uri: str = ":memory:",
    redis_uri: str = "fake",
    migrations_path: str = "__inmem",
    runtime_edition: str = "inmem",
    # Workers
    n_jobs_per_worker: int = 10,
    # LangSmith/Tracing
    langsmith_api_key: str | None = None,
    tracing_enabled: bool = False,
    # Security
    aes_key: str | None = None,
    # Server
    api_variant: str = "local_dev",
    allow_private_network: bool = True,
) -> None:
    """
    Set up environment variables required by langgraph_api.server.

    IMPORTANT: This must be called BEFORE importing langgraph_api.server,
    as the configuration is read at import time.

    Args:
        graphs: Dictionary mapping graph names to their module paths.
                Example: {"agent": "main:graph"}
        host: The host the server will run on (used for LANGGRAPH_API_URL).
        port: The port the server will run on (used for LANGGRAPH_API_URL).

        Storage/Persistence:
            database_uri: Database connection string.
                - Development: ":memory:" (in-memory, no persistence)
                - Production: "postgresql://user:pass@host:5432/dbname"
            redis_uri: Redis connection string.
                - Development: "fake" (mock Redis)
                - Production: "redis://host:6379"
            migrations_path: Path to database migrations.
                - Development: "__inmem"
                - Production: "/storage/migrations"
            runtime_edition: Runtime mode.
                - "inmem": In-memory storage (development)
                - "postgres": PostgreSQL persistence (production)
                - "community": PostgreSQL with community features

        Workers:
            n_jobs_per_worker: Number of concurrent jobs per worker. Default: 10

        LangSmith/Tracing:
            langsmith_api_key: LangSmith API key for tracing. Default: None
            tracing_enabled: Enable LangChain tracing. Default: False

        Security:
            aes_key: AES encryption key (16, 24, or 32 bytes) for encrypting
                     sensitive data at rest. Default: None (no encryption)

        Server:
            api_variant: API variant identifier. Default: "local_dev"
            allow_private_network: Allow private network access (for dev). Default: True

    Example (Development):
        setup_langgraph_environment(
            graphs={"agent": "main:graph"},
        )

    Example (Production):
        setup_langgraph_environment(
            graphs={"agent": "main:graph"},
            database_uri="postgresql://user:pass@db:5432/langgraph",
            redis_uri="redis://redis:6379",
            runtime_edition="postgres",
            langsmith_api_key=os.getenv("LANGSMITH_API_KEY"),
            tracing_enabled=True,
            aes_key=os.getenv("LANGGRAPH_AES_KEY"),
        )
    """
    # Storage/Persistence
    os.environ["DATABASE_URI"] = database_uri
    os.environ["REDIS_URI"] = redis_uri
    os.environ["MIGRATIONS_PATH"] = migrations_path
    os.environ["LANGGRAPH_RUNTIME_EDITION"] = runtime_edition

    # Workers
    os.environ["N_JOBS_PER_WORKER"] = str(n_jobs_per_worker)

    # Graphs configuration
    os.environ["LANGSERVE_GRAPHS"] = json.dumps(graphs)

    # Server
    os.environ["LANGGRAPH_API_URL"] = f"http://{host}:{port}"
    os.environ["LANGSMITH_LANGGRAPH_API_VARIANT"] = api_variant
    os.environ["ALLOW_PRIVATE_NETWORK"] = str(allow_private_network).lower()

    # LangSmith/Tracing (only set if provided)
    if langsmith_api_key:
        os.environ["LANGSMITH_API_KEY"] = langsmith_api_key
    if tracing_enabled:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"

    # Security (only set if provided)
    if aes_key:
        os.environ["LANGGRAPH_AES_KEY"] = aes_key


def get_langgraph_app() -> Starlette:
    """
    Import and return the LangGraph API Starlette application.

    IMPORTANT: setup_langgraph_environment() must be called before this function.

    Returns:
        The LangGraph API Starlette application instance.

    Raises:
        ImportError: If langgraph_api is not installed.
        RuntimeError: If environment is not set up properly.
    """
    # Check if environment is set up
    if "LANGSERVE_GRAPHS" not in os.environ:
        raise RuntimeError(
            "LangGraph environment not configured. "
            "Call setup_langgraph_environment() first."
        )

    # Import the app (this reads environment variables at import time)
    from langgraph_api.server import app

    return app


def mount_langgraph_api(
    app: FastAPI,
    graphs: dict[str, str],
    path: str = "",
    host: str = "0.0.0.0",
    port: int = 8123,
    dependencies: list[str] | None = None,
    # Storage/Persistence (production)
    database_uri: str = ":memory:",
    redis_uri: str = "fake",
    migrations_path: str = "__inmem",
    runtime_edition: str = "inmem",
    # Workers
    n_jobs_per_worker: int = 10,
    # LangSmith/Tracing
    langsmith_api_key: str | None = None,
    tracing_enabled: bool = False,
    # Security
    aes_key: str | None = None,
    # Server
    api_variant: str = "local_dev",
    allow_private_network: bool = True,
) -> FastAPI:
    """
    Mount all LangGraph API endpoints onto a FastAPI application.

    This function sets up the required environment and mounts the complete
    LangGraph API (assistants, threads, runs, store, MCP, A2A, etc.) onto
    your FastAPI app.

    IMPORTANT: Call this function BEFORE starting uvicorn, as the LangGraph
    configuration is read at import time.

    Args:
        app: The FastAPI application to mount LangGraph API onto.
        graphs: Dictionary mapping graph names to their module paths.
                Example: {"agent": "main:graph"}
        path: URL path prefix for LangGraph endpoints.
              - "" (empty): Mount at root (/assistants, /threads, etc.)
              - "/langgraph": Mount with prefix (/langgraph/assistants, etc.)
        host: The host the server will run on.
        port: The port the server will run on.
        dependencies: Optional list of dependency paths to add to sys.path.

        Storage/Persistence (for production):
            database_uri: Database connection string.
                - Development: ":memory:" (default, in-memory)
                - Production: "postgresql://user:pass@host:5432/dbname"
            redis_uri: Redis connection string.
                - Development: "fake" (default, mock Redis)
                - Production: "redis://host:6379"
            migrations_path: Path to database migrations.
                - Development: "__inmem" (default)
                - Production: "/storage/migrations"
            runtime_edition: Runtime mode ("inmem", "postgres", "community").
                - Default: "inmem"

        Workers:
            n_jobs_per_worker: Concurrent jobs per worker. Default: 10

        LangSmith/Tracing:
            langsmith_api_key: LangSmith API key for tracing.
            tracing_enabled: Enable LangChain tracing. Default: False

        Security:
            aes_key: AES encryption key (16/24/32 bytes) for data at rest.

        Server:
            api_variant: API variant identifier. Default: "local_dev"
            allow_private_network: Allow private network access. Default: True

    Returns:
        The FastAPI app with LangGraph API mounted.

    Example (Development):
        from fastapi import FastAPI
        from langgraph_helper import mount_langgraph_api

        app = FastAPI()

        @app.get("/health")
        def health():
            return {"status": "ok"}

        # Simple development setup (in-memory, no persistence)
        mount_langgraph_api(
            app,
            graphs={"agent": "main:graph"},
        )

    Example (Production with PostgreSQL):
        import os
        from fastapi import FastAPI
        from langgraph_helper import mount_langgraph_api

        app = FastAPI()

        mount_langgraph_api(
            app,
            graphs={"agent": "main:graph"},
            # PostgreSQL for persistence
            database_uri=os.getenv("DATABASE_URI", "postgresql://..."),
            redis_uri=os.getenv("REDIS_URI", "redis://redis:6379"),
            runtime_edition="postgres",
            # Enable tracing
            langsmith_api_key=os.getenv("LANGSMITH_API_KEY"),
            tracing_enabled=True,
            # Encryption for sensitive data
            aes_key=os.getenv("LANGGRAPH_AES_KEY"),
        )

    Available endpoints after mounting:
        - GET  /ok, /, /info, /metrics, /docs, /openapi.json
        - POST /assistants, /assistants/search, /assistants/count
        - GET/PATCH/DELETE /assistants/{assistant_id}
        - POST /threads, /threads/search, /threads/count
        - GET/PATCH/DELETE /threads/{thread_id}
        - GET/POST /threads/{thread_id}/state
        - POST /runs, /runs/stream, /runs/wait
        - POST /threads/{thread_id}/runs
        - PUT/GET/DELETE /store/items
        - POST/GET/DELETE /mcp (MCP protocol)
        - POST/GET/DELETE /a2a/{assistant_id} (A2A protocol)
        ... and more
    """
    # Add dependencies to sys.path if provided
    if dependencies:
        cwd = Path.cwd()
        for dep in dependencies:
            dep_path = cwd / dep
            if dep_path.is_dir() and dep_path.exists():
                if str(dep_path) not in sys.path:
                    sys.path.append(str(dep_path))

    # Set up environment variables (must happen before import)
    setup_langgraph_environment(
        graphs=graphs,
        host=host,
        port=port,
        database_uri=database_uri,
        redis_uri=redis_uri,
        migrations_path=migrations_path,
        runtime_edition=runtime_edition,
        n_jobs_per_worker=n_jobs_per_worker,
        langsmith_api_key=langsmith_api_key,
        tracing_enabled=tracing_enabled,
        aes_key=aes_key,
        api_variant=api_variant,
        allow_private_network=allow_private_network,
    )

    # Get the LangGraph API app
    lg_app = get_langgraph_app()

    # Mount the LangGraph API app onto the FastAPI app
    if path:
        # Mount with a prefix (e.g., /langgraph/assistants)
        app.mount(path, lg_app)
    else:
        # Mount at root - add routes directly to preserve FastAPI's own routes
        # This allows both custom routes and LangGraph routes at the root level
        app.mount("/", lg_app)

    return app


def load_graphs_from_config(config_path: str | Path | None = None) -> dict[str, str]:
    """
    Load graph configuration from a langgraph.json file.

    Args:
        config_path: Path to the langgraph.json file.
                     If None, looks for langgraph.json in the current directory.

    Returns:
        Dictionary of graph names to module paths.

    Example:
        graphs = load_graphs_from_config("langgraph.json")
        mount_langgraph_api(app, graphs=graphs)
    """
    if config_path is None:
        config_path = Path.cwd() / "langgraph.json"
    else:
        config_path = Path(config_path)

    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")

    with open(config_path) as f:
        config = json.load(f)

    return config.get("graphs", {})
