import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import { createCalendar, deleteCalendar, listEvents } from '../src/calendar.js';

test('MCP Server Staging E2E', async (t) => {
    const testCalName = `MCP-TEST-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const calRes = await createCalendar(testCalName);
    const calendarId = calRes.id;
    assert(calendarId, 'Calendar ID should be returned');

    t.after(async () => {
        await deleteCalendar(calendarId);
    });

    const server = spawn('node', ['build/index.js']);
    let messageId = 0;
    
    function sendRequest(method: string, params: any = {}) {
        const req = { jsonrpc: '2.0', id: ++messageId, method, params };
        server.stdin.write(JSON.stringify(req) + '\n');
    }

    function waitForResponse(expectedId: number): Promise<any> {
        return new Promise((resolve) => {
            const onData = (data: Buffer) => {
                const msgs = data.toString().trim().split('\n');
                for (const msg of msgs) {
                    if (!msg) continue;
                    try {
                        const parsed = JSON.parse(msg);
                        if (parsed.id === expectedId) {
                            server.stdout.removeListener('data', onData);
                            resolve(parsed);
                        }
                    } catch (e) {}
                }
            };
            server.stdout.on('data', onData);
        });
    }

    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1);
    const endTime = new Date(startTime.getTime() + 3600000);

    sendRequest('tools/call', {
        name: 'stage_create_event',
        arguments: {
            calendarId,
            title: 'Automated E2E Test Event',
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            timeZone: 'Europe/London'
        }
    });

    const stageRes = await waitForResponse(messageId);
    const stageContent = stageRes.result.content[0].text;
    const tokenMatch = stageContent.match(/token (REQ-[a-f0-9]+)/);
    const token = tokenMatch![1];

    sendRequest('tools/call', {
        name: 'commit_staged_action',
        arguments: { token }
    });
    
    await waitForResponse(messageId);

    // Fetch events 
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const eventsRes = await listEvents(calendarId, pastDate.toISOString());
    
    const hasTestEvent = eventsRes.events.some(e => e.summary === 'Automated E2E Test Event');
    assert(hasTestEvent, 'The committed test event should exist in the calendar');

    server.kill();
});
