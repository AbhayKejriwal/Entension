// filepath: c:\Users\Abhay\Documents\Entension\src\agents\coder\coderViewProvider.ts
import * as vscode from 'vscode';
import { join } from 'path';
import { exec } from 'child_process';
import { getNonce, ProcessStatus, loadHtmlTemplate } from '../../common/utils';
import { ProcessManager } from '../../common/processManager';

/**
 * Provider for Dev Bot view.
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
				switch (message.command) {
					case 'selectFile':
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
			[]
		);
	}
	
	private _getHtmlForWebview(webview: vscode.Webview): string {
		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce();
		const templatePath = join(this._extensionUri.fsPath, 'src', 'agents', 'coder', 'webview', 'coderView.html');
		
		// Load template and replace placeholders
		return loadHtmlTemplate(templatePath, {
			nonce: nonce,
			cspSource: webview.cspSource
		});
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
