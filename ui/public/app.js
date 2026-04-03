// ─── API Helper ───
async function api(path, body) {
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ─── DOM References ───
const messagesEl = document.getElementById('messages');
const chipsEl = document.getElementById('chips');
const inputEl = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const hamburgerBtn = document.getElementById('hamburger');
const sidebarEl = document.getElementById('sidebar');

// ─── State Machine ───
const state = {
  current: 'WELCOME',
  intent: {},
  resolvedOrigin: null,
  resolvedDest: null,
};

// ─── Tool Call Highlight (no-op since sidebar simplified) ───
function highlightTool(toolName) {}

// ─── Message Renderers ───
function renderText(content) {
  const div = document.createElement('div');
  div.className = 'bubble';
  div.innerHTML = content.text.replace(/\n/g, '<br>');
  return div;
}

function renderToolCall(content) {
  const div = document.createElement('div');
  div.innerHTML = `
    <div class="tool-call"><span class="tool-call-icon">&#9881;</span> ${content.tool}</div>
    <div class="bubble" style="border-top-left-radius:4px;">${content.text.replace(/\n/g, '<br>')}</div>
  `;
  return div;
}

function renderWelcome(content) {
  const div = document.createElement('div');
  div.className = 'welcome-card';
  div.innerHTML = `
    <h2>${content.title}</h2>
    <div class="subtitle">${content.subtitle}</div>
    <ul class="feature-list">
      ${content.features.map(f => `
        <li><span class="feature-icon">${f.icon}</span> ${f.text}</li>
      `).join('')}
    </ul>
  `;
  return div;
}

function renderCodeBlock(content) {
  const div = document.createElement('div');
  div.className = 'code-card';
  const id = 'code-' + Math.random().toString(36).slice(2, 8);
  // Simple JSON syntax highlighting
  let highlighted = escapeHtml(content.code);
  highlighted = highlighted.replace(/"([^"]+)"(?=\s*:)/g, '<span class="json-key">"$1"</span>');
  highlighted = highlighted.replace(/:\s*"([^"]+)"/g, ': <span class="json-string">"$1"</span>');
  div.innerHTML = `
    <div class="code-header">
      <span class="code-lang">${content.language}</span>
      <button class="copy-btn" onclick="copyCode('${id}', this)">Copy</button>
    </div>
    <div class="code-body" id="${id}">${highlighted}</div>
    ${content.caption ? `<div class="code-caption">${content.caption}</div>` : ''}
  `;
  return div;
}

function renderIntentCard(content) {
  const div = document.createElement('div');
  div.className = 'intent-card';
  const intent = content.intent || {};
  const fields = Object.entries(intent).filter(([, v]) => v !== undefined && v !== null && v !== '');
  const conf = content.confidence ?? 0;
  const confClass = conf >= 0.66 ? 'confidence-high' : conf >= 0.33 ? 'confidence-med' : 'confidence-low';

  div.innerHTML = `
    <div class="intent-header">
      Detected Intent
      <span class="confidence-badge ${confClass}">${Math.round(conf * 100)}%</span>
    </div>
    <div class="intent-fields">
      ${fields.map(([k, v]) => `
        <div class="intent-field">
          <div class="field-label">${k.replace(/_/g, ' ')}</div>
          <div class="field-value">${v}</div>
        </div>
      `).join('')}
    </div>
    ${content.missing_fields?.length > 0 ? `
      <div class="intent-missing">
        <span class="missing-label">Missing:</span>
        ${content.missing_fields.map(f => `<span class="missing-pill">${f}</span>`).join('')}
      </div>
    ` : ''}
  `;
  return div;
}

function renderValidationCard(content) {
  const div = document.createElement('div');
  div.className = 'validation-card';
  const headerClass = content.valid ? 'valid' : 'invalid';
  const icon = content.valid ? '&#10003;' : '&#10007;';
  const label = content.valid ? 'All checks passed' : 'Validation failed';

  div.innerHTML = `
    <div class="validation-header ${headerClass}">${icon}&nbsp; ${label}</div>
    <div class="validation-body">
      ${content.errors?.length > 0 ? `<ul>${content.errors.map(e => `<li class="val-error"><span class="icon">&#10007;</span> ${e}</li>`).join('')}</ul>` : ''}
      ${content.warnings?.length > 0 ? `<ul>${content.warnings.map(w => `<li class="val-warning"><span class="icon">&#9888;</span> ${w}</li>`).join('')}</ul>` : ''}
      ${content.valid && !content.errors?.length && !content.warnings?.length ? '<p style="color:#065F46;font-size:13px;">Your search parameters look good!</p>' : ''}
    </div>
  `;
  return div;
}

