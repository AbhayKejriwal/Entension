import * as vscode from 'vscode';
import { join } from 'path';
import { exec } from 'child_process';
import { getNonce, ProcessStatus } from '../../common/utils';
import { ProcessManager } from '../../common/processManager';

/**
 * Provider for Jira Story Bot view.
 */
export class JiraViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'jira-view';

	private _view?: vscode.WebviewView;
	private _processManager = new ProcessManager();

	constructor(private readonly _extensionUri: vscode.Uri) { }
	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Enable JavaScript in the webview
			enableScripts: true,
			// Restrict the webview to only loading content from our extension's directory
			localResourceRoots: [this._extensionUri],
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {					case 'executeCommand':
						this._executeCommand(message.text);
						break;
					case 'openSettings':
						vscode.commands.executeCommand('workbench.action.openSettings', 'jiraStoryBot.scriptPath');
						break;
				}
			},
			undefined,
			[]);
		
		// Send current configuration to the webview
		this._sendConfigUpdate();
	}

	private _getHtmlForWebview(webview: vscode.Webview): string {
		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce();

		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
			<title>Jira Story Bot</title>			<style>
				body {
					padding: 10px;
					color: var(--vscode-foreground);
					font-family: var(--vscode-font-family);
				}
				.container {
					display: flex;
					flex-direction: column;
					gap: 12px;
				}
				.section {
					background-color: var(--vscode-editor-background);
					border-radius: 6px;
					padding: 12px;
					border: 1px solid var(--vscode-widget-border);
				}
				.section-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 10px;
				}
				.section-title {
					font-weight: 600;
					font-size: 14px;
					color: var(--vscode-editor-foreground);
				}
				.collapsible {
					background: none;
					border: none;
					cursor: pointer;
					font-size: 12px;
					color: var(--vscode-textLink-foreground);
					padding: 0;
				}
				.collapsible:hover {
					text-decoration: underline;
				}
				.collapsed {
					display: none;
				}
				.input-container {
					display: flex;
					gap: 5px;
				}
				.form-field {
					margin-bottom: 10px;
				}
				.form-field label {
					display: block;
					margin-bottom: 4px;
					font-size: 12px;
					color: var(--vscode-disabledForeground);
				}
				input, textarea {
					padding: 6px;
					border: 1px solid var(--vscode-input-border);
					background-color: var(--vscode-input-background);
					color: var(--vscode-input-foreground);
					width: 100%;
					box-sizing: border-box;
					border-radius: 3px;
				}
				input:focus, textarea:focus {
					outline: 1px solid var(--vscode-focusBorder);
				}
				.input-file {
					display: flex;
					align-items: center;
				}
				button {
					padding: 6px 12px;
					background-color: var(--vscode-button-background);
					color: var(--vscode-button-foreground);
					border: none;
					border-radius: 3px;
					cursor: pointer;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 13px;
				}
				.btn-small {
					padding: 4px 8px;
					font-size: 12px;
				}
				.btn-secondary {
					background-color: var(--vscode-button-secondaryBackground);
					color: var(--vscode-button-secondaryForeground);
				}
				button:hover {
					background-color: var(--vscode-button-hoverBackground);
				}
				.btn-secondary:hover {
					background-color: var(--vscode-button-secondaryHoverBackground);
				}
				button:disabled {
					opacity: 0.5;
					cursor: not-allowed;
				}
				.output-container {
					display: flex;
					flex-direction: column;
				}
				.output-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					font-size: 12px;
					color: var(--vscode-descriptionForeground);
					margin-bottom: 5px;
				}
				.output {
					padding: 10px;
					background-color: var(--vscode-editor-background);
					border: 1px solid var(--vscode-panel-border);
					overflow: auto;
					max-height: 300px;
					border-radius: 3px;
					font-size: 13px;
				}
				.output-content {
					white-space: pre-wrap;
					font-family: var(--vscode-editor-font-family);
					font-size: var(--vscode-editor-font-size);
				}
				.loading {
					display: inline-block;
					width: 16px;
					height: 16px;
					border: 2px solid var(--vscode-button-background);
					border-radius: 50%;
					border-top-color: transparent;
					animation: spin 1s linear infinite;
				}
				@keyframes spin {
					to { transform: rotate(360deg); }
				}
				.error {
					color: var(--vscode-errorForeground);
				}
				.success {
					color: var(--vscode-terminal-ansiGreen);
				}
				.actions {
					display: flex;
					justify-content: space-between;
					align-items: center;
					gap: 8px;
				}
				.right-actions {
					margin-left: auto;
				}				.icon-button {
					background: none;
					border: none;
					padding: 4px;
					cursor: pointer;
					font-size: 16px;
					color: var(--vscode-editor-foreground);
					opacity: 0.7;
					border-radius: 3px;
					display: flex;
					align-items: center;
					justify-content: center;
				}
				.icon-button:hover {
					opacity: 1;
					background-color: var(--vscode-toolbar-hoverBackground);
				}
			</style>
		</head>		<body>
			<div class="container">
				<div class="section">					<div class="section-header">
						<h3 class="section-title">Jira Story Bot</h3>
						<button class="icon-button" id="settings-button" title="Open Settings">⚙️</button>
					</div>
					<p>Generate story details by entering the requirements of your epic:</p>
					<div class="input-container">
						<input type="text" id="command-input" placeholder="Enter epic requirements">
						<button id="run-button">Generate</button>
					</div>
				</div>
				
				<div class="section">
					<div class="section-header">
						<span class="section-title">Output</span>
						<div class="actions">
							<span id="status-text">Ready</span>
							<span id="loading-indicator" style="display:none"><div class="loading"></div></span>
						</div>
					</div>
					<div class="output">
						<div class="output-content" id="output-content">Enter your epic requirements and click Generate to create Jira stories.</div>
					</div>
				</div>
				</div>
			</div>			<script nonce="${nonce}">
				const vscode = acquireVsCodeApi();				const commandInput = document.getElementById('command-input');
				const runButton = document.getElementById('run-button');
				const outputContent = document.getElementById('output-content');
				const statusText = document.getElementById('status-text');
				const loadingIndicator = document.getElementById('loading-indicator');
				const settingsButton = document.getElementById('settings-button');
				
				// Open settings when gear icon is clicked
				settingsButton.addEventListener('click', () => {
					vscode.postMessage({
						command: 'openSettings'
					});
				});
				
				// Send command to extension
				runButton.addEventListener('click', () => {
					const command = commandInput.value.trim();
					if (command) {
						// Disable button and show loading
						runButton.disabled = true;
						loadingIndicator.style.display = 'block';
						statusText.textContent = 'Executing...';
						outputContent.textContent = 'Executing command: ' + command;
						
						// Send message
						vscode.postMessage({
							command: 'executeCommand',
							text: command
						});
					}
				});

				// Handle Enter key on input
				commandInput.addEventListener('keydown', (e) => {
					if (e.key === 'Enter') {
						runButton.click();
					}
				});
				
				// Focus input field on load
				commandInput.focus();
				
				// Listen for messages from the extension
				window.addEventListener('message', event => {
					const message = event.data;
					switch (message.command) {
						case 'processUpdate':
							if (message.status === 'running') {
								// Process is still running
								runButton.disabled = true;
								loadingIndicator.style.display = 'block';
								statusText.textContent = 'Running...';
								outputContent.textContent = message.message || 'Generating story details...';
							} else if (message.status === 'success') {
								// Process completed successfully
								runButton.disabled = false;
								loadingIndicator.style.display = 'none';
								statusText.textContent = 'Completed';
								outputContent.textContent = message.message || 'Story details generated successfully.';
							} else if (message.status === 'error') {
								// Process encountered an error
								runButton.disabled = false;
								loadingIndicator.style.display = 'none';
								statusText.textContent = 'Error';
								outputContent.textContent = 'Error: ' + (message.message || 'Unknown error');
							}
							break;						// No need for configUpdate case anymore
							break;
					}
				});
			</script>
		</body>
		</html>`;
	}
	private async _executeCommand(commandText: string) {
		if (!this._view) {
			return;
		}

		// Show a folder selection dialog
		const options: vscode.OpenDialogOptions = {
			canSelectMany: false,
			canSelectFiles: false,
			canSelectFolders: true,
			openLabel: 'Select Output Folder',
			title: 'Select folder where story details will be saved'
		};

		const folderUri = await vscode.window.showOpenDialog(options);
		
		// If user canceled the dialog, abort the operation
		if (!folderUri || folderUri.length === 0) {
			this._sendProcessUpdate({
				status: 'error',
				message: 'Folder selection canceled'
			});
			return;
		}

		const outputFolder = folderUri[0].fsPath;
		const outputFile = join(outputFolder, `jira_story_${Date.now()}.txt`);
		
		// Send an initial update to show we're starting the process
		this._sendProcessUpdate({
			status: 'running',
			message: 'Generating story details...'
		});		// Get path to the Python script - either from settings or default
		const configPath = vscode.workspace.getConfiguration('jiraStoryBot').get<string>('scriptPath');
		const scriptPath = configPath && configPath.trim() !== '' 
			? configPath 
			: join(this._extensionUri.fsPath, 'src', 'script', 'dummy_script.py');

		// Build the command to execute the Python script with the input and output folder as arguments
		const pythonCommand = `python "${scriptPath}" "${commandText}" "${outputFile}"`;
		console.log(`Executing Python command: ${pythonCommand}`);
		
		// Execute the command and manage the process - with no timeout to allow long-running scripts
		// This runs fully asynchronously and non-blocking
		const process = exec(pythonCommand);
		
		// Set up the process manager
		this._processManager.setProcess(process, (status) => {
			this._sendProcessUpdate(status);
			
			// Handle process completion
			if (status.status === 'success') {
				// Show success notification with file location
				this._sendProcessUpdate({
					status: 'success',
					message: `Story details generated and saved in the file: ${outputFile}`
				});
				vscode.window.showInformationMessage(`Story details generated and saved at: ${outputFile}`);
			} else if (status.status === 'error') {
				// Show error notification
				vscode.window.showErrorMessage(`Failed to generate story details: ${status.message}`);
			}
		});
	}	// Configuration methods removed - now using settings gear icon

	/**
	 * Sends a process status update to the webview
	 */
	private _sendProcessUpdate(status: ProcessStatus) {
		if (!this._view) {
			return;
		}

		this._view.webview.postMessage({
			command: 'processUpdate',
			...status
		});
	}
}
