import '@testing-library/jest-dom/vitest';
// Registers the axe matchers *and* their types. Importing `vitest-axe/matchers`
// and calling expect.extend by hand registers the runtime behaviour but leaves
// `toHaveNoViolations` untyped, so typecheck fails on every axe assertion.
import 'vitest-axe/extend-expect';
import { cleanup } from '@testing-library/vue';
import { afterEach } from 'vitest';

// Testing Library only auto-registers cleanup when Vitest globals are on, and
// they are not. Without this every test inherits the previous test's DOM, and
// queries silently match the wrong element.
afterEach(cleanup);
