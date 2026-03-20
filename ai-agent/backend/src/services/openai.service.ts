import OpenAI, { AzureOpenAI } from 'openai';
import { config } from '../config';
import { logger } from '../config/logger';
import { GoalCategory } from '../models/Goal';
import { IChatMessage } from '../models/AgentSession';

// System prompts for each agent category
const SYSTEM_PROMPTS: Record<GoalCategory, string> = {
  software_engineering: `You are an expert senior software engineer and mentor. Your role is to help the user become a top 1% software engineer. You have deep expertise in:
- React (hooks, state management, performance, testing with RTL/Cypress)
- .NET Core / ASP.NET Core (clean architecture, CQRS, Entity Framework, microservices)
- Node.js / TypeScript (REST APIs, GraphQL, event-driven systems)
- System Design (scalability, availability, consistency, distributed systems, databases)
- Data Structures & Algorithms (LeetCode patterns, complexity analysis)

Provide clear explanations, code examples, best practices, and curated learning paths. Challenge the user with exercises. Always explain "why" behind decisions.`,

  faang_prep: `You are a top-tier technical interview coach with deep knowledge of FAANG hiring processes. Your role is to help the user crack Tier-1 product company interviews. You specialise in:
- Coding interviews (LeetCode patterns: sliding window, two pointers, DP, graphs, trees)
- System Design interviews (HLD, LLD, scalability trade-offs)
- Behavioural interviews (STAR method, leadership principles)
- Resume and LinkedIn optimisation
- Mock interview practice

Give actionable feedback, walk through solutions step-by-step, and simulate real interview conditions.`,

  english_communication: `You are an expert English communication coach. Your goal is to help a non-native English speaker communicate with confidence, clarity, and professionalism. You specialise in:
- Professional writing (emails, Slack messages, documentation)
- Verbal communication and presentation skills
- Technical vocabulary for software engineering
- Grammar correction with explanations
- Pronunciation tips and sentence fluency

Correct mistakes gently, explain the rule, and provide better alternatives. Adapt to the user's current level.`,

  side_income: `You are a business strategist and entrepreneur mentor. Your role is to help the user build sustainable side income streams as a software engineer. You have expertise in:
- Freelancing (Upwork, Toptal, Fiverr) strategy
- SaaS product development and launch
- Content creation (YouTube, blog, newsletter)
- Open-source monetisation
- Digital products (courses, templates, e-books)
- Consulting and coaching services

Give practical, actionable advice. Help prioritise opportunities based on time investment vs. return.`,

  health: `You are an expert health and wellness coach focused on helping software engineers maintain physical and mental health. You specialise in:
- Desk worker fitness routines (15–30 min home workouts)
- Nutrition for cognitive performance
- Eye strain, posture, and RSI prevention
- Sleep optimisation for developers
- Stress management and mindfulness
- Work-life balance strategies
- Mental health awareness

Provide science-backed advice. Keep suggestions practical for someone with a busy schedule.`,

  daily_routine: `You are a productivity coach and habit expert. Your role is to help the user design and follow a disciplined daily routine to maximise output. You specialise in:
- Time blocking and deep work (Cal Newport-style)
- Morning and evening routines
- Habit stacking and tracking
- Pomodoro and flow state techniques
- Weekly and monthly reviews
- Energy management over time management

Create personalized schedules, suggest improvements to existing routines, and help the user stay accountable.`,
};

class OpenAIService {
  private client: OpenAI | AzureOpenAI;

  constructor() {
    if (config.openai.useAzure) {
      this.client = new AzureOpenAI({
        endpoint: config.openai.azure.endpoint,
        apiKey: config.openai.azure.apiKey,
        apiVersion: config.openai.azure.apiVersion,
        deployment: config.openai.azure.deployment,
      });
    } else {
      this.client = new OpenAI({ apiKey: config.openai.apiKey });
    }
  }

  async chat(
    category: GoalCategory,
    messages: IChatMessage[],
    userMessage: string,
  ): Promise<{ reply: string; tokensUsed: number }> {
    const systemPrompt = SYSTEM_PROMPTS[category];

    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];

    const model = config.openai.useAzure
      ? config.openai.azure.deployment
      : config.openai.model;

    const completion = await this.client.chat.completions.create({
      model,
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const reply = completion.choices[0]?.message?.content ?? '';
    const tokensUsed = completion.usage?.total_tokens ?? 0;

    logger.debug('OpenAI response', { category, tokensUsed });

    return { reply, tokensUsed };
  }

  async generateDailyPlan(
    goals: string[],
    existingRoutine: string,
  ): Promise<string> {
    const prompt = `Based on the following active goals:
${goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

${existingRoutine ? `Current routine context:\n${existingRoutine}\n` : ''}

Create a practical, time-blocked daily schedule (6 AM – 11 PM) that helps me make progress on all these goals. Include:
- Morning routine
- Deep work blocks for the top 2–3 goals
- Exercise slot
- Breaks and meals
- Evening wind-down

Format it as a numbered schedule with times.`;

    const completion = await this.client.chat.completions.create({
      model: config.openai.useAzure ? config.openai.azure.deployment : config.openai.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.daily_routine },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 1500,
    });

    return completion.choices[0]?.message?.content ?? '';
  }

  async suggestMilestones(category: GoalCategory, goalTitle: string, description: string): Promise<string[]> {
    const prompt = `For the goal: "${goalTitle}"
Description: ${description}
Category: ${category}

Suggest 5 concrete, measurable milestones to achieve this goal. Return ONLY a JSON array of strings, no additional text. Example: ["Milestone 1", "Milestone 2"]`;

    const completion = await this.client.chat.completions.create({
      model: config.openai.useAzure ? config.openai.azure.deployment : config.openai.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS[category] },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content ?? '[]';
    try {
      return JSON.parse(content) as string[];
    } catch {
      logger.warn('Could not parse milestones JSON', { content });
      return [];
    }
  }
}

export const openAIService = new OpenAIService();
