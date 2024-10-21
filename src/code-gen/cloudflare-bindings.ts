import { STORAGE_DIR } from "@/rag/constants";
import { loadVectorIndex } from "@/rag/shared";
import { generateObject } from "ai";
import { type MetadataFilter, MetadataMode } from "llamaindex";
import { z } from "zod";
import { activeModel } from "./models";

export async function addCloudflareBindings({
	reasoning,
	bindings,
	apiRoutes,
}: {
	reasoning: string;
	bindings: string[];
	apiRoutes: string;
}) {
	const documentation = await getDocumentation(reasoning, bindings);
	// TODO
	const PROMPT = `
You are a Cloudflare developer expert who works with Hono.js on Cloudflare workers.

You are helping use Cloudflare bindings to implement certain requirements of an api.

For instance, for R2, you should add functionality to upload and download files.

You need to implement functionality related to the following Cloudflare bindings: ${bindings.join(", ")}.

Here are some examples of how to use the Cloudflare bindings:
<hono-examples>
${getHonoExamples(bindings)}
</hono-examples>

Here is some documentation on the Cloudflare bindings:
<documentation>
${documentation.content}
</documentation>

Here is the reasoning for why these bindings are needed:
${reasoning}

Here is the existing API routes file:
${apiRoutes}

Modify the API routes file to include the necessary Cloudflare bindings.
`.trim();

	const result = await generateObject({
		model: activeModel,
		schema: z.object({
			reasoning: z.string(),
			indexTs: z
				.string()
				.describe("The generated api routes file, in typescript"),
		}),
		prompt: PROMPT,
	});

	return {
		reasoning: result.object.reasoning,
		indexTs: result.object.indexTs,
		documentation,
		prompt: PROMPT,
	};
}

/**
 * 
 * @param query 
export declare enum FilterOperator {
    EQ = "==",// default operator (string, number)
    IN = "in",// In array (string or number)
    GT = ">",// greater than (number)
    LT = "<",// less than (number)
    NE = "!=",// not equal to (string, number)
    GTE = ">=",// greater than or equal to (number)
    LTE = "<=",// less than or equal to (number)
    NIN = "nin",// Not in array (string or number)
    ANY = "any",// Contains any (array of strings)
    ALL = "all",// Contains all (array of strings)
    TEXT_MATCH = "text_match",// full text match (allows you to search for a specific substring, token or phrase within the text field)
    CONTAINS = "contains",// metadata array contains value (string or number)
    IS_EMPTY = "is_empty"
}
 */
export async function getDocumentation(query: string, bindings: string[]) {
	const results: Array<{
		binding: string;
		docs: Array<{
			score: number;
			content: string;
		}>;
	}> = [];
	// TODO - Parallelize this
	for (const binding of bindings) {
		const bindingName = mapBinding(binding);
		const bindingFilter: MetadataFilter[] = bindingName
			? [{ key: "tag", value: bindingName, operator: "==" }]
			: [];
		// Load the vector index from storage here
		// If you haven't created an index yet, you gotta do that first!
		const vectorIndex = await loadVectorIndex(STORAGE_DIR);
		const retriever = vectorIndex.asRetriever({
			similarityTopK: 3,
			filters: {
				filters: [
					{ key: "vendor", value: "cloudflare", operator: "==" },
					...bindingFilter,
				],
			},
		});

		const nodesWithScore = await retriever.retrieve({ query });

		// NOTE - Only take the top result for now
		// TODO - Record all results for review
		if (nodesWithScore.length > 0) {
			results.push({
				binding,
				docs: nodesWithScore.map((node) => ({
					score: node.score ?? Number.NaN,
					content: node.node.getContent(MetadataMode.NONE),
				})),
			});
		}
	}

	return {
		results,
		content: results
			.map((result) => docsToString(result.binding, result.docs))
			.join("\n\n"),
	};
}

function docsToString(
	binding: string,
	docs: Array<{
		score: number;
		content: string;
	}>,
) {
	return docs
		.map((doc) =>
			`
  <${binding}>
    <section>
      ${doc.content}
    </section>
  </${binding}>
`.trim(),
		)
		.join("\n");
}

// TODO - Create constants for these values
function mapBinding(binding: string) {
	switch (binding?.toLowerCase()) {
		case "r2":
			return "r2";
		case "d1":
			return "d1";
		case "ai":
			return "ai";
		case "kv":
			return "kv";
		case "durable objects":
			return "durable-objects";
		default:
			return null;
	}
}

