import OpenAI from 'openai';
import Constants from 'expo-constants';
import { Profile } from '@/types/profile';
import AsyncStorage from '@react-native-async-storage/async-storage';

class OpenAIService {
  private client: OpenAI;
  private static instance: OpenAIService;
  private static MAX_RETRIES = 3;
  private static RETRY_DELAY = 2000;
  private static BACKOFF_FACTOR = 1.5;

  private constructor() {
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
      baseURL: 'https://api.openai.com/v1',
      defaultHeaders: { 'Content-Type': 'application/json' },
      timeout: 30000,
      maxRetries: 3,
      fetch,
    });
  }

  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) OpenAIService.instance = new OpenAIService();
    return OpenAIService.instance;
  }

  async createAssistant(profile: Profile): Promise<string> {
    const assistant = await this.client.beta.assistants.create({
      name: `${profile.name}'s Personal Assistant`,
      model: 'gpt-4o',
      response_format: 'json_object',
      instructions: `You are an assistant embedded in a long-term coaching system. 
      You must call a tool and respond only in JSON format. You MUST respond by calling a function via tool_calls.
You are NOT allowed to respond in plain text.  You are NOT allowed to simulate a function. Avoid markdown, bullet points, or styled text. Output must be a raw JSON object matching the expected structure of the tool. Do NOT include any markdown or code block fences. You MUST call one of the following tools:
1. generate_daily_insights: When the user gives their focus, blocker, and bold move for the day.
2. analyze_decision: When the user shares a dilemma or hard choice they're facing.
3. assess_progress_and_suggest: When the user requests an assessment of their progress and suggestions.
If you do not recognize the input, return an empty tool_calls array.
You will be tracking decisions and clarity sessions to help users improve over time.`,
      tools: [
        {
          type: 'function',
          function: {
            name: 'generate_daily_insights',
            description:
              'Generate concise and actionable daily insights. Return only JSON.',
            "type": "object",
    "properties": {
      "insights": {
        "type": "array",
        "items": { "type": "string" }
      }
    },
    "required": ["insights"]
          },
        },
        {
          type: 'function',
          function: {
            name: 'analyze_decision',
            description: 'Break down a decision and give strategic clarity. return JSON.',
            parameters: {
              type: 'object',
              properties: {
                dilemma: { type: 'string' },
              },
              required: ['dilemma'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'assess_progress_and_suggest',
            description: 'Assess progress based on calendar events, decisions, and priorities. return JSON.',
            parameters: {
              type: 'object',
              properties: {
                calendarEvents: { type: 'array', items: { type: 'object' } },
                decisions: { type: 'array', items: { type: 'object' } },
                priorities: { type: 'array', items: { type: 'object' } },
              },
              required: ['calendarEvents', 'decisions', 'priorities'],
            },
          },
        },
      ],
    });
    return assistant.id;
  }

  async createThread(): Promise<string> {
    const thread = await this.client.beta.threads.create();
    return thread.id;
  }

  async addMessage(threadId: string, content: string): Promise<void> {
    await this.client.beta.threads.messages.create(threadId, {
      role: 'user',
       content: `Please reply in raw JSON format. Do NOT include any markdown or code block fences.\n\n${content}`,
    });
  }

  async runAssistant(
    assistantId: string,
    threadId: string,
    profileId: string,
    forceTool?: string
  ): Promise<any> {
    const run = await this.client.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
     tool_choice: forceTool
    ? {
        type: 'function',
        function: { name: forceTool },
      }
    : 'auto',
    });

    let status = run.status;
    let latestToolOutput: any = null;

    while (['in_progress', 'queued', 'requires_action'].includes(status)) {
      const current = await this.client.beta.threads.runs.retrieve(
        threadId,
        run.id
      );
      status = current.status;

      if (
        status === 'requires_action' &&
        current.required_action?.submit_tool_outputs?.tool_calls
      ) {
        const toolOutputs = await this.handleToolCalls(
          current.required_action.submit_tool_outputs.tool_calls,
          profileId
        );
        latestToolOutput = toolOutputs?.[0]?.output;
        await this.client.beta.threads.runs.submitToolOutputs(
          threadId,
          run.id,
          {
            tool_outputs: toolOutputs,
          }
        );
      } else {
        await new Promise((res) => setTimeout(res, OpenAIService.RETRY_DELAY));
      }
    }

    if (latestToolOutput) {
      try {
        return JSON.parse(latestToolOutput);
      } catch (e) {
        console.error('Tool output was not valid JSON', e);
        throw new Error('Parsed tool output failed');
      }
    }

    throw new Error('No valid tool output found in response');
  }

  private async handleToolCalls(
    toolCalls: any[],
    profileId: string
  ): Promise<{ tool_call_id: string; output: string }[]> {
    return Promise.all(
      toolCalls.map(async (toolCall) => {
        const name = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let output;

        if (name === 'generate_daily_insights') {
         const chatPrompt = `
Based on the following:

Focus: ${args.focus}
Blocker: ${args.blocker}
Bold Move: ${args.bold_move}

Please provide concise and direct insights the user can take action on today.

🔁 Respond ONLY in raw JSON:
{
  "insights": [
    "Insight 1",
    "Insight 2",
    "Insight 3",
    "Insight 4",
    ...
  ]
}

No markdown, no bullet points, no explanation. Just return a valid JSON object.
`;

          const completion = await this.client.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'You are a high-performance productivity assistant.',
              },
              { role: 'user', content: chatPrompt },
            ],
          });

          const rawText = completion.choices[0].message.content || '';
          const suggestions = rawText.split(/\n+/).filter(Boolean);

          output = {
            insights: suggestions,
            focus: args.focus,
            blocker: args.blocker,
            bold_move: args.bold_move,
          };
        } else if (name === 'analyze_decision') {
          const decisionPrompt = `I need help making a decision:
${args.dilemma}

Please analyze the dilemma in detail, consider pros and cons, and give me a clear recommendation with confidence level (high, medium, low).
Respond ONLY in raw JSON without markdown or explanation. Do NOT include any markdown or code block fences.
Return an object with: recommendation, reasoning (as an array), and confidence.`;

          const completion = await this.client.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content:
                  'You are a senior decision strategist. You give clear, confident, and structured decisions.',
              },
              { role: 'user', content: decisionPrompt },
            ],
          });

          const raw = (completion.choices[0].message.content || '')
            const cleanJson = raw
  .replace(/```json/i, '') // remove ```json (case-insensitive)
  .replace(/```/, '')       // remove trailing ```

const parsed = JSON.parse(cleanJson.trim());

          output = {
            recommendation: parsed.recommendation || 'No clear recommendation.',
            reasoning: parsed.reasoning || ['No reasoning provided.'],
            confidence: parsed.confidence || 'medium',
          };
        } else if (name === 'assess_progress_and_suggest') {
          // Get current month's data
          const today = new Date();
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          
          // Fetch data from AsyncStorage
          const [calendarEvents, decisions, priorities] = await Promise.all([
            AsyncStorage.getItem('calendarEvents'),
            AsyncStorage.getItem('decisionHistory'),
            AsyncStorage.getItem('priorities'),
          ]);

          // Parse and filter data for current month
          const parsedEvents = calendarEvents ? JSON.parse(calendarEvents) : [];
          const parsedDecisions = decisions ? JSON.parse(decisions) : [];
          const parsedPriorities = priorities ? JSON.parse(priorities) : [];

          const thisMonthEvents = parsedEvents.filter((event: any) => {
            const eventDate = new Date(event.date);
            return eventDate >= startOfMonth;
          });

          const thisMonthDecisions = parsedDecisions.filter((decision: any) => {
            const decisionDate = new Date(decision.timestamp);
            return decisionDate >= startOfMonth;
          });

          const progressPrompt = `Analyze the user's progress this month in JSON format.

Calendar Events: ${JSON.stringify(thisMonthEvents)}
Decisions Made: ${JSON.stringify(thisMonthDecisions)}
Active Priorities: ${JSON.stringify(parsedPriorities)}

Respond ONLY in raw JSON and Do NOT include any markdown or code block fences. Use the following structure:
{
  "assessment": "string",
  "achievements": ["string", "string", "string"],
  "improvements": ["string", "string"],
  "recommendations": ["string", "string", "string"]
}`;

          const completion = await this.client.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'You are a progress analyst and productivity coach.',
              },
              { role: 'user', content: progressPrompt },
            ],
          });

          const parsed = JSON.parse(completion.choices[0].message.content || '');

output = {
  insights: parsed.insights || []
};
        }

        return {
          tool_call_id: toolCall.id,
          output: JSON.stringify(output),
        };
      })
    );
  }

  private saveInteractionToDB(
    profileId: string,
    type: 'decision' | 'clarity' | 'progress',
    data: any
  ) {
    console.log(`[SAVE] Profile: ${profileId}, Type: ${type}, Data:`, data);
  }
}

export default OpenAIService;