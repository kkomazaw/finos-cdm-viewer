/**
 * AST (Abstract Syntax Tree) type definitions for Rosetta DSL
 */

/**
 * Represents a complete Rosetta file
 */
export interface RosettaFile {
    filePath: string;
    namespace?: RosettaNamespace;
    imports: RosettaImport[];
    types: RosettaType[];
    enums: RosettaEnum[];
    functions: RosettaFunction[];
}

/**
 * Namespace declaration
 */
export interface RosettaNamespace {
    name: string;
    description?: string;
    version?: string;
}

/**
 * Import statement
 */
export interface RosettaImport {
    path: string;
    isWildcard: boolean;
}

/**
 * Type definition (class)
 */
export interface RosettaType {
    name: string;
    description?: string;
    extends?: string;
    metadata: RosettaMetadata[];
    fields: RosettaField[];
    conditions: RosettaCondition[];
    location: Location;
}

/**
 * Field definition within a type
 */
export interface RosettaField {
    name: string;
    type: string;
    cardinality: Cardinality;
    description?: string;
    metadata: RosettaMetadata[];
    location: Location;
}

/**
 * Cardinality specification (e.g., 0..1, 1..*, etc.)
 */
export interface Cardinality {
    min: number;
    max: number | '*';
    isRequired: boolean;
    isMultiple: boolean;
}

/**
 * Metadata annotations
 */
export interface RosettaMetadata {
    type: 'key' | 'id' | 'reference' | 'scheme';
}

/**
 * Condition (validation rule)
 */
export interface RosettaCondition {
    name: string;
    description?: string;
    expression: string;
    location: Location;
}

/**
 * Enum definition
 */
export interface RosettaEnum {
    name: string;
    description?: string;
    values: RosettaEnumValue[];
    location: Location;
}

/**
 * Enum value
 */
export interface RosettaEnumValue {
    name: string;
    displayName?: string;
    description?: string;
}

/**
 * Function definition
 */
export interface RosettaFunction {
    name: string;
    description?: string;
    inputs: RosettaField[];
    output?: RosettaField;
    location: Location;
}

/**
 * Source location for error reporting and navigation
 */
export interface Location {
    line: number;
    column: number;
    length: number;
}

/**
 * Symbol information for indexing
 */
export interface SymbolInfo {
    name: string;
    kind: SymbolKind;
    namespace: string;
    filePath: string;
    location: Location;
    documentation?: string;
}

/**
 * Symbol kinds
 */
export enum SymbolKind {
    Type = 'type',
    Enum = 'enum',
    Function = 'function',
    Field = 'field',
    EnumValue = 'enumValue'
}

/**
 * Parse error
 */
export interface ParseError {
    message: string;
    location: Location;
    severity: 'error' | 'warning';
}

/**
 * Parse result
 */
export interface ParseResult {
    file: RosettaFile;
    errors: ParseError[];
}
