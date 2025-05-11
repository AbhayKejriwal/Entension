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
	private _selectedCodeFilePath: string = '';
	private _sourceDirectoryPath: string = '';
	private _destinationDirectoryPath: string = '';

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
						this._selectFile(message.section);
						break;
					case 'selectDirectory':
						this._selectDirectory(message.section);
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
	 * @param section The section requesting file selection
	 */
	private async _selectFile(section: string) {
		if (!this._view) {
			return;
		}

		// Show a file selection dialog
		const options: vscode.OpenDialogOptions = {
			canSelectMany: false,
			canSelectFiles: true,
			canSelectFolders: false,
			openLabel: 'Select File',
			title: 'Select a file for code generation',
			filters: {
				'Code Files': ['js', 'ts', 'py', 'java', 'cs', 'cpp', 'c', 'go', 'php', 'rb'],
				'All Files': ['*']
			}
		};

		const fileUri = await vscode.window.showOpenDialog(options);
		
		// If user canceled the dialog, abort the operation
		if (!fileUri || fileUri.length === 0) {
			this._sendFileSelectedUpdate('', section);
			return;
		}

		this._selectedCodeFilePath = fileUri[0].fsPath;
		this._sendFileSelectedUpdate(this._selectedCodeFilePath, section);
	}
	
	/**
	 * Handle directory selection
	 * @param section The section requesting directory selection
	 */
	private async _selectDirectory(section: string) {
		if (!this._view) {
			return;
		}

		// Show a folder selection dialog
		const options: vscode.OpenDialogOptions = {
			canSelectMany: false,
			canSelectFiles: false,
			canSelectFolders: true,
			openLabel: 'Select Directory',
			title: section === 'sourceDir' ? 'Select source directory' : 'Select destination directory'
		};

		const dirUri = await vscode.window.showOpenDialog(options);
		
		// If user canceled the dialog, abort the operation
		if (!dirUri || dirUri.length === 0) {
			this._sendDirectorySelectedUpdate('', section);
			return;
		}

		// Update the appropriate path based on the section
		if (section === 'sourceDir') {
			this._sourceDirectoryPath = dirUri[0].fsPath;
		} else if (section === 'destinationDir') {
			this._destinationDirectoryPath = dirUri[0].fsPath;
		}
		
		this._sendDirectorySelectedUpdate(dirUri[0].fsPath, section);
	}
	
	/**
	 * Execute the command with selected options
	 * @param options The selected options for the specified action
	 */
	private async _executeCommand(options: {
		actionType: string;
		[key: string]: any;
	}) {
		if (!this._view) {
			return;
		}
		
		// Handle different action types
		if (options.actionType === 'codeGen') {
			if (!this._selectedCodeFilePath) {
				this._sendProcessUpdate({
					status: 'error',
					message: 'No file selected for code generation'
				});
				return;
			}
			
			// Code generation is just a placeholder for now
			this._sendProcessUpdate({
				status: 'running',
				message: 'Code generation feature coming soon...'
			});
			
			// Simulate processing
			setTimeout(() => {
				this._sendProcessUpdate({
					status: 'success',
					message: 'Code generation placeholder - Feature coming soon!'
				});
			}, 2000);
		} 
		else if (options.actionType === 'docsAndTests') {
			// Validate that we have source and destination directories
			if (!this._sourceDirectoryPath || !this._destinationDirectoryPath) {
				this._sendProcessUpdate({
					status: 'error',
					message: 'Source and destination directories must be selected'
				});
				return;
			}
			
			// Validate that at least one option is selected
			if (!options.docs && !options.unitTest) {
				this._sendProcessUpdate({
					status: 'error',
					message: 'At least one option (Documentation or Unit Tests) must be selected'
				});
				return;
			}
			
			// Get path to the Python script - either from settings or default
			const configPath = vscode.workspace.getConfiguration('coderBot').get<string>('scriptPath');
			const scriptPath = configPath && configPath.trim() !== '' 
				? configPath 
				: join(this._extensionUri.fsPath, 'src', 'script', 'coder_script.py');
			
			// Build a unique output prefix based on timestamp
			const outputPrefix = join(this._destinationDirectoryPath, `coder_output_${Date.now()}`);
			
			// Build arguments based on selected options
			const args: string[] = [];
			if (options.unitTest) args.push('--unit-test');
			if (options.docs) args.push('--docs');
			
			// Send an initial update to show we're starting the process
			this._sendProcessUpdate({
				status: 'running',
				message: `Generating ${options.docs ? 'documentation' : ''}${options.docs && options.unitTest ? ' and ' : ''}${options.unitTest ? 'unit tests' : ''}...`
			});
			
			// Build the command to execute the Python script
			const pythonCommand = `python "${scriptPath}" "${this._sourceDirectoryPath}" "${outputPrefix}" ${args.join(' ')}`;
			console.log(`Executing Python command: ${pythonCommand}`);
			
			// Execute the command and manage the process
			const process = exec(pythonCommand);
			
			// Set up the process manager
			this._processManager.setProcess(process, (status) => {
				this._sendProcessUpdate(status);
				
				// Handle process completion
				if (status.status === 'success') {
					// Show success notification
					const successMessage = `Generation completed and saved with prefix: ${outputPrefix}`;
					this._sendProcessUpdate({
						status: 'success',
						message: successMessage
					});
					vscode.window.showInformationMessage(successMessage);
				} else if (status.status === 'error') {
					// Show error notification
					const errorMessage = `Failed to generate outputs: ${status.message}`;
					this._sendProcessUpdate({
						status: 'error',
						message: errorMessage
					});
					vscode.window.showErrorMessage(errorMessage);
				}
			});
		}
	}
	
	/**
	 * Send file selection update to the webview
	 */
	private _sendFileSelectedUpdate(path: string, section: string) {
		if (!this._view) {
			return;
		}
		
		this._view.webview.postMessage({
			command: 'fileSelected',
			section: section,
			path: path
		});
	}
	
	/**
	 * Send directory selection update to the webview
	 */
	private _sendDirectorySelectedUpdate(path: string, section: string) {
		if (!this._view) {
			return;
		}
		
		this._view.webview.postMessage({
			command: 'directorySelected',
			section: section,
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
