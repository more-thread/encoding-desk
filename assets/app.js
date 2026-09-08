/* ITPMS Log Encoder — reads an informal message, drafts the six fields,
   validates them, and builds the semicolon-separated entry. No network calls. */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var STORE_KEY = 'itpms-encoder:entries:v1';

  var FIELDS = [
    { key: 'type', label: 'TYPE' },
    { key: 'module', label: 'MODULE ID' },
    { key: 'description', label: 'DESCRIPTION' },
    { key: 'dept', label: 'DEPARTMENT ID' },
    { key: 'challenge', label: 'CHALLENGE' },
    { key: 'resolution', label: 'RESOLUTION' }
  ];

  var value = { type: 'SUPPORT', module: '', description: '', dept: '', challenge: '', resolution: '' };
  var drafted = {};
  var entries = [];

  /* ---------- text helpers ---------- */

  function normalize(s) {
    return ' ' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  }

  function hasCue(norm, cue) {
    var c = normalize(cue).trim();
    if (!c) return false;
    if (norm.indexOf(' ' + c + ' ') !== -1) return true;
    return c.length >= 5 && norm.indexOf(c) !== -1;
  }

  function score(norm, cues) {
    var total = 0, hits = [];
    for (var i = 0; i < cues.length; i++) {
      if (hasCue(norm, cues[i][0])) { total += cues[i][1]; hits.push(cues[i][0]); }
    }
    return { total: total, hits: hits };
  }

  function trimHits(hits) {
    return hits.slice(0, 3).map(function (h) { return h.trim(); }).join(', ');
  }

  function best(norm, list) {
    var top = null;
    for (var i = 0; i < list.length; i++) {
      var s = score(norm, list[i].cues);
      if (s.total > 0 && (!top || s.total > top.score)) {
        top = { id: list[i].id, score: s.total, hits: s.hits };
      }
    }
    return top;
  }

  /* Field text is stored as typed and cleaned when the line is built:
     a stray semicolon would silently add a seventh field. */
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

  /* ---------- reading the message ---------- */

  var GREETING = /^(sir|ma'?am|maam)?[\s,]*\b(hi+|hello+|hey|good\s+(morning|afternoon|evening|day))\b[\s,.!]*(sir|ma'?am|maam|po)?[\s,.!:]*/i;

  /* Taglish request forms this desk sees every day. The pa- prefix is the ask;
     the English stem is the action, so the stem alone reads as a log entry. */
  var REQUEST_VERBS = [
    [/\bpa-?cancel\b/gi, 'cancel'], [/\bpa-?check\b/gi, 'check'],
    [/\bpa-?update\b/gi, 'update'], [/\bpa-?delete\b/gi, 'delete'],
    [/\bpa-?add\b/gi, 'add'], [/\bpa-?reset\b/gi, 'reset'],
    [/\bpa-?approve\b/gi, 'approve'], [/\bpa-?revise\b/gi, 'revise'],
    [/\bpa-?open\b/gi, 'open'], [/\bpa-?activate\b/gi, 'activate'],
    [/\bpa-?encode\b/gi, 'encode'], [/\bpa-?upload\b/gi, 'upload'],
    [/\bpa-?extend\b/gi, 'extend'], [/\bpa-?help\b/gi, 'assist with']
  ];

  var FILLERS = /\b(po|opo|yong|yung|nito|niyan|naman|sana|lang|kaya|pala|pede|pwede|puwede|ba|daw)\b/gi;
  var PROBLEM = ['error', 'bug', 'not working', 'hindi', 'cannot', "can't", 'issue', 'problem', 'failed',
    'stuck', 'wrong', 'incorrect', 'missing', 'bakit', 'delayed', 'pending', 'duplicate', 'unclear',
    'double', 'mali', 'walang', 'wala', 'nagpapakita', 'still'];

  function splitSentences(text) {
    var NL = String.fromCharCode(10);
    return text.replace(/([.!?])\s+/g, '$1' + NL).split(NL)
      .map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function stripPoliteness(s) {
    var out = String(s).replace(GREETING, '');
    REQUEST_VERBS.forEach(function (pair) { out = out.replace(pair[0], pair[1]); });
    return out
      .replace(FILLERS, ' ')
      .replace(/\b(sir|ma'?am|maam)\b/gi, ' ')
      .replace(/\b(thank you|thanks|salamat)\b[\s.!]*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function draftDescription(text) {
    var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var kept = lines.filter(function (l) { return !(GREETING.test(l) && l.replace(GREETING, '').trim().length < 3); });
    var body = stripPoliteness(kept.join(' '));
    var out = splitSentences(body).slice(0, 2).join(' ');
    if (out.length > 220) out = out.slice(0, 217).replace(/\s+\S*$/, '') + '…';
    return tidy(out);
  }

  function draftChallenge(text, description) {
    var sentences = splitSentences(stripPoliteness(text));
    var desc = normalize(description || '').trim();
    for (var i = 0; i < sentences.length; i++) {
      var norm = normalize(sentences[i]);
      /* Skip anything the description already says — a repeated sentence
         hides the blocker instead of naming it. */
      if (desc && desc.indexOf(norm.trim()) !== -1) continue;
      for (var j = 0; j < PROBLEM.length; j++) {
        if (hasCue(norm, PROBLEM[j])) {
          var s = tidy(sentences[i]);
          if (s.length > 180) s = s.slice(0, 177).replace(/\s+\S*$/, '') + '…';
          return s;
        }
      }
    }
    return '';
  }

  function findDetails(text) {
    var found = [];
    var patterns = [
      /\b\d{6,8}\b/g,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
      /\b\d{1,2}:\d{2}\s?(?:[ap]\.?m\.?)?/gi,
      /\b[A-Z][A-Z\-]+(?:\s+[A-Z][A-Z\-]+)*(?:,\s*[A-Z][A-Z\-]*\.?){1,3}/g
    ];
    patterns.forEach(function (re) {
      var m;
      while ((m = re.exec(text)) !== null) {
        var t = m[0].trim();
        if (t && found.indexOf(t) === -1) found.push(t);
      }
    });
    return found.slice(0, 8);
  }

  function readMessage() {
    var raw = $('raw').value.trim();
    if (!raw) {
      $('cues').innerHTML = '<p>Nothing to read. Paste a client message first.</p>';
      return;
    }
    var norm = normalize(raw);
    var notes = [];

    var typeHit = best(norm, TYPES);
    var type = typeHit ? typeHit.id : 'SUPPORT';
    setValue('type', type, true);
    notes.push({ field: 'Type', value: type, why: typeHit ? trimHits(typeHit.hits) : 'nothing matched — SUPPORT is the default' });

    var mod = best(norm, MODULES);
    setValue('module', mod ? mod.id : '', !!mod);
    notes.push({ field: 'Module ID', value: mod ? mod.id : 'not found', why: mod ? trimHits(mod.hits) : 'no module word in the message' });

    var dep = best(norm, DEPARTMENTS);
    setValue('dept', dep ? dep.id : '', !!dep);
    notes.push({ field: 'Department ID', value: dep ? dep.id : 'not found', why: dep ? trimHits(dep.hits) : 'no department named — ask the requester' });

    var desc = draftDescription(raw);
    setValue('description', desc, !!desc);

    var chal = draftChallenge(raw, desc);
    setValue('challenge', chal, !!chal);
    $('challengeHint').textContent = chal
      ? 'State the blocker, not the request again.'
      : 'Nothing in the message states the blocker. Write it, or ask the requester.';

    if (!value.resolution) setValue('resolution', 'For ITPMS Request', true);

    $('cues').innerHTML = '<ul class="cue-list">' + notes.map(function (n) {
      return '<li><b>' + esc(n.field) + ' → ' + esc(n.value) + '</b><br>' + esc(n.why) + '</li>';
    }).join('') + '</ul>';

    var details = findDetails(raw);
    $('detailsBox').hidden = details.length === 0;
    $('details').innerHTML = details.map(function (d) {
      return '<button type="button" class="chip" data-detail="' + esc(d) + '">' + esc(d) + '</button>';
    }).join('');

    stampCells();
    render();
    setStatus('Fields drafted. Check each one before you copy.', 'ok');
  }

  function stampCells() {
    var cells = document.querySelectorAll('.cell');
    Array.prototype.forEach.call(cells, function (cell, i) {
      cell.classList.remove('is-stamping');
      void cell.offsetWidth;
      cell.style.setProperty('--i', i);
      cell.classList.add('is-stamping');
    });
  }

  /* ---------- state ---------- */

  function setValue(key, val, isDraft) {
    value[key] = val;
    drafted[key] = !!isDraft && !!val;
    if (key === 'type') {
      var radio = document.querySelector('input[name="type"][value="' + val + '"]');
      if (radio) radio.checked = true;
      var t = TYPES.filter(function (x) { return x.id === val; })[0];
      $('typeHint').textContent = t ? t.hint : 'Pick the log this entry belongs to.';
    } else if (key === 'module') { $('moduleSelect').value = val; }
    else if (key === 'dept') { $('deptSelect').value = val; }
    else if (key === 'description') { $('descInput').value = val; autoGrow($('descInput')); }
    else if (key === 'challenge') { $('challengeInput').value = val; autoGrow($('challengeInput')); }
    else if (key === 'resolution') { $('resolutionInput').value = val; autoGrow($('resolutionInput')); }
  }

  function buildLine() {
    return [
      value.type,
      value.module,
      sanitize(value.description),
      value.dept,
      sanitize(value.challenge),
      sanitize(value.resolution),
      'NONE'
    ].join('; ');
  }

  function missingFields() {
    return FIELDS.filter(function (f) { return !sanitize(value[f.key]); });
  }

  function render() {
    FIELDS.forEach(function (f) {
      var cell = document.querySelector('.cell[data-field="' + f.key + '"]');
      if (!cell) return;
      var filled = !!sanitize(value[f.key]);
      cell.classList.toggle('is-filled', filled);
      cell.classList.toggle('is-empty', !filled);
      cell.classList.toggle('is-drafted', !!drafted[f.key] && filled);
    });

    var HINTS = {
      description: ['descHint', 'Keep the names, numbers, and dates from the message.'],
      challenge: ['challengeHint', null],
      resolution: ['resHint', 'What was done, or where the request goes next.']
    };
    Object.keys(HINTS).forEach(function (key) {
      var hint = $(HINTS[key][0]);
      if (!hint) return;
      if (String(value[key]).indexOf(';') !== -1) {
        hint.textContent = 'Semicolons become commas — they separate the fields.';
        hint.classList.add('is-warn');
      } else if (hint.classList.contains('is-warn')) {
        hint.classList.remove('is-warn');
        if (HINTS[key][1]) hint.textContent = HINTS[key][1];
      }
    });

    var parts = [value.type, value.module, sanitize(value.description), value.dept,
      sanitize(value.challenge), sanitize(value.resolution), 'NONE'];
    $('outputLine').innerHTML = parts.map(function (p, i) {
      if (p) return esc(p);
      return '<span class="gap">' + FIELDS[i].label + ' ?</span>';
    }).join('<span class="sep">; </span>');

    var missing = missingFields();
    $('fieldCount').textContent = (6 - missing.length) + ' of 6 fields filled';
    return missing;
  }

  function setStatus(msg, kind) {
    var s = $('status');
    s.textContent = msg;
    s.className = 'status' + (kind ? ' is-' + kind : '');
  }

  function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = Math.max(84, el.scrollHeight + 2) + 'px';
  }

  /* ---------- clipboard ---------- */

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
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

  /* ---------- week log ---------- */

  function loadEntries() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      entries = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(entries)) entries = [];
    } catch (e) { entries = []; }
  }

  function saveEntries() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(entries)); }
    catch (e) { setStatus('This browser is not storing the week list. The line above still copies.', 'warn'); }
  }

  function stampTime(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' }) + ' ' +
      d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  function renderLog() {
    $('logCount').textContent = entries.length + (entries.length === 1 ? ' entry' : ' entries');
    $('logEmpty').hidden = entries.length > 0;
    $('logTable').hidden = entries.length === 0;
    $('logBody').innerHTML = entries.map(function (e, i) {
      return '<tr><td class="num">' + esc(stampTime(e.ts)) + '</td>' +
        '<td class="log-line">' + esc(e.line) + '</td>' +
        '<td class="num"><button type="button" class="row-btn" data-copy-entry="' + i + '">Copy</button> ' +
        '<button type="button" class="row-btn" data-remove-entry="' + i + '">Remove</button></td></tr>';
    }).join('');
  }

  function toCSV() {
    var q = function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; };
    var rows = [['Saved at', 'Type', 'Module ID', 'Description', 'Department ID', 'Challenge', 'Resolution', 'Trailing', 'Encoded line']];
    entries.forEach(function (e) {
      rows.push([new Date(e.ts).toISOString(), e.type, e.module, e.description, e.dept, e.challenge, e.resolution, 'NONE', e.line]);
    });
    return rows.map(function (r) { return r.map(q).join(','); }).join('\r\n');
  }

  function download(name, text, mime) {
    var blob = new Blob([text], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- build the page ---------- */

  function buildTypeSet() {
    $('typeSet').innerHTML = TYPES.map(function (t) {
      return '<input type="radio" name="type" id="type-' + t.id + '" value="' + t.id + '"' +
        (t.id === value.type ? ' checked' : '') + '>' +
        '<label for="type-' + t.id + '">' + t.id + '</label>';
    }).join('');
  }

  function buildSelects() {
    $('moduleSelect').innerHTML = '<option value="">— choose a module —</option>' +
      MODULES.map(function (m) { return '<option value="' + m.id + '">' + m.id + ' · ' + esc(m.name) + '</option>'; }).join('');

    $('deptSelect').innerHTML = '<option value="">— choose a department —</option>' +
      DEPARTMENT_GROUPS.map(function (g) {
        return '<optgroup label="' + esc(g.label) + '">' + g.departments.map(function (d) {
          return '<option value="' + d.id + '">' + d.id + ' · ' + esc(d.name) + '</option>';
        }).join('') + '</optgroup>';
      }).join('');
  }

  function buildQuickPicks() {
    var chips = function (list, attr) {
      return list.map(function (r) {
        return '<button type="button" class="chip chip--text" title="' + esc(r.value) + '" data-' +
          attr + '="' + esc(r.value) + '">' + esc(r.label) + '</button>';
      }).join('');
    };
    $('quickRes').innerHTML = chips(QUICK_RESOLUTIONS, 'pick-resolution');
    $('quickChal').innerHTML = chips(QUICK_CHALLENGES, 'pick-challenge');
  }

  function buildReference() {
    $('moduleTable').innerHTML = MODULES.map(function (m) {
      return '<tr data-search="' + esc((m.id + ' ' + m.name + ' ' + m.scope).toLowerCase()) + '">' +
        '<td class="code"><button type="button" class="row-btn" data-set-module="' + m.id + '">' + m.id + '</button></td>' +
        '<td>' + esc(m.scope) + '</td></tr>';
    }).join('');

    $('deptTable').innerHTML = DEPARTMENTS.map(function (d) {
      return '<tr data-search="' + esc((d.id + ' ' + d.name + ' ' + d.group).toLowerCase()) + '">' +
        '<td class="code"><button type="button" class="row-btn" data-set-dept="' + d.id + '">' + d.id + '</button></td>' +
        '<td>' + esc(d.name) + '</td><td class="num">' + esc(d.group) + '</td></tr>';
    }).join('');
  }

  function filterTable(tbodyId, term) {
    var q = term.trim().toLowerCase();
    Array.prototype.forEach.call($(tbodyId).rows, function (row) {
      row.hidden = q !== '' && row.getAttribute('data-search').indexOf(q) === -1;
    });
  }

  var SAMPLES = [
    'Hi sir pede pacancel yong SIL nito. Retgular employee na kasi sya.\n1000000 DELA CRUZ, JUAN, M 05/26/2026 SIL 8 HR/S FULL DAY SCHEDULED REPEAT LABORATORY TEST',
    'Hi sir, regarding sa Canteen, bakit po kaya merong nagpapakita na for approval, nasync ko naman po noong 10:10 kanina. Sample lang po sa under RSG po Sir:',
    'Sir good morning, pwede po ba tayong mag meeting this Friday for the alignment sa new KPI rating period sa OTP? Kasama po sana ang Agronomy team.'
  ];
  var sampleIndex = 0;

  function flashCell(key) {
    var cell = document.querySelector('.cell[data-field="' + key + '"]');
    if (!cell) return;
    cell.classList.remove('is-stamping');
    void cell.offsetWidth;
    cell.style.setProperty('--i', 0);
    cell.classList.add('is-stamping');
  }

  function bind() {
    $('readBtn').addEventListener('click', readMessage);

    $('raw').addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); readMessage(); }
    });

    $('sampleBtn').addEventListener('click', function () {
      $('raw').value = SAMPLES[sampleIndex % SAMPLES.length];
      sampleIndex++;
      readMessage();
    });

    $('clearBtn').addEventListener('click', function () {
      $('raw').value = '';
      ['module', 'description', 'dept', 'challenge', 'resolution'].forEach(function (k) { setValue(k, '', false); });
      setValue('type', 'SUPPORT', false);
      drafted = {};
      $('cues').innerHTML = '<p>Nothing read yet. Paste a message and choose <b>Read message</b>.</p>';
      $('detailsBox').hidden = true;
      $('challengeHint').textContent = 'State the blocker, not the request again.';
      render();
      setStatus('Fields cleared.');
      $('raw').focus();
    });

    $('typeSet').addEventListener('change', function (e) {
      if (e.target.name !== 'type') return;
      drafted.type = false;
      setValue('type', e.target.value, false);
      render();
    });

    $('moduleSelect').addEventListener('change', function (e) {
      drafted.module = false;
      value.module = e.target.value;
      render();
    });

    $('deptSelect').addEventListener('change', function (e) {
      drafted.dept = false;
      value.dept = e.target.value;
      render();
    });

    [['descInput', 'description'], ['challengeInput', 'challenge'], ['resolutionInput', 'resolution']].forEach(function (pair) {
      var el = $(pair[0]);
      el.addEventListener('input', function () {
        drafted[pair[1]] = false;
        value[pair[1]] = el.value;
        autoGrow(el);
        render();
      });
    });

    [['quickRes', 'pick-resolution', 'resolution'], ['quickChal', 'pick-challenge', 'challenge']].forEach(function (spec) {
      $(spec[0]).addEventListener('click', function (e) {
        var btn = e.target.closest('[data-' + spec[1] + ']');
        if (!btn) return;
        setValue(spec[2], btn.getAttribute('data-' + spec[1]), false);
        render();
        flashCell(spec[2]);
      });
    });

    $('details').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-detail]');
      if (!btn) return;
      var d = btn.getAttribute('data-detail');
      if (value.description.indexOf(d) === -1) {
        setValue('description', tidy(value.description ? value.description + ' — ' + d : d), false);
      }
      render();
      flashCell('description');
    });

    $('copyBtn').addEventListener('click', function () {
      var missing = missingFields();
      copyText(buildLine()).then(function () {
        if (missing.length) {
          setStatus('Copied, but ' + missing.map(function (f) { return f.label; }).join(' and ') + ' still needs a value.', 'warn');
        } else {
          setStatus('Copied. All six fields are filled.', 'ok');
        }
        $('outputLine').classList.remove('is-flash');
        void $('outputLine').offsetWidth;
        $('outputLine').classList.add('is-flash');
      }).catch(function () {
        setStatus('Copying was blocked. Select the line above and copy it.', 'warn');
      });
    });

    $('saveBtn').addEventListener('click', function () {
      var missing = missingFields();
      if (missing.length) {
        setStatus('Fill ' + missing.map(function (f) { return f.label; }).join(' and ') + ' before saving.', 'warn');
        return;
      }
      entries.unshift({
        ts: Date.now(),
        type: value.type,
        module: value.module,
        description: sanitize(value.description),
        dept: value.dept,
        challenge: sanitize(value.challenge),
        resolution: sanitize(value.resolution),
        line: buildLine()
      });
      saveEntries();
      renderLog();
      setStatus('Saved to this week — ' + entries.length + ' so far.', 'ok');
    });

    $('logBody').addEventListener('click', function (e) {
      var copyBtn = e.target.closest('[data-copy-entry]');
      if (copyBtn) {
        var i = Number(copyBtn.getAttribute('data-copy-entry'));
        copyText(entries[i].line).then(function () {
          copyBtn.textContent = 'Copied';
          setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1400);
        });
        return;
      }
      var rm = e.target.closest('[data-remove-entry]');
      if (rm) {
        entries.splice(Number(rm.getAttribute('data-remove-entry')), 1);
        saveEntries();
        renderLog();
      }
    });

    $('copyAllBtn').addEventListener('click', function () {
      if (!entries.length) { setStatus('Nothing saved yet.', 'warn'); return; }
      copyText(entries.map(function (e) { return e.line; }).join('\n'))
        .then(function () { setStatus('Copied ' + entries.length + ' lines.', 'ok'); })
        .catch(function () { setStatus('Copying was blocked. Use Download CSV instead.', 'warn'); });
    });

    $('downloadBtn').addEventListener('click', function () {
      if (!entries.length) { setStatus('Nothing saved yet.', 'warn'); return; }
      var d = new Date().toISOString().slice(0, 10);
      download('itpms-log-' + d + '.csv', toCSV(), 'text/csv;charset=utf-8');
    });

    $('clearLogBtn').addEventListener('click', function () {
      if (!entries.length) return;
      if (!window.confirm('Remove all ' + entries.length + ' saved entries? This cannot be undone.')) return;
      entries = [];
      saveEntries();
      renderLog();
      setStatus('Week list cleared.');
    });

    $('moduleFilter').addEventListener('input', function (e) { filterTable('moduleTable', e.target.value); });
    $('deptFilter').addEventListener('input', function (e) { filterTable('deptTable', e.target.value); });

    document.addEventListener('click', function (e) {
      var m = e.target.closest('[data-set-module]');
      if (m) {
        drafted.module = false;
        setValue('module', m.getAttribute('data-set-module'), false);
        render();
        flashCell('module');
        document.getElementById('encoder').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      var d = e.target.closest('[data-set-dept]');
      if (d) {
        drafted.dept = false;
        setValue('dept', d.getAttribute('data-set-dept'), false);
        render();
        flashCell('dept');
        document.getElementById('encoder').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    $('copyPromptBtn').addEventListener('click', function () {
      copyText($('promptSource').textContent)
        .then(function () { $('promptStatus').textContent = 'Copied.'; $('promptStatus').className = 'status is-ok'; })
        .catch(function () { $('promptStatus').textContent = 'Copying was blocked. Select the text below.'; $('promptStatus').className = 'status is-warn'; });
    });
  }

  buildTypeSet();
  buildSelects();
  buildQuickPicks();
  buildReference();
  loadEntries();
  bind();
  render();
  renderLog();
})();
