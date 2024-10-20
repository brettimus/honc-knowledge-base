import { config } from "dotenv";
config();
// console.log(process.env.OPENAI_API_KEY);

import { testCloudflare } from "./cloudflare";
import { STORAGE_DIR } from "./constants";
import { testDrizzle } from "./drizzle";
import { loadVectorIndex } from "./shared";

// Load the vector index from storage here
// If you haven't created an index yet, you gotta do that mayne
const vectorIndex = await loadVectorIndex(STORAGE_DIR);

// testDrizzle(vectorIndex);
testCloudflare(vectorIndex);
