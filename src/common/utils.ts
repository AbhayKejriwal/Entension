/**
 * Helper function to generate a nonce for script security
 */
export function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

/**
 * Common interface for process status events
 */
export interface ProcessStatus {
	status: 'running' | 'success' | 'error';
	message?: string;
	data?: any;
}

/**
 * Common interface for webview data handling
 */
export interface ViewState {
	history?: string[];
	[key: string]: any;
}