function renderDeeplinkCard(content) {
  const div = document.createElement('div');
  div.className = 'deeplink-card';
  div.innerHTML = `
    <div class="deeplink-header">
      <div class="deeplink-route">${content.origin} &rarr; ${content.destination}</div>
      <div class="deeplink-dates">${content.dates}</div>
    </div>
    <div class="deeplink-details">
      <div class="deeplink-detail"><div class="dl-label">Passengers</div><div class="dl-value">${content.passengers}</div></div>
      <div class="deeplink-detail"><div class="dl-label">Class</div><div class="dl-value">${content.cabin}</div></div>
      <div class="deeplink-detail"><div class="dl-label">Market</div><div class="dl-value">${content.market}</div></div>
    </div>
    <div class="deeplink-cta">
      <a href="${content.url}" target="_blank" rel="noopener" class="cta-button">Search on Liligo &#8599;</a>
    </div>
    <div class="deeplink-url-row">
      <div class="deeplink-url-text">${content.url}</div>
    </div>
  `;
  return div;
}

function renderDestShowcase(content) {
  const div = document.createElement('div');
  div.className = 'dest-showcase';
  const dests = content.destinations || getPopularDestinations();
  dests.slice(0, 6).forEach(d => {
    div.innerHTML += `
      <div class="dest-img-card" onclick="handleUserInput('${d.name}')">
        <img src="${d.image}" alt="${d.name}" loading="lazy">
        <div class="dest-img-overlay">
          <div class="dest-img-name">${d.emoji} ${d.name}</div>
          <div class="dest-img-country">${d.country}</div>
        </div>
      </div>
    `;
  });
  return div;
}

function renderGuideCard(content) {
  const div = document.createElement('div');
  div.className = 'guide-card';
  const d = content;
  div.innerHTML = `
    <div class="guide-hero">
      <img src="${d.hero}" alt="${d.name}" loading="lazy">
      <div class="guide-hero-overlay">
        <span class="guide-hero-title">${d.emoji} ${d.name}</span>
        <span class="guide-hero-country">${d.country}</span>
      </div>
    </div>
    <div class="guide-body">
      <div class="guide-stat-row">
        <div class="guide-stat"><div class="gs-label">Summer</div><div class="gs-value">${d.weather.summer}</div></div>
        <div class="guide-stat"><div class="gs-label">Winter</div><div class="gs-value">${d.weather.winter}</div></div>
        <div class="guide-stat"><div class="gs-label">Budget</div><div class="gs-value">${d.guide.avg_budget}</div></div>
      </div>

      <div class="guide-section">
        <div class="guide-section-title">Top Highlights</div>
        <div class="guide-tags">${d.guide.highlights.map(h => `<span class="guide-tag">${h}</span>`).join('')}</div>
      </div>

      <div class="guide-section">
        <div class="guide-section-title">Must-Try Food</div>
        <div class="guide-tags">${d.guide.cuisine.map(c => `<span class="guide-tag">${c}</span>`).join('')}</div>
      </div>

      <div class="guide-section">
        <div class="guide-section-title">Getting Around</div>
        <div class="guide-text">${d.guide.transport}</div>
      </div>

      <div class="guide-section">
        <div class="guide-section-title">Best Time to Visit</div>
        <div class="guide-text">${d.weather.best_months}</div>
      </div>

      <div class="guide-section">
        <div class="guide-tip"><strong>Pro Tip:</strong> ${d.guide.tip}</div>
      </div>
    </div>
  `;
  return div;
}

function renderLoading() {
  const div = document.createElement('div');
  div.className = 'bubble';
  div.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  return div;
}

