import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
async function listModels() {
  const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY, // Set your API key in environment vars
  });

  const response = await client.models.list();

  console.log("Available Gemini Models:\n", response);
  response.models.forEach((m) => {
    console.log(`- ${m.name}`);
  });
}

listModels().catch(console.error);
