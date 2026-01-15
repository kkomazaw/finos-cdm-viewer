import * as vscode from 'vscode';
import { SymbolIndexer } from '../indexer/SymbolIndexer';

/**
 * Provides code completion for Rosetta DSL
 */
export class RosettaCompletionProvider implements vscode.CompletionItemProvider {
    constructor(private indexer: SymbolIndexer) {}

    /**
     * Provide completion items
     */
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const lineText = document.lineAt(position.line).text;
        const linePrefix = lineText.substring(0, position.character);

        // Determine the completion context
        const completionContext = this.getCompletionContext(linePrefix);

        switch (completionContext) {
            case CompletionContext.FieldType:
                return this.getTypeAndEnumCompletions();
            case CompletionContext.ExtendsType:
                return this.getTypeCompletions();
            case CompletionContext.Keyword:
                return this.getKeywordCompletions();
            case CompletionContext.Metadata:
                return this.getMetadataCompletions();
            case CompletionContext.Cardinality:
                return this.getCardinalityCompletions();
            default:
                return [];
        }
    }

    /**
     * Determine the completion context based on the line content
     */
    private getCompletionContext(linePrefix: string): CompletionContext {
        // Check for extends clause
        if (/type\s+\w+\s+extends\s+$/.test(linePrefix) || /type\s+\w+\s+extends\s+\w*$/.test(linePrefix)) {
            return CompletionContext.ExtendsType;
        }

        // Check for field type (after field name)
        if (/^\s+\w+\s+$/.test(linePrefix) || /^\s+\w+\s+\w*$/.test(linePrefix)) {
            return CompletionContext.FieldType;
        }

        // Check for metadata annotations
        if (/\[metadata\s+$/.test(linePrefix) || /\[metadata\s+\w*$/.test(linePrefix)) {
            return CompletionContext.Metadata;
        }

        // Check for cardinality
        if (/\(\s*$/.test(linePrefix) || /\(\s*\d*$/.test(linePrefix)) {
            return CompletionContext.Cardinality;
        }

        // Check for keywords at the start of a line
        if (/^\s*$/.test(linePrefix) || /^\s*\w*$/.test(linePrefix)) {
            return CompletionContext.Keyword;
        }

        return CompletionContext.Unknown;
    }

    /**
     * Get type completions only
     */
    private getTypeCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];

        // Add primitive types
        const primitiveTypes = ['string', 'int', 'number', 'boolean', 'date', 'time', 'dateTime', 'zonedDateTime'];
        for (const type of primitiveTypes) {
            const item = new vscode.CompletionItem(type, vscode.CompletionItemKind.Class);
            item.detail = 'Primitive type';
            item.sortText = `0_${type}`;
            completions.push(item);
        }

        // Add custom types from workspace
        const types = this.indexer.getAllTypes();
        for (const type of types) {
            const item = new vscode.CompletionItem(type.name, vscode.CompletionItemKind.Class);
            item.detail = 'Type';
            if (type.description) {
                item.documentation = new vscode.MarkdownString(type.description);
            }
            item.sortText = `1_${type.name}`;
            completions.push(item);
        }

        return completions;
    }

    /**
     * Get type and enum completions
     */
    private getTypeAndEnumCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];

        // Add primitive types
        const primitiveTypes = ['string', 'int', 'number', 'boolean', 'date', 'time', 'dateTime', 'zonedDateTime'];
        for (const type of primitiveTypes) {
            const item = new vscode.CompletionItem(type, vscode.CompletionItemKind.Class);
            item.detail = 'Primitive type';
            item.sortText = `0_${type}`;
            completions.push(item);
        }

        // Add custom types from workspace
        const types = this.indexer.getAllTypes();
        for (const type of types) {
            const item = new vscode.CompletionItem(type.name, vscode.CompletionItemKind.Class);
            item.detail = 'Type';
            if (type.description) {
                item.documentation = new vscode.MarkdownString(type.description);
            }
            item.sortText = `1_${type.name}`;
            completions.push(item);
        }

        // Add enums from workspace
        const enums = this.indexer.getAllEnums();
        for (const enumDef of enums) {
            const item = new vscode.CompletionItem(enumDef.name, vscode.CompletionItemKind.Enum);
            item.detail = 'Enum';
            if (enumDef.description) {
                item.documentation = new vscode.MarkdownString(enumDef.description);
            }
            item.sortText = `2_${enumDef.name}`;
            completions.push(item);
        }

        return completions;
    }

    /**
     * Get keyword completions
     */
    private getKeywordCompletions(): vscode.CompletionItem[] {
        const keywords = [
            { label: 'namespace', detail: 'Define a namespace', snippet: 'namespace ${1:name}\n\t$0' },
            { label: 'version', detail: 'Define version', snippet: 'version "${1:1.0.0}"' },
            { label: 'import', detail: 'Import another namespace', snippet: 'import ${1:namespace}.*' },
            { label: 'type', detail: 'Define a type', snippet: 'type ${1:Name}:\n\t$0' },
            { label: 'enum', detail: 'Define an enum', snippet: 'enum ${1:Name}:\n\t$0' },
            { label: 'func', detail: 'Define a function', snippet: 'func ${1:Name}:\n\t$0' },
            { label: 'extends', detail: 'Extend a type', snippet: 'extends ${1:BaseType}' },
            { label: 'condition', detail: 'Define a validation condition', snippet: 'condition ${1:Name}:\n\t$0' }
        ];

        return keywords.map(kw => {
            const item = new vscode.CompletionItem(kw.label, vscode.CompletionItemKind.Keyword);
            item.detail = kw.detail;
            item.insertText = new vscode.SnippetString(kw.snippet);
            item.sortText = `0_${kw.label}`;
            return item;
        });
    }

    /**
     * Get metadata completions
     */
    private getMetadataCompletions(): vscode.CompletionItem[] {
        const metadataTypes = [
            { label: 'key', detail: 'Field is a key', description: 'Marks the field as a unique identifier' },
            { label: 'id', detail: 'Field is an ID', description: 'Marks the field as an identifier' },
            { label: 'reference', detail: 'Field is a reference', description: 'Marks the field as a reference to another entity' },
            { label: 'scheme', detail: 'Field uses a scheme', description: 'Associates the field with a classification scheme' },
            { label: 'calculation', detail: 'Field is calculated', description: 'Marks the field as a calculated value' }
        ];

        return metadataTypes.map(meta => {
            const item = new vscode.CompletionItem(meta.label, vscode.CompletionItemKind.Property);
            item.detail = meta.detail;
            item.documentation = new vscode.MarkdownString(meta.description);
            return item;
        });
    }

    /**
     * Get cardinality completions
     */
    private getCardinalityCompletions(): vscode.CompletionItem[] {
        const cardinalities = [
            { label: '0..1', detail: 'Optional (zero or one)' },
            { label: '1..1', detail: 'Required (exactly one)' },
            { label: '0..*', detail: 'Zero or more' },
            { label: '1..*', detail: 'One or more' },
            { label: '0..0', detail: 'Forbidden (zero only)' }
        ];

        return cardinalities.map(card => {
            const item = new vscode.CompletionItem(card.label, vscode.CompletionItemKind.Value);
            item.detail = card.detail;
            item.insertText = card.label;
            return item;
        });
    }

    /**
     * Provide completion item details
     */
    resolveCompletionItem(
        item: vscode.CompletionItem
    ): vscode.ProviderResult<vscode.CompletionItem> {
        // Additional details can be provided here if needed
        return item;
    }
}

/**
 * Completion context enum
 */
enum CompletionContext {
    FieldType,
    ExtendsType,
    Keyword,
    Metadata,
    Cardinality,
    Unknown
}
