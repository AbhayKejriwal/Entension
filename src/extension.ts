// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { JiraViewProvider } from './agents/jira/jiraViewProvider';
import { CoderViewProvider } from './agents/coder/coderViewProvider';
import { JenkinsViewProvider } from './agents/jenkins/jenkinsViewProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
console.log("Congratulations, your extension \"Agents Extension\" is now active!");

// Register the webview providers
const jiraViewProvider = new JiraViewProvider(context.extensionUri);
const coderViewProvider = new CoderViewProvider(context.extensionUri);
const jenkinsViewProvider = new JenkinsViewProvider(context.extensionUri);

context.subscriptions.push(
vscode.window.registerWebviewViewProvider(JiraViewProvider.viewType, jiraViewProvider),
vscode.window.registerWebviewViewProvider(CoderViewProvider.viewType, coderViewProvider),
vscode.window.registerWebviewViewProvider(JenkinsViewProvider.viewType, jenkinsViewProvider)
);

// Register commands
const helloCommand = vscode.commands.registerCommand("agents.helloWorld", () => {
vscode.window.showInformationMessage("Hello World from Agents Extension!");
});

const openJiraViewCommand = vscode.commands.registerCommand("agents.openJiraView", () => {
vscode.commands.executeCommand("jira-view.focus");
});

const openCoderViewCommand = vscode.commands.registerCommand("agents.openCoderView", () => {
vscode.commands.executeCommand("coder-view.focus");
});

const openJenkinsViewCommand = vscode.commands.registerCommand("agents.openJenkinsView", () => {
vscode.commands.executeCommand("jenkins-view.focus");
});

const executeCommandCommand = vscode.commands.registerCommand("agents.executeCommand", async () => {
const commandText = await vscode.window.showInputBox({
placeHolder: "Enter a CLI command to execute",
prompt: "Enter a command to execute in the terminal"
});

if (commandText) {
exec(commandText, (error, stdout, stderr) => {
if (error) {
vscode.window.showErrorMessage(`Error executing command: ${error.message}`);
return;
}
const output = stdout || stderr;
const outputChannel = vscode.window.createOutputChannel("Agents Extension");
outputChannel.clear();
outputChannel.append(output);
outputChannel.show();
});
}
});

context.subscriptions.push(
helloCommand, 
openJiraViewCommand, 
openCoderViewCommand, 
openJenkinsViewCommand, 
executeCommandCommand
);
}

// This method is called when your extension is deactivated
export function deactivate() {}
