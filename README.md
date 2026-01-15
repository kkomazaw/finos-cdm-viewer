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
- `CDM: Show Type Graph` - (Coming soon) Visualize type relationships

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
│   └── providers/
│       ├── CdmTreeDataProvider.ts        # Tree view provider
│       ├── RosettaHoverProvider.ts       # Hover information provider
│       ├── RosettaDefinitionProvider.ts  # Go to definition provider
│       └── RosettaReferenceProvider.ts   # Find all references provider
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
- [ ] Type graph visualization
- [ ] Search and filter functionality
- [ ] Export to various formats (JSON, GraphViz)
- [ ] Validation and error highlighting
- [ ] Code completion for type references
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
