
import { createServer } from "./server.js";
import { scanSessions } from "./lib/analyzer.js";

async function main() {
  const mockEntries = [
    { type: 'message', id: '1', parentId: null, timestamp: new Date().toISOString(), message: { role: 'user', content: 'Hello' } },
    { type: 'message', id: '2', parentId: '1', timestamp: new Date().toISOString(), message: { role: 'assistant', content: 'Hi there', provider: 'test', model: 'gpt-4' } },
  ];

  const server = await createServer({
    port: 8765,
    ctx: {} as any,
    pi: {} as any,
    getSessionData: () => ({
      sessionFile: '/tmp/test.jsonl',
      sessionId: 'test-session',
      entries: mockEntries as any,
      branch: mockEntries as any,
      leafId: '2',
      isStreaming: false,
    }),
    onNavigate: async (id, summarize) => console.log('Navigate:', id, summarize),
    onFork: async (id) => console.log('Fork:', id),
    onSwitchSession: async (path) => console.log('Switch:', path),
  });

  console.log(`Test server running at http://localhost:${server.port}`);
}

main().catch(console.error);
