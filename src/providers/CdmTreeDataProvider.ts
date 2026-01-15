import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { RosettaParser } from '../parser/RosettaParser';
import { RosettaFile, RosettaType, RosettaEnum } from '../models/RosettaAst';

/**
 * Tree item types
 */
export enum TreeItemType {
    Namespace = 'namespace',
    Type = 'type',
    Enum = 'enum',
    Field = 'field',
    EnumValue = 'enumValue',
    Folder = 'folder'
}

/**
 * Custom tree item for CDM explorer
 */
export class CdmTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly type: TreeItemType,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly data?: any,
        public readonly filePath?: string
    ) {
        super(label, collapsibleState);

        this.contextValue = type;
        this.iconPath = this.getIcon();
        this.tooltip = this.getTooltip();

        // Set command for clickable items
        if (type === TreeItemType.Type || type === TreeItemType.Enum) {
            this.command = {
                command: 'cdm.openDefinition',
                title: 'Open Definition',
                arguments: [this]
            };
        }
    }

    private getIcon(): vscode.ThemeIcon {
        switch (this.type) {
            case TreeItemType.Namespace:
                return new vscode.ThemeIcon('package');
            case TreeItemType.Type:
                return new vscode.ThemeIcon('symbol-class');
            case TreeItemType.Enum:
                return new vscode.ThemeIcon('symbol-enum');
            case TreeItemType.Field:
                return new vscode.ThemeIcon('symbol-field');
            case TreeItemType.EnumValue:
                return new vscode.ThemeIcon('symbol-enum-member');
            case TreeItemType.Folder:
                return new vscode.ThemeIcon('folder');
            default:
                return new vscode.ThemeIcon('file');
        }
    }

    private getTooltip(): string {
        if (this.data?.description) {
            return this.data.description;
        }

        switch (this.type) {
            case TreeItemType.Type:
                return `Type: ${this.label}`;
            case TreeItemType.Enum:
                return `Enum: ${this.label}`;
            case TreeItemType.Field:
                return `Field: ${this.label}`;
            default:
                return this.label;
        }
    }
}

/**
 * Tree data provider for CDM Explorer
 */
