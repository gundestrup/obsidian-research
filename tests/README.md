# Test Suite for Research Article Fetcher

This directory contains the Vitest-based test suite for the Research Article Fetcher Obsidian plugin.

## Structure

```
tests/
├── api.test.ts                # Tests for API functions with mocked requestUrl
├── extraction.test.ts         # Tests for ID extraction functions
├── duplicate-detection.test.ts # Tests for duplicate citation detection
├── replacement.test.ts         # Tests for URL replacement helpers
└── citation-formatting.test.ts # Tests for citation formatting
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Framework

This test suite uses:

- **Vitest** - Fast Vite-native test framework
- **`vi.fn()`** - Built-in mocking provided by Vitest
- **`@vitest/coverage-v8`** - Coverage provider

## Test Categories

### Unit Tests (Vitest)

Fast, isolated tests that don't make external API calls:

- `api.test.ts` - API functions with mocked `requestUrl`
- `extraction.test.ts` - ID extraction from URLs and text
- `duplicate-detection.test.ts` - Citation duplicate detection logic
- `replacement.test.ts` - URL replacement helpers
- `citation-formatting.test.ts` - Citation string formatting

There are no integration tests; all API calls are mocked in unit tests.

## Writing New Tests

### Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { extractPubMedId } from '../src/utils';

describe('My Feature', () => {
  it('should do something', () => {
    const result = extractPubMedId('https://pubmed.ncbi.nlm.nih.gov/12345/');
    expect(result).toBe('12345');
  });
});
```

### Best Practices

1. **Use descriptive test names** - Test names should clearly describe what is being tested
2. **Test edge cases** - Include tests for empty strings, null values, invalid inputs
3. **Keep tests isolated** - Each test should be independent
4. **Import from `src/`** - Re-use real utility and API functions; avoid duplicating logic in tests
5. **Mock external dependencies** - Don't make real API calls in unit tests

## Coverage

Run `npm run test:coverage` to generate a coverage report. The report will be available in the `coverage/` directory.

Current coverage targets:

- Statements: 80%+
- Branches: 80%+
- Functions: 80%+
- Lines: 80%+

## CI/CD Integration

These tests are designed to run in CI/CD pipelines. They are fast, reliable, and don't depend on external APIs.

## Troubleshooting

### Tests fail with "Cannot find module"

Run `npm install` to ensure all dependencies are installed.

### TypeScript errors in tests

Make sure `vitest` is installed and your IDE is using the workspace TypeScript version.

### Watch mode crashes on syntax errors

This is expected behavior with Vitest watch mode. Fix the syntax error and the tests will auto-restart.
