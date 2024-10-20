import crypto from "node:crypto";
import fs from "node:fs/promises";
import path, { basename } from "node:path";
import { BASE_OUTPUT_DIR } from "./constants";
let currentTraceId: string | null = null;

function generateTraceId(): string {
	return crypto.randomBytes(16).toString("hex");
}

export function initializeTraceId(): string {
	currentTraceId = generateTraceId();
	return currentTraceId;
}

function getOutputDir(): string {
	if (!currentTraceId) {
		throw new Error(
			"Trace ID not initialized. Call initializeTraceId() first.",
		);
	}
	return path.join(BASE_OUTPUT_DIR, currentTraceId);
}

function getFileName(stepName: string): string {
	return basename(stepName) === stepName ? `${stepName}.json` : stepName;
}

export async function saveOutput(
	stepName: string,
	data: unknown,
): Promise<void> {
	const fileName = getFileName(stepName);
	const outputDir = getOutputDir();
	await fs.mkdir(outputDir, { recursive: true });
	const filePath = path.join(outputDir, fileName);

	let contents: string;
	if (fileName.endsWith(".ts")) {
		// For TypeScript files, assume data is already a string and write it directly
		contents = typeof data === "string" ? data : JSON.stringify(data, null, 2);
	} else if (fileName.endsWith(".json")) {
		contents = JSON.stringify(data, null, 2);
	} else {
		contents = data?.toString() ?? JSON.stringify(data, null, 2);
	}

	await fs.writeFile(filePath, contents);
	console.log(`Output saved to ${filePath}`);
}

export async function loadOutput(stepName: string): Promise<unknown> {
	const outputDir = getOutputDir();
	const fileName = getFileName(stepName);
	const filePath = path.join(outputDir, fileName);
	try {
		const data = await fs.readFile(filePath, "utf-8");
		return JSON.parse(data);
	} catch (error) {
		console.error(`Error loading output for step ${stepName}:`, error);
		return null;
	}
}

export async function listOutputs(): Promise<string[]> {
	const outputDir = getOutputDir();
	try {
		const files = await fs.readdir(outputDir);
		return files
			.filter((file) => file.endsWith(".json") || file.endsWith(".ts"))
			.map((file) => file.replace(".json", "").replace(".ts", ""));
	} catch (error) {
		console.error("Error listing outputs:", error);
		return [];
	}
}

export function getCurrentTraceId(): string | null {
	return currentTraceId;
}
