import * as vscode from 'vscode';
import { ChildProcess } from 'child_process';
import { ProcessStatus } from './utils';

/**
 * A class for managing script execution processes
 */
export class ProcessManager {
    private _process: ChildProcess | null = null;
    private _statusUpdateCallback: ((status: ProcessStatus) => void) | null = null;
    private _outputData: string = '';

    /**
     * Set the current process being managed
     * @param process The child process to manage
     * @param statusUpdateCallback Callback function that receives status updates
     */
    public setProcess(
        process: ChildProcess, 
        statusUpdateCallback: (status: ProcessStatus) => void
    ): void {
        // Clear any existing process
        this.clearProcess();

        this._process = process;
        this._statusUpdateCallback = statusUpdateCallback;
        this._outputData = '';

        // Set up process listeners
        this._setupEventListeners();
        
        // Notify that the process has started
        this._notifyStatusUpdate({
            status: 'running',
            message: 'Process started'
        });
    }
    
    /**
     * Clear the current process
     */
    public clearProcess(): void {
        if (this._process) {
            try {
                // Remove all listeners to avoid memory leaks
                this._process.removeAllListeners();
                
                // Kill the process if it's still running
                this._process.kill();
            } catch (e) {
                console.error('Error killing process:', e);
            }
            
            this._process = null;
            this._statusUpdateCallback = null;
        }
    }
    
    /**
     * Checks if a process is currently running
     */
    public isRunning(): boolean {
        return this._process !== null;
    }
    
    /**
     * Gets the accumulated output data
     */
    public getOutput(): string {
        return this._outputData;
    }
    
    /**
     * Set up event listeners for the current process
     */    private _setupEventListeners(): void {
        if (!this._process) {
            return;
        }
        
        // Handle stdout data
        this._process.stdout?.on('data', (data) => {
            const strData = data.toString();
            this._outputData += strData;
            this._notifyStatusUpdate({
                status: 'running',
                data: strData
            });
        });
        
        // Handle stderr data
        this._process.stderr?.on('data', (data) => {
            const strData = data.toString();
            this._outputData += strData;
            this._notifyStatusUpdate({
                status: 'running',
                data: strData
            });
        });
        
        // Handle when the process can't be spawned or killed
        this._process.on('error', (error) => {
            console.error('Process error:', error);
            this._notifyStatusUpdate({
                status: 'error',
                message: `Failed to execute process: ${error.message}`
            });
        });
        
        // Handle process completion
        this._process.on('close', (code) => {
            if (code === 0) {
                // Success case
                this._notifyStatusUpdate({
                    status: 'success',
                    message: `Process completed successfully.`,
                    data: this._outputData
                });
            } else {
                // Error case
                this._notifyStatusUpdate({
                    status: 'error',
                    message: `Process exited with code ${code}`,
                    data: this._outputData
                });
            }
            
            this._process = null;
        });
        
        // Handle process error
        this._process.on('error', (error) => {
            // Error case
            this._notifyStatusUpdate({
                status: 'error',
                message: error.message,
                data: this._outputData
            });
            
            this._process = null;
        });
    }
    
    /**
     * Notify the status update callback with the current status
     */
    private _notifyStatusUpdate(status: ProcessStatus): void {
        if (this._statusUpdateCallback) {
            this._statusUpdateCallback(status);
        }
    }
}
