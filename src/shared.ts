import {
	type Document,
	HuggingFaceEmbedding,
	MetadataMode,
	type NodeWithScore,
	Ollama,
	Settings,
	SimpleDirectoryReader,
	VectorStoreIndex,
	storageContextFromDefaults,
} from "llamaindex";

const ollama = new Ollama({
	model: "llama3.1",
	options: { temperature: 0.75 },
});

// Use Ollama LLM and Embed Model
Settings.llm = ollama;
// Xenova/all-MiniLM-L6-v2
Settings.embedModel = new HuggingFaceEmbedding();

// Agent debugging
//
// Callback for tool calls and results
Settings.callbackManager.on("llm-tool-call", (event) => {
	console.log(event.detail);
});
Settings.callbackManager.on("llm-tool-result", (event) => {
	console.log(event.detail);
});

export const filterMdxFiles = (documents: Document[]) =>
	documents.filter((doc) => doc.metadata.file_name?.endsWith(".mdx"));

export async function loadDocuments(
	directory: string,
	filter: (d: Document[]) => Document[],
) {
	const reader = new SimpleDirectoryReader();
	const documents = await reader.loadData(directory);
	const filteredDocs = filter(documents);
	return filteredDocs;
}

export async function createVectorIndex(
	documents: Document[],
	storageDir: string,
) {
	const storageContext = await storageContextFromDefaults({
		persistDir: storageDir,
	});
	const vectorIndex = await VectorStoreIndex.fromDocuments(documents, {
		storageContext,
	});
	return vectorIndex;
}

export async function searchStore(
	vectorIndex: VectorStoreIndex,
	query: string,
	similarityTopK = 3,
) {
	const retriever = vectorIndex.asRetriever({
		similarityTopK,
	});

	// Fetch nodes!
	const nodesWithScore = await retriever.retrieve({ query });
	if (nodesWithScore) {
		nodesWithScore.forEach((source: NodeWithScore, index: number) => {
			console.log(
				`\n${index}: Score: ${source.score} - ${source.node.getContent(MetadataMode.NONE).substring(0, 50)}...\n`,
			);
		});
	}
}

export async function queryStore(vectorIndex: VectorStoreIndex, query: string) {
	const queryEngine = vectorIndex.asQueryEngine();
	const { response, sourceNodes } = await queryEngine.query({
		query,
	});

	// Output response with sources
	console.log(response);

	if (sourceNodes) {
		sourceNodes.forEach((source: NodeWithScore, index: number) => {
			console.log(
				`\n${index}: Score: ${source.score} - \n${source.node.getContent(MetadataMode.NONE).substring(0, 100)}...\n\n`,
			);
		});
	}
}

export const exploreDocuments = (documents: Document[]) => {
	// biome-ignore lint/complexity/noForEach: <explanation>
	documents.forEach((doc) => {
		console.log(
			`document (${doc.id_}): ${doc.type}\n${doc.metadata.file_path}\n${doc.metadata.file_name}`,
		);
	});
};
