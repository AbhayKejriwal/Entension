# Agents Extension - Architecture

## Directory Structure

```
src/
├── extension.ts               # Main extension file
├── agents/                    # Agent-specific code
│   ├── jira/                  # Jira Story Bot
│   │   └── jiraViewProvider.ts
│   ├── coder/                 # Coder & Documentation Bot
│   │   └── coderViewProvider.ts
│   └── jenkins/               # Jenkins Agent
│       └── jenkinsViewProvider.ts
├── common/                    # Shared utilities
│   ├── utils.ts               # Utility functions and interfaces
│   └── processManager.ts      # Script process management
├── script/                    # Python scripts
│   └── dummy_script.py        # Test script
└── webview/                   # Webview related code
    └── main.ts                # Shared webview code

resources/
└── icons/                     # Sidebar icons
    ├── jira.svg               # Jira Story Bot icon
    ├── coder.svg              # Coder & Documentation Bot icon
    └── jenkins.svg            # Jenkins Agent icon
```

## Component Interaction

```
+--------------------+      +------------------+      +-------------------+
| VS Code Extension  |----->| Agent Providers  |----->| Webview Sidebars  |
+--------------------+      +------------------+      +-------------------+
         |                          |                          |
         |                          |                          |
         v                          v                          v
+--------------------+      +------------------+      +-------------------+
| Commands and APIs  |      | Process Manager  |      | User Interaction  |
+--------------------+      +------------------+      +-------------------+
                                    |
                                    v
                            +-------------------+
                            | Python Scripts    |
                            +-------------------+
```

## Extension Flow

1. User activates extension
2. Three sidebar icons appear in the Activity Bar (Jira, Coder, Jenkins)
3. User clicks on a sidebar icon to open the corresponding view
4. User interacts with the view (e.g., enters a command in Jira Story Bot)
5. View provider processes the command and executes actions
6. Results are displayed in the view

## Providers

Each agent sidebar has a dedicated view provider class that:
- Creates and manages the webview
- Provides HTML content
- Handles messages from the webview
- Executes backend commands
- Returns results to the webview

## Common Utilities

- `utils.ts` - Basic utilities like nonce generation, interface definitions
- `processManager.ts` - Manages script execution processes including:
  - Starting/stopping processes
  - Monitoring output
  - Notifying status changes

## Future Enhancements

1. Complete implementation of Coder & Documentation Bot
2. Complete implementation of Jenkins Agent
3. Add settings for each agent
4. Enhance Python script integration
5. Add test coverage
