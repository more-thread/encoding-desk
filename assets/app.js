/* Encoding Desk — paste a screenshot or a conversation, get the record.
   The AI reader handles both; plain text falls back to an on-device reader. */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var AI_KEY = 'encoding-desk:ai:v1';
  var LEGACY_AI_KEY = 'itpms-encoder:ai:v1';

  var FIELDS = [
    { key: 'type', label: 'TYPE' },
    { key: 'module', label: 'MODULE ID' },
    { key: 'description', label: 'DESCRIPTION' },
    { key: 'dept', label: 'DEPARTMENT ID' },
    { key: 'challenge', label: 'CHALLENGE' },
    { key: 'resolution', label: 'RESOLUTION' }
  ];

  var shots = [];
  var record = null;
  var preparing = 0;

  /* ---------- text helpers ---------- */

  /* A semicolon inside a field would silently add a seventh field. */
  function sanitize(v) {
    return String(v).replace(/[\r\n]+/g, ' ').replace(/;/g, ',').replace(/\s+/g, ' ').trim();
  }

  function tidy(s) {
    var out = String(s).replace(/\s+/g, ' ')
      .replace(/\s+([.,:;!?])/g, '$1')
      .replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
      .trim().replace(/[.…:,\s]+$/, '');
    return out ? out.charAt(0).toUpperCase() + out.slice(1) : '';
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- AI reader ---------- */

  function loadAI() {
    try {
      var raw = localStorage.getItem(AI_KEY);
      /* Carry over a key saved under the old name so it is not silently lost. */
      if (!raw) {
        var legacy = localStorage.getItem(LEGACY_AI_KEY);
        if (legacy) {
          localStorage.setItem(AI_KEY, legacy);
          localStorage.removeItem(LEGACY_AI_KEY);
          raw = legacy;
        }
      }
      var cfg = JSON.parse(raw || '{}');
      var prov = providerById(cfg.provider);
      var model = cfg.model || prov.defaultModel;
      if (RETIRED_MODELS[model]) model = RETIRED_MODELS[model];
      return {
        provider: prov.id,
        model: model,
        url: cfg.url || prov.url,
        key: cfg.key || ''
      };
    } catch (e) {
      return {
        provider: AI_PROVIDERS[0].id, model: AI_PROVIDERS[0].defaultModel,
        url: AI_PROVIDERS[0].url, key: ''
      };
    }
  }

  function saveAI(cfg) {
    try { localStorage.setItem(AI_KEY, JSON.stringify(cfg)); return true; }
    catch (e) { return false; }
  }

  function providerById(id) {
    return AI_PROVIDERS.filter(function (p) { return p.id === id; })[0] || AI_PROVIDERS[0];
  }

  /* The standard is the only place codes are defined. Reading them back out
     means adding a module there is enough — nothing else to keep in step. */
  function codesUnder(heading) {
    var std = $('promptSource').textContent;
    var at = std.indexOf(heading);
    if (at === -1) return [];
    var block = std.slice(at + heading.length);
    var end = block.indexOf('\n# ');
    if (end !== -1) block = block.slice(0, end);
    var out = [], re = /^-\s*([A-Z0-9]+)\s*:/gm, m;
    while ((m = re.exec(block)) !== null) out.push(m[1]);
    return out;
  }

  var MODULE_IDS = codesUnder('# Supported MODULE IDs');
  var DEPT_IDS = codesUnder('# Supported DEPARTMENT IDs');
  var TYPE_IDS = TYPES;

  function systemPrompt() {
    return $('promptSource').textContent +
      '\n\n# Output contract\n' +
      '- Reply with JSON only, matching the requested schema. No prose, no code fences.\n' +
      '- MODULE ID must be one of: ' + MODULE_IDS.join(', ') + '.\n' +
      '- DEPARTMENT ID must be one of: ' + DEPT_IDS.join(', ') + '.\n' +
      '- TYPE must be one of: ' + TYPE_IDS.join(', ') + '.\n' +
      '- If the module or department cannot be determined, return "UNKNOWN" for that field.\n' +
      '  Do not guess a code the message does not support.\n' +
      '- Write Description, Challenge and Resolution as formal English sentences, even when\n' +
      '  the source is in Filipino, Taglish, or shorthand.\n' +
      '- Keep employee numbers, surnames and dates exactly as they appear.\n' +
      '- Never put a semicolon inside a field value; it separates fields.\n' +
      '- Description states what is being asked for. Challenge states what blocks closing it,\n' +
      '  not a restatement of the request. Resolution states what was done or where it goes next.\n' +
      '- When the input is a screenshot of a conversation, read every message in it and encode\n' +
      '  the whole thread as one entry. Ignore interface chrome, timestamps and reactions.\n' +
      '- Use "notes" for anything you could not determine and would need to ask the requester.';
  }

  var AI_SCHEMA = {
    type: 'OBJECT',
    properties: {
      type: { type: 'STRING', enum: TYPE_IDS },
      module: { type: 'STRING', enum: MODULE_IDS.concat(['UNKNOWN']) },
      description: { type: 'STRING' },
      dept: { type: 'STRING', enum: DEPT_IDS.concat(['UNKNOWN']) },
      challenge: { type: 'STRING' },
      resolution: { type: 'STRING' },
      notes: { type: 'STRING' }
    },
    required: ['type', 'module', 'description', 'dept', 'challenge', 'resolution'],
    propertyOrdering: ['type', 'module', 'description', 'dept', 'challenge', 'resolution', 'notes']
  };

  function fetchJSON(url, options, timeoutMs) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, timeoutMs || 60000);
    options.signal = controller.signal;
    return fetch(url, options).then(function (res) {
      return res.text().then(function (body) {
        clearTimeout(timer);
        var parsed = null;
        try { parsed = JSON.parse(body); } catch (e) { /* keep raw */ }
        if (!res.ok) {
          var msg = parsed && parsed.error && (parsed.error.message || parsed.error.code);
          throw new Error(msg || ('HTTP ' + res.status));
        }
        if (!parsed) throw new Error('The provider returned a response that was not JSON.');
        return parsed;
      });
    }, function (err) {
      clearTimeout(timer);
      throw new Error(err.name === 'AbortError'
        ? 'The provider did not answer in time.'
        : 'Could not reach the provider. Check the network and the key.');
    });
  }

  function askText() {
    return shots.length
      ? 'Encode the conversation in the attached screenshot' + (shots.length > 1 ? 's' : '') + '.'
      : '';
  }

  function callGemini(cfg, text) {
    var parts = shots.map(function (s) {
      return { inline_data: { mime_type: s.mime, data: s.base64 } };
    });
    parts.push({ text: text || askText() });
    var base = (cfg.url || providerById('gemini').url).replace(/\/+$/, '');
    var url = base + '/models/' + encodeURIComponent(cfg.model) +
      ':generateContent?key=' + encodeURIComponent(cfg.key);
    return fetchJSON(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt() }] },
        contents: [{ role: 'user', parts: parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: AI_SCHEMA
        }
      })
    }).then(function (data) {
      var cand = data.candidates && data.candidates[0];
      var part = cand && cand.content && cand.content.parts && cand.content.parts[0];
      if (!part || !part.text) {
        var blocked = (data.promptFeedback && data.promptFeedback.blockReason) ||
          (cand && cand.finishReason === 'SAFETY' && 'SAFETY');
        throw new Error(blocked ? 'The provider blocked this input (' + blocked + ').'
                                : 'The provider returned an empty answer.');
      }
      return part.text;
    });
  }

  function callOpenAI(cfg, text) {
    var content = shots.map(function (s) {
      return { type: 'image_url', image_url: { url: 'data:' + s.mime + ';base64,' + s.base64 } };
    });
    content.push({ type: 'text', text: text || askText() });
    return fetchJSON(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt() },
          { role: 'user', content: content }
        ]
      })
    }).then(function (data) {
      var choice = data.choices && data.choices[0];
      var out = choice && choice.message && choice.message.content;
      if (!out) throw new Error('The provider returned an empty answer.');
      return out;
    });
  }

  function callProvider(cfg, text) {
    var prov = providerById(cfg.provider);
    if (prov.kind === 'openai' && !cfg.url) {
      return Promise.reject(new Error('Set the endpoint URL for ' + prov.name + ' first.'));
    }
    if (!cfg.model) {
      return Promise.reject(new Error('Choose a model first — use List models to see what the key allows.'));
    }
    return prov.kind === 'openai' ? callOpenAI(cfg, text) : callGemini(cfg, text);
  }

  /* Model IDs move often enough that guessing them is the main setup failure.
     Every provider here exposes a list endpoint, so ask it. */
  function listModels(cfg) {
    var prov = providerById(cfg.provider);
    if (prov.kind === 'gemini') {
      var base = (cfg.url || prov.url).replace(/\/+$/, '');
      return fetchJSON(base + '/models?key=' + encodeURIComponent(cfg.key), { method: 'GET' })
        .then(function (d) {
          return (d.models || []).filter(function (m) {
            return (m.supportedGenerationMethods || []).indexOf('generateContent') !== -1;
          }).map(function (m) { return String(m.name).replace(/^models\//, ''); });
        });
    }
    var url = cfg.url.replace(/\/chat\/completions\/?$/, '/models');
    return fetchJSON(url, { method: 'GET', headers: { 'Authorization': 'Bearer ' + cfg.key } })
      .then(function (d) {
        return (d.data || d.models || []).map(function (m) { return m.id || m.name; }).filter(Boolean);
      });
  }

  /* Models sometimes fence the JSON despite the contract. */
  function parseAIReply(text) {
    var t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try { return JSON.parse(t); }
    catch (e) {
      var first = t.indexOf('{'), last = t.lastIndexOf('}');
      if (first === -1 || last <= first) throw new Error('The answer was not valid JSON.');
      return JSON.parse(t.slice(first, last + 1));
    }
  }

  function pickCode(val, allowed) {
    var v = String(val || '').trim().toUpperCase();
    return allowed.indexOf(v) !== -1 ? v : '';
  }

  function toRecord(obj) {
    var notes = [];
    var mod = pickCode(obj.module, MODULE_IDS);
    var dep = pickCode(obj.dept, DEPT_IDS);
    var rejected = [];
    if (obj.module && !mod && String(obj.module).toUpperCase() !== 'UNKNOWN') {
      rejected.push('module "' + obj.module + '"');
    }
    if (obj.dept && !dep && String(obj.dept).toUpperCase() !== 'UNKNOWN') {
      rejected.push('department "' + obj.dept + '"');
    }
    if (rejected.length) {
      notes.push('Returned ' + rejected.join(' and ') + ', which is not in the standard.');
    }
    if (obj.notes) notes.push(String(obj.notes));
    return {
      rec: {
        type: pickCode(obj.type, TYPE_IDS) || 'SUPPORT',
        module: mod,
        description: tidy(sanitize(obj.description || '')),
        dept: dep,
        challenge: tidy(sanitize(obj.challenge || '')),
        resolution: tidy(sanitize(obj.resolution || ''))
      },
      notes: notes
    };
  }

  /* ---------- screenshots ---------- */

  var MAX_SHOTS = 4;
  var MAX_EDGE = 2000;

  /* Screenshots of chat threads are tall and mostly text. Downscaling keeps the
     request small without dropping the resolution the model needs to read it. */
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Could not read that image.')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('That file is not an image the browser can open.')); };
        img.onload = function () {
          var scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
          var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          var url = canvas.toDataURL('image/jpeg', 0.92);
          resolve({
            mime: 'image/jpeg',
            base64: url.slice(url.indexOf(',') + 1),
            thumb: url,
            w: w, h: h
          });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function addShots(files) {
    var list = Array.prototype.filter.call(files, function (f) {
      return f && f.type && f.type.indexOf('image/') === 0;
    });
    if (!list.length) return;
    var room = MAX_SHOTS - shots.length;
    if (room <= 0) {
      setTopStatus('That is the limit of ' + MAX_SHOTS + ' screenshots.', 'warn');
      return;
    }
    preparing++;
    setTopStatus('Preparing ' + Math.min(list.length, room) + ' image…');
    Promise.all(list.slice(0, room).map(shrink))
      .then(function (added) {
        shots = shots.concat(added);
        renderShots();
        setTopStatus(shots.length + (shots.length === 1 ? ' screenshot ready.' : ' screenshots ready.') +
          ' Choose Encode.', 'ok');
      })
      .catch(function (err) { setTopStatus(err.message, 'warn'); })
      .then(function () { preparing--; });
  }

  function renderShots() {
    $('shots').hidden = shots.length === 0;
    $('shots').innerHTML = shots.map(function (s, i) {
      return '<figure class="shot"><img src="' + s.thumb + '" alt="Screenshot ' + (i + 1) + '">' +
        '<button type="button" class="shot-x" data-drop-shot="' + i + '" ' +
        'aria-label="Remove screenshot ' + (i + 1) + '">&times;</button>' +
        '<figcaption>' + s.w + '&times;' + s.h + '</figcaption></figure>';
    }).join('');
  }

  /* ---------- result ---------- */

  function buildLine(rec) {
    return [rec.type, rec.module, rec.description, rec.dept, rec.challenge, rec.resolution, 'NONE']
      .map(sanitize).join('; ');
  }

  function missingIn(rec) {
    return FIELDS.filter(function (f) { return !sanitize(rec[f.key]); });
  }

  function showResult(rec, notes) {
    record = rec;
    var missing = missingIn(rec);
    var parts = FIELDS.map(function (f) { return sanitize(rec[f.key]); }).concat(['NONE']);

    $('resultLine').innerHTML = parts.map(function (p, i) {
      return p ? esc(p) : '<span class="gap">' + FIELDS[i].label + ' ?</span>';
    }).join('<span class="sep">; </span>');

    $('resultMeta').textContent = missing.length
      ? (6 - missing.length) + ' of 6 fields'
      : 'All six fields';

    $('breakdownBody').innerHTML = FIELDS.map(function (f, i) {
      var v = sanitize(rec[f.key]);
      return '<tr><td class="code">' + String(i + 1).padStart(2, '0') + ' ' + f.label + '</td>' +
        '<td>' + (v ? esc(v) : '<span class="gap">not determined</span>') + '</td></tr>';
    }).join('') + '<tr><td class="code">07 TRAILING</td><td>NONE</td></tr>';

    var all = (notes || []).slice();
    if (missing.length) {
      all.unshift('Could not determine ' + missing.map(function (f) { return f.label; }).join(' and ') +
        '. Fill it in after copying, or paste more of the conversation.');
    }
    $('resultNotes').hidden = all.length === 0;
    $('resultNotes').innerHTML = all.map(esc).join('<br>');

    $('result').hidden = false;
    $('result').classList.remove('is-in');
    void $('result').offsetWidth;
    $('result').classList.add('is-in');
    setTopStatus('');
  }

  function setStatus(msg, kind) {
    $('status').textContent = msg;
    $('status').className = 'status' + (kind ? ' is-' + kind : '');
  }

  function setTopStatus(msg, kind) {
    $('topStatus').textContent = msg;
    $('topStatus').className = 'status status--standalone' + (kind ? ' is-' + kind : '');
  }

  function setBusy(busy) {
    $('encodeBtn').disabled = busy;
    $('encodeBtn').textContent = busy ? 'Encoding…' : 'Encode';
  }

  function encode() {
    var text = $('raw').value.trim();
    /* Encoding mid-shrink would quietly drop the screenshot from the request. */
    if (preparing > 0) {
      setTopStatus('Still preparing the screenshot. Try again in a moment.', 'warn');
      return;
    }
    if (!text && !shots.length) {
      setTopStatus('Paste a conversation or a screenshot first.', 'warn');
      $('raw').focus();
      return;
    }
    var cfg = loadAI();
    if (!cfg.key) {
      openAISettings(true);
      setTopStatus('Add a free API key to encode — it takes a minute. See below.', 'warn');
      return;
    }

    setBusy(true);
    setTopStatus('Reading with ' + providerById(cfg.provider).name + '…');
    callProvider(cfg, text)
      .then(function (reply) {
        var out = toRecord(parseAIReply(reply));
        showResult(out.rec, out.notes);
        setStatus('Check the line before you file it.', 'ok');
      })
      .catch(function (err) { setTopStatus(err.message, 'warn'); })
      .then(function () { setBusy(false); });
  }

  /* ---------- clipboard ---------- */

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy blocked'));
    });
  }

  /* ---------- AI panel ---------- */

  function keyHintHTML(prov) {
    var bits = [];
    if (prov.prefix) bits.push('Starts with <code>' + esc(prov.prefix) + '</code>.');
    if (prov.note) bits.push(esc(prov.note));
    if (prov.keyUrl) {
      bits.push('Get one at <a href="' + esc(prov.keyUrl) + '" target="_blank" rel="noopener noreferrer">' +
        esc(prov.keyUrl.replace('https://', '')) + '</a>');
    }
    return bits.join(' ');
  }

  function openAISettings(open) {
    $('aiSettings').hidden = !open;
    $('aiToggle').setAttribute('aria-expanded', open ? 'true' : 'false');
    $('aiToggle').textContent = open ? 'Hide' : (loadAI().key ? 'Settings' : 'Set up');
    if (open) $('aiPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function renderAIState() {
    var cfg = loadAI();
    var prov = providerById(cfg.provider);
    $('aiState').textContent = cfg.key
      ? 'Ready — ' + prov.name + ', ' + cfg.model
      : 'No key saved. Add one to start encoding.';
    $('aiState').classList.toggle('is-ready', !!cfg.key);
    $('aiKeyHint').innerHTML = keyHintHTML(prov);
    if ($('aiSettings').hidden) $('aiToggle').textContent = cfg.key ? 'Settings' : 'Set up';
  }

  function readPanel() {
    var prov = providerById($('aiProvider').value);
    return {
      provider: prov.id,
      model: $('aiModel').value.trim() || prov.defaultModel,
      url: $('aiUrl').value.trim() || prov.url,
      key: $('aiKey').value.trim()
    };
  }

  function showUrlField(prov) {
    $('aiUrlRow').hidden = prov.kind !== 'openai';
  }

  function buildAIPanel() {
    $('aiProvider').innerHTML = AI_PROVIDERS.map(function (p) {
      return '<option value="' + p.id + '">' + esc(p.name) + '</option>';
    }).join('');
    var cfg = loadAI();
    $('aiProvider').value = cfg.provider;
    $('aiModel').value = cfg.model;
    $('aiUrl').value = cfg.url;
    $('aiKey').value = cfg.key;
    showUrlField(providerById(cfg.provider));
    renderAIState();
  }

  /* ---------- wiring ---------- */

  function bind() {
    $('encodeBtn').addEventListener('click', encode);

    $('raw').addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); encode(); }
    });

    /* Paste anywhere on the page: an image becomes a screenshot, text lands in the box. */
    document.addEventListener('paste', function (e) {
      if (!e.clipboardData) return;
      var files = [];
      Array.prototype.forEach.call(e.clipboardData.items || [], function (item) {
        if (item.kind === 'file' && item.type.indexOf('image/') === 0) {
          var f = item.getAsFile();
          if (f) files.push(f);
        }
      });
      if (files.length) {
        e.preventDefault();
        addShots(files);
      }
    });

    ['dragenter', 'dragover'].forEach(function (ev) {
      $('drop').addEventListener(ev, function (e) {
        e.preventDefault();
        $('drop').classList.add('is-over');
      });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      $('drop').addEventListener(ev, function (e) {
        e.preventDefault();
        if (ev === 'dragleave' && $('drop').contains(e.relatedTarget)) return;
        $('drop').classList.remove('is-over');
      });
    });
    $('drop').addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) addShots(e.dataTransfer.files);
    });

    $('shotBtn').addEventListener('click', function () { $('shotInput').click(); });
    $('shotInput').addEventListener('change', function (e) {
      addShots(e.target.files);
      e.target.value = '';
    });

    $('shots').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-drop-shot]');
      if (!btn) return;
      shots.splice(Number(btn.getAttribute('data-drop-shot')), 1);
      renderShots();
    });

    $('clearBtn').addEventListener('click', function () {
      $('raw').value = '';
      shots = [];
      record = null;
      renderShots();
      $('result').hidden = true;
      setTopStatus('');
      $('raw').focus();
    });

    $('copyBtn').addEventListener('click', function () {
      if (!record) return;
      var missing = missingIn(record);
      copyText(buildLine(record)).then(function () {
        setStatus(missing.length
          ? 'Copied, with ' + missing.map(function (f) { return f.label; }).join(' and ') + ' still empty.'
          : 'Copied.', missing.length ? 'warn' : 'ok');
      }).catch(function () {
        setStatus('Copying was blocked. Select the line and copy it.', 'warn');
      });
    });

    $('breakdownBtn').addEventListener('click', function () {
      var open = $('breakdown').hidden;
      $('breakdown').hidden = !open;
      $('breakdownBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
      $('breakdownBtn').textContent = open ? 'Hide fields' : 'Show fields';
    });

    $('aiToggle').addEventListener('click', function () { openAISettings($('aiSettings').hidden); });

    $('aiProvider').addEventListener('change', function () {
      var prov = providerById($('aiProvider').value);
      $('aiModel').value = prov.defaultModel;
      $('aiUrl').value = prov.url;
      showUrlField(prov);
      $('aiKeyHint').innerHTML = keyHintHTML(prov);
      $('aiSaveStatus').textContent = prov.defaultModel
        ? 'Save the key to use ' + prov.name + '.'
        : 'Add your key, then choose List models to pick one.';
    });

    $('aiSaveBtn').addEventListener('click', function () {
      var cfg = readPanel();
      $('aiModel').value = cfg.model;
      if (!cfg.key) { $('aiSaveStatus').textContent = 'Paste a key first.'; return; }
      $('aiSaveStatus').textContent = saveAI(cfg)
        ? 'Saved in this browser.'
        : 'This browser is not storing settings, so the key lasts for this page only.';
      renderAIState();
    });

    $('aiForgetBtn').addEventListener('click', function () {
      try { localStorage.removeItem(AI_KEY); } catch (e) { /* nothing to remove */ }
      $('aiKey').value = '';
      $('aiSaveStatus').textContent = 'Key removed from this browser.';
      renderAIState();
    });

    $('aiListBtn').addEventListener('click', function () {
      var cfg = readPanel();
      if (!cfg.key) { $('aiSaveStatus').textContent = 'Paste a key first.'; return; }
      $('aiSaveStatus').textContent = 'Asking the provider what it offers…';
      listModels(cfg)
        .then(function (ids) {
          if (!ids.length) { $('aiSaveStatus').textContent = 'The provider listed no models.'; return; }
          $('aiSaveStatus').textContent = ids.length + ' models available. Choose one:';
          $('aiModels').hidden = false;
          $('aiModels').innerHTML = ids.sort().map(function (id) {
            return '<button type="button" class="chip" data-model="' + esc(id) + '">' + esc(id) + '</button>';
          }).join('');
        })
        .catch(function (err) { $('aiSaveStatus').textContent = err.message; });
    });

    $('aiModels').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-model]');
      if (!btn) return;
      $('aiModel').value = btn.getAttribute('data-model');
      $('aiModels').hidden = true;
      $('aiSaveStatus').textContent = 'Model set. Choose Save key, then Test connection.';
    });

    $('aiTestBtn').addEventListener('click', function () {
      var cfg = readPanel();
      if (!cfg.key) { $('aiSaveStatus').textContent = 'Paste a key first.'; return; }
      $('aiSaveStatus').textContent = 'Testing…';
      var held = shots;
      shots = [];
      callProvider(cfg, 'Hi sir, pacheck po ng canteen sync. Salamat.')
        .then(function (reply) {
          parseAIReply(reply);
          $('aiSaveStatus').textContent = 'Works — ' + cfg.model + ' answered in the right shape.';
        })
        .catch(function (err) { $('aiSaveStatus').textContent = err.message; })
        .then(function () { shots = held; });
    });
  }

  buildAIPanel();
  bind();

  /* An empty enum would force every answer to UNKNOWN while still looking
     like it worked, so say so instead. */
  if (!MODULE_IDS.length || !DEPT_IDS.length) {
    $('encodeBtn').disabled = true;
    setTopStatus('The code lists could not be read from the standard in index.html. ' +
      'Check the "# Supported MODULE IDs" and "# Supported DEPARTMENT IDs" sections.', 'warn');
  }
})();
