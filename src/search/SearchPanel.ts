import * as vscode from 'vscode';
import { SearchProvider, SearchResult, SearchFilters } from './SearchProvider';

/**
 * Quick pick item for search results
 */
interface SearchQuickPickItem extends vscode.QuickPickItem {
    result: SearchResult;
}

/**
 * Manages CDM search interface
 */
export class SearchPanel {
    constructor(private searchProvider: SearchProvider) {}

    /**
     * Show search quick pick
     */
    async showSearch(): Promise<void> {
        const quickPick = vscode.window.createQuickPick<SearchQuickPickItem>();
        quickPick.placeholder = 'Search for types, enums, or fields...';
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;

        // Add filter buttons
        const filterButtons: vscode.QuickInputButton[] = [
            {
                iconPath: new vscode.ThemeIcon('filter'),
                tooltip: 'Filter Results'
            },
            {
                iconPath: new vscode.ThemeIcon('refresh'),
                tooltip: 'Clear Filters'
            }
        ];

        quickPick.buttons = filterButtons;

        let currentFilters: SearchFilters = {};

        // Handle input changes
        quickPick.onDidChangeValue(value => {
            if (value.length > 0) {
                const results = this.searchProvider.search(value, currentFilters);
                quickPick.items = this.createQuickPickItems(results);
            } else {
                quickPick.items = [];
            }
        });

        // Handle button clicks
        quickPick.onDidTriggerButton(button => {
            if (button.tooltip === 'Filter Results') {
                this.showFilterOptions().then(filters => {
                    if (filters) {
                        currentFilters = filters;
                        if (quickPick.value.length > 0) {
                            const results = this.searchProvider.search(quickPick.value, currentFilters);
                            quickPick.items = this.createQuickPickItems(results);
                        }
                    }
                });
            } else if (button.tooltip === 'Clear Filters') {
                currentFilters = {};
                if (quickPick.value.length > 0) {
                    const results = this.searchProvider.search(quickPick.value, currentFilters);
                    quickPick.items = this.createQuickPickItems(results);
                }
                vscode.window.showInformationMessage('Filters cleared');
            }
        });

        // Handle selection
        quickPick.onDidAccept(() => {
            const selected = quickPick.selectedItems[0];
            if (selected) {
                this.navigateToResult(selected.result);
                quickPick.hide();
            }
        });

        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.show();
    }

    /**
     * Show filter options
     */
    private async showFilterOptions(): Promise<SearchFilters | undefined> {
        const filters: SearchFilters = {};

        // Filter by kind
        const kindOptions = await vscode.window.showQuickPick(
            [
                { label: 'All', picked: true },
                { label: 'Types only' },
                { label: 'Enums only' },
                { label: 'Fields only' },
                { label: 'Types and Enums' }
            ],
            {
                placeHolder: 'Select element types to include'
            }
        );

        if (!kindOptions) {
            return undefined;
        }

        switch (kindOptions.label) {
            case 'Types only':
                filters.kind = ['type'];
                break;
            case 'Enums only':
                filters.kind = ['enum'];
                break;
            case 'Fields only':
                filters.kind = ['field'];
                break;
            case 'Types and Enums':
                filters.kind = ['type', 'enum'];
                break;
        }

        // Filter by namespace
        const namespaces = this.searchProvider.getNamespaces();
        if (namespaces.length > 1) {
            const namespaceOption = await vscode.window.showQuickPick(
                ['All namespaces', ...namespaces],
                {
                    placeHolder: 'Select namespace (optional)'
                }
            );

            if (namespaceOption && namespaceOption !== 'All namespaces') {
                filters.namespace = namespaceOption;
            }
        }

        // Filter by description
        const descriptionOption = await vscode.window.showQuickPick(
            [
                { label: 'All', picked: true },
                { label: 'With description only' },
                { label: 'Without description only' }
            ],
            {
                placeHolder: 'Filter by description'
            }
        );

        if (descriptionOption) {
            switch (descriptionOption.label) {
                case 'With description only':
                    filters.hasDescription = true;
                    break;
                case 'Without description only':
                    filters.hasDescription = false;
                    break;
            }
        }

        return filters;
    }

    /**
     * Create quick pick items from search results
     */
    private createQuickPickItems(results: SearchResult[]): SearchQuickPickItem[] {
        return results.map(result => {
            const icon = this.getIconForKind(result.kind);
            const label = result.parent ? `${icon} ${result.name} (in ${result.parent})` : `${icon} ${result.name}`;
            const description = result.namespace || '';
            const detail = result.description || '';

            return {
                label,
                description,
                detail,
                result
            };
        });
    }

    /**
     * Get icon for element kind
     */
    private getIconForKind(kind: 'type' | 'enum' | 'field'): string {
        switch (kind) {
            case 'type':
                return '$(symbol-class)';
            case 'enum':
                return '$(symbol-enum)';
            case 'field':
                return '$(symbol-field)';
        }
    }

    /**
     * Navigate to search result
     */
    private async navigateToResult(result: SearchResult): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(result.filePath);
            const editor = await vscode.window.showTextDocument(document);

            // Navigate to the line
            const position = new vscode.Position(Math.max(0, result.line - 1), 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(
                new vscode.Range(position, position),
                vscode.TextEditorRevealType.InCenter
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${error}`);
        }
    }
}
