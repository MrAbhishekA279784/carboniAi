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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("CRITICAL: GEMINI_API_KEY environment variable is not set. Server startup aborted.");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

function sanitizeAIInput(input: string): string {
  if (!input) return "";
  const patterns = [
    /ignore prior/i,
    /ignore previous/i,
    /ignore all instructions/i,
    /system instruction/i,
    /forget everything/i,
    /you are now a/i,
    /override/i,
    /jailbreak/i,
    /dan mode/i
  ];
  
  let cleaned = input;
  for (const pattern of patterns) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, "[removed injection attempt]");
    }
  }
  return cleaned;
}

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

  // --- XP RATELIMITING & AWARD API ---
  const XP_LIMITS: Record<string, number> = {
    habit: 5, action: 15, mission: 100, level_bonus: 0
  };

  app.post("/api/xp/award", (req, res) => {
    try {
      const { action, xpGain, ecoPointsGain } = req.body;
      if (!action) return res.status(400).json({ error: "Action is required" });
      
      const maxXP = XP_LIMITS[action];
      if (maxXP === undefined) {
        return res.status(400).json({ error: `Unknown award action: ${action}` });
      }

      if (xpGain > maxXP) {
        return res.status(400).json({ 
          error: `Rejected: xpGain ${xpGain} exceeds backend limit ${maxXP} for ${action}` 
        });
      }

      return res.json({
        verified: true,
        xpGain,
        ecoPointsGain
      });
    } catch (error: any) {
      console.error("XP Award Error:", error);
      res.status(500).json({ error: "Failed to validate XP award" });
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
        model: "gemini-2.5-flash",
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
      const { messages, userProfile, carbonData, recentActivities, activeMissions } = req.body;

      console.log("[CHAT] Incoming request body keys:", Object.keys(req.body));
      console.log("[CHAT] messages length:", messages?.length);
      console.log("[CHAT] GEMINI_API_KEY loaded:", !!process.env.GEMINI_API_KEY);

      // Sanitize the last user message of the history
      if (messages && messages.length > 0) {
        messages[messages.length - 1].content = sanitizeAIInput(messages[messages.length - 1].content);
        console.log("[CHAT] Last message role:", messages[messages.length - 1].role, "content:", messages[messages.length - 1].content.substring(0, 100));
      }

      const history = messages.slice(0, -1).map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
      console.log("[CHAT] History length:", history.length);
      if (history.length > 0) {
        console.log("[CHAT] First history entry role:", history[0].role);
        console.log("[CHAT] Last history entry role:", history[history.length - 1].role);
      }

      const lastMessageContent = messages[messages.length - 1].content;
      console.log("[CHAT] Creating chat with model: gemini-2.5-flash");

      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: `You are EcoAgent AI, an expert sustainability coach.
          You help users understand and reduce their carbon footprint.
          User Profile: ${JSON.stringify(userProfile)}
          Current Footprint: ${JSON.stringify(carbonData)}
          Recent Carbon-Saving Activities: ${JSON.stringify(recentActivities || [])}
          Active Sustainable Missions: ${JSON.stringify(activeMissions || [])}
          
          Guidelines:
          - Be friendly, professional and encouraging.
          - Use "we" to emphasize collaboration.
          - Provide specific, data-driven advice when possible based on the user's footprint, their recent carbon-saving activities, and active missions.
          - Try to mention their recent activities (e.g. "Excellent job on completing standard activities") or advocate for completing active missions when pertinent.
          - If asked about specific actions, refer to their current categories (Transport, Energy, etc).
          - Keep responses relatively brief (max 150 words) for mobile readability.`,
        },
        history
      });

      console.log("[CHAT] Chat created, sending message...");
      const response = await chat.sendMessage({
        message: lastMessageContent
      });

      console.log("[CHAT] Response received. Has candidates:", !!response.candidates);
      console.log("[CHAT] response.text:", response.text ? response.text.substring(0, 200) : "UNDEFINED");

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("[CHAT] ERROR:", error.message);
      console.error("[CHAT] Error stack:", error.stack);
      console.error("[CHAT] Error name:", error.name);
      console.error("[CHAT] Error status:", error.status);
      if (error.error) {
        console.error("[CHAT] Error detail:", JSON.stringify(error.error));
      }
      res.status(500).json({ error: "Failed to connect to EcoAgent AI" });
    }
  });

  // API Route for analyzing what-if scenarios
  app.post("/api/gemini/whatif", async (req, res) => {
    try {
      const { prompt, userProfile, currentFootprint } = req.body;
      const sanitizedPrompt = sanitizeAIInput(prompt);
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: "You are a simulation analyzer for CARBONIQ. Analyze the what-if scenario based on the user's current footprint and profile. Provide a short, structured analysis of the impact. User Profile: " + JSON.stringify(userProfile) + " Current Footprint: " + currentFootprint + " kg CO2e. Respond in concise bullet points.",
        },
        contents: sanitizedPrompt
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
      const sanitizedPrompt = sanitizeAIInput(prompt);
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: sanitizedPrompt,
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