export class CdmTreeDataProvider implements vscode.TreeDataProvider<CdmTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CdmTreeItem | undefined | null | void> = new vscode.EventEmitter<CdmTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CdmTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private parser: RosettaParser;
    private rosettaFiles: Map<string, RosettaFile> = new Map();
    private namespaces: Map<string, RosettaFile[]> = new Map();

    constructor() {
        this.parser = new RosettaParser();
    }

    /**
     * Refresh the tree view
     */
    refresh(): void {
        this.rosettaFiles.clear();
        this.namespaces.clear();
        this.indexWorkspace();
        this._onDidChangeTreeData.fire();
    }

    /**
     * Get tree item
     */
    getTreeItem(element: CdmTreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * Get children of a tree item
     */
    async getChildren(element?: CdmTreeItem): Promise<CdmTreeItem[]> {
        if (!element) {
            // Root level: show namespaces
            return this.getRootNamespaces();
        }

        switch (element.type) {
            case TreeItemType.Namespace:
                return this.getNamespaceChildren(element);
            case TreeItemType.Type:
                return this.getTypeChildren(element);
            case TreeItemType.Enum:
                return this.getEnumChildren(element);
            default:
                return [];
        }
    }

    /**
     * Get root namespaces
     */
    private getRootNamespaces(): CdmTreeItem[] {
        const items: CdmTreeItem[] = [];

        // Group files by namespace
        for (const [namespace, files] of this.namespaces.entries()) {
            items.push(new CdmTreeItem(
                namespace,
                TreeItemType.Namespace,
                vscode.TreeItemCollapsibleState.Collapsed,
                { namespace, files }
            ));
        }

        return items.sort((a, b) => a.label.localeCompare(b.label));
    }

    /**
     * Get children of a namespace
     */
    private getNamespaceChildren(element: CdmTreeItem): CdmTreeItem[] {
        const items: CdmTreeItem[] = [];
        const files = element.data.files as RosettaFile[];

        // Collect all types and enums from files in this namespace
        for (const file of files) {
            // Add types
            for (const type of file.types) {
                items.push(new CdmTreeItem(
                    type.name,
                    TreeItemType.Type,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    type,
                    file.filePath
                ));
            }

            // Add enums
            for (const enumDef of file.enums) {
                items.push(new CdmTreeItem(
                    enumDef.name,
                    TreeItemType.Enum,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    enumDef,
                    file.filePath
                ));
            }
        }

        return items.sort((a, b) => a.label.localeCompare(b.label));
    }

    /**
     * Get children of a type (fields)
     */
    private getTypeChildren(element: CdmTreeItem): CdmTreeItem[] {
        const type = element.data as RosettaType;
        const items: CdmTreeItem[] = [];

        // Show inheritance info
        if (type.extends) {
            items.push(new CdmTreeItem(
                `extends ${type.extends}`,
                TreeItemType.Field,
                vscode.TreeItemCollapsibleState.None,
                { name: type.extends, type: 'extends' }
            ));
        }

        // Show fields
        for (const field of type.fields) {
            const cardinalityStr = this.formatCardinality(field.cardinality);
            const label = `${field.name}: ${field.type} (${cardinalityStr})`;

            items.push(new CdmTreeItem(
                label,
                TreeItemType.Field,
                vscode.TreeItemCollapsibleState.None,
                field
            ));
        }

        return items;
    }

    /**
     * Get children of an enum (values)
     */
    private getEnumChildren(element: CdmTreeItem): CdmTreeItem[] {
        const enumDef = element.data as RosettaEnum;
        const items: CdmTreeItem[] = [];

        for (const value of enumDef.values) {
            const label = value.displayName ? `${value.name} - ${value.displayName}` : value.name;

            items.push(new CdmTreeItem(
                label,
                TreeItemType.EnumValue,
                vscode.TreeItemCollapsibleState.None,
                value
            ));
        }

        return items;
    }

    /**
     * Format cardinality for display
     */
    private formatCardinality(cardinality: any): string {
        const { min, max } = cardinality;
        return `${min}..${max}`;
    }

    /**
     * Index all Rosetta files in the workspace
     */
    private indexWorkspace(): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return;
        }

        for (const folder of workspaceFolders) {
            this.indexFolder(folder.uri.fsPath);
        }
    }

    /**
     * Index a folder recursively
     */
    private indexFolder(folderPath: string): void {
        try {
            const entries = fs.readdirSync(folderPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(folderPath, entry.name);

                if (entry.isDirectory()) {
                    // Skip node_modules and hidden directories
                    if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
                        this.indexFolder(fullPath);
                    }
                } else if (entry.isFile() && entry.name.endsWith('.rosetta')) {
                    this.indexFile(fullPath);
                }
            }
        } catch (error) {
            console.error(`Error indexing folder ${folderPath}:`, error);
        }
    }

    /**
     * Index a single Rosetta file
     */
    private indexFile(filePath: string): void {
        try {
            const result = this.parser.parseFile(filePath);

            if (result.errors.length > 0) {
                console.warn(`Errors parsing ${filePath}:`, result.errors);
            }

            this.rosettaFiles.set(filePath, result.file);

            // Group by namespace
            if (result.file.namespace) {
                const namespace = result.file.namespace.name;

                if (!this.namespaces.has(namespace)) {
                    this.namespaces.set(namespace, []);
                }

                this.namespaces.get(namespace)!.push(result.file);
            }
        } catch (error) {
            console.error(`Error indexing file ${filePath}:`, error);
        }
    }

    /**
     * Get file for a tree item
     */
    getFileForItem(item: CdmTreeItem): RosettaFile | undefined {
        if (item.filePath) {
            return this.rosettaFiles.get(item.filePath);
        }
        return undefined;
    }
}
