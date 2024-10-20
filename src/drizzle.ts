import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { VectorStoreIndex } from "llamaindex";
import { STORAGE_DIR } from "./constants";
import {
	createVectorIndex,
	filterMdxFiles,
	loadDocuments,
	queryStore,
} from "./shared";

// Create __dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function createDrizzleVectorIndex() {
	// Path to drizzle docs directory
	const drizzleDocsDirectory = join(
		__dirname,
		"..",
		"drizzle-orm-docs",
		"src",
		"content",
		"documentation",
		"docs",
	);

	const documents = await loadDocuments(drizzleDocsDirectory, filterMdxFiles);
	const vectorIndex = await createVectorIndex(documents, STORAGE_DIR);

	return vectorIndex;
}

export async function testDrizzle(vectorIndex?: VectorStoreIndex) {
	const drizzleVectorIndex = vectorIndex || (await createDrizzleVectorIndex());
	const testQuery = "How do I add a numeric column to a sqlite table?";
	await queryStore(drizzleVectorIndex, testQuery);
}
