import * as vscode from 'vscode';
import { CdmTreeDataProvider, CdmTreeItem, TreeItemType } from './providers/CdmTreeDataProvider';
import { RosettaHoverProvider } from './providers/RosettaHoverProvider';
import { RosettaDefinitionProvider } from './providers/RosettaDefinitionProvider';
import { RosettaReferenceProvider } from './providers/RosettaReferenceProvider';
import { SymbolIndexer } from './indexer/SymbolIndexer';
import { RosettaType, RosettaEnum } from './models/RosettaAst';

/**
 * Check if workspace has any .rosetta files
 */
async function updateWorkspaceContext() {
    const rosettaFiles = await vscode.workspace.findFiles('**/*.rosetta', '**/node_modules/**', 1);
    const hasRosettaFiles = rosettaFiles.length > 0;
    await vscode.commands.executeCommand('setContext', 'workspaceHasRosettaFiles', hasRosettaFiles);
    return hasRosettaFiles;
}

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('FINOS CDM Viewer extension is now active');

    // Set initial workspace context
    updateWorkspaceContext();

    // Create symbol indexer
    const symbolIndexer = new SymbolIndexer();
    symbolIndexer.indexWorkspace();

    // Create tree data provider
    const treeDataProvider = new CdmTreeDataProvider();

    // Register tree view
    const treeView = vscode.window.createTreeView('cdmExplorer', {
        treeDataProvider,
        showCollapseAll: true
    });

    context.subscriptions.push(treeView);

    // Register refresh command
    context.subscriptions.push(
        vscode.commands.registerCommand('cdm.refreshExplorer', () => {
            symbolIndexer.indexWorkspace();
            treeDataProvider.refresh();
            vscode.window.showInformationMessage('CDM Explorer refreshed');
        })
    );

    // Register open definition command
    context.subscriptions.push(
        vscode.commands.registerCommand('cdm.openDefinition', async (item: CdmTreeItem) => {
            if (!item.filePath) {
                vscode.window.showWarningMessage('No file path available for this item');
                return;
            }

            try {
                const document = await vscode.workspace.openTextDocument(item.filePath);
                const editor = await vscode.window.showTextDocument(document);

                // Try to navigate to the definition location
                if (item.data) {
                    const text = document.getText();
                    let searchTerm = '';

                    if (item.type === TreeItemType.Type) {
                        const type = item.data as RosettaType;
                        searchTerm = `type ${type.name}`;
                    } else if (item.type === TreeItemType.Enum) {
                        const enumDef = item.data as RosettaEnum;
                        searchTerm = `enum ${enumDef.name}`;
                    }

                    if (searchTerm) {
                        const index = text.indexOf(searchTerm);
                        if (index !== -1) {
                            const position = document.positionAt(index);
                            editor.selection = new vscode.Selection(position, position);
                            editor.revealRange(
                                new vscode.Range(position, position),
                                vscode.TextEditorRevealType.InCenter
                            );
                        }
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to open file: ${error}`);
            }
        })
    );

    // Register show type graph command (placeholder for future implementation)
    context.subscriptions.push(
        vscode.commands.registerCommand('cdm.showTypeGraph', () => {
            vscode.window.showInformationMessage('Type graph visualization coming soon!');
        })
    );

    // Register hover provider for Rosetta files
    context.subscriptions.push(
        vscode.languages.registerHoverProvider('rosetta', new RosettaHoverProvider(symbolIndexer))
    );

    // Register definition provider for Rosetta files
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider('rosetta', new RosettaDefinitionProvider(symbolIndexer))
    );

    // Register reference provider for Rosetta files
    context.subscriptions.push(
        vscode.languages.registerReferenceProvider('rosetta', new RosettaReferenceProvider(symbolIndexer))
    );

    // Watch for changes to .rosetta files and refresh
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.rosetta');

    fileWatcher.onDidCreate((uri) => {
        updateWorkspaceContext();
        symbolIndexer.indexFile(uri.fsPath);
        treeDataProvider.refresh();
    });
    fileWatcher.onDidChange((uri) => {
        symbolIndexer.indexFile(uri.fsPath);
        treeDataProvider.refresh();
    });
    fileWatcher.onDidDelete(() => {
        updateWorkspaceContext();
        symbolIndexer.indexWorkspace();
        treeDataProvider.refresh();
    });

    context.subscriptions.push(fileWatcher);

    // Initial tree refresh
    treeDataProvider.refresh();
}

/**
 * Extension deactivation
 */
export function deactivate() {
    console.log('FINOS CDM Viewer extension is now deactivated');
}
