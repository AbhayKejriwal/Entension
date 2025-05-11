import * as vscode from 'vscode';
import { join } from 'path';
import { exec } from 'child_process';
import { getNonce, ProcessStatus, loadHtmlTemplate } from '../../common/utils';
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
				// No need to send config update anymore
	}	private _getHtmlForWebview(webview: vscode.Webview): string {
		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce();
		const templatePath = join(this._extensionUri.fsPath, 'src', 'agents', 'jira', 'webview', 'jiraView.html');
		
		// Load template and replace placeholders
		return loadHtmlTemplate(templatePath, {
			nonce: nonce,
			cspSource: webview.cspSource
		});
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
	}
	/**
	 * _sendConfigUpdate method was removed since we now use the VS Code settings UI directly
	 */
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
