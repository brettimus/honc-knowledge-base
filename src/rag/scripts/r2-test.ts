import { STORAGE_DIR } from "@/rag/constants";
import { loadVectorIndex } from "@/rag/shared";
import { MetadataMode } from "llamaindex";

getContext("R2 upload file example");

export async function getContext(query: string) {
	// Load the vector index from storage here
	// If you haven't created an index yet, you gotta do that first!
	const vectorIndex = await loadVectorIndex(STORAGE_DIR);
	const retriever = vectorIndex.asRetriever({
		similarityTopK: 3,
		filters: {
			filters: [
				{ key: "vendor", value: "cloudflare", operator: "==" },
				{ key: "tag", value: "r2", operator: "==" },
			],
		},
	});

	const nodesWithScore = await retriever.retrieve({ query });

	// TODO!!!!
	for (const nodeWithScore of nodesWithScore) {
		console.log("--------------------------------");
		console.log(nodeWithScore.score);
		console.log(nodeWithScore.node.getContent(MetadataMode.NONE));
		console.log("--------------------------------");
	}

	return nodesWithScore;
}
