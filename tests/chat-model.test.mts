import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generationPhase, historyBeforeEdit, historyForRegeneration } from '../src/components/chat/chat-model.ts';
import type { UIMessage } from '@tanstack/ai-react';
const history: UIMessage[] = [
  { id: 'u1', role: 'user', parts: [{ type: 'text', content: 'one' }] },
  { id: 'a1', role: 'assistant', parts: [{ type: 'text', content: 'answer' }] },
  { id: 'u2', role: 'user', parts: [{ type: 'text', content: 'two' }] },
  { id: 'a2', role: 'assistant', parts: [{ type: 'thinking', content: 'consider' }] },
];
test('editing and regenerating remove dependent turns without mutating history', () => {
  assert.deepEqual(historyBeforeEdit(history, 'u2').map(m=>m.id), ['u1','a1']);
  assert.deepEqual(historyForRegeneration(history,'a1').map(m=>m.id), ['u1']);
  assert.equal(history.length,4);
  assert.throws(()=>historyBeforeEdit(history,'missing'));
});
test('status is scoped to the active user turn, not old answers', () => {
  assert.equal(generationPhase(history.slice(0,3)), 'waiting');
  assert.equal(generationPhase(history),'thinking');
  assert.equal(generationPhase([...history,{id:'a3',role:'assistant',parts:[{type:'tool-call',id:'t',name:'get_current_time',arguments:'{}',state:'input-complete'}]}]),'tool');
});
