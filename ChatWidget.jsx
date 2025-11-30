import React, { useState } from 'react';
import axios from 'axios';

export default function ChatWidget() {
  const [messages, setMessages] = useState([
    { role: 'agent', text: 'Hi — I can plan your trip. Tell me: destination, dates (optional), interests, and budget.' }
  ]);
  const [input, setInput] = useState('');

  async function send() {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    setMessages(m => [...m, userMsg]);
    setInput('');
    try {
      const r = await axios.post('/api/chat', { message: userMsg.text });
      const reply = (r.data && r.data.content) ? r.data.content : 'No response';
      setMessages(m => [...m, { role: 'agent', text: reply }]);
    } catch (err) {
      setMessages(m => [...m, { role: 'agent', text: 'Error: could not reach server' }]);
    }
  }

  return (
    <div style={{ width: 360, border: '1px solid #ddd', borderRadius: 8, padding: 12, fontFamily: 'sans-serif' }}>
      <div style={{ height: 380, overflowY: 'auto', marginBottom: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ margin: '8px 0', textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <div style={{
              display: 'inline-block', padding: '8px 12px', borderRadius: 12,
              background: m.role === 'user' ? '#0b74ff' : '#f1f1f1', color: m.role === 'user' ? '#fff' : '#000',
              maxWidth: '85%'
            }}>{m.text}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex' }}>
        <input value={input} onChange={e => setInput(e.target.value)} style={{ flex: 1, padding: 8 }} placeholder="Describe your trip..." />
        <button onClick={send} style={{ marginLeft: 8, padding: '8px 12px' }}>Send</button>
      </div>
    </div>
  );
}
