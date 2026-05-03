/**
 * AFRICA54 — Apps Script Backend
 * The ALU Knowledge Game · Powered by Student Companion AI
 *
 * SETUP (5 minutes — see README for screenshots):
 *   1. Open a NEW Google Sheet → name it "Africa54 Backend"
 *   2. Copy the Sheet ID from the URL:
 *      https://docs.google.com/spreadsheets/d/[THIS_PART]/edit
 *      Paste it below into SHEET_ID.
 *   3. Sheet → Extensions → Apps Script → paste this entire file
 *   4. Click ▶ Run → choose the function `setupSheets` → grant permissions
 *      (this creates all 4 tabs with proper headers, plus seeds 12 starter questions)
 *   5. Click "Deploy" → "New deployment" → ⚙ → Web app
 *      • Description: "Africa54 API v1"
 *      • Execute as: "Me"
 *      • Who has access: "Anyone"
 *      • Click Deploy
 *   6. Copy the Web App URL (looks like https://script.google.com/macros/s/AKfy.../exec)
 *   7. Paste it into index.html as API_URL.
 *
 * IMPORTANT: Every time you change this code, you must "Deploy → Manage deployments"
 *            and click the pencil ✏️ next to your deployment, then "Version: New version"
 *            and Deploy. The URL stays the same.
 */

const SHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';

const SHEETS = {
  QUESTIONS: 'Questions',
  SESSIONS:  'Sessions',
  SCORES:    'Scores',
  PLAYERS:   'Players'
};

const HEADERS = {
  Questions: ['id', 'type', 'prompt', 'text', 'flag', 'correct', 'wrong1', 'wrong2', 'wrong3', 'region', 'difficulty', 'active', 'fact'],
  Sessions:  ['code', 'host', 'mode', 'region', 'question_count', 'question_ids', 'created_at', 'status'],
  Scores:    ['timestamp', 'code', 'name', 'score', 'correct', 'total', 'accuracy', 'mode', 'region', 'best_streak'],
  Players:   ['name', 'first_seen', 'last_seen', 'games_played', 'total_points']
};

/* =========================================================
   ROUTING
========================================================= */
function doGet(e)  { return route_(e.parameter || {}); }
function doPost(e) {
  const params = e.parameter || {};
  if (e.postData && e.postData.contents) {
    try { Object.assign(params, JSON.parse(e.postData.contents)); } catch (err) {}
  }
  return route_(params);
}

