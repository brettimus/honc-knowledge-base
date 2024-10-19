// import { config } from "dotenv";
// config();
// console.log(process.env.OPENAI_API_KEY);

import { testCloudflare } from "./cloudflare";
import { testDrizzle } from "./drizzle";
//
testDrizzle();
testCloudflare();
