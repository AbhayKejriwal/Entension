# Agents Extension

VS Code extension with three specialized agent sidebars for Jira, coding documentation, and Jenkins automation.

## Features

This extension provides three different agent sidebars, each with specialized functionality:

### Jira Story Bot
- **Input Field**: Enter text commands to interact with the Jira Story Bot
- **Execute**: Click the Generate button to run commands through a Python script
- **Output Display**: View the command output directly in the sidebar
- **Error Handling**: Clearly see error messages if execution fails
- **Notifications**: Get notified when execution completes

### Dev Bot
- **File Selection**: Select a text file that contains stories/requirements
- **Options Selection**: Choose from code generation, unit tests, and documentation
- **Generation**: Click the Generate button to create the selected outputs
- **Output Display**: View the process status directly in the sidebar
- **Error Handling**: Clearly see error messages if execution fails

### Jenkins Agent
- Placeholder for future implementation
- Will provide Jenkins CI/CD integration and automation

## How to Use

1. Click on one of the three agent icons in the Activity Bar:
   - Jira Story Bot icon
   - Dev Bot icon
   - Jenkins Agent icon

### Jira Story Bot
1. Enter your desired input text in the text box
2. Click the "Generate" button or press Enter to execute the Python script
3. Choose an output folder when prompted
4. View the script output in the panel below
5. See notifications when execution completes
6. Optional: Configure a custom script by clicking the gear icon (⚙️) next to the heading

### Dev Bot
1. Click "Select File" to choose a text file with stories/requirements
2. Check/uncheck the desired output types:
   - Code Generation
   - Unit Test Cases
   - Documentation
3. Click "Generate" to process the file
4. Choose an output folder when prompted
5. View the processing status in the panel below
6. Optional: Configure a custom script by clicking the gear icon (⚙️) next to the heading

## Example Inputs

Here are some example inputs you might want to try:

- `Hello World` - Pass "Hello World" as arguments to the script
- `--name John --age 30` - Pass named arguments to the script
- `file1.txt file2.txt` - Pass multiple file names as arguments
- `"quoted string with spaces"` - Pass a quoted string as a single argument

## Requirements

- Visual Studio Code 1.100.0 or higher
- Python 3.6+ installed on your system (for running the Python script)

## Configuration

This extension provides the following configuration options:

| Setting | Description |
|---------|-------------|
| `jiraStoryBot.scriptPath` | Absolute path to a custom Python script for the Jira Story Bot. If not set, the default built-in script will be used. |
| `coderBot.scriptPath` | Absolute path to a custom Python script for the Dev Bot. If not set, the default built-in script will be used. |

### Configuration Methods

You can configure the script paths in two ways:

#### Method 1: Using Settings UI
1. Open VS Code settings (File > Preferences > Settings)
2. Search for "Jira Story Bot" or "Dev Bot" 
3. Enter the absolute path to your custom Python script
4. The changes will take effect immediately

#### Method 2: Using the Settings Gear Icon
1. Open the respective agent sidebar (Jira Story Bot or Dev Bot)
2. Click the gear icon (⚙️) next to the heading
3. This will open the VS Code settings directly to the relevant configuration
4. Enter the absolute path to your custom Python script
5. The changes will take effect immediately

### Script Requirements

- **Jira Story Bot Script**: Should accept two arguments: the input text and the output file path
- **Dev Bot Script**: Should accept the input file path, output prefix, and option flags

## Development

Clone the repository and run the following commands:

```bash
npm install
npm run compile
```

Press F5 to open a new window with the extension loaded.

### Project Structure

The project follows a modular structure:

- Each agent has its own directory under `src/agents/`
- Icons are stored in `resources/icons/`
- Common utilities are in `src/common/`
- Python script is in `src/script/`

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed overview of the project structure.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