// NOTE - This will be our recipes for using the bindings in Hono
function getHonoExamples(bindings: string[]) {
	const examples = [];
	for (const binding of bindings) {
		const bindingName = mapBinding(binding);
		if (bindingName) {
			examples.push(getHonoExample(bindingName));
		}
	}
	return examples.join("\n");
}

function getHonoExample(binding: string) {
	switch (binding) {
		case "r2":
			return getHonoR2Example();
		default:
			return "";
	}
}

function getHonoR2Example() {
	return `
<r2>
  <example description="Upload a file to R2">
    import { Hono } from "hono";

    type Bindings = {
      DB: D1Database;
      MY_BUCKET: R2Bucket;
    };

    const app = new Hono<{
      Bindings: Bindings;
    }>();

    /**
     * List all objects in the R2 bucket
     */
    app.get("/list", async (c) => {
      const objects = await c.env.MY_BUCKET.list();
      return c.json(objects);
    });

    /**
     * Get a specific object from the R2 bucket
     */
    app.get("/get/:key", async (c) => {
      const object = await c.env.MY_BUCKET.get(c.req.param("key"));

      if (!object) {
        return c.json({ message: "Object not found" }, 404);
      }

      const responseHeaders = mapR2HttpMetadataToHeaders(object.httpMetadata);

      return c.body(object.body, {
        headers: responseHeaders,
      });
    });

    /**
     * Example of uploading a file to the R2 bucket via a \`multipart/form-data\` upload.
     *
     * Expects a form with a file field named "file"
     *
     * @param key - The key of the object to upload
     * @returns - The uploaded object
     */
    app.post("/put/:key", async (c) => {
      const key = c.req.param("key");

      const formData = await c.req.parseBody();

      const { file } = formData;

      // Validate the file is a File
      if (!(file instanceof File)) {
        return c.json(
          { message: "The 'file' field must be a File", actualType: typeof file },
          422,
        );
      }

      console.log("file type", file.type);

      const options: R2PutOptions = {
        httpMetadata: { contentType: file.type },
      };

      const object = await c.env.MY_BUCKET.put(key, file, options);

      return c.json(object, 201);
    });

    /**
     * Upload any old object to the R2 bucket, using the raw request body.
     *
     * This relies on the \`Content-Type\` header to be set correctly by the client.
     *
     * If you wanted to go a step further and detect the file type from the content itself,
     * in case the \`Content-Type\` header is not set or is incorrect,
     * you could use a library like \`file-type\`.
     * However, this would require reading the entire file into memory,
     * which might not be ideal for large files.
     * In a Cloudflare Workers environment, you'd need to ensure such a library is compatible
     * and doesn't exceed size limits.
     *
     * @param key - The key of the object to upload
     * @returns - The uploaded object
     */
    app.post("/put-raw/:key", async (c) => {
      const key = c.req.param("key");
      const body = c.req.raw.body;
      const contentType =
        c.req.header("Content-Type") || "application/octet-stream";
      const options: R2PutOptions = {
        httpMetadata: {
          contentType: contentType,
        },
      };
      const object = await c.env.MY_BUCKET.put(key, body, options);
      return c.json(object, 201);
    });

    /**
     * Delete an object from the R2 bucket
     * @param key - The key of the object to delete
     * @returns - 204 No Content
     */
    app.delete("/delete/:key", async (c) => {
      try {
        await c.env.MY_BUCKET.delete(c.req.param("key"));
        // HACK - Fiberplane Studio can't handle 204s right now
        return c.text("", 200);
      } catch (error) {
        return c.json({ message: "Failed to delete object", error }, 500);
      }
    });

    export default app;

    /**
     * Helper function that returns the correct headers for a given R2 object
     *
     * @param metadata - The R2 HTTP metadata
     * @returns - The headers
     */
    function mapR2HttpMetadataToHeaders(metadata?: R2HTTPMetadata): Headers {
      const headers = new Headers();

      if (!metadata) {
        return headers;
      }

      if (metadata.contentType) {
        headers.set("Content-Type", metadata.contentType);
      }
      if (metadata.contentLanguage) {
        headers.set("Content-Language", metadata.contentLanguage);
      }
      if (metadata.contentDisposition) {
        headers.set("Content-Disposition", metadata.contentDisposition);
      }
      if (metadata.contentEncoding) {
        headers.set("Content-Encoding", metadata.contentEncoding);
      }
      if (metadata.cacheControl) {
        headers.set("Cache-Control", metadata.cacheControl);
      }
      if (metadata.cacheExpiry) {
        headers.set("Cache-Expiry", metadata.cacheExpiry.toUTCString());
      }

      return headers;
    }
  </example>
</r2>
  `;
}
