import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { version } from "../../package.json";
import { Text2ImgRequestSchema, Text2ImgResponseSchema } from "../types";
import { executeText2Img } from "../services/text2img.service";

/**
 * V1 API Routes Plugin
 *
 * This plugin registers all /api/v1/* routes.
 * It can be easily extended with new routes without modifying server.ts.
 *
 * Usage:
 * ```typescript
 * await server.register(v1Routes, {
 *   getWasEverWarm: () => wasEverWarm
 * });
 * ```
 */
export default async function v1Routes(
  fastify: FastifyInstance,
  opts: { getWasEverWarm: () => boolean }
) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /**
   * GET /api/v1/health
   *
   * Health probe endpoint.
   * Returns 200 if the server has been warmed up, 500 otherwise.
   */
  app.get(
    "/api/v1/health",
    {
      schema: {
        summary: "Health Probe (v1)",
        description: "Check if the server is healthy",
        tags: ["v1"],
        response: {
          200: z.object({
            version: z.literal(version),
            status: z.literal("healthy!!"),
          }),
          500: z.object({
            version: z.literal(version),
            status: z.literal("not healthy"),
          }),
        },
      },
    },
    async (request, reply) => {
      // 200 if ready, 500 if not
      if (opts.getWasEverWarm()) {
        return reply.code(200).send({ version, status: "healthy!!" });
      }
      return reply.code(500).send({ version, status: "not healthy" });
    }
  );

  /**
   * POST /api/v1/prompt/text2img
   *
   * Text-to-Image generation using a named workflow file.
   * Loads a static JSON workflow, executes it, and returns image file paths.
   */
  app.post(
    "/api/v1/prompt/text2img",
    {
      schema: {
        summary: "Text-to-Image with Named Workflow",
        description: "Execute a named workflow and return image file paths",
        tags: ["v1"],
        body: Text2ImgRequestSchema,
        response: {
          200: Text2ImgResponseSchema,
          404: z.object({
            error: z.string(),
            message: z.string(),
          }),
          500: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { workflow_name } = request.body;

      try {
        const result = await executeText2Img(workflow_name, request.log);
        return reply.code(200).send(result);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        if (errorMessage.includes("not found")) {
          return reply.code(404).send({
            error: "Workflow not found",
            message: errorMessage,
          });
        }

        request.log.error(
          error,
          `Error executing workflow: ${workflow_name}`
        );
        return reply.code(500).send({
          error: "Execution failed",
          message: errorMessage,
        });
      }
    }
  );

  // ============================================
  // Future v1 routes can be added below:
  // ============================================

  // Example pattern for adding more routes:
  // app.get("/api/v1/ready", {
  //   schema: {
  //     summary: "Readiness Probe (v1)",
  //     description: "Check if the server is ready to process requests",
  //     tags: ["v1", "monitoring"],
  //     response: { ... }
  //   }
  // }, async (request, reply) => { ... });

  // app.post("/api/v1/models", {
  //   schema: { ... }
  // }, async (request, reply) => { ... });
}
