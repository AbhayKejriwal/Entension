import * as vscode from 'vscode';
import { getNonce } from '../../common/utils';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

interface JenkinsJob {
    name: string;
    path: string;
}

/**
 * Provider for Jenkins Agent view.
 */
export class JenkinsViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'jenkins-view';

    private _view?: vscode.WebviewView;
    private _jobs: JenkinsJob[] = [];
    private _jenkinsBaseUrl = '';
    private _jenkinsAuthToken = '';

    constructor(private readonly _extensionUri: vscode.Uri) {
        this._loadConfiguration();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('jenkinsAgent')) {
                this._loadConfiguration();
                this._updateJobs();
            }
        });
    }

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
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'getBuildStatus':
                    this._getBuildStatus(message.jobPath, message.buildNumber);
                    break;
                    
                case 'getBuildLogs':
                    this._getBuildLogs(message.jobPath, message.buildNumber);
                    break;
                    
                case 'openJenkinsSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'jenkinsAgent');
                    break;
                      case 'refreshJobs':
                    this._fetchJenkinsJobs();
                    break;
                      case 'openBuildInBrowser':
                    this._openBuildInBrowser(message.jobPath, message.buildNumber);
                    break;                case 'testConnection':
                    this._testConnection();
                    break;
            }
        });

        // Initial jobs update
        this._updateJobs();
    }    /**
     * Common method to handle Jenkins API requests
     */
    private async _makeJenkinsRequest<T>(endpoint: string, options: { responseType?: string, method?: string } = {}): Promise<T> {
        if (!this._jenkinsBaseUrl) {
            throw new Error('Jenkins base URL not configured');
        }
        
        if (!this._jenkinsAuthToken) {
            throw new Error('Jenkins authentication token not configured');
        }
        
        const url = `${this._jenkinsBaseUrl}/${endpoint}`;
        
        const config: any = {
            headers: {
                'Authorization': `Bearer ${this._jenkinsAuthToken}`
            }
        };
        
        if (options.responseType) {
            config.responseType = options.responseType;
        }
        
        try {
            let response;
            
            // Use the appropriate HTTP method
            if (options.method === 'POST') {
                response = await axios.post(url, null, config);
            } else {
                response = await axios.get(url, config);
            }
            
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(`Server returned ${error.response.status}: ${error.response.statusText}`);
            }
            throw error;
        }
    }
    
    /**
     * Fetch jobs from Jenkins
     */
    private async _fetchJenkinsJobs(): Promise<void> {
        try {
            this._sendStatusUpdate('running', 'Fetching jobs from Jenkins...');
            
            const data = await this._makeJenkinsRequest<any>('api/json?tree=jobs[name,url]');
            
            if (data && data.jobs) {
                this._jobs = data.jobs.map((job: any) => ({
                    name: job.name,
                    path: this._extractJobPathFromUrl(job.url)
                }));
                
                this._updateJobs();
                this._sendStatusUpdate('success', `Loaded ${this._jobs.length} jobs from Jenkins`);
            }
        } catch (error) {
            this._sendStatusUpdate('error', `Failed to fetch jobs: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Extract job path from Jenkins URL
     */
    private _extractJobPathFromUrl(url: string): string {
        try {
            // Extract path from URL (e.g., http://jenkins.example.com/job/my-project/ -> job/my-project)
            const jenkinsUrl = new URL(this._jenkinsBaseUrl);
            const jobUrl = new URL(url);
            
            // Remove base URL and trailing slash
            let path = jobUrl.pathname.replace(jenkinsUrl.pathname, '').replace(/^\/|\/$/g, '');
            
            return path;
        } catch (e) {
            // If URL parsing fails, return the URL as is
            return url;
        }
    }    private _loadConfiguration(): void {
        const config = vscode.workspace.getConfiguration('jenkinsAgent');
        this._jenkinsBaseUrl = config.get('baseUrl') || '';
        this._jenkinsAuthToken = config.get('authToken') || '';
        
        // Load jobs from settings first
        const jobPaths = config.get<string[]>('jobPaths') || [];
        this._jobs = jobPaths.map(path => ({ 
            name: this._getJobNameFromPath(path), 
            path 
        }));
        
        // Try to fetch jobs from Jenkins if we have credentials
        if (this._jenkinsBaseUrl && this._jenkinsAuthToken) {
            this._fetchJenkinsJobs().catch(() => {
                // If fetching jobs fails, we already have jobs from settings
                console.log('Failed to fetch jobs from Jenkins, using configured jobs');
            });
        }
    }

    private _getJobNameFromPath(path: string): string {
        // Simple function to extract a readable name from a job path
        const segments = path.split('/');
        return segments[segments.length - 1] || path;
    }

    private _updateJobs(): void {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateJobs',
                jobs: this._jobs
            });
        }
    }    private async _getBuildStatus(jobPath: string, buildNumber: string): Promise<void> {
        try {
            this._sendStatusUpdate('running', `Fetching build status for ${jobPath}/${buildNumber}...`);
            
            // Get build info from Jenkins API
            const buildInfo = await this._makeJenkinsRequest<any>(`${jobPath}/${buildNumber}/api/json`);
              // Format the response data for display
            const formattedDate = new Date(buildInfo.timestamp).toLocaleString();
            const durationInMinutes = buildInfo.duration / 60000;
            
            let statusMessage = `Build ${buildNumber} Status:
- Result: ${buildInfo.result || 'IN PROGRESS'}
- Started: ${formattedDate}
- Duration: ${durationInMinutes.toFixed(2)} minutes
- Building: ${buildInfo.building ? 'Yes' : 'No'}`;
            
            // Additional information if available
            if (buildInfo.description) {
                statusMessage += `\n- Description: ${buildInfo.description}`;
            }
            
            if (buildInfo.estimatedDuration) {
                const estimatedMinutes = buildInfo.estimatedDuration / 60000;
                statusMessage += `\n- Estimated Duration: ${estimatedMinutes.toFixed(2)} minutes`;
            }            // Add a link to open in browser
            statusMessage += `\n\nClick "Open in Browser" below to view in Jenkins.`;
            
            this._sendStatusUpdate('success', statusMessage, {
                jobPath,
                buildNumber,
                hasLink: true
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 
                axios.isAxiosError(error) && error.response ? 
                    `Server returned ${error.response.status}: ${error.response.statusText}` : 
                    String(error);
            
            this._sendStatusUpdate('error', `Failed to get build status: ${errorMessage}`);
        }
    }    private async _getBuildLogs(jobPath: string, buildNumber: string): Promise<void> {
        try {
            this._sendStatusUpdate('running', 'Preparing to download build logs...');
            
        
            // Open dialog to select save location
            const folderUri = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select folder to save build logs'
            });
            
            if (!folderUri || folderUri.length === 0) {
                this._sendStatusUpdate('error', 'Operation cancelled. No folder selected.');
                return;
            }
              const saveDir = folderUri[0].fsPath;
            this._sendStatusUpdate('running', 'Downloading build logs...');
            
            // Fetch logs from the Jenkins API
            const logContent = await this._makeJenkinsRequest<string>(`${jobPath}/${buildNumber}/consoleText`, { responseType: 'text' });
            
            // Save logs to the selected folder
            const jobName = this._getJobNameFromPath(jobPath);
            const fileName = `${jobName}-${buildNumber}-logs.txt`;
            const filePath = path.join(saveDir, fileName);
              // Write the log content to a file
            fs.writeFileSync(filePath, logContent);
            
            this._sendStatusUpdate('success', `Build logs saved to: ${filePath}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 
                axios.isAxiosError(error) && error.response ? 
                    `Server returned ${error.response.status}: ${error.response.statusText}` : 
                    String(error);
                    
            this._sendStatusUpdate('error', `Failed to get build logs: ${errorMessage}`);
        }
    }
    
    /**
     * Test the connection to Jenkins
     */
    private async _testConnection(): Promise<void> {
        try {
            this._sendStatusUpdate('running', 'Testing connection to Jenkins...');
            
            if (!this._jenkinsBaseUrl) {
                throw new Error('Jenkins base URL not configured');
            }
            
            if (!this._jenkinsAuthToken) {
                throw new Error('Jenkins authentication token not configured');
            }
            
            // Try to get basic Jenkins info
            const data = await this._makeJenkinsRequest<any>('api/json');
            
            // Check if we got a valid response with Jenkins version
            if (data && data.version) {
                let message = `Connected successfully to Jenkins!
- Version: ${data.version}
- Node Name: ${data.nodeName || 'Not available'}
- Mode: ${data.mode || 'Not available'}`;

                if (data.numExecutors !== undefined) {
                    message += `\n- Executors: ${data.numExecutors}`;
                }
                
                this._sendStatusUpdate('success', message);
            } else {
                this._sendStatusUpdate('success', 'Connected successfully, but could not retrieve Jenkins version information.');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 
                axios.isAxiosError(error) && error.response ? 
                    `Server returned ${error.response.status}: ${error.response.statusText}` : 
                    String(error);
                    
            this._sendStatusUpdate('error', `Connection failed: ${errorMessage}`);
        }
    }
    
    /**
     * Open the build in a browser
     */
    private _openBuildInBrowser(jobPath: string, buildNumber: string): void {
        if (!this._jenkinsBaseUrl) {
            this._sendStatusUpdate('error', 'Jenkins base URL not configured. Please set it in settings.');
            return;
        }
        
        const buildUrl = `${this._jenkinsBaseUrl}/${jobPath}/${buildNumber}`;
        vscode.env.openExternal(vscode.Uri.parse(buildUrl));
    }
      // Retry build feature removed as per requirements
    
    private _sendStatusUpdate(status: 'running' | 'success' | 'error', message: string, data?: any): void {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'processUpdate',
                status,
                message,
                data
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Read the HTML file from disk
        const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'agents', 'jenkins', 'webview', 'jenkinsView.html');
        let html = fs.readFileSync(htmlPath, 'utf-8');
        
        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();
        
        // Replace placeholders in the HTML
        html = html.replace(/{{nonce}}/g, nonce);
        html = html.replace(/{{cspSource}}/g, webview.cspSource);
        
        return html;
    }
}
