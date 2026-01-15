import * as vscode from 'vscode';
import { CdmTreeDataProvider, CdmTreeItem, TreeItemType } from './providers/CdmTreeDataProvider';
import { RosettaHoverProvider } from './providers/RosettaHoverProvider';
import { RosettaDefinitionProvider } from './providers/RosettaDefinitionProvider';
import { RosettaReferenceProvider } from './providers/RosettaReferenceProvider';
import { SymbolIndexer } from './indexer/SymbolIndexer';
import { TypeGraphBuilder } from './graph/TypeGraphBuilder';
import { TypeGraphPanel } from './views/TypeGraphPanel';
import { SearchProvider } from './search/SearchProvider';
import { SearchPanel } from './search/SearchPanel';
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

    // Create type graph builder
    const typeGraphBuilder = new TypeGraphBuilder(symbolIndexer);

    // Create search provider
    const searchProvider = new SearchProvider(symbolIndexer);
    const searchPanel = new SearchPanel(searchProvider);

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

    // Register show type graph command
    context.subscriptions.push(
        vscode.commands.registerCommand('cdm.showTypeGraph', async () => {
            // Get the current word under cursor if in a Rosetta file
            const editor = vscode.window.activeTextEditor;
            let typeName: string | undefined;

            if (editor && editor.document.languageId === 'rosetta') {
                const position = editor.selection.active;
                const wordRange = editor.document.getWordRangeAtPosition(position);
                if (wordRange) {
                    const word = editor.document.getText(wordRange);
                    const symbol = symbolIndexer.getSymbol(word);
                    if (symbol) {
                        typeName = word;
                    }
                }
            }

            // If no type name, ask the user
            if (!typeName) {
                const answer = await vscode.window.showQuickPick(
                    ['Show all types', 'Enter type name'],
                    { placeHolder: 'What would you like to visualize?' }
                );

                if (answer === 'Enter type name') {
                    typeName = await vscode.window.showInputBox({
                        prompt: 'Enter the type or enum name',
                        placeHolder: 'e.g., Person, Employee'
                    });

                    if (!typeName) {
                        return;
                    }
                }
            }

            TypeGraphPanel.createOrShow(typeGraphBuilder, typeName);
        })
    );

    // Register search command
    context.subscriptions.push(
        vscode.commands.registerCommand('cdm.search', async () => {
            await searchPanel.showSearch();
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
