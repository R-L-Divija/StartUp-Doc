(function () {
  if (window.__dsChatbotLoaded) return;
  window.__dsChatbotLoaded = true;

  const style = document.createElement('style');
  style.id = 'dsChatbotStyles';
  style.textContent = `
    :root { --ds-accent: var(--accent, #6eb8e1); --ds-accent2: var(--accent2, #c8abe6); --ds-text: var(--text, #0b1220); }
    .ds-chatbot-btn { position: fixed; right: 20px; bottom: 20px; width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, var(--ds-accent), var(--ds-accent2)); color: #fff; display: grid; place-items: center; font-size: 24px; cursor: pointer; box-shadow: 0 10px 24px rgba(0,0,0,.25), 0 0 0 3px rgba(255,255,255,.7) inset; z-index: 9999; transition: transform .15s ease, box-shadow .2s ease; border: 0; }
    .ds-chatbot-btn:hover { transform: translateY(-2px); box-shadow: 0 16px 36px rgba(0,0,0,.3), 0 0 0 3px rgba(255,255,255,.9) inset; }
    .ds-chatbot-panel { position: fixed; right: 20px; bottom: 86px; width: min(360px, 92vw); max-height: min(70vh, 620px); background: #fff; color: var(--ds-text); border-radius: 16px; box-shadow: 0 24px 64px rgba(0,0,0,.35); display: none; flex-direction: column; overflow: hidden; z-index: 10000; border: 1px solid rgba(0,0,0,.08); }
    .ds-chatbot-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px; background: linear-gradient(135deg, rgba(110,184,225,.12), rgba(200,171,230,.12)); border-bottom: 1px solid rgba(0,0,0,.06); }
    .ds-chatbot-title { display: flex; align-items: center; gap: 8px; font-weight: 800; }
    .ds-chip { background: linear-gradient(135deg, var(--ds-accent), var(--ds-accent2)); color: #fff; font-size: 12px; border-radius: 999px; padding: 2px 8px; font-weight: 700; }
    .ds-close { background: transparent; border: 0; color: var(--ds-text); font-size: 20px; cursor: pointer; }
    .ds-chatbot-body { display: flex; flex-direction: column; gap: 10px; padding: 12px; overflow: auto; }
    .ds-msg { max-width: 80%; padding: 10px 12px; border-radius: 12px; line-height: 1.35; font-size: 14px; box-shadow: 0 1px 0 rgba(0,0,0,.05); }
    .ds-msg.user { align-self: flex-end; background: rgba(110,184,225,.15); }
    .ds-msg.bot { align-self: flex-start; background: rgba(200,171,230,.15); }
    .ds-time { display: block; margin-top: 4px; opacity: .6; font-size: 11px; }
    .ds-chatbot-input { display: flex; gap: 8px; padding: 10px; border-top: 1px solid rgba(0,0,0,.06); background: #fafafa; }
    .ds-input { flex: 1; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(0,0,0,.12); font-size: 14px; outline: none; }
    .ds-send { background: linear-gradient(135deg, var(--ds-accent), var(--ds-accent2)); color: #fff; border: 0; border-radius: 10px; padding: 10px 14px; font-weight: 800; cursor: pointer; }
    .ds-actions { display: flex; gap: 8px; margin-top: 6px; }
    .ds-action { border: 1px solid rgba(0,0,0,.1); background: #fff; border-radius: 999px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.className = 'ds-chatbot-btn';
  btn.setAttribute('aria-label', 'Open DocuSuite Assistant');
  btn.innerHTML = '🤖';

  const panel = document.createElement('div');
  panel.className = 'ds-chatbot-panel';
  panel.innerHTML = `
    <div class="ds-chatbot-header">
      <div class="ds-chatbot-title"><span>🤖</span><span>DocuSuite Assistant</span><span class="ds-chip">AI</span></div>
      <button class="ds-close" aria-label="Close">×</button>
    </div>
    <div class="ds-chatbot-body" id="dsChatBody"></div>
    <div class="ds-chatbot-input">
      <input class="ds-input" id="dsChatInput" placeholder="Ask about documents, taxes, legal advise..." />
      <button class="ds-send" id="dsSendBtn">Send</button>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  const bodyEl = panel.querySelector('#dsChatBody');
  const inputEl = panel.querySelector('#dsChatInput');
  const sendEl = panel.querySelector('#dsSendBtn');
  const closeEl = panel.querySelector('.ds-close');

  let questionCount = 0;
  let hasPromptedFurtherHelp = false;

  function nowTime() {
    try {
      return new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  function appendMessage(text, who) {
    const div = document.createElement('div');
    div.className = `ds-msg ${who}`;
    div.innerHTML = `${text}<span class="ds-time">${nowTime()}</span>`;
    bodyEl.appendChild(div);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    return div;
  }

  function openPanel() {
    panel.style.display = 'flex';
    inputEl.focus();
  }
  function closePanel() {
    panel.style.display = 'none';
  }
  function togglePanel() {
    if (panel.style.display === 'flex') closePanel();
    else openPanel();
  }

  btn.addEventListener('click', togglePanel);
  closeEl.addEventListener('click', closePanel);

  function navigateToLegal() {
    const target = document.getElementById('legal');
    if (target) {
      closePanel();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.location.href = '/index.html#legal';
    }
  }

  function showFurtherHelpPrompt() {
    if (hasPromptedFurtherHelp) return;
    hasPromptedFurtherHelp = true;
    const wrap = document.createElement('div');
    wrap.className = 'ds-msg bot';
    wrap.innerHTML = `For further doubts, would you like to go to the Legal Advise section?<div class="ds-actions"><button class="ds-action" data-ans="yes">Yes, take me there</button><button class="ds-action" data-ans="no">No, thanks</button></div><span class="ds-time">${nowTime()}</span>`;
    bodyEl.appendChild(wrap);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    wrap.querySelectorAll('.ds-action').forEach((b) => {
      b.addEventListener('click', (e) => {
        const ans = e.currentTarget.getAttribute('data-ans');
        if (ans === 'yes') {
          navigateToLegal();
        } else {
          appendMessage('Thank you! Have a great day.', 'bot');
          closePanel();
        }
      });
    });
  }

  function answerQuestion(q) {
    const text = q.toLowerCase();
    const kb = [
      {
        k: ['document generation', 'docgen', 'generate'],
        a: 'Use our Document Generation page to create Company Certificates, MOA/AOA, and more. Start at /docgen.html.',
      },
      {
        k: ['summarize', 'summary', 'summarization'],
        a: 'Go to the Summarization section on the home page to summarize text or PDF. It is under the Summarization card.',
      },
      {
        k: ['company', 'incorporation', 'name approval', 'name registration'],
        a: 'For Company Registration steps (RUN name, DSC, DIN, SPICe+), see the Company flow and timeline on the site.',
      },
      {
        k: ['dsc', 'digital signature'],
        a: 'DSC can be generated from the Company section. Fill the DSC form and download the PDF.',
      },
      {
        k: ['din'],
        a: 'DIN is generated via the DIN form in the Company section. Submit details to get the DIN and PDF.',
      },
      {
        k: ['moa', 'aoa'],
        a: 'MOA and AOA are available in the Company Document Generation flows. Provide class details to generate PDFs.',
      },
      {
        k: ['tax', 'gst'],
        a: 'For Tax/GST registration, use the Tax page to apply. You will get a registration number and the PDF.',
      },
      {
        k: ['license', 'government'],
        a: 'Government licenses (FSSAI, Trade, Shops & Establishment) can be applied from the Government Licenses page.',
      },
      {
        k: ['legal', 'advise', 'advice', 'lawyer'],
        a: 'You can request expert help in the Legal Advise section at the bottom of the home page. We will connect you.',
      },
      {
        k: ['login', 'register', 'auth'],
        a: 'Use the Login/Register controls in the navbar, or the dedicated Login page, to sign in to DocuSuite.',
      },
    ];
    const hit = kb.find((r) => r.k.some((kw) => text.includes(kw)));
    return hit
      ? hit.a
      : "I'm your AI assistant for DocuSuite. Ask about document generation, summarization, company registration, taxes, or legal advise.";
  }

  function handleSend() {
    const val = String(inputEl.value || '').trim();
    if (!val) return;
    appendMessage(val, 'user');
    inputEl.value = '';
    questionCount += 1;
    const thinking = appendMessage('Typing…', 'bot');
    setTimeout(() => {
      thinking.innerHTML = `${answerQuestion(
        val
      )}<span class="ds-time">${nowTime()}</span>`;
      bodyEl.scrollTop = bodyEl.scrollHeight;
      if (questionCount === 3) {
        setTimeout(showFurtherHelpPrompt, 300);
      }
    }, 400);
  }

  sendEl.addEventListener('click', handleSend);
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  });

  // Greeting
  appendMessage(
    'Hi! I can help with company registration, licenses, taxes, summarization, and more. How can I help?',
    'bot'
  );
})();
