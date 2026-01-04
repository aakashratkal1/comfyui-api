import "dotenv/config";
import { start } from "./server";

// Export types for library usage
export { Text2ImgRequest, Text2ImgResponse } from "./types";

start();