// ─── Message System ───
function addMessage(msg) {
  const wrapper = document.createElement('div');
  wrapper.className = `message ${msg.role}`;
  wrapper.dataset.id = msg.id || Math.random().toString(36).slice(2);

  // Avatar
  const avatar = document.createElement('div');
  avatar.className = `avatar ${msg.role}`;
  avatar.textContent = msg.role === 'bot' ? '✈' : 'U';
  wrapper.appendChild(avatar);

  // Content
  let content;
  switch (msg.type) {
    case 'text': content = renderText(msg.content); break;
    case 'tool-call': content = renderToolCall(msg.content); break;
    case 'welcome': content = renderWelcome(msg.content); break;
    case 'code-block': content = renderCodeBlock(msg.content); break;
    case 'card-intent': content = renderIntentCard(msg.content); break;
    case 'card-validation': content = renderValidationCard(msg.content); break;
    case 'card-deeplink': content = renderDeeplinkCard(msg.content); break;
    case 'dest-showcase': content = renderDestShowcase(msg.content); break;
    case 'dest-guide': content = renderGuideCard(msg.content); break;
    case 'card-prices': content = renderPricesCard(msg.content); break;
    case 'card-suggestions': content = renderSuggestionsCard(msg.content); break;
    case 'card-dates': content = renderDatesCard(msg.content); break;
    case 'loading': content = renderLoading(); break;
    default: content = renderText({ text: JSON.stringify(msg.content) });
  }
  wrapper.appendChild(content);
  messagesEl.appendChild(wrapper);
  scrollToBottom();

  // Show chips after delay
  if (msg.chips && msg.chips.length > 0) {
    setTimeout(() => showChips(msg.chips), 200);
  }

  return wrapper;
}

function removeMessage(id) {
  const el = messagesEl.querySelector(`[data-id="${id}"]`);
  if (el) el.remove();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

function showChips(chips) {
  chipsEl.innerHTML = chips.map(c => `<button class="chip">${c}</button>`).join('');
  chipsEl.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      handleUserInput(btn.textContent);
    });
  });
}

