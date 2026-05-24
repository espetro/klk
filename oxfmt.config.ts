import { defineConfig } from 'oxfmt';

export default defineConfig({
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  arrowParens: 'always',
  endOfLine: 'lf',
  jsxSingleQuote: true,
  bracketSpacing: true,
  bracketSameLine: false,
  sortImports: {
    order: 'asc',
    internalPattern: ['@/*', '@klk/*'],
    newlinesBetween: true,
  },
});
