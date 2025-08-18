import { config as baseConfig } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config} */
export default [
	...baseConfig,
	{
		languageOptions: {
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				project: false,
			},
		},
	},
];


