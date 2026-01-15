# Change Log

All notable changes to the "finos-cdm-viewer" extension will be documented in this file.

## [Unreleased]

### Added
- Comprehensive test suite with Mocha and Chai
  - Unit tests for RosettaParser
  - Unit tests for CdmTreeDataProvider
  - Integration tests for extension functionality
- CI/CD pipeline with GitHub Actions
  - Automated testing on multiple platforms (Ubuntu, Windows, macOS)
  - Automated security audits
  - Code quality checks
- Release workflow for automated packaging

### Changed
- Improved test coverage
- Enhanced development workflow

## [0.1.0] - 2026-01-15

### Added
- Initial MVP release
- CDM Explorer tree view for browsing Rosetta DSL files
- Namespace-based organization of types and enums
- Basic navigation to type/enum definitions
- Auto-refresh when .rosetta files change
- Support for:
  - Namespace and version declarations
  - Import statements
  - Type definitions with inheritance
  - Field definitions with cardinality
  - Enum definitions with display names
  - Metadata annotations
- Context-aware tree view (only shows when .rosetta files exist)
- Basic hover provider
- File system watcher for automatic updates

### Known Issues
- Syntax highlighting not yet implemented
- Performance may be slow with very large workspaces (500+ files)
- Parser uses regex-based approach (will be improved in Phase 2)

## Development Phases

### Phase 1: Stabilization and Testing (Current)
**Target: v0.3.0 - February 2026**
- Comprehensive test coverage (>80%)
- Performance improvements
- Bug fixes and stability improvements
- CI/CD pipeline
- Documentation improvements

### Phase 2: Advanced Navigation (Planned)
**Target: v0.5.0 - April 2026**
- Enhanced hover information with type details
- Go to Definition for type references
- Find All References
- Rosetta DSL syntax highlighting
- Basic IntelliSense

### Phase 3: Visualization and Export (Planned)
**Target: v1.0.0 - July 2026**
- Type graph visualization (Mermaid/GraphViz)
- Search and filter functionality
- Export to JSON, GraphViz, PlantUML
- Validation and error highlighting
- Advanced refactoring support

---

## Version History

- [0.1.0] - Initial MVP release with basic CDM browsing functionality
