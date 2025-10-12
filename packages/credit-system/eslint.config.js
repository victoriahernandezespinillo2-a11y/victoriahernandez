module.exports = {
  extends: ['@repo/eslint-config/base'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
  },
  rules: {
    // Reglas específicas para el sistema de créditos
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};


