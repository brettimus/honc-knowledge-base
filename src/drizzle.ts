import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { VectorStoreIndex, HuggingFaceEmbedding, Settings, SimpleDirectoryReader, type NodeWithScore, MetadataMode, Ollama, storageContextFromDefaults } from "llamaindex";
// import { SimpleDirectoryReader } from "llamaindex/readers/SimpleDirectoryReader";

// Create __dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ollama = new Ollama({ model: "llama3.1", options: { temperature: 0.75 } });

// Use Ollama LLM and Embed Model
Settings.llm = ollama;
// Xenova/all-MiniLM-L6-v2
Settings.embedModel = new HuggingFaceEmbedding();

// Path to drizzle docs directory
const drizzleDocsDirectory = join(__dirname, "..", "..", "drizzle-orm-docs", "src", "content", "documentation", "docs");

// Directory reader
const reader = new SimpleDirectoryReader();
const documents = await reader.loadData(drizzleDocsDirectory);

// Filter mdx files
const mdxFiles = documents.filter((doc) => doc.metadata.file_name?.endsWith(".mdx"));

// Build vector index
const storageContext = await storageContextFromDefaults({
  persistDir: "./storage",
});
const vectorIndex = await VectorStoreIndex.fromDocuments(mdxFiles, { storageContext });

// Test
const testQuery = "How do I add a numeric column to a sqlite table?";
search(testQuery);

async function search(query: string) {
  const retriever = vectorIndex.asRetriever({
    similarityTopK: 3,
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

async function executeQuery(query: string) {
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

const exploreDocuments = () => {
  // // biome-ignore lint/complexity/noForEach: <explanation>
  // documents.forEach((doc) => {
  //   console.log(`document (${doc.id_}): ${doc.type}\n${doc.metadata.file_path}\n${doc.metadata.file_name}`);
  // });
}
