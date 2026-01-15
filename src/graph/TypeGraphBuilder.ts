import { SymbolIndexer } from '../indexer/SymbolIndexer';
import { TypeGraph, TypeNode, TypeEdge, RelationshipType, GraphOptions } from '../models/TypeGraph';

/**
 * Builds type dependency graphs from indexed symbols
 */
export class TypeGraphBuilder {
    constructor(private indexer: SymbolIndexer) {}

    /**
     * Build a complete type graph for the workspace
     */
    buildGraph(options: GraphOptions = {}): TypeGraph {
        const nodes = new Map<string, TypeNode>();
        const edges: TypeEdge[] = [];

        const files = this.indexer.getAllFiles();

        // Process all types and enums
        for (const [, file] of files) {
            const namespace = file.namespace?.name;

            // Add type nodes
            for (const type of file.types) {
                const nodeId = namespace ? `${namespace}.${type.name}` : type.name;

                nodes.set(nodeId, {
                    id: nodeId,
                    name: type.name,
                    kind: 'type',
                    namespace,
                    description: type.description
                });

                // Add inheritance edge
                if (type.extends) {
                    const parentId = namespace ? `${namespace}.${type.extends}` : type.extends;
                    edges.push({
                        from: nodeId,
                        to: parentId,
                        relationshipType: RelationshipType.Extends,
                        label: 'extends'
                    });
                }

                // Add field type edges
                if (options.includeFields !== false) {
                    for (const field of type.fields) {
                        const fieldTypeId = namespace ? `${namespace}.${field.type}` : field.type;

                        // Only add edge if the field type is a known type (not primitive)
                        if (!this.isPrimitiveType(field.type)) {
                            edges.push({
                                from: nodeId,
                                to: fieldTypeId,
                                relationshipType: RelationshipType.HasField,
                                label: field.name
                            });
                        }
                    }
                }
            }

            // Add enum nodes
            if (options.includeEnums !== false) {
                for (const enumDef of file.enums) {
                    const nodeId = namespace ? `${namespace}.${enumDef.name}` : enumDef.name;

                    nodes.set(nodeId, {
                        id: nodeId,
                        name: enumDef.name,
                        kind: 'enum',
                        namespace,
                        description: enumDef.description
                    });
                }
            }
        }

        return { nodes, edges };
    }

    /**
     * Build a graph starting from a specific type
     */
    buildGraphFromType(typeName: string, options: GraphOptions = {}): TypeGraph {
        const nodes = new Map<string, TypeNode>();
        const edges: TypeEdge[] = [];
        const maxDepth = options.maxDepth ?? 3;

        this.buildGraphRecursive(typeName, nodes, edges, new Set(), 0, maxDepth, options);

        return { nodes, edges };
    }

    /**
     * Recursively build graph from a type
     */
    private buildGraphRecursive(
        typeName: string,
        nodes: Map<string, TypeNode>,
        edges: TypeEdge[],
        visited: Set<string>,
        depth: number,
        maxDepth: number,
        options: GraphOptions
    ): void {
        if (depth > maxDepth || visited.has(typeName)) {
            return;
        }

        visited.add(typeName);

        // Get type or enum
        const type = this.indexer.getType(typeName);
        const enumDef = this.indexer.getEnum(typeName);

        if (type) {
            const symbol = this.indexer.getSymbol(typeName);
            const namespace = symbol?.namespace;
            const nodeId = namespace ? `${namespace}.${type.name}` : type.name;

            // Add node
            nodes.set(nodeId, {
                id: nodeId,
                name: type.name,
                kind: 'type',
                namespace,
                description: type.description
            });

            // Add parent type
            if (type.extends) {
                const parentId = namespace ? `${namespace}.${type.extends}` : type.extends;
                edges.push({
                    from: nodeId,
                    to: parentId,
                    relationshipType: RelationshipType.Extends,
                    label: 'extends'
                });

                this.buildGraphRecursive(type.extends, nodes, edges, visited, depth + 1, maxDepth, options);
            }

            // Add field types
            if (options.includeFields !== false) {
                for (const field of type.fields) {
                    if (!this.isPrimitiveType(field.type)) {
                        const fieldTypeId = namespace ? `${namespace}.${field.type}` : field.type;
                        edges.push({
                            from: nodeId,
                            to: fieldTypeId,
                            relationshipType: RelationshipType.HasField,
                            label: field.name
                        });

                        this.buildGraphRecursive(field.type, nodes, edges, visited, depth + 1, maxDepth, options);
                    }
                }
            }
        } else if (enumDef && options.includeEnums !== false) {
            const symbol = this.indexer.getSymbol(typeName);
            const namespace = symbol?.namespace;
            const nodeId = namespace ? `${namespace}.${enumDef.name}` : enumDef.name;

            nodes.set(nodeId, {
                id: nodeId,
                name: enumDef.name,
                kind: 'enum',
                namespace,
                description: enumDef.description
            });
        }
    }

    /**
     * Check if a type is primitive
     */
    private isPrimitiveType(typeName: string): boolean {
        const primitives = ['string', 'int', 'number', 'boolean', 'date', 'time', 'dateTime', 'zonedDateTime'];
        return primitives.includes(typeName);
    }

    /**
     * Generate Mermaid diagram syntax from graph
     */
    generateMermaidDiagram(graph: TypeGraph): string {
        const lines: string[] = ['graph TD'];

        // Add nodes with styling
        for (const [id, node] of graph.nodes) {
            const sanitizedId = this.sanitizeId(id);
            const label = node.description
                ? `${node.name}<br/><small>${this.truncate(node.description, 40)}</small>`
                : node.name;

            if (node.kind === 'enum') {
                lines.push(`    ${sanitizedId}["${label}"]:::enumStyle`);
            } else {
                lines.push(`    ${sanitizedId}["${label}"]:::typeStyle`);
            }
        }

        // Add edges
        for (const edge of graph.edges) {
            const fromId = this.sanitizeId(edge.from);
            const toId = this.sanitizeId(edge.to);

            // Only add edge if both nodes exist
            if (graph.nodes.has(edge.from) && graph.nodes.has(edge.to)) {
                if (edge.relationshipType === RelationshipType.Extends) {
                    lines.push(`    ${fromId} -.->|extends| ${toId}`);
                } else if (edge.relationshipType === RelationshipType.HasField) {
                    lines.push(`    ${fromId} -->|${edge.label || 'has'}| ${toId}`);
                } else {
                    lines.push(`    ${fromId} --> ${toId}`);
                }
            }
        }

        // Add styling
        lines.push('    classDef typeStyle fill:#e1f5ff,stroke:#01579b,stroke-width:2px');
        lines.push('    classDef enumStyle fill:#fff9c4,stroke:#f57f17,stroke-width:2px');

        return lines.join('\n');
    }

    /**
     * Sanitize ID for Mermaid
     */
    private sanitizeId(id: string): string {
        return id.replace(/[.]/g, '_');
    }

    /**
     * Truncate string to max length
     */
    private truncate(str: string, maxLength: number): string {
        if (str.length <= maxLength) {
            return str;
        }
        return str.substring(0, maxLength - 3) + '...';
    }
}