function clearChips() {
  chipsEl.innerHTML = '';
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function copyCode(id, btn) {
  const el = document.getElementById(id);
  if (el) {
    navigator.clipboard.writeText(el.textContent);
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
  }
}

async function botTyping(delayMs = 600) {
  const loadingId = 'loading-' + Date.now();
  addMessage({ id: loadingId, role: 'bot', type: 'loading', content: {} });
  await new Promise(r => setTimeout(r, delayMs));
  removeMessage(loadingId);
}

function botText(text, chips) {
  addMessage({ role: 'bot', type: 'text', content: { text }, chips });
}

// ─── Conversation Flow ───
async function transitionTo(newState) {
  state.current = newState;

  switch (newState) {
    case 'WELCOME':
      addMessage({
        role: 'bot',
        type: 'welcome',
        content: {
          title: 'Liligo Flight Assistant',
          subtitle: 'AI-powered flight search with 11 MCP tools',
          features: [
            { icon: '🔍', text: 'Natural language flight search' },
            { icon: '🏙️', text: 'Smart city resolution (Autocomplete API)' },
            { icon: '🔗', text: 'Direct deeplinks to Liligo results' },
            { icon: '💰', text: 'Cached price lookup & date suggestions' },
            { icon: '🌍', text: '6 markets: FR, ES, IT, DE, UK, US' },
          ],
        },
        chips: ['Get Started'],
      });
      break;

    case 'INSTALL':
      await botTyping(400);
      botText("Great! Let me show you how to set up the Liligo MCP server in Claude Code.");
      await botTyping(500);
      addMessage({
        role: 'bot',
        type: 'code-block',
        content: {
          language: '.mcp.json',
          code: `{
  "mcpServers": {
    "liligo": {
      "command": "node",
      "args": ["/Users/guillaumerostand/Documents/Liligo MCP/liligo-mcp-server/dist/src/index.js"]
    }
  }
}`,
          caption: 'Place this .mcp.json file at the root of your project directory, then restart Claude Code.',
        },
      });
      await botTyping(400);
      botText(
        "Once configured, Claude will have access to all 11 Liligo tools:\n\n" +
        "• detect_travel_intent — Parse natural language\n" +
        "• resolve_city_identifiers — City to IATA codes\n" +
        "• validate_travel_intent — Check parameters\n" +
        "• build_liligo_deeplink — Generate search URLs\n" +
        "• search_cached_prices — Quick price lookup\n" +
        "• suggest_destinations — Inspiration by budget\n" +
        "• suggest_dates — Flexible date pricing\n" +
        "• rank_click_options — Smart flight ranking\n" +
        "• refine_travel_intent — Follow-up questions\n" +
        "• render_interactive_results — Rich formatting\n" +
        "• track_interaction_event — Analytics",
        ["I'm ready, let's search!", "Show me the demo flow"]
      );
      break;

    case 'ASK_SEARCH':
      await botTyping(400);
      botText(
        "Where would you like to fly? Type naturally or pick a destination below."
      );
      addMessage({
        role: 'bot',
        type: 'dest-showcase',
        content: { destinations: getPopularDestinations() },
        chips: ["Paris to Barcelona", "London to New York", "Lyon to Lisbon"],
      });
      break;

    case 'PROCESS_INTENT':
      // This is called after user input with their search text
      break;

    case 'ASK_MISSING':
      await handleMissingFields();
      break;

    case 'RESOLVE_CITIES':
      await resolveCities();
      break;

    case 'VALIDATE':
      await validateAndBuild();
      break;

    case 'BUILD_DEEPLINK':
      await buildDeeplink();
      break;

    case 'DONE':
      await botTyping(300);
      botText("Your Liligo search is ready! What else would you like to explore?", [
        "Compare prices", "Suggest destinations", "Flexible dates", "Search again"
      ]);
      break;
  }
}

async function handleUserInput(text) {
  if (!text.trim()) return;
  clearChips();
  addMessage({ role: 'user', type: 'text', content: { text } });

  switch (state.current) {
    case 'WELCOME':
      await transitionTo('INSTALL');
      break;

    case 'INSTALL':
      if (text.toLowerCase().includes('demo') || text.toLowerCase().includes('show')) {
        await transitionTo('ASK_SEARCH');
      } else {
        await transitionTo('ASK_SEARCH');
      }
      break;

    case 'ASK_SEARCH':
      await processNaturalLanguage(text);
      break;

    case 'ASK_MISSING':
      await handleMissingAnswer(text);
      break;

    case 'ASK_DEPARTURE':
      state.intent.departure_date = text.trim();
      if (state.pendingQuestions && state.pendingQuestions.length > 0) {
        await askNextQuestion();
      } else {
        await transitionTo('RESOLVE_CITIES');
      }
      break;

    case 'ASK_RETURN':
      if (text.toLowerCase().includes('one') || text.toLowerCase().includes('aller simple') || text.toLowerCase() === 'no') {
        state.intent.round_trip = false;
      } else {
        state.intent.return_date = text.trim();
        state.intent.round_trip = true;
      }
      await transitionTo('RESOLVE_CITIES');
      break;

    case 'DONE':
      const lower = text.toLowerCase();
      if (lower.includes('again') || lower.includes('new') || lower.includes('search')) {
        state.intent = {};
        state.resolvedOrigin = null;
        state.resolvedDest = null;
        await transitionTo('ASK_SEARCH');
      } else if (lower.includes('price') || lower.includes('compare')) {
        await showPriceComparison();
      } else if (lower.includes('suggest') || lower.includes('destination') || lower.includes('inspir')) {
        await showDestinationSuggestions();
      } else if (lower.includes('flex') || lower.includes('date')) {
        await showFlexibleDates();
      } else {
        await processNaturalLanguage(text);
      }
      break;

    default:
      await processNaturalLanguage(text);
  }
}

async function processNaturalLanguage(text) {
  await botTyping(500);
  highlightTool('detect_travel_intent');

  // Call detect intent
  const result = await api('detect-intent', { user_message: text });

  addMessage({
    role: 'bot',
    type: 'tool-call',
    content: { tool: 'detect_travel_intent', text: 'Analyzing your travel request...' },
  });

  addMessage({
    role: 'bot',
    type: 'card-intent',
    content: result,
  });

  // Merge detected intent
  const detected = result.intent || {};
  Object.entries(detected).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      state.intent[k] = v;
    }
  });

  // Check missing fields
  const missing = result.missing_fields || [];

  if (missing.length > 0) {
    await botTyping(400);
    // Get refinement questions
    const refine = await api('refine-intent', state.intent);
    state.pendingQuestions = (refine.questions || []).filter(q => q.priority === 'required');
    await askNextQuestion();
  } else {
    await transitionTo('RESOLVE_CITIES');
  }
}

