// import { config } from "dotenv";
// config();
// console.log(process.env.OPENAI_API_KEY);

import { testCloudflare } from "./cloudflare";
import { STORAGE_DIR } from "./constants";
import { testDrizzle } from "./drizzle";
import { loadVectorIndex } from "./shared";

//
const vectorIndex = await loadVectorIndex(STORAGE_DIR);
testDrizzle(vectorIndex);
testCloudflare(vectorIndex);
