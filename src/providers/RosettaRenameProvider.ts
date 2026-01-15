import * as vscode from 'vscode';
import { SymbolIndexer } from '../indexer/SymbolIndexer';

/**
 * Provides rename functionality for Rosetta symbols
 */
export class RosettaRenameProvider implements vscode.RenameProvider {
    constructor(private indexer: SymbolIndexer) {}

    /**
     * Prepare rename - validate that the position is on a renameable symbol
     */
    prepareRename(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.ProviderResult<vscode.Range | { range: vscode.Range; placeholder: string }> {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            throw new Error('No symbol found at the current position');
        }

        const word = document.getText(wordRange);
        const symbol = this.indexer.getSymbol(word);

        if (!symbol) {
            throw new Error(`Symbol '${word}' is not defined in the workspace`);
        }

        return {
            range: wordRange,
            placeholder: word
        };
    }

    /**
     * Provide rename edits
     */
    provideRenameEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        newName: string
    ): vscode.ProviderResult<vscode.WorkspaceEdit> {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return undefined;
        }

        const oldName = document.getText(wordRange);
        const symbol = this.indexer.getSymbol(oldName);

        if (!symbol) {
            vscode.window.showErrorMessage(`Symbol '${oldName}' is not defined in the workspace`);
            return undefined;
        }

        // Validate new name
        const validationError = this.validateNewName(newName, oldName);
        if (validationError) {
            vscode.window.showErrorMessage(validationError);
            return undefined;
        }

        // Create workspace edit
        const edit = new vscode.WorkspaceEdit();

        // Find all references (including the definition)
        const locations = this.indexer.findReferences(oldName);

        // Find and replace the symbol name in the definition
        this.addDefinitionEdit(edit, symbol, oldName, newName);

        // Add edits for all references
        for (const location of locations) {
            edit.replace(location.uri, location.range, newName);
        }

        return edit;
    }

    /**
     * Add edit for the symbol definition
     */
    private addDefinitionEdit(
        edit: vscode.WorkspaceEdit,
        symbol: { filePath: string; location: { line: number; column: number } },
        oldName: string,
        newName: string
    ): void {
        try {
            const uri = vscode.Uri.file(symbol.filePath);
            vscode.workspace.openTextDocument(uri).then(doc => {
                const text = doc.getText();

                // Find the definition pattern (type or enum)
                const typePattern = new RegExp(`\\btype\\s+${oldName}\\b`);
                const enumPattern = new RegExp(`\\benum\\s+${oldName}\\b`);

                const typeMatch = text.match(typePattern);
                const enumMatch = text.match(enumPattern);

                if (typeMatch && typeMatch.index !== undefined) {
                    const startPos = doc.positionAt(typeMatch.index + 5); // Skip "type "
                    const endPos = doc.positionAt(typeMatch.index + 5 + oldName.length);
                    edit.replace(uri, new vscode.Range(startPos, endPos), newName);
                } else if (enumMatch && enumMatch.index !== undefined) {
                    const startPos = doc.positionAt(enumMatch.index + 5); // Skip "enum "
                    const endPos = doc.positionAt(enumMatch.index + 5 + oldName.length);
                    edit.replace(uri, new vscode.Range(startPos, endPos), newName);
                }
            });
        } catch (error) {
            console.error(`Error adding definition edit: ${error}`);
        }
    }

    /**
     * Validate the new symbol name
     */
    private validateNewName(newName: string, oldName: string): string | null {
        // Check if name is empty
        if (!newName || newName.trim().length === 0) {
            return 'Symbol name cannot be empty';
        }

        // Check if name is the same
        if (newName === oldName) {
            return 'New name must be different from the old name';
        }

        // Check if name follows naming conventions (PascalCase for types/enums)
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(newName)) {
            return 'Symbol name must be in PascalCase (e.g., MyType, PersonEnum)';
        }

        // Check for conflicts with existing symbols
        const existingSymbol = this.indexer.getSymbol(newName);
        if (existingSymbol) {
            return `A symbol with the name '${newName}' already exists in the workspace`;
        }

        // Check for conflicts with primitive types
        const primitiveTypes = ['string', 'int', 'number', 'boolean', 'date', 'time', 'dateTime', 'zonedDateTime'];
        if (primitiveTypes.includes(newName.toLowerCase())) {
            return `Cannot use primitive type name '${newName}'`;
        }

        return null;
    }
}