async function askNextQuestion() {
  if (!state.pendingQuestions || state.pendingQuestions.length === 0) {
    await transitionTo('RESOLVE_CITIES');
    return;
  }

  const q = state.pendingQuestions.shift();
  state.currentQuestion = q;

  if (q.field === 'departure_date') {
    state.current = 'ASK_DEPARTURE';
    botText(q.question, ['2026-06-15', '2026-07-01', '2026-08-15']);
  } else if (q.field === 'return_date') {
    state.current = 'ASK_RETURN';
    botText(q.question, ['2026-06-22', '2026-07-08', 'One-way']);
  } else if (q.field === 'origin') {
    state.current = 'ASK_MISSING';
    botText(q.question, q.suggestions || ['Paris', 'London', 'Barcelona']);
  } else if (q.field === 'destination') {
    state.current = 'ASK_MISSING';
    botText(q.question, q.suggestions || ['Barcelona', 'Lisbon', 'Rome']);
  } else {
    state.current = 'ASK_MISSING';
    botText(q.question, q.suggestions || []);
  }
}

async function handleMissingAnswer(text) {
  const field = state.currentQuestion?.field;
  const val = text.trim();
  if (field) {
    // If user provides a 3-letter IATA code, store it as _iata
    if (/^[A-Z]{3}$/.test(val)) {
      if (field === 'origin' || field === 'origin_iata') {
        state.intent.origin_iata = val;
        state.intent.origin = val;
      } else if (field === 'destination' || field === 'destination_iata') {
        state.intent.destination_iata = val;
        state.intent.destination = val;
      } else {
        state.intent[field] = val;
      }
    } else {
      state.intent[field] = val;
    }
  }

  if (state.pendingQuestions && state.pendingQuestions.length > 0) {
    await askNextQuestion();
  } else {
    await transitionTo('RESOLVE_CITIES');
  }
}

async function resolveCities() {
  state.current = 'RESOLVE_CITIES';
  const needOrigin = state.intent.origin && !state.intent.origin_iata;
  const needDest = state.intent.destination && !state.intent.destination_iata;

  if (needOrigin) {
    await botTyping(400);
    highlightTool('resolve_city_identifiers');
    addMessage({ role: 'bot', type: 'tool-call', content: { tool: 'resolve_city_identifiers', text: `Resolving "${state.intent.origin}"...` } });
    try {
      const result = await api('resolve-city', { query: state.intent.origin, market_tld: 'fr' });
      if (result.results && result.results.length > 0) {
        const city = result.results[0];
        state.intent.origin_iata = city.iata_code;
        state.resolvedOrigin = city;
        botText(`Found: ${city.name} (${city.iata_code}) — ${city.country}`);
      } else {
        botText(`Could not resolve "${state.intent.origin}". Please provide the IATA code directly.`, ['PAR', 'LHR', 'BCN']);
        state.current = 'ASK_MISSING';
        state.currentQuestion = { field: 'origin_iata' };
        return;
      }
    } catch (e) {
      // If API fails, try to use the text as IATA
      if (/^[A-Z]{3}$/.test(state.intent.origin)) {
        state.intent.origin_iata = state.intent.origin;
      } else {
        botText(`API error resolving city. Please enter the 3-letter IATA code directly.`, ['PAR', 'LHR', 'BCN']);
        state.current = 'ASK_MISSING';
        state.currentQuestion = { field: 'origin_iata' };
        return;
      }
    }
  }

  if (needDest) {
    await botTyping(300);
    highlightTool('resolve_city_identifiers');
    addMessage({ role: 'bot', type: 'tool-call', content: { tool: 'resolve_city_identifiers', text: `Resolving "${state.intent.destination}"...` } });
    try {
      const result = await api('resolve-city', { query: state.intent.destination, market_tld: 'fr' });
      if (result.results && result.results.length > 0) {
        const city = result.results[0];
        state.intent.destination_iata = city.iata_code;
        state.resolvedDest = city;
        botText(`Found: ${city.name} (${city.iata_code}) — ${city.country}`);
      } else {
        botText(`Could not resolve "${state.intent.destination}". Please provide the IATA code.`, ['BCN', 'JFK', 'LIS']);
        state.current = 'ASK_MISSING';
        state.currentQuestion = { field: 'destination_iata' };
        return;
      }
    } catch (e) {
      if (/^[A-Z]{3}$/.test(state.intent.destination)) {
        state.intent.destination_iata = state.intent.destination;
      } else {
        botText(`API error. Please enter the IATA code directly.`, ['BCN', 'JFK', 'LIS']);
        state.current = 'ASK_MISSING';
        state.currentQuestion = { field: 'destination_iata' };
        return;
      }
    }
  }

  // Check if we still need a departure date
  if (!state.intent.departure_date) {
    state.pendingQuestions = [{ field: 'departure_date', question: 'When would you like to depart? (YYYY-MM-DD)', suggestions: [] }];
    await askNextQuestion();
    return;
  }

  await transitionTo('VALIDATE');
}

