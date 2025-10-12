# Contributing to MediConnect Pro

Thank you for your interest in contributing to MediConnect Pro! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and collaborative environment for everyone.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/mediconnect-pro.git
   cd mediconnect-pro
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-username/mediconnect-pro.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

6. **Start development environment**:
   ```bash
   docker-compose up -d
   npm run dev
   ```

## Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Test your changes**:
   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```

4. **Commit your changes** (see Commit Guidelines below)

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

## Coding Standards

### TypeScript/JavaScript

- Use **TypeScript** for all new code
- Follow **ESLint** and **Prettier** configurations
- Use **meaningful variable names**
- Write **JSDoc comments** for public APIs
- Keep functions **small and focused**
- Use **async/await** instead of callbacks

Example:
```typescript
/**
 * Validates patient vital signs data
 * @param vitals - The vital signs data to validate
 * @returns True if valid, false otherwise
 */
export async function validateVitals(vitals: VitalsData): Promise<boolean> {
  if (!vitals.heartRate || vitals.heartRate < 0) {
    return false;
  }
  // ... more validation
  return true;
}
```

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Line length**: Max 100 characters
- **Naming**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and types
  - `UPPER_CASE` for constants

### Testing

- Write **unit tests** for all business logic
- Write **integration tests** for API endpoints
- Aim for **80%+ code coverage**
- Use **descriptive test names**

Example:
```typescript
describe('VitalsService', () => {
  describe('validateVitals', () => {
    it('should return true for valid vital signs', async () => {
      const vitals = { heartRate: 75, bloodPressure: '120/80' };
      const result = await validateVitals(vitals);
      expect(result).toBe(true);
    });

    it('should return false for negative heart rate', async () => {
      const vitals = { heartRate: -10, bloodPressure: '120/80' };
      const result = await validateVitals(vitals);
      expect(result).toBe(false);
    });
  });
});
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, missing semi-colons, etc.)
- **refactor**: Code refactoring (no functional changes)
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **build**: Build system or dependency changes
- **ci**: CI/CD configuration changes
- **chore**: Other changes that don't modify src or test files

### Examples

```bash
feat(auth): add multi-factor authentication support

Implements TOTP-based MFA for enhanced security.
Users can enable MFA in their account settings.

Closes #123
```

```bash
fix(vitals): resolve race condition in data processing

Fixed a race condition where concurrent vital sign updates
could result in data loss.

Fixes #456
```

## Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Ensure all tests pass**: `npm run test`
4. **Ensure code is linted**: `npm run lint`
5. **Ensure types are correct**: `npm run type-check`
6. **Update CHANGELOG.md** if applicable
7. **Fill out the PR template** completely
8. **Request review** from maintainers
9. **Address review comments** promptly
10. **Squash commits** if requested

### Pull Request Title

Follow the same format as commit messages:
```
feat(service-name): brief description
```

### Pull Request Description Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added and passing
- [ ] Dependent changes merged

## Screenshots (if applicable)
Add screenshots here

## Related Issues
Closes #(issue number)
```

## Reporting Bugs

### Before Submitting

1. **Check existing issues** to avoid duplicates
2. **Use the latest version** to verify the bug still exists
3. **Collect information**:
   - OS and version
   - Node.js and npm versions
   - Browser (if frontend issue)
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages and stack traces

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Actual behavior**
What actually happened.

**Screenshots**
If applicable, add screenshots.

**Environment**
- OS: [e.g., Ubuntu 22.04]
- Node.js: [e.g., 20.10.0]
- Browser: [e.g., Chrome 120]

**Additional context**
Any other relevant information.
```

## Suggesting Features

We welcome feature suggestions! Please:

1. **Check existing feature requests** to avoid duplicates
2. **Describe the problem** this feature would solve
3. **Describe the solution** you'd like
4. **Describe alternatives** you've considered
5. **Provide context** about your use case

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Other solutions or features you've considered.

**Use case**
How would this feature be used?

**Additional context**
Any other context, screenshots, or examples.
```

## Architecture Guidelines

### Microservices

- Keep services **loosely coupled**
- Use **message queues** for async communication
- Implement **circuit breakers** for resilience
- Use **API versioning** for backward compatibility

### Database

- Use **migrations** for schema changes
- Write **rollback migrations**
- Index frequently queried fields
- Use **transactions** for data consistency

### Security

- **Never commit secrets** to the repository
- Use **environment variables** for configuration
- Implement **rate limiting** on all endpoints
- Validate and **sanitize all inputs**
- Follow **OWASP** security guidelines
- Implement **proper authentication and authorization**

## Questions?

If you have questions, please:

1. Check the [documentation](./README.md)
2. Search [existing issues](https://github.com/yourusername/mediconnect-pro/issues)
3. Open a new issue with the `question` label

Thank you for contributing to MediConnect Pro!
