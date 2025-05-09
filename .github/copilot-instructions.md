<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Agents Extension - Copilot Instructions

This is a VS Code extension project that implements three separate agent sidebars:

1. **Jira Story Bot** - A sidebar that allows users to interact with a Python script and see the results
2. **Coder & Documentation Bot** - (Placeholder) Will provide code documentation and generation assistance
3. **Jenkins Agent** - (Placeholder) Will provide Jenkins CI/CD integration

## Architecture

- Each view has its own provider class in `src/providers/`
- The main extension file (`src/extension.ts`) registers these providers and commands
- SVG icons for the sidebars are stored in `resources/icons/`
- A Python script for testing is in `src/script/dummy_script.py`

## Development

When working on this project, please use the following guidelines:

1. Use the `get_vscode_api` tool to fetch the latest VS Code API references
2. Maintain separation of concerns between the three view providers
3. Ensure proper error handling and UX in all webview interfaces
4. Follow VS Code's extension development best practices

## Future Enhancement Priorities

1. Complete implementation of the Coder & Documentation Bot view
2. Complete implementation of the Jenkins Agent view
3. Enhance the Jira Story Bot with more specialized Jira integration
4. Add settings and configuration options for each agent