async function validateAndBuild() {
  state.current = 'VALIDATE';
  await botTyping(400);
  highlightTool('validate_travel_intent');
  addMessage({ role: 'bot', type: 'tool-call', content: { tool: 'validate_travel_intent', text: 'Checking your search parameters...' } });

  const validation = await api('validate-intent', {
    origin_iata: state.intent.origin_iata,
    destination_iata: state.intent.destination_iata,
    departure_date: state.intent.departure_date,
    return_date: state.intent.return_date,
    round_trip: state.intent.round_trip ?? true,
    adults: state.intent.adults ?? 1,
    children: state.intent.children ?? 0,
    infants: state.intent.infants ?? 0,
    cabin_class: state.intent.cabin_class ?? 'economy',
  });

  addMessage({ role: 'bot', type: 'card-validation', content: validation });

  if (validation.valid) {
    await transitionTo('BUILD_DEEPLINK');
  } else {
    await botTyping(300);
    botText("There are some issues with your search. Would you like to fix them and try again?", ["Fix and retry", "Start over"]);
    state.current = 'DONE';
  }
}

async function buildDeeplink() {
  state.current = 'BUILD_DEEPLINK';
  await botTyping(500);
  highlightTool('build_liligo_deeplink');
  addMessage({ role: 'bot', type: 'tool-call', content: { tool: 'build_liligo_deeplink', text: 'Generating your Liligo search link...' } });

  const originIata = state.intent.origin_iata || '';
  const destIata = state.intent.destination_iata || '';
  const depDate = state.intent.departure_date || '';
  const retDate = state.intent.return_date || undefined;
  const roundTrip = retDate ? true : false;
  const adults = state.intent.adults ?? 1;
  const children = state.intent.children ?? 0;
  const cabin = state.intent.cabin_class ?? 'economy';
  const market = state.intent.market_tld ?? 'fr';

  const result = await api('build-deeplink', {
    origin_iata: originIata,
    destination_iata: destIata || undefined,
    departure_date: depDate,
    return_date: retDate,
    round_trip: roundTrip,
    adults, children,
    cabin_class: cabin,
    market_tld: market,
  });

  if (result.valid) {
    const originName = state.resolvedOrigin?.name || originIata;
    const destName = state.resolvedDest?.name || destIata;
    const dates = retDate ? `${depDate}  →  ${retDate}` : depDate;
    const pax = children > 0 ? `${adults} adult${adults > 1 ? 's' : ''}, ${children} child${children > 1 ? 'ren' : ''}` : `${adults} adult${adults > 1 ? 's' : ''}`;

    addMessage({
      role: 'bot',
      type: 'card-deeplink',
      content: {
        origin: originName,
        destination: destName,
        dates,
        passengers: pax,
        cabin: cabin.charAt(0).toUpperCase() + cabin.slice(1),
        market: `.${market}`,
        url: result.url,
      },
    });

    // Track the event
    api('track-event', {
      event_type: 'deeplink_generated',
      properties: { origin: originIata, destination: destIata, url: result.url },
    });

    // Show destination guide if available
    const destGuide = getDestination(destIata);
    if (destGuide) {
      await botTyping(400);
      botText(`Here's your travel guide for ${destGuide.name}:`);
      addMessage({ role: 'bot', type: 'dest-guide', content: destGuide });
    }

    await transitionTo('DONE');
  } else {
    await botTyping(300);
    botText(`Something went wrong: ${result.warnings?.join(', ') || 'Unknown error'}`, ["Try again"]);
    state.current = 'DONE';
  }
}

