import { SymbolIndexer } from '../indexer/SymbolIndexer';
import { RosettaType, RosettaEnum } from '../models/RosettaAst';

/**
 * Search result item
 */
export interface SearchResult {
    name: string;
    kind: 'type' | 'enum' | 'field';
    namespace?: string;
    description?: string;
    filePath: string;
    line: number;
    parent?: string; // For fields, the containing type
}

/**
 * Search filters
 */
export interface SearchFilters {
    kind?: ('type' | 'enum' | 'field')[];
    namespace?: string;
    hasDescription?: boolean;
}

/**
 * Provides search functionality for CDM elements
 */
export class SearchProvider {
    constructor(private indexer: SymbolIndexer) {}

    /**
     * Search for types, enums, and fields
     */
    search(query: string, filters?: SearchFilters): SearchResult[] {
        const results: SearchResult[] = [];
        const lowerQuery = query.toLowerCase();

        const files = this.indexer.getAllFiles();

        for (const [filePath, file] of files) {
            const namespace = file.namespace?.name;

            // Search types
            if (!filters?.kind || filters.kind.includes('type')) {
                for (const type of file.types) {
                    if (this.matchesQuery(type.name, lowerQuery) && this.matchesFilters(type, namespace, filters)) {
                        results.push({
                            name: type.name,
                            kind: 'type',
                            namespace,
                            description: type.description,
                            filePath,
                            line: type.location.line
                        });
                    }

                    // Search fields within types
                    if (!filters?.kind || filters.kind.includes('field')) {
                        for (const field of type.fields) {
                            if (this.matchesQuery(field.name, lowerQuery)) {
                                results.push({
                                    name: field.name,
                                    kind: 'field',
                                    namespace,
                                    description: field.description,
                                    filePath,
                                    line: field.location.line,
                                    parent: type.name
                                });
                            }
                        }
                    }
                }
            }

            // Search enums
            if (!filters?.kind || filters.kind.includes('enum')) {
                for (const enumDef of file.enums) {
                    if (this.matchesQuery(enumDef.name, lowerQuery) && this.matchesFilters(enumDef, namespace, filters)) {
                        results.push({
                            name: enumDef.name,
                            kind: 'enum',
                            namespace,
                            description: enumDef.description,
                            filePath,
                            line: enumDef.location.line
                        });
                    }
                }
            }
        }

        // Sort by relevance (exact match first, then alphabetically)
        results.sort((a, b) => {
            const aExact = a.name.toLowerCase() === lowerQuery;
            const bExact = b.name.toLowerCase() === lowerQuery;

            if (aExact && !bExact) {
                return -1;
            }
            if (!aExact && bExact) {
                return 1;
            }

            return a.name.localeCompare(b.name);
        });

        return results;
    }

    /**
     * Check if name matches query (supports fuzzy matching)
     */
    private matchesQuery(name: string, query: string): boolean {
        const lowerName = name.toLowerCase();

        // Exact match
        if (lowerName === query) {
            return true;
        }

        // Starts with
        if (lowerName.startsWith(query)) {
            return true;
        }

        // Contains
        if (lowerName.includes(query)) {
            return true;
        }

        // Fuzzy match (checks if query characters appear in order)
        let queryIndex = 0;
        for (let i = 0; i < lowerName.length && queryIndex < query.length; i++) {
            if (lowerName[i] === query[queryIndex]) {
                queryIndex++;
            }
        }

        return queryIndex === query.length;
    }

    /**
     * Check if element matches filters
     */
    private matchesFilters(
        element: RosettaType | RosettaEnum,
        namespace: string | undefined,
        filters?: SearchFilters
    ): boolean {
        if (!filters) {
            return true;
        }

        // Namespace filter
        if (filters.namespace && namespace !== filters.namespace) {
            return false;
        }

        // Description filter
        if (filters.hasDescription !== undefined) {
            const hasDesc = !!element.description;
            if (filters.hasDescription !== hasDesc) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get all unique namespaces
     */
    getNamespaces(): string[] {
        const namespaces = new Set<string>();
        const files = this.indexer.getAllFiles();

        for (const [, file] of files) {
            if (file.namespace?.name) {
                namespaces.add(file.namespace.name);
            }
        }

        return Array.from(namespaces).sort();
    }
}
