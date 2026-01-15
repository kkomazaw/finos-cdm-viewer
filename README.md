# FINOS CDM Viewer

Visual viewer for FINOS Common Domain Model (CDM) written in Rosetta DSL.

## Features

- **CDM Explorer Tree View**: Browse CDM types, enums, and their relationships hierarchically
- **Namespace Organization**: Automatically organizes CDM definitions by namespace
- **Type Navigation**: Click on types and enums to jump to their definitions
- **Field Details**: View field cardinality, types, and descriptions
- **Auto-refresh**: Automatically updates when .rosetta files change
- **Syntax Highlighting**: Full syntax highlighting for Rosetta DSL files
- **Enhanced Hover**: Hover over types, enums, and fields to see detailed information
- **Go to Definition**: Navigate to type and enum definitions with F12 or Cmd+Click
- **Find All References**: Find all usages of types and enums across the workspace with Shift+F12
- **Type Graph Visualization**: Interactive graph visualization of type relationships using Mermaid.js
- **Search and Filter**: Quick search for types, enums, and fields with fuzzy matching and advanced filters
- **Export to Multiple Formats**: Export CDM data to JSON, Mermaid diagrams, or GraphViz DOT files
- **Validation and Diagnostics**: Real-time validation with error highlighting for undefined types, circular inheritance, invalid cardinality, and more
- **Code Completion**: IntelliSense-style code completion for types, enums, keywords, metadata, and cardinality

## Installation

### Prerequisites

- Visual Studio Code 1.85.0 or higher
- Node.js 18+ and npm

### Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/kkomazaw/finos-cdm-viewer.git
   cd finos-cdm-viewer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run compile
   ```

4. Run the extension in development mode:
   - Press `F5` in VS Code to open a new Extension Development Host window
   - Or use the "Run Extension" debug configuration

## Usage

### Opening CDM Files

1. Open a workspace containing `.rosetta` files (e.g., clone the [FINOS CDM repository](https://github.com/finos/common-domain-model))
2. The CDM Explorer view will appear in the Explorer sidebar
3. Browse the namespace hierarchy to find types and enums

### Navigation

- **Click** on a type or enum name to open its definition in the editor
- **Expand** namespaces to see all types and enums defined within
- **Expand** types to see their fields, inheritance, and conditions
- **Expand** enums to see their values
- **Hover** over type or enum names to see detailed information
- **F12** or **Cmd+Click** on a type or enum to go to its definition
- **Shift+F12** on a type or enum to find all references

### Commands

- `CDM: Refresh Explorer` - Manually refresh the CDM explorer tree
- `CDM: Show Type Graph` - Visualize type relationships in an interactive graph
  - Can be invoked from command palette, editor context menu, or with cursor on a type name
  - Shows inheritance relationships, field dependencies, and enum usage
  - Supports zoom, pan, and SVG export
- `CDM: Search Types and Enums` - Search for CDM elements with advanced filtering
  - Fuzzy search supports partial matches and character-by-character matching
  - Filter by element kind (types, enums, fields)
  - Filter by namespace
  - Filter by description presence
  - Navigate directly to search results
- `CDM: Export to JSON/Mermaid/GraphViz` - Export CDM definitions and graphs
  - Export all types or specific type with dependencies
  - JSON format: Complete type and enum definitions with metadata
  - Mermaid format: Ready-to-use diagram markup for documentation
  - GraphViz DOT format: Professional graph visualization

### Validation and Diagnostics

The extension provides real-time validation of Rosetta files with error highlighting:

- **Undefined Type References**: Detects references to types or enums that don't exist
- **Circular Inheritance**: Identifies circular inheritance chains in type hierarchies
- **Invalid Cardinality**: Validates field cardinality (min must not exceed max)
- **Duplicate Fields**: Detects duplicate field names within types
- **Duplicate Enum Values**: Detects duplicate values in enums
- **Empty Types**: Warns about types with no fields defined
- **Empty Enums**: Flags enums with no values
- **Missing Descriptions**: Optional warning for missing documentation

Validation runs automatically on:
- Document open
- Document save
- Document changes (with 500ms debounce)
- File system changes

### Code Completion

The extension provides IntelliSense-style code completion while editing Rosetta files:

- **Type Completions**: Suggests primitive types (string, int, number, boolean, date, etc.) and custom types when defining fields or extends clauses
- **Enum Completions**: Suggests enums when defining field types
- **Keyword Completions**: Provides snippet-based completions for Rosetta keywords (namespace, type, enum, func, extends, condition)
- **Metadata Completions**: Suggests metadata annotations (key, id, reference, scheme, calculation)
- **Cardinality Completions**: Suggests common cardinality patterns (0..1, 1..1, 0..*, 1..*)

Completions are triggered automatically as you type, or can be manually triggered with Ctrl+Space (or Cmd+Space on macOS).

### File Watcher

The extension automatically watches for changes to `.rosetta` files and refreshes the tree view when files are:
- Created
- Modified
- Deleted

## Extension Configuration

You can configure the extension through VS Code settings:

```json
{
  "cdm.sourcePath": "path/to/rosetta/files",
  "cdm.enableCache": true
}
```

- `cdm.sourcePath`: Specify a custom path to Rosetta source files
- `cdm.enableCache`: Enable/disable file parsing cache (default: true)

## Development

### Project Structure

```
finos-cdm-viewer/
├── src/
│   ├── extension.ts           # Extension entry point
│   ├── models/
│   │   └── RosettaAst.ts      # AST type definitions
│   ├── parser/
│   │   └── RosettaParser.ts   # Rosetta DSL parser
│   ├── indexer/
│   │   └── SymbolIndexer.ts   # Symbol indexing for workspace
│   ├── graph/
│   │   └── TypeGraphBuilder.ts  # Type graph builder
│   ├── search/
│   │   ├── SearchProvider.ts    # Search and filter provider
│   │   └── SearchPanel.ts       # Search quick pick interface
│   ├── export/
│   │   └── ExportProvider.ts    # Export to JSON/Mermaid/GraphViz
│   ├── validation/
│   │   ├── ValidationRules.ts   # Validation rule definitions
│   │   └── DiagnosticProvider.ts  # Real-time diagnostics provider
│   ├── views/
│   │   └── TypeGraphPanel.ts    # WebView panel for graph visualization
│   ├── providers/
│   │   ├── CdmTreeDataProvider.ts        # Tree view provider
│   │   ├── RosettaHoverProvider.ts       # Hover information provider
│   │   ├── RosettaDefinitionProvider.ts  # Go to definition provider
│   │   └── RosettaReferenceProvider.ts   # Find all references provider
│   └── models/
│       ├── RosettaAst.ts     # AST type definitions
│       └── TypeGraph.ts      # Type graph data structures
├── syntaxes/
│   └── rosetta.tmLanguage.json  # Syntax highlighting grammar
├── test/
│   └── fixtures/              # Test Rosetta files
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Run tests (when implemented)
npm test
```

### Testing with FINOS CDM

1. Clone the FINOS CDM repository:
   ```bash
   git clone https://github.com/finos/common-domain-model.git
   ```

2. Open the CDM repository in VS Code with this extension running

3. Navigate to `rosetta-source/src/main/rosetta/` to see the CDM files

4. The CDM Explorer should populate with all namespaces and types

## Technical Details

### Parser Implementation

The extension uses a lightweight regex-based parser that extracts:
- Namespace declarations
- Import statements
- Type definitions (with inheritance, fields, metadata, conditions)
- Enum definitions (with values and display names)
- Cardinality specifications (e.g., 0..1, 1..*)

### Supported Rosetta Syntax

- ✅ Namespace and version declarations
- ✅ Import statements
- ✅ Type definitions with `extends`
- ✅ Field definitions with cardinality
- ✅ Metadata annotations `[metadata key|id|reference|scheme]`
- ✅ Enum definitions with display names
- ✅ Condition (validation rule) definitions
- ⏹ Function definitions (planned)

### Performance

- Parsing ~150 Rosetta files (~3MB): 2-5 seconds on initial load
- Incremental parsing: 50-100ms per file
- Memory usage: ~50-100MB for full CDM

## Roadmap

### MVP
- [x] Tree view with namespace/type/enum hierarchy
- [x] Basic navigation to definitions
- [x] Auto-refresh on file changes

### Phase 2
- [x] Enhanced hover information with type details
- [x] Go to Definition for type references
- [x] Syntax highlighting for Rosetta DSL
- [x] Find All References

### Phase 3 (Current)
- [x] Type graph visualization
- [x] Search and filter functionality
- [x] Export to various formats (JSON, Mermaid, GraphViz)
- [x] Validation and error highlighting
- [x] Code completion for type references
- [ ] Rename symbol support

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

[License information to be added]

## Resources

- [FINOS Common Domain Model](https://github.com/finos/common-domain-model)
- [Rosetta DSL Documentation](https://docs.rosetta-technology.io/)
- [VS Code Extension API](https://code.visualstudio.com/api)

## Support

For issues and questions, please open an issue on the GitHub repository.