// ─── Extra Tool Features ───

async function showPriceComparison() {
  const origin = state.intent.origin_iata;
  const dest = state.intent.destination_iata;
  const dep = state.intent.departure_date;
  if (!origin || !dest || !dep) {
    botText("I need a complete search first to compare prices.", ["Search again"]);
    return;
  }
  await botTyping(500);
  highlightTool('search_cached_prices');
  addMessage({ role: 'bot', type: 'tool-call', content: { tool: 'search_cached_prices', text: `Fetching cached prices for ${origin} → ${dest}...` } });

  try {
    const result = await api('search-prices', {
      origin_iata: origin, destination_iata: dest,
      departure_date: dep, return_date: state.intent.return_date,
      range: 3, market_tld: state.intent.market_tld || 'fr',
    });
    if (result.results && result.results.length > 0) {
      addMessage({ role: 'bot', type: 'card-prices', content: result });
    } else {
      botText("No cached prices available for this route yet. The prices will be available once you search on Liligo.");
    }
  } catch (e) {
    botText("Could not fetch cached prices at the moment. Try searching directly on Liligo.");
  }
  botText("", ["Suggest destinations", "Flexible dates", "Search again"]);
  // Remove empty bubble - show chips via last message
  const msgs = messagesEl.querySelectorAll('.message');
  if (msgs.length > 0) msgs[msgs.length - 1].remove();
  showChips(["Suggest destinations", "Flexible dates", "Search again"]);
}

async function showDestinationSuggestions() {
  const origin = state.intent.origin_iata || 'PAR';
  await botTyping(500);
  highlightTool('suggest_destinations');
  addMessage({ role: 'bot', type: 'tool-call', content: { tool: 'suggest_destinations', text: `Finding inspiring destinations from ${origin}...` } });

  try {
    const result = await api('suggest-destinations', {
      departure_city_id: origin,
      month: state.intent.departure_date?.substring(0, 7),
      market_tld: state.intent.market_tld || 'fr',
    });
    if (result.destinations && result.destinations.length > 0) {
      addMessage({ role: 'bot', type: 'card-suggestions', content: result });
    } else {
      // Show our built-in destinations instead
      botText("Here are some popular destinations you might enjoy:");
      addMessage({ role: 'bot', type: 'dest-showcase', content: { destinations: getPopularDestinations(origin) } });
    }
  } catch (e) {
    botText("Here are some popular destinations you might enjoy:");
    addMessage({ role: 'bot', type: 'dest-showcase', content: { destinations: getPopularDestinations(origin) } });
  }
  showChips(["Compare prices", "Flexible dates", "Search again"]);
}

async function showFlexibleDates() {
  const origin = state.intent.origin_iata;
  const dest = state.intent.destination_iata;
  const dep = state.intent.departure_date;
  if (!origin || !dest || !dep) {
    botText("I need a complete search first to suggest flexible dates.", ["Search again"]);
    return;
  }
  await botTyping(500);
  highlightTool('suggest_dates');
  addMessage({ role: 'bot', type: 'tool-call', content: { tool: 'suggest_dates', text: `Checking flexible dates for ${origin} → ${dest}...` } });

  try {
    const result = await api('suggest-dates', {
      origin_iata: origin, destination_iata: dest,
      departure_date: dep, return_date: state.intent.return_date,
      range: 5, market_tld: state.intent.market_tld || 'fr',
    });
    if (result.suggestions && result.suggestions.length > 0) {
      addMessage({ role: 'bot', type: 'card-dates', content: result });
    } else {
      botText("No flexible date pricing available yet for this route.");
    }
  } catch (e) {
    botText("Could not fetch date suggestions at the moment.");
  }
  showChips(["Compare prices", "Suggest destinations", "Search again"]);
}

// ─── Extra Card Renderers ───

