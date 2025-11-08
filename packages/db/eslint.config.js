import { config as baseConfig } from "@repo/eslint-config/base";
import globals from "globals";

/** @type {import("eslint").Linter.Config} */
export default [
	...baseConfig,
	// Reglas generales para este paquete (incluye TS)
	{
		languageOptions: {
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				project: false,
			},
			globals: {
				...globals.node,
				console: "readonly",
				process: "readonly",
				fetch: "readonly",
				__dirname: "readonly",
				require: "readonly",
			},
		},
		rules: {
			"turbo/no-undeclared-env-vars": "off",
		},
	},
	// Overrides para scripts JS/CJS en este paquete
	{
		files: ["**/*.js", "**/*.cjs"],
		languageOptions: {
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "script",
			},
			globals: {
				...globals.node,
				console: "readonly",
				process: "readonly",
				__dirname: "readonly",
				require: "readonly",
			},
		},
		rules: {
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/no-require-imports": "off",
			"no-useless-escape": "off",
			"no-undef": "off",
		},
	},
	// Ajuste específico para archivos que definen __filename/__dirname
	{
		files: [
			"apply-permissions.js",
		],
		rules: {
			"no-redeclare": "off",
		},
	},
];


