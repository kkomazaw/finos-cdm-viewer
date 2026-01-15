import * as fs from 'fs';
import {
    RosettaFile,
    RosettaNamespace,
    RosettaImport,
    RosettaType,
    RosettaField,
    RosettaEnum,
    RosettaEnumValue,
    RosettaFunction,
    RosettaCondition,
    RosettaMetadata,
    Cardinality,
    ParseResult,
    ParseError
} from '../models/RosettaAst';

/**
 * Simple regex-based Rosetta DSL parser
 * This is a lightweight parser that extracts the main structural elements
 */
export class RosettaParser {
    /**
     * Parse a Rosetta file from disk
     */
    parseFile(filePath: string): ParseResult {
        const content = fs.readFileSync(filePath, 'utf-8');
        return this.parse(content, filePath);
    }

    /**
     * Parse Rosetta content
     */
    parse(content: string, filePath: string = ''): ParseResult {
        const errors: ParseError[] = [];

        try {
            const file: RosettaFile = {
                filePath,
                namespace: this.extractNamespace(content),
                imports: this.extractImports(content),
                types: this.extractTypes(content, errors),
                enums: this.extractEnums(content, errors),
                functions: this.extractFunctions(content, errors)
            };

            return { file, errors };
        } catch (error) {
            errors.push({
                message: `Failed to parse file: ${error}`,
                location: { line: 0, column: 0, length: 0 },
                severity: 'error'
            });

            return {
                file: {
                    filePath,
                    imports: [],
                    types: [],
                    enums: [],
                    functions: []
                },
                errors
            };
        }
    }

