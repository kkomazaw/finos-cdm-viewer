import * as vscode from 'vscode';
import { SymbolIndexer } from '../indexer/SymbolIndexer';
import { RosettaType, RosettaEnum, RosettaField } from '../models/RosettaAst';

/**
 * Hover provider for Rosetta files
 */
export class RosettaHoverProvider implements vscode.HoverProvider {
    constructor(private indexer: SymbolIndexer) {}

    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.ProviderResult<vscode.Hover> {
        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            return null;
        }

        const word = document.getText(range);
        const item = this.indexer.findTypeAtPosition(document, position);

        if (item) {
            return this.createHover(item, range);
        }

        // Try to find by name only
        const type = this.indexer.getType(word);
        if (type) {
            return this.createHover(type, range);
        }

        const enumDef = this.indexer.getEnum(word);
        if (enumDef) {
            return this.createHover(enumDef, range);
        }

        return null;
    }

    /**
     * Create hover content for different symbol types
     */
    private createHover(item: RosettaType | RosettaEnum | RosettaField, range: vscode.Range): vscode.Hover {
        if ('fields' in item) {
            return this.createTypeHover(item, range);
        } else if ('values' in item) {
            return this.createEnumHover(item, range);
        } else {
            return this.createFieldHover(item, range);
        }
    }

    /**
     * Create hover for type
     */
    private createTypeHover(type: RosettaType, range: vscode.Range): vscode.Hover {
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;
        markdown.supportHtml = true;

        // Header
        markdown.appendCodeblock(`type ${type.name}${type.extends ? ` extends ${type.extends}` : ''}`, 'rosetta');

        // Description
        if (type.description) {
            markdown.appendMarkdown(`\n${type.description}\n\n`);
        }

        // Metadata
        if (type.metadata && type.metadata.length > 0) {
            markdown.appendMarkdown(`**Metadata:** ${type.metadata.map(m => m.type).join(', ')}\n\n`);
        }

        // Fields summary
        if (type.fields && type.fields.length > 0) {
            markdown.appendMarkdown(`**Fields:** ${type.fields.length}\n\n`);

            const fieldsList = type.fields.slice(0, 5).map(f => {
                const cardinality = `${f.cardinality.min}..${f.cardinality.max}`;
                return `- \`${f.name}: ${f.type} (${cardinality})\``;
            }).join('\n');

            markdown.appendMarkdown(fieldsList);

            if (type.fields.length > 5) {
                markdown.appendMarkdown(`\n- _(${type.fields.length - 5} more fields...)_`);
            }
        }

        // Conditions
        if (type.conditions && type.conditions.length > 0) {
            markdown.appendMarkdown(`\n\n**Conditions:** ${type.conditions.length}`);
        }

        return new vscode.Hover(markdown, range);
    }

    /**
     * Create hover for enum
     */
    private createEnumHover(enumDef: RosettaEnum, range: vscode.Range): vscode.Hover {
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;

        // Header
        markdown.appendCodeblock(`enum ${enumDef.name}`, 'rosetta');

        // Description
        if (enumDef.description) {
            markdown.appendMarkdown(`\n${enumDef.description}\n\n`);
        }

        // Values
        if (enumDef.values && enumDef.values.length > 0) {
            markdown.appendMarkdown(`**Values:** ${enumDef.values.length}\n\n`);

            const valuesList = enumDef.values.slice(0, 10).map(v => {
                if (v.displayName) {
                    return `- \`${v.name}\` - ${v.displayName}`;
                }
                return `- \`${v.name}\``;
            }).join('\n');

            markdown.appendMarkdown(valuesList);

            if (enumDef.values.length > 10) {
                markdown.appendMarkdown(`\n- _(${enumDef.values.length - 10} more values...)_`);
            }
        }

        return new vscode.Hover(markdown, range);
    }

    /**
     * Create hover for field
     */
    private createFieldHover(field: RosettaField, range: vscode.Range): vscode.Hover {
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;

        const cardinality = `${field.cardinality.min}..${field.cardinality.max}`;
        markdown.appendCodeblock(`${field.name}: ${field.type} (${cardinality})`, 'rosetta');

        if (field.description) {
            markdown.appendMarkdown(`\n${field.description}\n\n`);
        }

        // Cardinality info
        const cardinalityInfo = [];
        if (field.cardinality.isRequired) {
            cardinalityInfo.push('**Required**');
        } else {
            cardinalityInfo.push('**Optional**');
        }

        if (field.cardinality.isMultiple) {
            cardinalityInfo.push('**Multiple**');
        }

        markdown.appendMarkdown(cardinalityInfo.join(' • '));

        // Metadata
        if (field.metadata && field.metadata.length > 0) {
            markdown.appendMarkdown(`\n\n**Metadata:** ${field.metadata.map(m => m.type).join(', ')}`);
        }

        return new vscode.Hover(markdown, range);
    }
}
