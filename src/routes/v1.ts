import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { version } from "../../package.json";

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

  // app.post("/api/v1/prompt", {
  //   schema: { ... }
  // }, async (request, reply) => { ... });
}
