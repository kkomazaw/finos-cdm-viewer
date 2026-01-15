import * as vscode from 'vscode';
import * as fs from 'fs';
import { SymbolIndexer } from '../indexer/SymbolIndexer';
import { TypeGraphBuilder } from '../graph/TypeGraphBuilder';
import { TypeGraph } from '../models/TypeGraph';

/**
 * Export formats
 */
export enum ExportFormat {
    JSON = 'json',
    Mermaid = 'mermaid',
    GraphViz = 'graphviz'
}

/**
 * Provides export functionality for CDM data
 */
export class ExportProvider {
    constructor(
        private indexer: SymbolIndexer,
        private graphBuilder: TypeGraphBuilder
    ) {}

    /**
     * Export CDM data to specified format
     */
    async export(format: ExportFormat, typeName?: string): Promise<void> {
        let content: string;
        let fileExtension: string;

        switch (format) {
            case ExportFormat.JSON:
                content = this.exportToJSON(typeName);
                fileExtension = 'json';
                break;
            case ExportFormat.Mermaid:
                content = this.exportToMermaid(typeName);
                fileExtension = 'mmd';
                break;
            case ExportFormat.GraphViz:
                content = this.exportToGraphViz(typeName);
                fileExtension = 'dot';
                break;
        }

        // Prompt user for save location
        const defaultFileName = typeName
            ? `cdm-${typeName}.${fileExtension}`
            : `cdm-export.${fileExtension}`;

        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(defaultFileName),
            filters: this.getFileFilters(format)
        });

        if (uri) {
            try {
                fs.writeFileSync(uri.fsPath, content, 'utf-8');
                vscode.window.showInformationMessage(`Exported to ${uri.fsPath}`);

                // Ask if user wants to open the file
                const openFile = await vscode.window.showQuickPick(['Yes', 'No'], {
                    placeHolder: 'Open exported file?'
                });

                if (openFile === 'Yes') {
                    const document = await vscode.workspace.openTextDocument(uri);
                    await vscode.window.showTextDocument(document);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to export: ${error}`);
            }
        }
    }

    /**
     * Export to JSON format
     */
    private exportToJSON(typeName?: string): string {
        const files = this.indexer.getAllFiles();
        const data: {
            exportDate: string;
            version: string;
            namespaces: Record<string, { types: unknown[]; enums: unknown[] }>;
        } = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            namespaces: {}
        };

        for (const [filePath, file] of files) {
            const namespace = file.namespace?.name || 'default';

            if (!data.namespaces[namespace]) {
                data.namespaces[namespace] = {
                    types: [],
                    enums: []
                };
            }

            // Export types
            for (const type of file.types) {
                if (!typeName || type.name === typeName) {
                    data.namespaces[namespace].types.push({
                        name: type.name,
                        description: type.description,
                        extends: type.extends,
                        fields: type.fields.map(f => ({
                            name: f.name,
                            type: f.type,
                            cardinality: {
                                min: f.cardinality.min,
                                max: f.cardinality.max
                            },
                            description: f.description,
                            metadata: f.metadata
                        })),
                        metadata: type.metadata,
                        conditions: type.conditions.map(c => ({
                            name: c.name,
                            description: c.description,
                            expression: c.expression
                        })),
                        file: filePath
                    });
                }
            }

            // Export enums
            for (const enumDef of file.enums) {
                if (!typeName || enumDef.name === typeName) {
                    data.namespaces[namespace].enums.push({
                        name: enumDef.name,
                        description: enumDef.description,
                        values: enumDef.values.map(v => ({
                            name: v.name,
                            displayName: v.displayName,
                            description: v.description
                        })),
                        file: filePath
                    });
                }
            }
        }

        return JSON.stringify(data, null, 2);
    }

    /**
     * Export to Mermaid diagram format
     */
    private exportToMermaid(typeName?: string): string {
        const graph = typeName
            ? this.graphBuilder.buildGraphFromType(typeName, { includeFields: true, includeEnums: true })
            : this.graphBuilder.buildGraph({ includeFields: true, includeEnums: true });

        const mermaid = this.graphBuilder.generateMermaidDiagram(graph);

        // Add title and metadata
        const lines = [
            `%% CDM Type Graph`,
            `%% Generated: ${new Date().toISOString()}`,
            typeName ? `%% Focus: ${typeName}` : '%% All types',
            '',
            mermaid
        ];

        return lines.join('\n');
    }

    /**
     * Export to GraphViz DOT format
     */
    private exportToGraphViz(typeName?: string): string {
        const graph = typeName
            ? this.graphBuilder.buildGraphFromType(typeName, { includeFields: true, includeEnums: true })
            : this.graphBuilder.buildGraph({ includeFields: true, includeEnums: true });

        return this.generateGraphVizDOT(graph);
    }

    /**
     * Generate GraphViz DOT syntax
     */
    private generateGraphVizDOT(graph: TypeGraph): string {
        const lines: string[] = [
            'digraph CDM {',
            '    rankdir=TB;',
            '    node [shape=box, style=filled, fillcolor=lightblue];',
            '    edge [fontsize=10];',
            ''
        ];

        // Add nodes
        for (const [id, node] of graph.nodes) {
            const label = node.description
                ? `${node.name}\\n${this.escapeGraphViz(node.description.substring(0, 40))}`
                : node.name;

            const color = node.kind === 'enum' ? 'lightyellow' : 'lightblue';
            const shape = node.kind === 'enum' ? 'ellipse' : 'box';

            lines.push(`    "${id}" [label="${label}", fillcolor=${color}, shape=${shape}];`);
        }

        lines.push('');

        // Add edges
        for (const edge of graph.edges) {
            if (graph.nodes.has(edge.from) && graph.nodes.has(edge.to)) {
                const style = edge.relationshipType === 'extends' ? 'dashed' : 'solid';
                const label = edge.label || '';
                lines.push(`    "${edge.from}" -> "${edge.to}" [label="${label}", style=${style}];`);
            }
        }

        lines.push('}');

        return lines.join('\n');
    }

    /**
     * Escape special characters for GraphViz
     */
    private escapeGraphViz(str: string): string {
        return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    }

    /**
     * Get file filters for save dialog
     */
    private getFileFilters(format: ExportFormat): { [name: string]: string[] } {
        switch (format) {
            case ExportFormat.JSON:
                return { 'JSON': ['json'] };
            case ExportFormat.Mermaid:
                return { 'Mermaid': ['mmd', 'mermaid'] };
            case ExportFormat.GraphViz:
                return { 'GraphViz DOT': ['dot', 'gv'] };
        }
    }
}
