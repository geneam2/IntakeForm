import dotenv from "dotenv";
dotenv.config();
import { Anthropic } from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const systemPrompt = process.env.ANTHROPIC_SYSTEM_PROMPT;
const systemImagePrompt = process.env.ANTHROPIC_IMG_PROMPT;

export async function getResponse(userPrompt) {
  try {
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 500,
      temperature: 0.1,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    return message.content[0].text;
  } catch (error) {
    console.error("Error calling Anthropic API:", error);
    throw new Error("Failed to get response from AI");
  }
}

export async function extractCardData(file) {
  try {
    const base64Image = file.buffer.toString("base64");

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1000,
      system: systemImagePrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 'Read this insurance card image and return the provider name and policy number in the format: "insuranceName, policyNumber"',
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: file.mimetype,
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    const response = message.content[0].text;
    const [provider, policyNumber] = response.split(", ");

    return {
      provider,
      policyNumber,
    };
  } catch (error) {
    console.error("Error extracting card data:", error);
    throw new Error("Failed to extract card data");
  }
}
