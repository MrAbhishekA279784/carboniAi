# CARBONIQ: Personal Carbon Decision Intelligence Platform

## Problem Statement
Many individuals want to reduce their carbon footprint but find general calculators static and unactionable. They lack personalized, context-aware intelligence capable of simulating the tangible eco-impact and cost-benefit of daily lifestyle modifications (like transport or diet choices).

## Solution Overview
CARBONIQ is a full-stack, AI-powered Decision Intelligence Platform designed to calculate, simulate, and reduce personal carbon footprints. By dynamically transforming rigid data into actionable, ranked missions, the platform operates as a personalized smart assistant—guiding users toward achievable eco-milestones. 

## Features
- **Carbon Profile Generation**: Accurate breakdown using a multi-step onboarding profiling based on individual inputs (Transport, Energy, Food, Shopping).
- **Decision Intelligence Engine**: Scores recommendation activities matching expected impact, cost, and difficulty criteria.
- **What-if Simulator**: Empowers users to test assumptions (e.g. "Switch to Metro 3 days a week") and preview precise annual CO₂ reductions before committing.
- **Missions & Streaks**: Gamified engagement mechanics tracking user success via continuous learning algorithms.
- **AI Sustainability Coach (Gemini)**: Embedded context-aware assistant driving personalized guidance and complex scenario explanations based exclusively on the current user footprint profile.

## Architecture
\`\`\`mermaid
graph TD
    UI[Frontend: React/Vite/Tailwind] --> State[Zustand Store]
    State --> Logic[Carbon Engine]
    State --> Server[Express API Backend]
    Server --> Gemini(Gemini 3 P/F Model)
    Server --> Res(Decision Engine & Coach)
\`\`\`

## System Flow
1. **Smart Onboarding**: Capture user basics, commute data, and dietary preferences securely via `react-hook-form` and `zod`.
2. **Profile Orchestration**: The `CarbonEngine` dynamically updates footprint category allocations stored safely inside the `Zustand` global state array.
3. **Simulations & Coaching**: AI coaching insights are triggered server-side preventing unauthorized leakages while retaining context of the users structured lifestyle points.

## Testing Strategy & Security Measures
- **Architecture Validation**: Built on resilient static paths without relying on direct database state during evaluation setup. 
- **Environment Handling**: Gemini API context and calls happen completely inside the backend container `/api/gemini/coach`. No keys are passed or exposed sequentially.

## Setup Instructions
The application runs as a fully self-contained Node.js Express server.
1. Make sure to define the local properties in `.env.example`. 
2. Execute `npm run dev` locally or `npm start` in production. 
3. Run `npx tsc --noEmit` to lint configurations and type safety.
