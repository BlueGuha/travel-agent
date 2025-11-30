require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());
const PORT = process.env.PORT || 8080;
const STORE = path.join(__dirname, 'trips');

if (!fs.existsSync(STORE)) fs.mkdirSync(STORE);

// ---------- Helper: call an LLM (replace with your provider details) ----------
async function callLLM(prompt) {
  // Example: if you're using OpenAI's API, swap this for the official request.
  // This is a placeholder that returns a pseudo-response for local testing.
  if (!process.env.REAL_LLM) {
    return { text: `LLM simulation response for prompt:\n\n${prompt.slice(0,400)}...` };
  }
  // Example for OpenAI (replace with your actual call)
  const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: "gpt-4o-mini", // replace as needed
    messages: [{ role: "user", content: prompt }],
    max_tokens: 900
  }, {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
  });
  return { text: resp.data.choices[0].message.content };
}

// ---------- Endpoint: chat (general) ----------
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });

    // Simple routing: detect create_itinerary keyword
    if (/itinerar|plan|trip|days?/i.test(message) && /to|in|for/i.test(message)) {
      // Use create itinerary flow
      const prompt = buildItineraryPrompt(message);
      const llm = await callLLM(prompt);
      return res.json({ type: 'itinerary', content: llm.text });
    }

    // fallback: generic chat response from LLM
    const llm = await callLLM(message);
    res.json({ type: 'chat', content: llm.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// ---------- Endpoint: save trip ----------
app.post('/api/trips', (req, res) => {
  const trip = req.body;
  if (!trip || !trip.id) return res.status(400).json({ error: 'trip with id required' });
  const fname = path.join(STORE, trip.id + '.json');
  fs.writeFileSync(fname, JSON.stringify(trip, null, 2));
  res.json({ ok: true, path: fname });
});

// ---------- Endpoint: load trip ----------
app.get('/api/trips/:id', (req, res) => {
  const fname = path.join(STORE, req.params.id + '.json');
  if (!fs.existsSync(fname)) return res.status(404).json({ error: 'not found' });
  const trip = JSON.parse(fs.readFileSync(fname, 'utf8'));
  res.json(trip);
});

// ---------- Endpoint stubs for flight/hotel search ----------
app.post('/api/search/flights', async (req, res) => {
  // Placeholder: plug in Amadeus/Skyscanner/etc.
  // Accepts { from, to, departDate, returnDate, passengers }
  const query = req.body;
  // For demo: return mock results
  const mock = [
    { provider: 'DemoAir', price: 300, currency: 'USD', depart: '2026-01-01T06:30', arrive: '2026-01-01T12:00', id: 'demo-1' },
    { provider: 'SampleWings', price: 350, currency: 'USD', depart: '2026-01-01T09:00', arrive: '2026-01-01T15:00', id: 'demo-2' }
  ];
  res.json({ query, results: mock });
});

app.post('/api/search/hotels', async (req, res) => {
  // Placeholder: plug in Booking/Expedia/etc.
  const query = req.body;
  const mock = [
    { provider: 'DemoHotel', price_per_night: 80, rating: 4.2, id: 'h-1' },
    { provider: 'SampleInn', price_per_night: 60, rating: 4.0, id: 'h-2' }
  ];
  res.json({ query, results: mock });
});

// ---------- Itinerary prompt builder ----------
function buildItineraryPrompt(userMessage) {
  // Extract sensible defaults (very simple extraction; improve as needed)
  // Provide a strong structured prompt to the LLM
  const prompt = `
You are a professional travel planner. Create a clear, day-by-day itinerary, packing list, budget estimate, local tips, transit notes, and one "must-try" restaurant suggestion.
User request: """${userMessage}"""

Format the output as JSON with keys: title, days (array of {day, date (if given), morning, afternoon, evening, activities}), packing_list (array), budget_estimate (currency & number), transport_tips, emergency_contacts (generic), short_summary
Be concise but useful. If dates are missing, assume flexible dates and suggest an example date range. If budget is given, respect it. Keep total token usage reasonable.
`;
  return prompt;
}

app.listen(PORT, () => console.log(`Travel agent API running on http://localhost:${PORT}`));
