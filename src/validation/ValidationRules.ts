/**
 * Validation rules for Rosetta DSL
 */

export enum DiagnosticSeverity {
    Error = 'error',
    Warning = 'warning',
    Information = 'information',
    Hint = 'hint'
}

export interface ValidationRule {
    id: string;
    name: string;
    description: string;
    severity: DiagnosticSeverity;
    enabled: boolean;
}

/**
 * Predefined validation rules
 */
export const VALIDATION_RULES: Record<string, ValidationRule> = {
    UNDEFINED_TYPE: {
        id: 'undefined-type',
        name: 'Undefined Type Reference',
        description: 'Type or enum referenced but not defined in workspace',
        severity: DiagnosticSeverity.Error,
        enabled: true
    },
    CIRCULAR_INHERITANCE: {
        id: 'circular-inheritance',
        name: 'Circular Inheritance',
        description: 'Type has circular inheritance chain',
        severity: DiagnosticSeverity.Error,
        enabled: true
    },
    INVALID_CARDINALITY: {
        id: 'invalid-cardinality',
        name: 'Invalid Cardinality',
        description: 'Field cardinality min is greater than max',
        severity: DiagnosticSeverity.Error,
        enabled: true
    },
    MISSING_DESCRIPTION: {
        id: 'missing-description',
        name: 'Missing Description',
        description: 'Type, enum, or field is missing a description',
        severity: DiagnosticSeverity.Warning,
        enabled: false
    },
    DUPLICATE_FIELD: {
        id: 'duplicate-field',
        name: 'Duplicate Field Name',
        description: 'Field name is duplicated within the same type',
        severity: DiagnosticSeverity.Error,
        enabled: true
    },
    DUPLICATE_ENUM_VALUE: {
        id: 'duplicate-enum-value',
        name: 'Duplicate Enum Value',
        description: 'Enum value is duplicated',
        severity: DiagnosticSeverity.Error,
        enabled: true
    },
    EMPTY_TYPE: {
        id: 'empty-type',
        name: 'Empty Type',
        description: 'Type has no fields defined',
        severity: DiagnosticSeverity.Warning,
        enabled: true
    },
    EMPTY_ENUM: {
        id: 'empty-enum',
        name: 'Empty Enum',
        description: 'Enum has no values defined',
        severity: DiagnosticSeverity.Error,
        enabled: true
    }
};
