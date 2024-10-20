import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { highlight } from "cli-highlight";
import { BASE_OUTPUT_DIR } from "./constants";

export async function visualizeTrace(traceId: string): Promise<void> {
	const traceDir = path.join(BASE_OUTPUT_DIR, traceId);
	const files = await fs.readdir(traceDir);

	for (const file of files) {
		if (file.endsWith(".json")) {
			const filePath = path.join(traceDir, file);
			const content = await fs.readFile(filePath, "utf-8");
			const parsedContent = JSON.parse(content);

			console.log(chalk.bold.blue(`\n--- ${file} ---`));
			console.log(formatJsonOutput(parsedContent));
		}
		if (file.endsWith(".ts")) {
			const filePath = path.join(traceDir, file);
			const content = await fs.readFile(filePath, "utf-8");
			console.log(chalk.bold.blue(`\n--- ${file} ---`));
			console.log(
				highlight(content, { language: "typescript", theme: "vscode-dark" }),
			);
		}
	}
}

function formatJsonOutput(obj: unknown, indent = ""): string {
	if (typeof obj !== "object" || obj === null) {
		return formatPrimitiveValue(obj);
	}

	const isArray = Array.isArray(obj);
	const brackets = isArray ? ["[", "]"] : ["{", "}"];
	const lines: string[] = [brackets[0]];

	for (const [key, value] of Object.entries(obj)) {
		const formattedKey = isArray ? "" : `${chalk.green(JSON.stringify(key))}: `;
		const formattedValue = formatJsonOutput(value, `${indent}  `);
		lines.push(`${indent}  ${formattedKey}${formattedValue},`);
	}

	lines.push(`${indent}${brackets[1]}`);
	return lines.join("\n");
}

function formatPrimitiveValue(value: unknown): string {
	if (typeof value === "string" && value.includes("\n")) {
		return chalk.yellow(`\`${value.replace(/\\n/g, "\n")}\``);
	}
	return chalk.cyan(JSON.stringify(value));
}
