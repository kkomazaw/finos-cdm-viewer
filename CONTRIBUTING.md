# Contributing to FINOS CDM Viewer

Thank you for your interest in contributing to the FINOS CDM Viewer! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm
- Visual Studio Code 1.85.0 or higher
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/finos-cdm-viewer.git
   cd finos-cdm-viewer
   ```

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile the extension:
   ```bash
   npm run compile
   ```

3. Open the project in VS Code:
   ```bash
   code .
   ```

4. Press `F5` to run the extension in debug mode

## Development Workflow

### Branch Strategy

- `main` - Stable releases only
- `develop` - Active development branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Critical production fixes

### Creating a Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes in the feature branch
2. Write tests for new functionality
3. Ensure all tests pass: `npm test`
4. Run linter: `npm run lint`
5. Compile: `npm run compile`

### Commit Messages

Follow conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(parser): add support for function definitions

Implement parsing of Rosetta function syntax including
input parameters and return types.

Closes #123
```

```
fix(tree): resolve memory leak in tree refresh

The tree provider was not properly disposing of event
listeners on refresh, causing memory buildup.

Fixes #456
```

## Coding Standards

### TypeScript Style Guide

- Use 4 spaces for indentation (not tabs)
- Maximum line length: 100 characters
- Use single quotes for strings
- Always use semicolons
- Use `const` for constants, `let` for variables (avoid `var`)
- Prefer interfaces over type aliases
- Use explicit return types for public functions

### Code Quality

- **Cyclomatic complexity**: Keep functions simple (< 10 complexity)
- **Function length**: Maximum 50 lines per function
- **File length**: Maximum 500 lines per file
- **Code coverage**: Aim for >80% test coverage

### ESLint

All code must pass ESLint checks:

```bash
npm run lint
```

Fix auto-fixable issues:

```bash
npm run lint -- --fix
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Compile and run tests
npm run compile && npm test

# Watch mode (for development)
npm run watch
```

### Writing Tests

- **Unit tests**: Test individual functions/classes
- **Integration tests**: Test module interactions
- **E2E tests**: Test complete user scenarios

Place tests in `test/suite/`:

```typescript
import { expect } from 'chai';
import { RosettaParser } from '../../src/parser/RosettaParser';

suite('RosettaParser Test Suite', () => {
    let parser: RosettaParser;

    setup(() => {
        parser = new RosettaParser();
    });

    test('should parse namespace', () => {
        const result = parser.parse('namespace cdm.base');
        expect(result.file.namespace?.name).to.equal('cdm.base');
    });
});
```

### Test Coverage

Generate coverage report:

```bash
npm run test:coverage
```

View coverage in `coverage/index.html`

## Submitting Changes

### Pull Request Process

1. **Update documentation**: Update README.md, CHANGELOG.md if needed
2. **Add tests**: Ensure new code is tested
3. **Run checks**:
   ```bash
   npm run lint
   npm run compile
   npm test
   ```
4. **Commit changes**: Follow commit message conventions
5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Create Pull Request**:
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe testing done

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] All tests pass
- [ ] Linter passes
```

### Code Review

- At least one approval required
- All CI checks must pass
- Address review comments
- Squash commits before merge (if requested)

## Reporting Bugs

### Before Submitting a Bug Report

- Check existing issues
- Try the latest version
- Collect debug information

### Bug Report Template

```markdown
**Description**
Clear description of the bug

**To Reproduce**
Steps to reproduce:
1. Open workspace with .rosetta files
2. Click on type "Party"
3. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., macOS 13.0]
- VS Code Version: [e.g., 1.85.0]
- Extension Version: [e.g., 0.1.0]

**Screenshots**
If applicable

**Additional Context**
Any other relevant information
```

## Requesting Features

### Feature Request Template

```markdown
**Problem**
What problem does this solve?

**Proposed Solution**
Describe your proposed solution

**Alternatives**
Alternative solutions considered

**Additional Context**
Mockups, examples, etc.
```

## Development Phases

We follow a phased development approach:

### Phase 1: Stabilization (Current)
- Focus on testing and stability
- Bug fixes
- Performance improvements
- Good first issues for new contributors

### Phase 2: Advanced Navigation
- Go to Definition
- Find All References
- Syntax highlighting

### Phase 3: Visualization
- Type graph visualization
- Export functionality

## Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Code Comments**: For understanding implementation details

## Recognition

Contributors will be recognized in:
- CHANGELOG.md
- GitHub contributors page
- Release notes

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to FINOS CDM Viewer! 🎉
