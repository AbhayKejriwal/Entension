import * as vscode from 'vscode';
import { join } from 'path';
import { exec } from 'child_process';
import { getNonce, ProcessStatus } from '../../common/utils';
import { ProcessManager } from '../../common/processManager';

/**
 * Provider for Coder & Documentation Bot view.
 */
export class CoderViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'coder-view';

	private _view?: vscode.WebviewView;
	private _processManager = new ProcessManager();
	private _selectedFilePath: string = '';

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
				switch (message.command) {					case 'selectFile':
						this._selectFile();
						break;
					case 'executeCommand':
						this._executeCommand(message.options);
						break;
					case 'openSettings':
						vscode.commands.executeCommand('workbench.action.openSettings', 'coderBot.scriptPath');
						break;
				}
			},
			undefined,
			[]);		// No need to send config update anymore
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
			<title>Coder & Documentation Bot</title>			<style>
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
					flex-direction: column;
					gap: 10px;
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
				h3 {
					margin-bottom: 10px;
				}
				.file-selector {
					display: flex;
					gap: 5px;
					align-items: center;
				}
				.file-path {
					flex: 1;
					padding: 4px 6px;
					color: var(--vscode-input-foreground);
					background-color: var(--vscode-input-background);
					border: 1px solid var(--vscode-input-border);
					cursor: default;
					border-radius: 3px;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
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
					gap: 5px;
				}
				button {
					padding: 6px 12px;
					background-color: var(--vscode-button-background);
					color: var(--vscode-button-foreground);
					border: none;
					cursor: pointer;
					border-radius: 3px;
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
				.checkbox-container {
					display: flex;
					flex-direction: column;
					gap: 8px;
					margin: 10px 0;
					padding: 10px;
					background-color: var(--vscode-input-background);
					border-radius: 3px;
				}
				.checkbox-item {
					display: flex;
					align-items: center;
					gap: 10px;
				}
				.checkbox-item input {
					margin: 0;
					width: auto;
				}
				.checkbox-item label {
					font-size: 13px;
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
			<div class="container">				<div class="section">
					<div class="section-header">
						<h3 class="section-title">Coder & Documentation Bot</h3>
						<button class="icon-button" id="settings-button" title="Open Settings">⚙️</button>
					</div>
					
					<div class="input-container">
						<div class="file-selector">
							<div id="file-path" class="file-path">No file selected</div>
							<button id="select-file-button">Select File</button>
						</div>
						
						<div class="checkbox-container">
							<div class="checkbox-item">
								<input type="checkbox" id="code-gen" checked>
								<label for="code-gen">Code Generation</label>
							</div>
							<div class="checkbox-item">
								<input type="checkbox" id="unit-test">
								<label for="unit-test">Unit Test Cases</label>
							</div>
							<div class="checkbox-item">
								<input type="checkbox" id="docs">
								<label for="docs">Documentation</label>
							</div>
						</div>
						
						<button id="execute-button" disabled>Generate</button>
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
						<div class="output-content" id="output-content">Select a file and options, then click Generate.</div>
					</div>
				</div>
		
			</div>
					<script nonce="${nonce}">
				const vscode = acquireVsCodeApi();				const filePath = document.getElementById('file-path');
				const selectFileButton = document.getElementById('select-file-button');
				const codeGenCheckbox = document.getElementById('code-gen');
				const unitTestCheckbox = document.getElementById('unit-test');
				const docsCheckbox = document.getElementById('docs');
				const executeButton = document.getElementById('execute-button');
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
				
				// Select file button
				selectFileButton.addEventListener('click', () => {
					vscode.postMessage({
						command: 'selectFile'
					});
				});
				
				// Execute button
				executeButton.addEventListener('click', () => {
					// Get selected options
					const options = {
						codeGen: codeGenCheckbox.checked,
						unitTest: unitTestCheckbox.checked,
						docs: docsCheckbox.checked
					};
					
					// Disable button and show loading
					executeButton.disabled = true;
					loadingIndicator.style.display = 'block';
					statusText.textContent = 'Executing...';
					outputContent.textContent = 'Generating selected outputs...';
					
					// Send message
					vscode.postMessage({
						command: 'executeCommand',
						options: options
					});
				});
				
				// Listen for messages from the extension
				window.addEventListener('message', event => {
					const message = event.data;
					switch (message.command) {
						case 'fileSelected':
							// Update file path display
							filePath.textContent = message.path || 'No file selected';
							// Enable/disable execute button based on file selection
							executeButton.disabled = !message.path;
							break;
						case 'processUpdate':
							if (message.status === 'running') {
								// Process is still running
								executeButton.disabled = true;
								loadingIndicator.style.display = 'block';
								statusText.textContent = 'Running...';
								outputContent.textContent = message.message || 'Generating outputs...';
							} else if (message.status === 'success') {
								// Process completed successfully
								executeButton.disabled = false;
								loadingIndicator.style.display = 'none';
								statusText.textContent = 'Completed';
								outputContent.textContent = message.message || 'Generation completed successfully.';
							} else if (message.status === 'error') {
								// Process encountered an error
								executeButton.disabled = false;
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
	
	/**
	 * Handle file selection
	 */
	private async _selectFile() {
		if (!this._view) {
			return;
		}

		// Show a file selection dialog
		const options: vscode.OpenDialogOptions = {
			canSelectMany: false,
			canSelectFiles: true,
			canSelectFolders: false,
			openLabel: 'Select Input File',
			title: 'Select a text file that contains the stories',
			filters: {
				'Text Files': ['txt', 'md'],
				'All Files': ['*']
			}
		};

		const fileUri = await vscode.window.showOpenDialog(options);
		
		// If user canceled the dialog, abort the operation
		if (!fileUri || fileUri.length === 0) {
			this._sendFileSelectedUpdate('');
			return;
		}

		this._selectedFilePath = fileUri[0].fsPath;
		this._sendFileSelectedUpdate(this._selectedFilePath);
	}
	
	/**
	 * Execute the command with selected options
	 * @param options The selected options (code generation, unit tests, docs)
	 */
	private async _executeCommand(options: {
		codeGen: boolean;
		unitTest: boolean;
		docs: boolean;
	}) {
		if (!this._view || !this._selectedFilePath) {
			return;
		}

		// Show a folder selection dialog for output
		const dialogOptions: vscode.OpenDialogOptions = {
			canSelectMany: false,
			canSelectFiles: false,
			canSelectFolders: true,
			openLabel: 'Select Output Folder',
			title: 'Select folder where outputs will be saved'
		};

		const folderUri = await vscode.window.showOpenDialog(dialogOptions);
		
		// If user canceled the dialog, abort the operation
		if (!folderUri || folderUri.length === 0) {
			this._sendProcessUpdate({
				status: 'error',
				message: 'Folder selection canceled'
			});
			return;
		}

		const outputFolder = folderUri[0].fsPath;
		const outputPrefix = join(outputFolder, `coder_output_${Date.now()}`);
		
		// Send an initial update to show we're starting the process
		this._sendProcessUpdate({
			status: 'running',
			message: 'Generating selected outputs...'
		});
				// Get path to the Python script - either from settings or default
		const configPath = vscode.workspace.getConfiguration('coderBot').get<string>('scriptPath');
		const scriptPath = configPath && configPath.trim() !== '' 
			? configPath 
			: join(this._extensionUri.fsPath, 'src', 'script', 'coder_script.py');

		// Build arguments based on selected options
		const args = [];
		if (options.codeGen) args.push('--code-gen');
		if (options.unitTest) args.push('--unit-test');
		if (options.docs) args.push('--docs');
		
		// Build the command to execute the Python script with the input file, options, and output folder
		const pythonCommand = `python "${scriptPath}" "${this._selectedFilePath}" "${outputPrefix}" ${args.join(' ')}`;
		console.log(`Executing Python command: ${pythonCommand}`);
		
		// Execute the command and manage the process
		const process = exec(pythonCommand);
		
		// Set up the process manager
		this._processManager.setProcess(process, (status) => {
			this._sendProcessUpdate(status);
			
			// Handle process completion
			if (status.status === 'success') {
				// Show success notification
				this._sendProcessUpdate({
					status: 'success',
					message: `Generation completed and saved with prefix: ${outputPrefix}`
				});
				vscode.window.showInformationMessage(`Generation completed and saved with prefix: ${outputPrefix}`);
			} else if (status.status === 'error') {
				// Show error notification
				vscode.window.showErrorMessage(`Failed to generate outputs: ${status.message}`);
			}
		});
	}
		/**
	 * Browse for a Python script file
	 */
	private async _browseScriptPath() {
		const options: vscode.OpenDialogOptions = {
			canSelectMany: false,
			canSelectFiles: true,
			canSelectFolders: false,
			title: 'Select Python Script',
			openLabel: 'Select Script',
			filters: {
				'Python Files': ['py'],
				'All Files': ['*']
			}
		};

		const fileUri = await vscode.window.showOpenDialog(options);
		
		if (fileUri && fileUri.length > 0) {
			const scriptPath = fileUri[0].fsPath;
			this._saveScriptPath(scriptPath);
		}
	}
	
	/**
	 * Save the script path to configuration
	 */
	private _saveScriptPath(path: string) {
		const config = vscode.workspace.getConfiguration('coderBot');
		config.update('scriptPath', path, vscode.ConfigurationTarget.Global)
			.then(() => {
				vscode.window.showInformationMessage(`Coder Bot script path updated`);
				this._sendConfigUpdate();
			}, (error) => {
				vscode.window.showErrorMessage(`Failed to update script path: ${error}`);
			});
	}
	
	/**
	 * Reset the script path to default
	 */
	private _resetScriptPath() {
		const config = vscode.workspace.getConfiguration('coderBot');
		config.update('scriptPath', undefined, vscode.ConfigurationTarget.Global)
			.then(() => {
				vscode.window.showInformationMessage(`Reset to default script path`);
				this._sendConfigUpdate();
			}, (error) => {
				vscode.window.showErrorMessage(`Failed to reset script path: ${error}`);
			});
	}
	
	/**
	 * Send current configuration to the webview
	 */
	private _sendConfigUpdate() {
		if (!this._view) {
			return;
		}
		
		const scriptPath = vscode.workspace.getConfiguration('coderBot').get<string>('scriptPath');
		this._view.webview.postMessage({
			command: 'configUpdate',
			scriptPath: scriptPath || ''
		});
	}
	
	/**
	 * Send file selection update to the webview
	 */
	private _sendFileSelectedUpdate(path: string) {
		if (!this._view) {
			return;
		}
		
		this._view.webview.postMessage({
			command: 'fileSelected',
			path: path
		});
	}
	
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
