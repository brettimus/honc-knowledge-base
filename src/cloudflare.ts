import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Document, VectorStoreIndex } from "llamaindex";
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

// Array of directories to load documents from
const docsDirectories = [
	{
		path: join(
			__dirname,
			"../../cloudflare-docs/src/content/workers-ai-models",
		),
		filter: (documents: Document[]) =>
			documents.filter((doc) => doc.metadata.file_name?.endsWith(".json")),
	},
	{
		path: `${__dirname}/../../cloudflare-docs/src/content/docs/durable-objects`,
		filter: filterMdxFiles,
	},
	{
		path: `${__dirname}/../../cloudflare-docs/src/content/docs/d1`,
		filter: filterMdxFiles,
	},
	{
		path: `${__dirname}/../../cloudflare-docs/src/content/docs/kv`,
		filter: filterMdxFiles,
	},
	{
		path: `${__dirname}/../../cloudflare-docs/src/content/docs/r2`,
		filter: filterMdxFiles,
	},
	{
		path: `${__dirname}/../../cloudflare-docs/src/content/docs/workers-ai`,
		filter: filterMdxFiles,
	},
	{
		path: `${__dirname}/../../cloudflare-docs/src/content/docs/ai-gateway`,
		filter: filterMdxFiles,
	},
];

export async function createCloudflareVectorIndex() {
	const documents: Document[] = [];
	for (const dir of docsDirectories) {
		const dirPath = dir.path;
		console.log(`Loading documents from ${dirPath}`);
		if (fs.existsSync(dirPath)) {
			const docs = await loadDocuments(dirPath, dir.filter);
			console.log(`Loaded ${docs.length} documents from ${dirPath}`);
			documents.push(...docs);
		} else {
			console.log(`Directory ${dirPath} does not exist`);
		}
	}

	const vectorIndex = await createVectorIndex(documents, STORAGE_DIR);
	return vectorIndex;
}

export async function testCloudflare(vectorIndex?: VectorStoreIndex) {
	const cloudflareVectorIndex =
		vectorIndex || (await createCloudflareVectorIndex());
	const testQuery = "How can I initialize a Durable Object in my Worker?";
	await queryStore(cloudflareVectorIndex, testQuery);
}
