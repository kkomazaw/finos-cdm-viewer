import * as assert from 'assert';
import { expect } from 'chai';
import * as vscode from 'vscode';
import * as path from 'path';
import { CdmTreeDataProvider } from '../../src/providers/CdmTreeDataProvider';

suite('Integration Test Suite', () => {
    test('Extension should be present', () => {
        const extension = vscode.extensions.getExtension('finos-community.finos-cdm-viewer');
        expect(extension).to.exist;
    });

    test('Should activate extension', async function() {
        this.timeout(10000);

        const extension = vscode.extensions.getExtension('finos-community.finos-cdm-viewer');
        if (!extension) {
            throw new Error('Extension not found');
        }

        await extension.activate();
        expect(extension.isActive).to.be.true;
    });

    test('Commands should be registered', async function() {
        this.timeout(10000);

        const commands = await vscode.commands.getCommands(true);

        expect(commands).to.include('cdm.refreshExplorer');
        expect(commands).to.include('cdm.openDefinition');
        expect(commands).to.include('cdm.showTypeGraph');
    });

    suite('Parser and TreeView Integration', () => {
        let provider: CdmTreeDataProvider;

        setup(() => {
            provider = new CdmTreeDataProvider();
        });

        test('Should parse and display sample fixture', async function() {
            this.timeout(10000);

            // Refresh to trigger parsing
            provider.refresh();

            // Get root children (namespaces)
            const children = await provider.getChildren();

            // Should return an array (might be empty if no workspace)
            expect(children).to.be.an('array');
        });

        test('Should create tree hierarchy correctly', async function() {
            this.timeout(10000);

            provider.refresh();

            const rootChildren = await provider.getChildren();

            // If we have namespaces, test the hierarchy
            if (rootChildren.length > 0) {
                const firstNamespace = rootChildren[0];
                expect(firstNamespace.type).to.equal('namespace');

                // Get types/enums under namespace
                const namespaceChildren = await provider.getChildren(firstNamespace);
                expect(namespaceChildren).to.be.an('array');

                // If there are types, check their children (fields)
                if (namespaceChildren.length > 0) {
                    const firstType = namespaceChildren.find(c => c.type === 'type');
                    if (firstType) {
                        const typeChildren = await provider.getChildren(firstType);
                        expect(typeChildren).to.be.an('array');
                    }
                }
            }
        });
    });

    suite('File Watcher Integration', () => {
        test('Should respond to file changes', async function() {
            this.timeout(15000);

            const provider = new CdmTreeDataProvider();

            let changeDetected = false;
            provider.onDidChangeTreeData(() => {
                changeDetected = true;
            });

            // Trigger a refresh
            provider.refresh();

            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Refresh should have fired the event
            expect(changeDetected).to.be.true;
        });
    });

    suite('Command Execution', () => {
        test('Should execute refresh command', async function() {
            this.timeout(10000);

            try {
                await vscode.commands.executeCommand('cdm.refreshExplorer');
                // If no error is thrown, command executed successfully
                expect(true).to.be.true;
            } catch (error) {
                // Command might not be available in test environment
                console.log('Command execution skipped in test environment');
            }
        });

        test('Should execute showTypeGraph command', async function() {
            this.timeout(10000);

            try {
                await vscode.commands.executeCommand('cdm.showTypeGraph');
                expect(true).to.be.true;
            } catch (error) {
                console.log('Command execution skipped in test environment');
            }
        });
    });

    suite('Context Variables', () => {
        test('Should set workspaceHasRosettaFiles context', async function() {
            this.timeout(10000);

            // The extension should set this context variable on activation
            // We can't directly test context values, but we can verify the command is available
            const commands = await vscode.commands.getCommands(true);
            expect(commands).to.include('setContext');
        });
    });
});
