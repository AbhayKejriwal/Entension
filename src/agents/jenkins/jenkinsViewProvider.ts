import * as vscode from 'vscode';
import { getNonce } from '../../common/utils';

/**
 * Provider for Jenkins Agent view.
 */
export class JenkinsViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'jenkins-view';

	private _view?: vscode.WebviewView;

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
			<title>Jenkins Agent</title>
			<style>
				body {
					padding: 10px;
					color: var(--vscode-foreground);
					font-family: var(--vscode-font-family);
				}
				.container {
					display: flex;
					flex-direction: column;
					gap: 10px;
				}
				h3 {
					margin-bottom: 16px;
				}
				.placeholder {
					padding: 20px;
					text-align: center;
					background-color: var(--vscode-editor-background);
					border: 1px solid var(--vscode-panel-border);
					border-radius: 3px;
				}
			</style>
		</head>
		<body>
			<div class="container">
				<h3>Jenkins Agent</h3>
				<div class="placeholder">
					<p>Placeholder content for Jenkins Agent.</p>
					<p>This view will be implemented in a future update.</p>
				</div>
			</div>
			<script nonce="${nonce}">
				const vscode = acquireVsCodeApi();
			</script>
		</body>
		</html>`;
	}
}
