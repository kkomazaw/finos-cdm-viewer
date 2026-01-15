import * as vscode from 'vscode';
import { SymbolIndexer } from '../indexer/SymbolIndexer';
import { RosettaParser } from '../parser/RosettaParser';
import { RosettaFile } from '../models/RosettaAst';
import { VALIDATION_RULES, DiagnosticSeverity } from './ValidationRules';

/**
 * Provides diagnostics for Rosetta files
 */
export class DiagnosticProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private parser: RosettaParser;

    constructor(private indexer: SymbolIndexer) {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('rosetta');
        this.parser = new RosettaParser();
    }

    /**
     * Validate a document
     */
    async validateDocument(document: vscode.TextDocument): Promise<void> {
        if (document.languageId !== 'rosetta') {
            return;
        }

        const diagnostics: vscode.Diagnostic[] = [];

        try {
            // Parse the document
            const result = this.parser.parse(document.getText(), document.uri.fsPath);

            // Add parser errors
            for (const error of result.errors) {
                const range = new vscode.Range(
                    Math.max(0, error.location.line - 1),
                    error.location.column,
                    Math.max(0, error.location.line - 1),
                    error.location.column + error.location.length
                );

                diagnostics.push(new vscode.Diagnostic(
                    range,
                    error.message,
                    this.mapSeverity(error.severity === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning)
                ));
            }

            // Validate types and enums
            this.validateTypes(result.file, document, diagnostics);
            this.validateEnums(result.file, document, diagnostics);

        } catch (error) {
            // Add general parsing error
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(0, 0, 0, 0),
                `Failed to parse file: ${error}`,
                vscode.DiagnosticSeverity.Error
            ));
        }

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    /**
     * Validate types
     */
    private validateTypes(file: RosettaFile, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const primitiveTypes = ['string', 'int', 'number', 'boolean', 'date', 'time', 'dateTime', 'zonedDateTime'];

        for (const type of file.types) {
            const typeLocation = this.findTypeLocation(document, type.name);

            // Check for empty types
            if (VALIDATION_RULES.EMPTY_TYPE.enabled && type.fields.length === 0 && !type.extends) {
                diagnostics.push(new vscode.Diagnostic(
                    typeLocation,
                    `Type '${type.name}' has no fields defined`,
                    this.mapSeverity(VALIDATION_RULES.EMPTY_TYPE.severity)
                ));
            }

            // Check for missing description
            if (VALIDATION_RULES.MISSING_DESCRIPTION.enabled && !type.description) {
                diagnostics.push(new vscode.Diagnostic(
                    typeLocation,
                    `Type '${type.name}' is missing a description`,
                    this.mapSeverity(VALIDATION_RULES.MISSING_DESCRIPTION.severity)
                ));
            }

            // Check parent type
            if (type.extends && VALIDATION_RULES.UNDEFINED_TYPE.enabled) {
                if (!primitiveTypes.includes(type.extends)) {
                    const parentType = this.indexer.getType(type.extends);
                    if (!parentType) {
                        const extendsLocation = this.findExtendsLocation(document, type.name, type.extends);
                        diagnostics.push(new vscode.Diagnostic(
                            extendsLocation,
                            `Parent type '${type.extends}' is not defined`,
                            this.mapSeverity(VALIDATION_RULES.UNDEFINED_TYPE.severity)
                        ));
                    }
                }
            }

            // Check for circular inheritance
            if (VALIDATION_RULES.CIRCULAR_INHERITANCE.enabled && type.extends) {
                if (this.hasCircularInheritance(type.name, new Set())) {
                    const extendsLocation = this.findExtendsLocation(document, type.name, type.extends);
                    diagnostics.push(new vscode.Diagnostic(
                        extendsLocation,
                        `Type '${type.name}' has circular inheritance`,
                        this.mapSeverity(VALIDATION_RULES.CIRCULAR_INHERITANCE.severity)
                    ));
                }
            }

            // Check for duplicate fields
            if (VALIDATION_RULES.DUPLICATE_FIELD.enabled) {
                const fieldNames = new Set<string>();
                for (const field of type.fields) {
                    if (fieldNames.has(field.name)) {
                        const fieldLocation = this.findFieldLocation(document, type.name, field.name);
                        diagnostics.push(new vscode.Diagnostic(
                            fieldLocation,
                            `Duplicate field name '${field.name}' in type '${type.name}'`,
                            this.mapSeverity(VALIDATION_RULES.DUPLICATE_FIELD.severity)
                        ));
                    }
                    fieldNames.add(field.name);
                }
            }

            // Validate fields
            for (const field of type.fields) {
                // Check field type
                if (VALIDATION_RULES.UNDEFINED_TYPE.enabled && !primitiveTypes.includes(field.type)) {
                    const fieldType = this.indexer.getType(field.type);
                    const fieldEnum = this.indexer.getEnum(field.type);

                    if (!fieldType && !fieldEnum) {
                        const fieldLocation = this.findFieldLocation(document, type.name, field.name);
                        diagnostics.push(new vscode.Diagnostic(
                            fieldLocation,
                            `Field type '${field.type}' is not defined`,
                            this.mapSeverity(VALIDATION_RULES.UNDEFINED_TYPE.severity)
                        ));
                    }
                }

                // Check cardinality
                if (VALIDATION_RULES.INVALID_CARDINALITY.enabled) {
                    if (typeof field.cardinality.max === 'number' && field.cardinality.min > field.cardinality.max) {
                        const fieldLocation = this.findFieldLocation(document, type.name, field.name);
                        diagnostics.push(new vscode.Diagnostic(
                            fieldLocation,
                            `Invalid cardinality for field '${field.name}': min (${field.cardinality.min}) > max (${field.cardinality.max})`,
                            this.mapSeverity(VALIDATION_RULES.INVALID_CARDINALITY.severity)
                        ));
                    }
                }

                // Check for missing field description
                if (VALIDATION_RULES.MISSING_DESCRIPTION.enabled && !field.description) {
                    const fieldLocation = this.findFieldLocation(document, type.name, field.name);
                    diagnostics.push(new vscode.Diagnostic(
                        fieldLocation,
                        `Field '${field.name}' is missing a description`,
                        this.mapSeverity(VALIDATION_RULES.MISSING_DESCRIPTION.severity)
                    ));
                }
            }
        }
    }

    /**
     * Validate enums
     */
    private validateEnums(file: RosettaFile, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        for (const enumDef of file.enums) {
            const enumLocation = this.findEnumLocation(document, enumDef.name);

            // Check for empty enum
            if (VALIDATION_RULES.EMPTY_ENUM.enabled && enumDef.values.length === 0) {
                diagnostics.push(new vscode.Diagnostic(
                    enumLocation,
                    `Enum '${enumDef.name}' has no values defined`,
                    this.mapSeverity(VALIDATION_RULES.EMPTY_ENUM.severity)
                ));
            }

            // Check for missing description
            if (VALIDATION_RULES.MISSING_DESCRIPTION.enabled && !enumDef.description) {
                diagnostics.push(new vscode.Diagnostic(
                    enumLocation,
                    `Enum '${enumDef.name}' is missing a description`,
                    this.mapSeverity(VALIDATION_RULES.MISSING_DESCRIPTION.severity)
                ));
            }

            // Check for duplicate enum values
            if (VALIDATION_RULES.DUPLICATE_ENUM_VALUE.enabled) {
                const valueNames = new Set<string>();
                for (const value of enumDef.values) {
                    if (valueNames.has(value.name)) {
                        diagnostics.push(new vscode.Diagnostic(
                            enumLocation,
                            `Duplicate enum value '${value.name}' in enum '${enumDef.name}'`,
                            this.mapSeverity(VALIDATION_RULES.DUPLICATE_ENUM_VALUE.severity)
                        ));
                    }
                    valueNames.add(value.name);
                }
            }
        }
    }

    /**
     * Check for circular inheritance
     */
    private hasCircularInheritance(typeName: string, visited: Set<string>): boolean {
        if (visited.has(typeName)) {
            return true;
        }

        visited.add(typeName);

        const type = this.indexer.getType(typeName);
        if (type && type.extends) {
            return this.hasCircularInheritance(type.extends, visited);
        }

        return false;
    }

    /**
     * Find type location in document
     */
    private findTypeLocation(document: vscode.TextDocument, typeName: string): vscode.Range {
        const text = document.getText();
        const pattern = new RegExp(`type\\s+${typeName}\\b`);
        const match = text.match(pattern);

        if (match && match.index !== undefined) {
            const position = document.positionAt(match.index);
            return new vscode.Range(position, position.translate(0, match[0].length));
        }

        return new vscode.Range(0, 0, 0, 0);
    }

    /**
     * Find enum location in document
     */
    private findEnumLocation(document: vscode.TextDocument, enumName: string): vscode.Range {
        const text = document.getText();
        const pattern = new RegExp(`enum\\s+${enumName}\\b`);
        const match = text.match(pattern);

        if (match && match.index !== undefined) {
            const position = document.positionAt(match.index);
            return new vscode.Range(position, position.translate(0, match[0].length));
        }

        return new vscode.Range(0, 0, 0, 0);
    }

    /**
     * Find extends clause location
     */
    private findExtendsLocation(document: vscode.TextDocument, typeName: string, extendsName: string): vscode.Range {
        const text = document.getText();
        const pattern = new RegExp(`type\\s+${typeName}\\s+extends\\s+${extendsName}\\b`);
        const match = text.match(pattern);

        if (match && match.index !== undefined) {
            const extendsIndex = match.index + match[0].lastIndexOf(extendsName);
            const position = document.positionAt(extendsIndex);
            return new vscode.Range(position, position.translate(0, extendsName.length));
        }

        return new vscode.Range(0, 0, 0, 0);
    }

    /**
     * Find field location in document
     */
    private findFieldLocation(document: vscode.TextDocument, typeName: string, fieldName: string): vscode.Range {
        const text = document.getText();

        // Find the type definition first
        const typePattern = new RegExp(`type\\s+${typeName}[\\s\\S]*?(?=\\ntype\\s|\\nenum\\s|$)`);
        const typeMatch = text.match(typePattern);

        if (typeMatch && typeMatch.index !== undefined) {
            const typeText = typeMatch[0];
            const fieldPattern = new RegExp(`\\b${fieldName}\\s+\\w+\\s+\\(`);
            const fieldMatch = typeText.match(fieldPattern);

            if (fieldMatch && fieldMatch.index !== undefined) {
                const absoluteIndex = typeMatch.index + fieldMatch.index;
                const position = document.positionAt(absoluteIndex);
                return new vscode.Range(position, position.translate(0, fieldName.length));
            }
        }

        return new vscode.Range(0, 0, 0, 0);
    }

    /**
     * Map custom severity to VS Code severity
     */
    private mapSeverity(severity: DiagnosticSeverity): vscode.DiagnosticSeverity {
        switch (severity) {
            case DiagnosticSeverity.Error:
                return vscode.DiagnosticSeverity.Error;
            case DiagnosticSeverity.Warning:
                return vscode.DiagnosticSeverity.Warning;
            case DiagnosticSeverity.Information:
                return vscode.DiagnosticSeverity.Information;
            case DiagnosticSeverity.Hint:
                return vscode.DiagnosticSeverity.Hint;
        }
    }

    /**
     * Clear diagnostics
     */
    clear(): void {
        this.diagnosticCollection.clear();
    }

    /**
     * Dispose
     */
    dispose(): void {
        this.diagnosticCollection.dispose();
    }
}
