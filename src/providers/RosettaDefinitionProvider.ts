import * as vscode from 'vscode';
import { SymbolIndexer } from '../indexer/SymbolIndexer';

/**
 * Definition provider for Rosetta files
 * Enables "Go to Definition" for types and enums
 */
export class RosettaDefinitionProvider implements vscode.DefinitionProvider {
    constructor(private indexer: SymbolIndexer) {}

    provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            return null;
        }

        const word = document.getText(range);

        // Try to find the symbol
        const symbol = this.indexer.getSymbol(word);
        if (symbol) {
            return this.createDefinitionLocation(symbol.filePath, symbol.name);
        }

        return null;
    }

    /**
     * Create a location for the definition
     */
    private async createDefinitionLocation(filePath: string, symbolName: string): Promise<vscode.Location | null> {
        try {
            const uri = vscode.Uri.file(filePath);

            // Read the file to find the exact position
            const doc = await vscode.workspace.openTextDocument(uri);
            const text = doc.getText();
            const simpleName = symbolName.split('.').pop() || symbolName;

            // Try to find type declaration
            let searchPattern = `type ${simpleName}`;
            let index = text.indexOf(searchPattern);

            // If not found, try enum declaration
            if (index === -1) {
                searchPattern = `enum ${simpleName}`;
                index = text.indexOf(searchPattern);
            }

            if (index !== -1) {
                const position = doc.positionAt(index);
                const endPosition = doc.positionAt(index + searchPattern.length);
                return new vscode.Location(uri, new vscode.Range(position, endPosition));
            }

            // Fallback to start of file
            return new vscode.Location(uri, new vscode.Position(0, 0));
        } catch (error) {
            console.error(`Error creating definition location for ${symbolName}:`, error);
            return null;
        }
    }
}
