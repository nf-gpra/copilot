Add the following back to package.json if local dev needed:

```
"dev": "concurrently \"npm run dev:ui\" \"npm run dev:agent\" --names ui,agent --prefix-colors blue,green --kill-others",
    "dev:debug": "LOG_LEVEL=debug npm run dev",
    "dev:agent": "cd agent && npx @langchain/langgraph-cli dev --port 8123 --no-browser",

"install:agent": "sh ./scripts/setup-agent.sh || scripts\\setup-agent.bat",
"postinstall": "npm run install:agent"
```
