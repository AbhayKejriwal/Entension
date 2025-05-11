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
 * Loads an HTML template from a file and replaces placeholders
 * @param templatePath Path to the HTML template file
 * @param replacements Object with placeholder values to replace
 * @returns Processed HTML string
 */
import * as fs from 'fs';
import * as path from 'path';

export function loadHtmlTemplate(templatePath: string, replacements: Record<string, string>): string {
    // Read the template file
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    
    // Replace all placeholders with their corresponding values
    let processedHtml = templateContent;
    for (const [key, value] of Object.entries(replacements)) {
        const placeholder = `{{${key}}}`;
        processedHtml = processedHtml.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return processedHtml;
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
