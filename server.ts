import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { calculateFootprint } from "./src/lib/carbon-engine";
import { generateRecommendations } from "./src/lib/recommendation-engine";
import { simulateScenario } from "./src/lib/simulator-engine";
import { generateWeeklyMissions } from "./src/lib/mission-engine";
// Removed firebase-admin for now until config is stable, will use it if tool succeeds or provide as skeleton
// import admin from "firebase-admin";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy_key",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // --- CARBON ENGINE API ---
  app.post("/api/carbon/calculate", (req, res) => {
    try {
      const { profile } = req.body;
      if (!profile) return res.status(400).json({ error: "Profile required" });
      const rawBreakdown = calculateFootprint(profile);
      const breakdown = {
        "Transport": Math.round(rawBreakdown["Transport"] || 0),
        "Home Energy": Math.round(rawBreakdown["Home Energy"] || 0),
        "Food": Math.round(rawBreakdown["Food"] || 0),
        "Shopping": Math.round(rawBreakdown["Shopping"] || 0),
        "Waste": Math.round(rawBreakdown["Waste"] || 0),
      };
      const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
      res.json({ total, breakdown, score: 100 - (total / 10) });
    } catch (error: any) {
      console.error("Calculate Error:", error);
      res.status(500).json({ error: "Calculation failed" });
    }
  });

  // --- RECOMMENDATION ENGINE API ---
  app.post("/api/recommendations", (req, res) => {
    try {
      const { profile, footprint } = req.body;
      if (!profile || !footprint) return res.status(400).json({ error: "Profile and footprint required" });
      const recommendations = generateRecommendations(profile, footprint);
      res.json(recommendations);
    } catch (error: any) {
      console.error("Recommendations Error:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  // --- SIMULATOR API ---
  app.post("/api/simulator", (req, res) => {
    try {
      const { profile, scenario } = req.body;
      if (!profile || !scenario) return res.status(400).json({ error: "Profile and scenario required" });
      const result = simulateScenario(profile, scenario);
      res.json(result);
    } catch (error: any) {
      console.error("Simulator Error:", error);
      res.status(500).json({ error: "Simulation failed" });
    }
  });

  // --- MISSIONS API ---
  app.post("/api/missions", (req, res) => {
    try {
      const { profile } = req.body;
      if (!profile) return res.status(400).json({ error: "Profile required" });
      const missions = generateWeeklyMissions(profile);
      res.json(missions);
    } catch (error: any) {
      console.error("Missions Error:", error);
      res.status(500).json({ error: "Failed to fetch missions" });
    }
  });

  // API Route for AI Coach
  app.post("/api/gemini/coach", async (req, res) => {
    try {
      const { prompt, userProfile, footprint, totalFootprint, budget } = req.body;
      
      const context = {
        profile: userProfile,
        footprint,
        total: totalFootprint,
        budget
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: `You are an AI Sustainability Coach for CARBONIQ. 
          Analyze the user's data and provide actionable, encouraging advice.
          Explain recommendations, simulations, and answer sustainability questions.
          Context: ${JSON.stringify(context)}
          Rules:
          1. Be concise and practical.
          2. Use bullet points for steps.
          3. Never perform manual CO2 calculations; explain existing ones.
          4. Focus on the largest emission categories if they exceed 30% of total.`,
        },
        contents: prompt
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Multi-turn Chat API
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { messages, userProfile, carbonData } = req.body;
      
      const chat = ai.chats.create({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: `You are EcoAgent AI, an expert sustainability coach.
          You help users understand and reduce their carbon footprint.
          User Profile: ${JSON.stringify(userProfile)}
          Current Footprint: ${JSON.stringify(carbonData)}
          
          Guidelines:
          - Be friendly, professional and encouraging.
          - Use "we" to emphasize collaboration.
          - Provide specific, data-driven advice when possible based on the user's footprint.
          - If asked about specific actions, refer to their current categories (Transport, Energy, etc).
          - Keep responses relatively brief (max 150 words) for mobile readability.`,
        },
        history: messages.slice(0, -1).map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }))
      });

      const response = await chat.sendMessage({
        message: messages[messages.length - 1].content
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Chat Error:", error);
      res.status(500).json({ error: "Failed to connect to EcoAgent AI" });
    }
  });

  // API Route for analyzing what-if scenarios
  app.post("/api/gemini/whatif", async (req, res) => {
    try {
      const { prompt, userProfile, currentFootprint } = req.body;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: "You are a simulation analyzer for CARBONIQ. Analyze the what-if scenario based on the user's current footprint and profile. Provide a short, structured analysis of the impact. User Profile: " + JSON.stringify(userProfile) + " Current Footprint: " + currentFootprint + " kg CO2e. Respond in concise bullet points.",
        },
        contents: prompt
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for search grounding
  app.post("/api/gemini/search", async (req, res) => {
    try {
      const { prompt } = req.body;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Search API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Server crashed during startup!", err);
});
