import { readFile } from "fs/promises";
import { join } from "path";
import { ComfyPrompt } from "../types";
import config from "../config";



/**
 * Loads a static JSON workflow file by name
 * Handles both visual workflow format (from ComfyUI UI) and API prompt format
 * @param workflowName - Name of the workflow file (without .json extension)
 * @returns Parsed ComfyUI prompt object (API format)
 * @throws Error if file not found or invalid JSON
 */
export async function loadWorkflowJson(workflowName: string): Promise<ComfyPrompt> {
  const workflowPath = join(config.workflowDir, `${workflowName}.json`);

  try {
    const fileContent = await readFile(workflowPath, "utf-8");
    const workflow = JSON.parse(fileContent) as ComfyPrompt;

    // Basic validation - ensure it's an object
    if (typeof workflow !== "object" || workflow === null) {
      throw new Error(`Invalid workflow format in ${workflowName}.json`);
    }

    // Already in API format
    return workflow;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Workflow file not found: ${workflowName}.json`);
    }
    throw error;
  }
}

/**
 * Updates SaveImage nodes in a workflow to use a custom output directory
 * @param prompt - ComfyUI prompt object
 * @param workflowName - Name for organizing outputs
 * @param executionId - Unique ID for this execution
 * @returns Modified prompt
 */
export function updateWorkflowVariables(
  prompt: ComfyPrompt,
  workflowName: string,
  executionId: string
): ComfyPrompt {
  const modifiedPrompt = { ...prompt };

  for (const [nodeId, node] of Object.entries(modifiedPrompt)) {
    if (node.class_type == "KSampler"){
      modifiedPrompt[nodeId] = {
        ...node,
        inputs: {
          ...node.inputs,
          seed: Math.floor(Math.random() * 2**53),
        },
      };
    } else if (node.class_type === "SaveImage") {
      // Update filename_prefix to include workflow name and execution ID
      modifiedPrompt[nodeId] = {
        ...node,
        inputs: {
          ...node.inputs,
          filename_prefix: `${workflowName}/${executionId}`,
        },
      };
    }
  }

  return modifiedPrompt;
}
