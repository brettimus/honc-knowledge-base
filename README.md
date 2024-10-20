# Honc Knowledge Base

This is a basic ingestion of the Drizzle and Cloudflare documentation into a simple local (on disk) vector store.

It's a testing ground.

You can use it with local ollama or with openai.

To improve:

- Use a better embedding model
- Parse and chunk mdx files properly (could not find an ollama helper for this, but crew AI does have one)
- Add metadata to the documents depending on the source
- Develop test cases for simple human eval
- Experiment with apis for chaining and agential flows

## Prerequisites

- Clone the cloudflare-docs repo into the same levels the root folder of this repo on your machine
- Ditto for drizzle-orm-docs
- `pnpm install`

for local ollama:

- `ollama run llama3.1`