function route_(p) {
  const action = (p.action || 'ping').toString();
  let result;
  try {
    switch (action) {
      case 'ping':                 result = { ok: true, time: new Date().toISOString(), version: '1.0' }; break;
      case 'getQuestions':         result = getQuestions_(p); break;
      case 'createSession':        result = createSession_(p); break;
      case 'joinSession':          result = joinSession_(p); break;
      case 'submitScore':          result = submitScore_(p); break;
      case 'getLeaderboard':       result = getLeaderboard_(p); break;
      case 'getGlobalLeaderboard': result = getGlobalLeaderboard_(p); break;
      case 'listSessions':         result = listSessions_(p); break;
      case 'closeSession':         result = closeSession_(p); break;
      default: result = { ok: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/* =========================================================
   SHEET HELPERS
========================================================= */
function ss_() { return SpreadsheetApp.openById(SHEET_ID); }

function sheet_(name) {
  const s = ss_().getSheetByName(name);
  if (!s) throw new Error('Sheet not found: ' + name + '. Run setupSheets() first.');
  return s;
}

function rowsAsObjects_(sheetName) {
  const s = sheet_(sheetName);
  const data = s.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const o = {};
    headers.forEach((h, i) => { o[h] = row[i]; });
    return o;
  }).filter(o => Object.values(o).some(v => v !== '' && v !== null && v !== undefined));
}

function appendRow_(sheetName, obj) {
  const s = sheet_(sheetName);
  const headers = HEADERS[sheetName];
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  s.appendRow(row);
}

/* =========================================================
   QUESTIONS
========================================================= */
function getQuestions_(p) {
  const mode    = (p.mode || 'quick').toString();
  const region  = (p.region || 'all').toString();
  const count   = Math.min(parseInt(p.count || '10', 10) || 10, 100);
  const type    = (p.type || '').toString(); // optional filter

  let pool = rowsAsObjects_(SHEETS.QUESTIONS).filter(q =>
    String(q.active).toLowerCase() === 'true' || q.active === true || q.active === 1
  );

  if (region && region !== 'all') {
    pool = pool.filter(q => String(q.region).trim() === region);
  }

  if (mode === 'flags') {
    pool = pool.filter(q => String(q.type) === 'flag-country');
  } else if (mode === 'capitals') {
    pool = pool.filter(q => String(q.type) === 'country-capital' || String(q.type) === 'capital-country');
  }

  if (type) pool = pool.filter(q => String(q.type) === type);

  // shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const finalCount = mode === 'marathon' ? pool.length : Math.min(count, pool.length);
  const picked = pool.slice(0, finalCount);

  return { ok: true, questions: picked, total: picked.length };
}

/* =========================================================
   SESSIONS (Kahoot-style PIN system)
========================================================= */
function createSession_(p) {
  const mode    = (p.mode || 'quick').toString();
  const region  = (p.region || 'all').toString();
  const host    = (p.host || 'Host').toString().substring(0, 30);
  const count   = Math.min(parseInt(p.count || '10', 10) || 10, 100);

  // pick questions for this session
  const qResp = getQuestions_({ mode, region, count });
  if (!qResp.ok || qResp.questions.length === 0) {
    return { ok: false, error: 'No active questions match this filter. Add some in the Questions tab.' };
  }
  const questionIds = qResp.questions.map(q => q.id).join(',');

  // generate unique code
  let code, attempts = 0;
  const sessions = rowsAsObjects_(SHEETS.SESSIONS);
  const usedCodes = new Set(sessions.map(s => String(s.code)));
  do {
    code = 'A54-' + Math.floor(1000 + Math.random() * 9000); // A54-1000 to A54-9999
    attempts++;
  } while (usedCodes.has(code) && attempts < 50);

  appendRow_(SHEETS.SESSIONS, {
    code,
    host,
    mode,
    region,
    question_count: qResp.questions.length,
    question_ids: questionIds,
    created_at: new Date().toISOString(),
    status: 'active'
  });

  return {
    ok: true,
    code,
    mode,
    region,
    host,
    questions: qResp.questions,
    question_count: qResp.questions.length
  };
}

function joinSession_(p) {
  const code = String(p.code || '').trim().toUpperCase();
  const name = String(p.name || '').trim().substring(0, 24);
  if (!code) return { ok: false, error: 'Missing session code.' };
  if (!name) return { ok: false, error: 'Enter your name to join.' };

  const sessions = rowsAsObjects_(SHEETS.SESSIONS);
  const session = sessions.find(s => String(s.code).toUpperCase() === code);
  if (!session) return { ok: false, error: 'Session not found. Check the code.' };
  if (String(session.status) !== 'active') {
    return { ok: false, error: 'This session has been closed.' };
  }

  // touch player record
  upsertPlayer_(name);

  // fetch the locked-in questions for this session
  const ids = String(session.question_ids).split(',').map(s => s.trim()).filter(Boolean);
  const allQs = rowsAsObjects_(SHEETS.QUESTIONS);
  const qById = {};
  allQs.forEach(q => { qById[String(q.id)] = q; });
  const questions = ids.map(id => qById[id]).filter(Boolean);

  return {
    ok: true,
    code: session.code,
    mode: session.mode,
    region: session.region,
    host: session.host,
    questions,
    question_count: questions.length,
    your_name: name
  };
}

function listSessions_(p) {
  const limit = Math.min(parseInt(p.limit || '20', 10) || 20, 100);
  const sessions = rowsAsObjects_(SHEETS.SESSIONS)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, limit);
  return { ok: true, sessions };
}

function closeSession_(p) {
  const code = String(p.code || '').trim().toUpperCase();
  const s = sheet_(SHEETS.SESSIONS);
  const data = s.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toUpperCase() === code) {
      s.getRange(i + 1, HEADERS.Sessions.indexOf('status') + 1).setValue('closed');
      return { ok: true, code, status: 'closed' };
    }
  }
  return { ok: false, error: 'Session not found.' };
}

