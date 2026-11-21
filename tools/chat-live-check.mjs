const baseUrl = 'http://127.0.0.1:3001';

async function postChat(messages) {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  let provider = '(none)';
  let model = '(none)';
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'x-vux-ai-provider') provider = value;
    if (key.toLowerCase() === 'x-vux-ai-model') model = value;
  });
  return { status: response.status, provider, model, body };
}

const coding = await postChat([{ role: 'user', content: 'Debug this JavaScript function and fix the error.' }]);
console.log('CODING-STYLE CHAT  -> status:', coding.status, '| provider:', coding.provider, '| model:', coding.model);
console.log('   text:', String(coding.body.text || '').slice(0, 90));

const chat = await postChat([{ role: 'user', content: 'What is a closure in JavaScript?' }]);
console.log('ORDINARY CHAT      -> status:', chat.status, '| provider:', chat.provider, '| model:', chat.model);
console.log('   text:', String(chat.body.text || '').slice(0, 90));

process.exit(0);
