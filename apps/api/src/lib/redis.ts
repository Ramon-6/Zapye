import { Redis } from "ioredis";
import { env } from "../config/env.js";

// maxRetriesPerRequest:null é exigido pelo BullMQ
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
