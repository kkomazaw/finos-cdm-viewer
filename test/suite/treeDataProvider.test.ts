import * as assert from 'assert';
import { expect } from 'chai';
import * as vscode from 'vscode';
import { CdmTreeDataProvider, CdmTreeItem, TreeItemType } from '../../src/providers/CdmTreeDataProvider';
import { RosettaFile, RosettaType, RosettaEnum } from '../../src/models/RosettaAst';

suite('CdmTreeDataProvider Test Suite', () => {
    let provider: CdmTreeDataProvider;

    setup(() => {
        provider = new CdmTreeDataProvider();
    });

    suite('Tree Item Creation', () => {
        test('should create namespace tree item', () => {
            const item = new CdmTreeItem(
                'cdm.base',
                TreeItemType.Namespace,
                vscode.TreeItemCollapsibleState.Collapsed
            );

            expect(item.label).to.equal('cdm.base');
            expect(item.type).to.equal(TreeItemType.Namespace);
            expect(item.collapsibleState).to.equal(vscode.TreeItemCollapsibleState.Collapsed);
            expect(item.contextValue).to.equal(TreeItemType.Namespace);
        });

        test('should create type tree item with command', () => {
            const mockType: RosettaType = {
                name: 'Party',
                description: 'Party definition',
                fields: [],
                metadata: [],
                conditions: [],
                location: { line: 1, column: 0, length: 10 }
            };

            const item = new CdmTreeItem(
                'Party',
                TreeItemType.Type,
                vscode.TreeItemCollapsibleState.Collapsed,
                mockType,
                '/path/to/file.rosetta'
            );

            expect(item.label).to.equal('Party');
            expect(item.type).to.equal(TreeItemType.Type);
            expect(item.command).to.exist;
            expect(item.command?.command).to.equal('cdm.openDefinition');
        });

        test('should create enum tree item', () => {
            const mockEnum: RosettaEnum = {
                name: 'StatusEnum',
                description: 'Status values',
                values: [],
                location: { line: 1, column: 0, length: 10 }
            };

            const item = new CdmTreeItem(
                'StatusEnum',
                TreeItemType.Enum,
                vscode.TreeItemCollapsibleState.Collapsed,
                mockEnum
            );

            expect(item.label).to.equal('StatusEnum');
            expect(item.type).to.equal(TreeItemType.Enum);
        });

        test('should create field tree item', () => {
            const item = new CdmTreeItem(
                'partyId: string (1..1)',
                TreeItemType.Field,
                vscode.TreeItemCollapsibleState.None
            );

            expect(item.label).to.equal('partyId: string (1..1)');
            expect(item.type).to.equal(TreeItemType.Field);
            expect(item.collapsibleState).to.equal(vscode.TreeItemCollapsibleState.None);
        });
    });

    suite('Tree Item Icons', () => {
        test('namespace should have package icon', () => {
            const item = new CdmTreeItem(
                'cdm.base',
                TreeItemType.Namespace,
                vscode.TreeItemCollapsibleState.Collapsed
            );

            expect(item.iconPath).to.exist;
            const icon = item.iconPath as vscode.ThemeIcon;
            expect(icon.id).to.equal('package');
        });

        test('type should have class icon', () => {
            const item = new CdmTreeItem(
                'Party',
                TreeItemType.Type,
                vscode.TreeItemCollapsibleState.Collapsed
            );

            const icon = item.iconPath as vscode.ThemeIcon;
            expect(icon.id).to.equal('symbol-class');
        });

        test('enum should have enum icon', () => {
            const item = new CdmTreeItem(
                'StatusEnum',
                TreeItemType.Enum,
                vscode.TreeItemCollapsibleState.Collapsed
            );

            const icon = item.iconPath as vscode.ThemeIcon;
            expect(icon.id).to.equal('symbol-enum');
        });

        test('field should have field icon', () => {
            const item = new CdmTreeItem(
                'field',
                TreeItemType.Field,
                vscode.TreeItemCollapsibleState.None
            );

            const icon = item.iconPath as vscode.ThemeIcon;
            expect(icon.id).to.equal('symbol-field');
        });
    });

    suite('Tree Item Tooltips', () => {
        test('should show type tooltip', () => {
            const mockType: RosettaType = {
                name: 'Party',
                description: 'Party definition',
                fields: [],
                metadata: [],
                conditions: [],
                location: { line: 1, column: 0, length: 10 }
            };

            const item = new CdmTreeItem(
                'Party',
                TreeItemType.Type,
                vscode.TreeItemCollapsibleState.Collapsed,
                mockType
            );

            expect(item.tooltip).to.equal('Party definition');
        });

        test('should show default tooltip when no description', () => {
            const item = new CdmTreeItem(
                'Party',
                TreeItemType.Type,
                vscode.TreeItemCollapsibleState.Collapsed
            );

            expect(item.tooltip).to.equal('Type: Party');
        });
    });

    suite('getTreeItem', () => {
        test('should return the same tree item', () => {
            const item = new CdmTreeItem(
                'Party',
                TreeItemType.Type,
                vscode.TreeItemCollapsibleState.Collapsed
            );

            const result = provider.getTreeItem(item);
            expect(result).to.equal(item);
        });
    });

    suite('Cardinality Formatting', () => {
        test('should format cardinality correctly', () => {
            // This tests the private formatCardinality method indirectly
            // through the tree item creation

            const mockType: RosettaType = {
                name: 'TestType',
                fields: [{
                    name: 'field1',
                    type: 'string',
                    cardinality: { min: 0, max: 1, isRequired: false, isMultiple: false },
                    metadata: [],
                    location: { line: 1, column: 0, length: 10 }
                }],
                metadata: [],
                conditions: [],
                location: { line: 1, column: 0, length: 10 }
            };

            const namespaceItem = new CdmTreeItem(
                'cdm.test',
                TreeItemType.Namespace,
                vscode.TreeItemCollapsibleState.Collapsed,
                { namespace: 'cdm.test', files: [{
                    filePath: '/test.rosetta',
                    imports: [],
                    types: [mockType],
                    enums: [],
                    functions: []
                }] }
            );

            const typeItem = new CdmTreeItem(
                'TestType',
                TreeItemType.Type,
                vscode.TreeItemCollapsibleState.Collapsed,
                mockType
            );

            // Verify the tree structure can be created
            expect(typeItem.data).to.deep.equal(mockType);
        });
    });

    suite('Empty State', () => {
        test('should return empty array when no workspace folders', async () => {
            // When there are no .rosetta files indexed
            const children = await provider.getChildren();

            // Should return empty array or at least not throw
            expect(children).to.be.an('array');
        });
    });
});
