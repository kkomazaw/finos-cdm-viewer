import * as vscode from 'vscode';
import { SymbolIndexer } from '../indexer/SymbolIndexer';

/**
 * Reference provider for Rosetta files
 * Enables "Find All References" for types and enums
 */
export class RosettaReferenceProvider implements vscode.ReferenceProvider {
    constructor(private indexer: SymbolIndexer) {}

    provideReferences(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.ReferenceContext
    ): vscode.ProviderResult<vscode.Location[]> {
        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            return null;
        }

        const word = document.getText(range);

        // Get the symbol info
        const symbol = this.indexer.getSymbol(word);
        if (!symbol) {
            return null;
        }

        // Find all references
        const references = this.indexer.findReferences(word);

        // Include the declaration if requested
        if (context.includeDeclaration) {
            const declarationLocation = new vscode.Location(
                vscode.Uri.file(symbol.filePath),
                new vscode.Position(symbol.location.line - 1, symbol.location.column)
            );
            references.unshift(declarationLocation);
        }

        return references;
    }
}
