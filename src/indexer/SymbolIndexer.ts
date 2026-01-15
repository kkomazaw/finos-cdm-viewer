import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { RosettaParser } from '../parser/RosettaParser';
import { RosettaFile, RosettaType, RosettaEnum, RosettaField, SymbolInfo, SymbolKind } from '../models/RosettaAst';

/**
 * Symbol indexer for Rosetta files
 * Maintains an index of all types, enums, and fields across the workspace
 */
export class SymbolIndexer {
    private parser: RosettaParser;
    private files: Map<string, RosettaFile> = new Map();
    private typeIndex: Map<string, SymbolInfo> = new Map();
    private enumIndex: Map<string, SymbolInfo> = new Map();

    constructor() {
        this.parser = new RosettaParser();
    }

    /**
     * Index all Rosetta files in the workspace
     */
    indexWorkspace(): void {
        this.files.clear();
        this.typeIndex.clear();
        this.enumIndex.clear();

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return;
        }

        for (const folder of workspaceFolders) {
            this.indexFolder(folder.uri.fsPath);
        }
    }

    /**
     * Index a folder recursively
     */
    private indexFolder(folderPath: string): void {
        try {
            const entries = fs.readdirSync(folderPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(folderPath, entry.name);

                if (entry.isDirectory()) {
                    if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
                        this.indexFolder(fullPath);
                    }
                } else if (entry.isFile() && entry.name.endsWith('.rosetta')) {
                    this.indexFile(fullPath);
                }
            }
        } catch (error) {
            console.error(`Error indexing folder ${folderPath}:`, error);
        }
    }

    /**
     * Index a single file
     */
    indexFile(filePath: string): void {
        try {
            const result = this.parser.parseFile(filePath);
            this.files.set(filePath, result.file);

            const namespace = result.file.namespace?.name || '';

            // Index types
            for (const type of result.file.types) {
                const qualifiedName = namespace ? `${namespace}.${type.name}` : type.name;
                this.typeIndex.set(type.name, {
                    name: type.name,
                    kind: SymbolKind.Type,
                    namespace,
                    filePath,
                    location: type.location,
                    documentation: type.description
                });
                this.typeIndex.set(qualifiedName, {
                    name: qualifiedName,
                    kind: SymbolKind.Type,
                    namespace,
                    filePath,
                    location: type.location,
                    documentation: type.description
                });
            }

            // Index enums
            for (const enumDef of result.file.enums) {
                const qualifiedName = namespace ? `${namespace}.${enumDef.name}` : enumDef.name;
                this.enumIndex.set(enumDef.name, {
                    name: enumDef.name,
                    kind: SymbolKind.Enum,
                    namespace,
                    filePath,
                    location: enumDef.location,
                    documentation: enumDef.description
                });
                this.enumIndex.set(qualifiedName, {
                    name: qualifiedName,
                    kind: SymbolKind.Enum,
                    namespace,
                    filePath,
                    location: enumDef.location,
                    documentation: enumDef.description
                });
            }
        } catch (error) {
            console.error(`Error indexing file ${filePath}:`, error);
        }
    }

    /**
     * Get type by name
     */
    getType(name: string): RosettaType | undefined {
        const symbol = this.typeIndex.get(name);
        if (!symbol) {
            return undefined;
        }

        const file = this.files.get(symbol.filePath);
        if (!file) {
            return undefined;
        }

        return file.types.find(t => t.name === symbol.name.split('.').pop());
    }

    /**
     * Get enum by name
     */
    getEnum(name: string): RosettaEnum | undefined {
        const symbol = this.enumIndex.get(name);
        if (!symbol) {
            return undefined;
        }

        const file = this.files.get(symbol.filePath);
        if (!file) {
            return undefined;
        }

        return file.enums.find(e => e.name === symbol.name.split('.').pop());
    }

    /**
     * Get symbol info (type or enum)
     */
    getSymbol(name: string): SymbolInfo | undefined {
        return this.typeIndex.get(name) || this.enumIndex.get(name);
    }

    /**
     * Get all files
     */
    getAllFiles(): Map<string, RosettaFile> {
        return this.files;
    }

    /**
     * Get file by path
     */
    getFile(filePath: string): RosettaFile | undefined {
        return this.files.get(filePath);
    }

    /**
     * Find type at position in document
     */
    findTypeAtPosition(document: vscode.TextDocument, position: vscode.Position): RosettaType | RosettaEnum | RosettaField | undefined {
        const file = this.files.get(document.uri.fsPath);
        if (!file) {
            return undefined;
        }

        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return undefined;
        }

        const word = document.getText(wordRange);

        // Check if it's a type
        const type = this.getType(word);
        if (type) {
            return type;
        }

        // Check if it's an enum
        const enumDef = this.getEnum(word);
        if (enumDef) {
            return enumDef;
        }

        // Check if it's a field in the current file
        const line = document.lineAt(position.line).text;
        const fieldMatch = line.match(/^\s*(\w+)\s+([\w<>]+)\s+\([^)]+\)/);
        if (fieldMatch && fieldMatch[1] === word) {
            // This is a field name
            for (const type of file.types) {
                const field = type.fields.find(f => f.name === word);
                if (field) {
                    return field;
                }
            }
        }

        return undefined;
    }
}
