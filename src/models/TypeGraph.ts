/**
 * Type graph data structures for visualizing type relationships
 */

/**
 * Type of relationship between types
 */
export enum RelationshipType {
    Extends = 'extends',
    HasField = 'hasField',
    References = 'references'
}

/**
 * Node in the type graph
 */
export interface TypeNode {
    id: string;
    name: string;
    kind: 'type' | 'enum';
    namespace?: string;
    description?: string;
}

/**
 * Edge in the type graph
 */
export interface TypeEdge {
    from: string;
    to: string;
    relationshipType: RelationshipType;
    label?: string;
}

/**
 * Complete type graph
 */
export interface TypeGraph {
    nodes: Map<string, TypeNode>;
    edges: TypeEdge[];
}

/**
 * Options for graph generation
 */
export interface GraphOptions {
    includeFields?: boolean;
    maxDepth?: number;
    includeEnums?: boolean;
    startFromType?: string;
}
