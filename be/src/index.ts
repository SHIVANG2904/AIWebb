require("dotenv").config();
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { BASE_PROMPT, getSystemPrompt } from "./prompts";
import { TextBlock } from "@anthropic-ai/sdk/resources";
import { basePrompt as nodeBasePrompt } from "./defaults/node";
import { basePrompt as reactBasePrompt } from "./defaults/react";
import cors from "cors";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
  // Replace with your default key or ensure dotenv is working correctly
});

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});



// Endpoint: /template
app.post("/template", async (req, res) => {
  const prompt = req.body.prompt;

  try {
    const response = await anthropic.messages.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      system:
        "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra.",
    });

    const answer = (response.content[0] as TextBlock).text; // Expected response: 'react' or 'node'

    if (answer === "react") {
      res.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [reactBasePrompt],
      });
      return;
    }

    if (answer === "node") {
      res.json({
        prompts: [
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [nodeBasePrompt],
      });
      return;
    }

    res.status(403).json({ message: "You can't access this" });
  } catch (error) {
    // Handle errors gracefully
    if (error instanceof Error) {
      res
        .status(500)
        .json({ message: "An error occurred.", error: error.message });
    } else {
      res.status(500).json({ message: "An unknown error occurred." });
    }
  }
});

// Endpoint: /chat
app.post("/chat", async (req, res) => {
  const messages = req.body.messages;

  try {
    const response = await anthropic.messages.create({
      messages,
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      system: getSystemPrompt(),
    });
    console.log(response.content);
    res.json({
      response: (response.content[0] as TextBlock)?.text,
    });
  } catch (error) {
    // Handle errors gracefully
    if (error instanceof Error) {
      res
        .status(500)
        .json({ message: "An error occurred.", error: error.message });
    } else {
      res.status(500).json({ message: "An unknown error occurred." });
    }
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
