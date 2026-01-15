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
import { ExportProvider, ExportFormat } from './export/ExportProvider';
import { DiagnosticProvider } from './validation/DiagnosticProvider';
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

    // Create export provider
    const exportProvider = new ExportProvider(symbolIndexer, typeGraphBuilder);

    // Create diagnostic provider
    const diagnosticProvider = new DiagnosticProvider(symbolIndexer);

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

    // Register export command
    context.subscriptions.push(
        vscode.commands.registerCommand('cdm.export', async () => {
            // Get current type if cursor is on one
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

            // Ask for export scope
            const scopeOptions = ['Export all types', 'Export specific type'];
            if (typeName) {
                scopeOptions.push(`Export ${typeName}`);
            }

            const scope = await vscode.window.showQuickPick(scopeOptions, {
                placeHolder: 'What would you like to export?'
            });

            if (!scope) {
                return;
            }

            // Determine type name based on scope
            let exportTypeName: string | undefined;
            if (scope === 'Export specific type') {
                exportTypeName = await vscode.window.showInputBox({
                    prompt: 'Enter the type or enum name',
                    placeHolder: 'e.g., Person, Employee'
                });
                if (!exportTypeName) {
                    return;
                }
            } else if (scope.startsWith('Export ') && scope !== 'Export all types') {
                exportTypeName = typeName;
            }

            // Ask for format
            const format = await vscode.window.showQuickPick(
                [
                    { label: 'JSON', description: 'Complete type and enum definitions' },
                    { label: 'Mermaid', description: 'Mermaid diagram for visualization' },
                    { label: 'GraphViz', description: 'DOT format for Graphviz' }
                ],
                {
                    placeHolder: 'Select export format'
                }
            );

            if (!format) {
                return;
            }

            // Perform export
            const exportFormat = format.label.toLowerCase() as ExportFormat;
            await exportProvider.export(exportFormat, exportTypeName);
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
        // Validate the changed document
        vscode.workspace.openTextDocument(uri).then(doc => {
            diagnosticProvider.validateDocument(doc);
        });
    });
    fileWatcher.onDidDelete(() => {
        updateWorkspaceContext();
        symbolIndexer.indexWorkspace();
        treeDataProvider.refresh();
    });

    context.subscriptions.push(fileWatcher);

    // Validate open documents
    vscode.workspace.textDocuments.forEach(doc => {
        if (doc.languageId === 'rosetta') {
            diagnosticProvider.validateDocument(doc);
        }
    });

    // Validate on document open
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(doc => {
            if (doc.languageId === 'rosetta') {
                diagnosticProvider.validateDocument(doc);
            }
        })
    );

    // Validate on document save
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(doc => {
            if (doc.languageId === 'rosetta') {
                // Re-index the file
                symbolIndexer.indexFile(doc.uri.fsPath);
                // Validate
                diagnosticProvider.validateDocument(doc);
                // Refresh tree
                treeDataProvider.refresh();
            }
        })
    );

    // Validate on document change (with debounce)
    let validationTimeout: NodeJS.Timeout | undefined;
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'rosetta') {
                if (validationTimeout) {
                    clearTimeout(validationTimeout);
                }
                validationTimeout = setTimeout(() => {
                    diagnosticProvider.validateDocument(event.document);
                }, 500); // 500ms debounce
            }
        })
    );

    context.subscriptions.push(diagnosticProvider);

    // Initial tree refresh
    treeDataProvider.refresh();
}

/**
 * Extension deactivation
 */
export function deactivate() {
    console.log('FINOS CDM Viewer extension is now deactivated');
}
