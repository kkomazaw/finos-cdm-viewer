import * as vscode from 'vscode';
import { TypeGraphBuilder } from '../graph/TypeGraphBuilder';
import { GraphOptions } from '../models/TypeGraph';

/**
 * Manages the webview panel for type graph visualization
 */
export class TypeGraphPanel {
    public static currentPanel: TypeGraphPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        private readonly graphBuilder: TypeGraphBuilder
    ) {
        this.panel = panel;

        // Set the webview's initial html content
        this.update();

        // Listen for when the panel is disposed
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            message => {
                switch (message.type) {
                    case 'refresh':
                        this.update(message.options);
                        return;
                }
            },
            null,
            this.disposables
        );
    }

    /**
     * Create or show the type graph panel
     */
    public static createOrShow(
        graphBuilder: TypeGraphBuilder,
        typeName?: string
    ): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (TypeGraphPanel.currentPanel) {
            TypeGraphPanel.currentPanel.panel.reveal(column);
            TypeGraphPanel.currentPanel.showGraph(typeName);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'cdmTypeGraph',
            'CDM Type Graph',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        TypeGraphPanel.currentPanel = new TypeGraphPanel(panel, graphBuilder);
        TypeGraphPanel.currentPanel.showGraph(typeName);
    }

    /**
     * Show graph for a specific type or all types
     */
    private showGraph(typeName?: string): void {
        const options: GraphOptions = {
            includeFields: true,
            includeEnums: true,
            maxDepth: 3
        };

        this.update(options, typeName);
    }

    /**
     * Update the webview content
     */
    private update(options?: GraphOptions, typeName?: string): void {
        const webview = this.panel.webview;

        // Generate the graph
        const graph = typeName
            ? this.graphBuilder.buildGraphFromType(typeName, options)
            : this.graphBuilder.buildGraph(options);

        const mermaidCode = this.graphBuilder.generateMermaidDiagram(graph);

        const title = typeName ? `Type Graph: ${typeName}` : 'CDM Type Graph';
        this.panel.title = title;

        webview.html = this.getHtmlForWebview(webview, mermaidCode, title);
    }

    /**
     * Dispose the panel
     */
    public dispose(): void {
        TypeGraphPanel.currentPanel = undefined;

        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    /**
     * Generate HTML content for the webview
     */
    private getHtmlForWebview(webview: vscode.Webview, mermaidCode: string, title: string): string {
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net; style-src ${webview.cspSource} 'unsafe-inline' https://cdn.jsdelivr.net;">
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js" nonce="${nonce}"></script>
    <style>
        body {
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            font-family: var(--vscode-font-family);
        }
        h1 {
            color: var(--vscode-foreground);
            margin-bottom: 20px;
        }
        .controls {
            margin-bottom: 20px;
            padding: 10px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
        }
        .controls button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 14px;
            margin-right: 10px;
            cursor: pointer;
            border-radius: 2px;
        }
        .controls button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .graph-container {
            background-color: var(--vscode-editor-background);
            padding: 20px;
            border-radius: 4px;
            overflow: auto;
            max-height: 80vh;
        }
        #mermaid-diagram {
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .error {
            color: var(--vscode-errorForeground);
            padding: 10px;
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <div class="controls">
        <button onclick="zoomIn()">Zoom In</button>
        <button onclick="zoomOut()">Zoom Out</button>
        <button onclick="resetZoom()">Reset Zoom</button>
        <button onclick="exportSVG()">Export SVG</button>
    </div>
    <div class="graph-container">
        <div id="mermaid-diagram">
            <pre class="mermaid">
${mermaidCode}
            </pre>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        let currentZoom = 1.0;

        // Initialize Mermaid
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis'
            }
        });

        function zoomIn() {
            currentZoom += 0.1;
            applyZoom();
        }

        function zoomOut() {
            currentZoom = Math.max(0.1, currentZoom - 0.1);
            applyZoom();
        }

        function resetZoom() {
            currentZoom = 1.0;
            applyZoom();
        }

        function applyZoom() {
            const diagram = document.getElementById('mermaid-diagram');
            diagram.style.transform = 'scale(' + currentZoom + ')';
            diagram.style.transformOrigin = 'top left';
        }

        function exportSVG() {
            const svg = document.querySelector('#mermaid-diagram svg');
            if (svg) {
                const serializer = new XMLSerializer();
                const svgString = serializer.serializeToString(svg);
                const blob = new Blob([svgString], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'type-graph.svg';
                a.click();
                URL.revokeObjectURL(url);
            }
        }

        // Handle errors
        window.addEventListener('error', (event) => {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = 'Error rendering graph: ' + event.message;
            document.querySelector('.graph-container').prepend(errorDiv);
        });
    </script>
</body>
</html>`;
    }

    /**
     * Generate a nonce for CSP
     */
    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