    /**
     * Extract namespace declaration
     */
    private extractNamespace(content: string): RosettaNamespace | undefined {
        const namespaceRegex = /^namespace\s+([\w.]+)\s*:\s*<"([^"]*)">?/m;
        const versionRegex = /^version\s+"([^"]+)"/m;

        const namespaceMatch = content.match(namespaceRegex);
        const versionMatch = content.match(versionRegex);

        if (namespaceMatch) {
            return {
                name: namespaceMatch[1],
                description: namespaceMatch[2] || undefined,
                version: versionMatch ? versionMatch[1] : undefined
            };
        }

        return undefined;
    }

    /**
     * Extract import statements
     */
    private extractImports(content: string): RosettaImport[] {
        const imports: RosettaImport[] = [];
        const importRegex = /^import\s+([\w.*]+)/gm;

        let match;
        while ((match = importRegex.exec(content)) !== null) {
            imports.push({
                path: match[1],
                isWildcard: match[1].includes('*')
            });
        }

        return imports;
    }

    /**
     * Extract type definitions
     */
    private extractTypes(content: string, errors: ParseError[]): RosettaType[] {
        const types: RosettaType[] = [];

        // Match type definitions with optional extends clause
        const typeRegex = /type\s+(\w+)(?:\s+extends\s+(\w+))?\s*:\s*<"([^"]*)">([\s\S]*?)(?=\ntype\s|\nenum\s|\nfunc\s|$)/g;

        let match;
        while ((match = typeRegex.exec(content)) !== null) {
            const [fullMatch, name, extendsName, description, body] = match;
            const line = this.getLineNumber(content, match.index);

            try {
                const metadata = this.extractMetadata(body);
                const fields = this.extractFields(body, errors);
                const conditions = this.extractConditions(body);

                types.push({
                    name,
                    description: description || undefined,
                    extends: extendsName || undefined,
                    metadata,
                    fields,
                    conditions,
                    location: {
                        line,
                        column: 0,
                        length: fullMatch.length
                    }
                });
            } catch (error) {
                errors.push({
                    message: `Error parsing type '${name}': ${error}`,
                    location: { line, column: 0, length: 0 },
                    severity: 'error'
                });
            }
        }

        return types;
    }

    /**
     * Extract field definitions
     */
    private extractFields(body: string, _errors: ParseError[]): RosettaField[] {
        const fields: RosettaField[] = [];

        // Match field definitions
        const fieldRegex = /^\s*(\w+)\s+([\w<>]+)\s+\(([^)]+)\)(?:\s*<"([^"]*)")?/gm;

        let match;
        while ((match = fieldRegex.exec(body)) !== null) {
            const [fullMatch, name, type, cardinalityStr, description] = match;

            try {
                const cardinality = this.parseCardinality(cardinalityStr);
                const metadata = this.extractFieldMetadata(body, match.index);

                fields.push({
                    name,
                    type,
                    cardinality,
                    description: description || undefined,
                    metadata,
                    location: {
                        line: 0, // Would need more complex tracking
                        column: 0,
                        length: fullMatch.length
                    }
                });
            } catch (error) {
                // Silently skip malformed fields
            }
        }

        return fields;
    }

    /**
     * Parse cardinality string (e.g., "0..1", "1..*")
     */
    private parseCardinality(cardinalityStr: string): Cardinality {
        const match = cardinalityStr.match(/(\d+)\.\.(\d+|\*)/);

        if (!match) {
            return {
                min: 1,
                max: 1,
                isRequired: true,
                isMultiple: false
            };
        }

        const min = parseInt(match[1], 10);
        const max = match[2] === '*' ? '*' : parseInt(match[2], 10);

        return {
            min,
            max,
            isRequired: min > 0,
            isMultiple: max === '*' || max > 1
        };
    }

    /**
     * Extract metadata annotations from type body
     */
    private extractMetadata(body: string): RosettaMetadata[] {
        const metadata: RosettaMetadata[] = [];
        const metadataRegex = /\[metadata\s+(key|id|reference|scheme)\]/g;

        let match;
        while ((match = metadataRegex.exec(body)) !== null) {
            metadata.push({
                type: match[1] as 'key' | 'id' | 'reference' | 'scheme'
            });
        }

        return metadata;
    }

    /**
     * Extract field-level metadata
     */
    private extractFieldMetadata(body: string, fieldIndex: number): RosettaMetadata[] {
        const metadata: RosettaMetadata[] = [];

        // Look for metadata on the next few lines after the field
        const afterField = body.substring(fieldIndex);
        const nextLines = afterField.split('\n').slice(0, 3).join('\n');

        const metadataRegex = /\[metadata\s+(key|id|reference|scheme)\]/g;
        let match;
        while ((match = metadataRegex.exec(nextLines)) !== null) {
            metadata.push({
                type: match[1] as 'key' | 'id' | 'reference' | 'scheme'
            });
        }

        return metadata;
    }

    /**
     * Extract condition (validation rule) definitions
     */
    private extractConditions(body: string): RosettaCondition[] {
        const conditions: RosettaCondition[] = [];
        const conditionRegex = /condition\s+(\w+)\s*:\s*<"([^"]*)">([^}]+)/gs;

        let match;
        while ((match = conditionRegex.exec(body)) !== null) {
            conditions.push({
                name: match[1],
                description: match[2] || undefined,
                expression: match[3].trim(),
                location: {
                    line: 0,
                    column: 0,
                    length: match[0].length
                }
            });
        }

        return conditions;
    }

    /**
     * Extract enum definitions
     */
    private extractEnums(content: string, errors: ParseError[]): RosettaEnum[] {
        const enums: RosettaEnum[] = [];
        const enumRegex = /enum\s+(\w+)\s*:\s*<"([^"]*)">([\s\S]*?)(?=\ntype\s|\nenum\s|\nfunc\s|$)/g;

        let match;
        while ((match = enumRegex.exec(content)) !== null) {
            const [fullMatch, name, description, body] = match;
            const line = this.getLineNumber(content, match.index);

            try {
                const values = this.extractEnumValues(body);

                enums.push({
                    name,
                    description: description || undefined,
                    values,
                    location: {
                        line,
                        column: 0,
                        length: fullMatch.length
                    }
                });
            } catch (error) {
                errors.push({
                    message: `Error parsing enum '${name}': ${error}`,
                    location: { line, column: 0, length: 0 },
                    severity: 'error'
                });
            }
        }

        return enums;
    }

    /**
     * Extract enum values
     */
    private extractEnumValues(body: string): RosettaEnumValue[] {
        const values: RosettaEnumValue[] = [];
        const valueRegex = /(\w+)(?:\s+displayName\s+"([^"]+)")?(?:\s*<"([^"]*)">)?/g;

        let match;
        while ((match = valueRegex.exec(body)) !== null) {
            const [, name, displayName, description] = match;

            // Skip if this looks like a keyword
            if (name === 'enum' || name === 'type' || name === 'func') {
                continue;
            }

            values.push({
                name,
                displayName: displayName || undefined,
                description: description || undefined
            });
        }

        return values;
    }

    /**
     * Extract function definitions (stub implementation)
     */
    private extractFunctions(_content: string, _errors: ParseError[]): RosettaFunction[] {
        const functions: RosettaFunction[] = [];
        // Function parsing is more complex, leaving as stub for now
        return functions;
    }

    /**
     * Get line number for a given index in the content
     */
    private getLineNumber(content: string, index: number): number {
        const lines = content.substring(0, index).split('\n');
        return lines.length;
    }
}
