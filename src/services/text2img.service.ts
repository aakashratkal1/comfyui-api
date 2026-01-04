import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { FastifyBaseLogger } from "fastify";
import { preprocessNodes } from "../comfy-node-preprocessors";
import { runPromptAndGetOutputs } from "../comfy";
import { Text2ImgResponse } from "../types";
import {
  loadWorkflowJson,
  updateWorkflowVariables,
} from "../utils/workflow-loader";

/**
 * Execute a text-to-image workflow by name
 * @param workflowName - Name of the workflow file (without .json extension)
 * @param log - Fastify logger instance
 * @returns Response with generated image file paths
 */
export async function executeText2Img(
  workflowName: string,
  log: FastifyBaseLogger
): Promise<Text2ImgResponse> {
  const startTime = Date.now();
  const executionId = randomUUID();

  // 1. Load workflow JSON file
  const workflow = await loadWorkflowJson(workflowName);

  // 2. Update SaveImage nodes to use organized output directory
  const modifiedWorkflow = updateWorkflowVariables(
    workflow,
    workflowName,
    executionId
  );

  // 3. Preprocess nodes (validate, download models/images if needed)
  const preprocessStartTime = Date.now();
  await preprocessNodes(modifiedWorkflow, executionId, log);
  const preprocessTime = Date.now() - preprocessStartTime;

  // 4. Execute workflow via ComfyUI
  const comfyStartTime = Date.now();
  const { outputs, stats: comfyStats } = await runPromptAndGetOutputs(
    executionId,
    modifiedWorkflow,
    log
  );
  const comfyRoundTripTime = Date.now() - comfyStartTime;

  // 5. Build file paths from outputs and save to disk
  // Outputs is a Record<filename, Buffer>
  const outputDir = path.join(process.cwd(), "outputs", workflowName);
  await mkdir(outputDir, { recursive: true });

  const imagePaths: string[] = [];
  for (const [filename, buffer] of Object.entries(outputs)) {
    const outputPath = path.join(outputDir, filename);
    await writeFile(outputPath, buffer);
    imagePaths.push(`outputs/${workflowName}/${filename}`);
  }

  const totalTime = Date.now() - startTime;

  // 6. Return response with file paths
  return {
    id: executionId,
    workflow_name: workflowName,
    images: imagePaths,
    status: "ok" as const,
    stats: {
      ...comfyStats,
      preprocess_time: preprocessTime,
      comfy_round_trip_time: comfyRoundTripTime,
      total_time: totalTime,
    },
  };
}