/* =========================================================
   SCORES
========================================================= */
function submitScore_(p) {
  const name        = String(p.name || '').trim().substring(0, 24);
  const code        = String(p.code || 'PRACTICE').trim().toUpperCase();
  const score       = parseInt(p.score || '0', 10) || 0;
  const correct     = parseInt(p.correct || '0', 10) || 0;
  const total       = parseInt(p.total || '0', 10) || 0;
  const mode        = String(p.mode || 'quick');
  const region      = String(p.region || 'all');
  const best_streak = parseInt(p.best_streak || '0', 10) || 0;
  const accuracy    = total > 0 ? Math.round((correct / total) * 100) : 0;

  if (!name) return { ok: false, error: 'Missing name.' };

  appendRow_(SHEETS.SCORES, {
    timestamp: new Date().toISOString(),
    code, name, score, correct, total, accuracy, mode, region, best_streak
  });

  upsertPlayer_(name, score);

  return { ok: true, score, accuracy, code };
}

function getLeaderboard_(p) {
  const code = String(p.code || '').trim().toUpperCase();
  if (!code) return { ok: false, error: 'Session code required.' };

  const scores = rowsAsObjects_(SHEETS.SCORES)
    .filter(s => String(s.code).toUpperCase() === code)
    .sort((a, b) => Number(b.score) - Number(a.score));

  return { ok: true, code, scores, count: scores.length };
}

function getGlobalLeaderboard_(p) {
  const limit = Math.min(parseInt(p.limit || '20', 10) || 20, 100);
  const scores = rowsAsObjects_(SHEETS.SCORES)
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, limit);
  return { ok: true, scores };
}

/* =========================================================
   PLAYERS
========================================================= */
function upsertPlayer_(name, scoreToAdd) {
  const s = sheet_(SHEETS.PLAYERS);
  const data = s.getDataRange().getValues();
  const now = new Date().toISOString();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === name.toLowerCase()) {
      // update last_seen, increment games & points
      s.getRange(i + 1, 3).setValue(now); // last_seen
      s.getRange(i + 1, 4).setValue((Number(data[i][3]) || 0) + 1); // games_played
      if (scoreToAdd) {
        s.getRange(i + 1, 5).setValue((Number(data[i][4]) || 0) + scoreToAdd); // total_points
      }
      return;
    }
  }
  // new player
  appendRow_(SHEETS.PLAYERS, {
    name, first_seen: now, last_seen: now,
    games_played: 1, total_points: scoreToAdd || 0
  });
}

/* =========================================================
   ONE-TIME SETUP — run this once after pasting in the script
========================================================= */
function setupSheets() {
  const ss = ss_();
  Object.keys(HEADERS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.clear();
    sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
    sh.getRange(1, 1, 1, HEADERS[name].length)
      .setFontWeight('bold')
      .setBackground('#0A0A0B')
      .setFontColor('#D4AF37');
    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, HEADERS[name].length);
  });

  // Remove the default "Sheet1" if it's empty
  const def = ss.getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0) ss.deleteSheet(def);

  // Seed starter questions (only if Questions tab is empty)
  const qSheet = sheet_(SHEETS.QUESTIONS);
  if (qSheet.getLastRow() <= 1) {
    seedQuestions_();
  }

  SpreadsheetApp.getUi().alert(
    'Africa54 backend ready!\n\n' +
    '✓ 4 tabs created (Questions, Sessions, Scores, Players)\n' +
    '✓ Starter questions seeded\n\n' +
    'Next: Deploy → New deployment → Web app → Anyone access.\n' +
    'Then paste the URL into index.html as API_URL.'
  );
}