function renderPricesCard(content) {
  const div = document.createElement('div');
  div.className = 'prices-card';
  const results = (content.results || []).slice(0, 8);
  const cheapest = content.cheapest;
  div.innerHTML = `
    <div class="prices-header">
      <span>Cached Prices</span>
      ${cheapest ? `<span class="prices-best">Best: ${cheapest.price}${cheapest.currency === 'EUR' ? '€' : cheapest.currency}</span>` : ''}
    </div>
    <div class="prices-grid">
      ${results.map(r => `
        <div class="price-row ${r === cheapest ? 'price-best' : ''}">
          <span class="price-date">${r.departure_date}</span>
          <span class="price-badge">${r.direct ? 'Direct' : 'Stops'}</span>
          <span class="price-amount">${r.price}${r.currency === 'EUR' ? '€' : r.currency}</span>
        </div>
      `).join('')}
    </div>
  `;
  return div;
}

function renderSuggestionsCard(content) {
  const div = document.createElement('div');
  div.className = 'suggestions-card';
  const dests = (content.destinations || []).slice(0, 6);
  div.innerHTML = `
    <div class="suggestions-header">Destination Suggestions <span class="suggestions-count">${content.count} found</span></div>
    <div class="suggestions-grid">
      ${dests.map(d => {
        const destData = getDestination(d.iata_code);
        const img = destData ? destData.image : 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=300&h=200&fit=crop';
        return `
          <div class="suggestion-dest" onclick="handleUserInput('${d.city_name}')">
            <img src="${img}" alt="${d.city_name}" loading="lazy">
            <div class="suggestion-overlay">
              <div class="suggestion-name">${d.city_name}</div>
              <div class="suggestion-country">${d.country}</div>
              <div class="suggestion-price">${d.price}${d.currency === 'EUR' ? '€' : d.currency}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  return div;
}

function renderDatesCard(content) {
  const div = document.createElement('div');
  div.className = 'dates-card';
  const suggestions = (content.suggestions || []).slice(0, 8);
  const reqPrice = content.requested_date_price;
  const cheapest = content.cheapest_alternative;
  div.innerHTML = `
    <div class="dates-header">
      <span>Flexible Dates</span>
      ${cheapest && reqPrice ? `<span class="dates-savings">Save up to ${Math.round(reqPrice - cheapest.price)}${cheapest.currency === 'EUR' ? '€' : cheapest.currency}</span>` : ''}
    </div>
    <div class="dates-grid">
      ${suggestions.map(s => {
        const isCheapest = cheapest && s.departure_date === cheapest.departure_date;
        const isRequested = s.departure_date === content.query?.departure_date;
        return `
          <div class="date-row ${isCheapest ? 'date-best' : ''} ${isRequested ? 'date-current' : ''}">
            <div class="date-info">
              <span class="date-dep">${s.departure_date}</span>
              ${isRequested ? '<span class="date-label">Your date</span>' : ''}
              ${isCheapest ? '<span class="date-label best">Cheapest</span>' : ''}
            </div>
            <div class="date-price">${s.price}${s.currency === 'EUR' ? '€' : s.currency}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  return div;
}

// ─── Input Handling ───
inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  sendBtn.disabled = !inputEl.value.trim();
});

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (inputEl.value.trim()) {
      handleUserInput(inputEl.value.trim());
      inputEl.value = '';
      inputEl.style.height = 'auto';
      sendBtn.disabled = true;
    }
  }
});

sendBtn.addEventListener('click', () => {
  if (inputEl.value.trim()) {
    handleUserInput(inputEl.value.trim());
    inputEl.value = '';
    inputEl.style.height = 'auto';
    sendBtn.disabled = true;
  }
});

// ─── New Chat ───
newChatBtn.addEventListener('click', () => {
  messagesEl.innerHTML = '';
  clearChips();
  state.intent = {};
  state.resolvedOrigin = null;
  state.resolvedDest = null;
  state.current = 'WELCOME';
  transitionTo('WELCOME');
});

// ─── Sidebar Toggle (Mobile) ───
hamburgerBtn.addEventListener('click', () => {
  sidebarEl.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (!sidebarEl.contains(e.target) && !hamburgerBtn.contains(e.target)) {
    sidebarEl.classList.remove('open');
  }
});

// ─── Init ───
transitionTo('WELCOME');