function seedQuestions_() {
  // Seed every African country with auto-generated flag-country and country-capital questions
  const COUNTRIES = [
    {n:"Algeria",c:"Algiers",f:"🇩🇿",r:"North Africa"},
    {n:"Angola",c:"Luanda",f:"🇦🇴",r:"Southern Africa"},
    {n:"Benin",c:"Porto-Novo",f:"🇧🇯",r:"West Africa",fact:"Cotonou is the seat of government, but Porto-Novo is the official capital."},
    {n:"Botswana",c:"Gaborone",f:"🇧🇼",r:"Southern Africa"},
    {n:"Burkina Faso",c:"Ouagadougou",f:"🇧🇫",r:"West Africa"},
    {n:"Burundi",c:"Gitega",f:"🇧🇮",r:"East Africa",fact:"Gitega replaced Bujumbura as the political capital in 2019."},
    {n:"Cabo Verde",c:"Praia",f:"🇨🇻",r:"West Africa"},
    {n:"Cameroon",c:"Yaoundé",f:"🇨🇲",r:"Central Africa"},
    {n:"Central African Republic",c:"Bangui",f:"🇨🇫",r:"Central Africa"},
    {n:"Chad",c:"N'Djamena",f:"🇹🇩",r:"Central Africa"},
    {n:"Comoros",c:"Moroni",f:"🇰🇲",r:"East Africa"},
    {n:"DR Congo",c:"Kinshasa",f:"🇨🇩",r:"Central Africa"},
    {n:"Republic of Congo",c:"Brazzaville",f:"🇨🇬",r:"Central Africa"},
    {n:"Côte d'Ivoire",c:"Yamoussoukro",f:"🇨🇮",r:"West Africa",fact:"Yamoussoukro is the official capital; Abidjan is the economic capital."},
    {n:"Djibouti",c:"Djibouti",f:"🇩🇯",r:"East Africa"},
    {n:"Egypt",c:"Cairo",f:"🇪🇬",r:"North Africa"},
    {n:"Equatorial Guinea",c:"Malabo",f:"🇬🇶",r:"Central Africa",fact:"Malabo sits on Bioko Island, off the mainland."},
    {n:"Eritrea",c:"Asmara",f:"🇪🇷",r:"East Africa"},
    {n:"Eswatini",c:"Mbabane",f:"🇸🇿",r:"Southern Africa",fact:"Lobamba is the royal & legislative capital; Mbabane the administrative."},
    {n:"Ethiopia",c:"Addis Ababa",f:"🇪🇹",r:"East Africa",fact:"Home to the African Union headquarters."},
    {n:"Gabon",c:"Libreville",f:"🇬🇦",r:"Central Africa"},
    {n:"Gambia",c:"Banjul",f:"🇬🇲",r:"West Africa"},
    {n:"Ghana",c:"Accra",f:"🇬🇭",r:"West Africa"},
    {n:"Guinea",c:"Conakry",f:"🇬🇳",r:"West Africa"},
    {n:"Guinea-Bissau",c:"Bissau",f:"🇬🇼",r:"West Africa"},
    {n:"Kenya",c:"Nairobi",f:"🇰🇪",r:"East Africa"},
    {n:"Lesotho",c:"Maseru",f:"🇱🇸",r:"Southern Africa",fact:"One of only three countries entirely surrounded by another."},
    {n:"Liberia",c:"Monrovia",f:"🇱🇷",r:"West Africa",fact:"Monrovia was named after U.S. President James Monroe."},
    {n:"Libya",c:"Tripoli",f:"🇱🇾",r:"North Africa"},
    {n:"Madagascar",c:"Antananarivo",f:"🇲🇬",r:"East Africa"},
    {n:"Malawi",c:"Lilongwe",f:"🇲🇼",r:"Southern Africa"},
    {n:"Mali",c:"Bamako",f:"🇲🇱",r:"West Africa"},
    {n:"Mauritania",c:"Nouakchott",f:"🇲🇷",r:"North Africa"},
    {n:"Mauritius",c:"Port Louis",f:"🇲🇺",r:"East Africa"},
    {n:"Morocco",c:"Rabat",f:"🇲🇦",r:"North Africa"},
    {n:"Mozambique",c:"Maputo",f:"🇲🇿",r:"Southern Africa"},
    {n:"Namibia",c:"Windhoek",f:"🇳🇦",r:"Southern Africa"},
    {n:"Niger",c:"Niamey",f:"🇳🇪",r:"West Africa"},
    {n:"Nigeria",c:"Abuja",f:"🇳🇬",r:"West Africa",fact:"Abuja replaced Lagos as the capital in 1991."},
    {n:"Rwanda",c:"Kigali",f:"🇷🇼",r:"East Africa",fact:"Home of African Leadership University."},
    {n:"São Tomé and Príncipe",c:"São Tomé",f:"🇸🇹",r:"Central Africa"},
    {n:"Senegal",c:"Dakar",f:"🇸🇳",r:"West Africa"},
    {n:"Seychelles",c:"Victoria",f:"🇸🇨",r:"East Africa",fact:"One of the world's smallest national capitals by population."},
    {n:"Sierra Leone",c:"Freetown",f:"🇸🇱",r:"West Africa"},
    {n:"Somalia",c:"Mogadishu",f:"🇸🇴",r:"East Africa"},
    {n:"South Africa",c:"Pretoria",f:"🇿🇦",r:"Southern Africa",fact:"Three capitals: Pretoria (executive), Cape Town (legislative), Bloemfontein (judicial)."},
    {n:"South Sudan",c:"Juba",f:"🇸🇸",r:"East Africa",fact:"The world's youngest nation — independent since 2011."},
    {n:"Sudan",c:"Khartoum",f:"🇸🇩",r:"North Africa"},
    {n:"Tanzania",c:"Dodoma",f:"🇹🇿",r:"East Africa",fact:"Dodoma is the official capital; Dar es Salaam is the largest city."},
    {n:"Togo",c:"Lomé",f:"🇹🇬",r:"West Africa"},
    {n:"Tunisia",c:"Tunis",f:"🇹🇳",r:"North Africa"},
    {n:"Uganda",c:"Kampala",f:"🇺🇬",r:"East Africa"},
    {n:"Zambia",c:"Lusaka",f:"🇿🇲",r:"Southern Africa"},
    {n:"Zimbabwe",c:"Harare",f:"🇿🇼",r:"Southern Africa"}
  ];

  const rows = [];
  let id = 1;

  COUNTRIES.forEach(c => {
    // Type 1: flag → country
    rows.push([
      'Q' + String(id++).padStart(4, '0'),
      'flag-country',
      'WHICH COUNTRY?',
      '',
      c.f,
      c.n,
      '', '', '',
      c.r,
      'easy',
      true,
      c.fact || ''
    ]);
    // Type 2: country → capital
    rows.push([
      'Q' + String(id++).padStart(4, '0'),
      'country-capital',
      'CAPITAL OF —',
      c.n,
      '',
      c.c,
      '', '', '',
      c.r,
      'medium',
      true,
      c.fact || ''
    ]);
    // Type 3: capital → country
    rows.push([
      'Q' + String(id++).padStart(4, '0'),
      'capital-country',
      'WHOSE CAPITAL?',
      c.c,
      '',
      c.n,
      '', '', '',
      c.r,
      'medium',
      true,
      c.fact || ''
    ]);
  });

  // Add a few starter custom questions to demonstrate the format
  const customs = [
    ['Q9001', 'custom', 'AFRICAN UNION HQ', 'Where is the African Union headquartered?', '', 'Addis Ababa', 'Nairobi', 'Cairo', 'Lagos', 'all', 'easy', true, 'The AU has been headquartered in Addis Ababa, Ethiopia since 1963.'],
    ['Q9002', 'custom', 'GREAT WALL', 'Which African country is home to the ancient ruins of Great Zimbabwe?', '', 'Zimbabwe', 'Kenya', 'Mali', 'Sudan', 'Southern Africa', 'medium', true, 'Built between 1100–1450 CE by the Shona civilization.'],
    ['Q9003', 'custom', 'NILE COUNTRIES', 'How many countries does the Nile River flow through?', '', '11', '7', '9', '13', 'all', 'hard', true, 'Burundi, Rwanda, Tanzania, Uganda, Kenya, DR Congo, Ethiopia, Eritrea, South Sudan, Sudan, and Egypt.'],
    ['Q9004', 'custom', 'YOUNGEST NATION', 'Which African nation gained independence most recently?', '', 'South Sudan', 'Eritrea', 'Namibia', 'Djibouti', 'all', 'easy', true, 'South Sudan declared independence on 9 July 2011.'],
    ['Q9005', 'custom', 'ALU HOME', 'In which city is African Leadership University (ALU) headquartered?', '', 'Kigali', 'Nairobi', 'Cape Town', 'Lagos', 'all', 'easy', true, 'ALU is based in Kigali, Rwanda — re-imagining higher education for Africa.']
  ];
  customs.forEach(c => rows.push(c));

  sheet_(SHEETS.QUESTIONS).getRange(2, 1, rows.length, HEADERS.Questions.length).setValues(rows);
}

/* =========================================================
   UTILITY — call this from the editor to test the API
========================================================= */
function _test() {
  Logger.log(JSON.stringify(getQuestions_({ mode: 'quick', count: 3 })));
  Logger.log(JSON.stringify(createSession_({ mode: 'quick', region: 'all', host: 'Andrew', count: 5 })));
}
