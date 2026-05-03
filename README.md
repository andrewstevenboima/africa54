# 🌍 Africa54 — The ALU Knowledge Game

> **Powered by Student Companion AI · Built at African Leadership University**

A Pan-African flag and capital quiz challenge with three game modes:

- **🎓 Host a Class Game** — Generate a Kahoot-style PIN, share with students, watch the leaderboard fill up
- **⚡ Join with Code** — Students enter the PIN + their name, play the same question set
- **📚 Practice Solo** — Works fully offline; no setup needed

The game bank, sessions, players, and scores are all stored in a single Google Sheet that you control.

---

## 🚀 Quick Start

If you just want to **try Practice Mode**, no setup is needed — open `index.html` in a browser and play.

If you want **classroom hosting + leaderboards**, follow the backend setup below (~5 minutes).

---

## 📋 Backend Setup — Google Sheet + Apps Script

### Step 1 · Create the Sheet

1. Go to [sheets.new](https://sheets.new) (creates a new blank Google Sheet)
2. Rename it to **Africa54 Backend**
3. Look at the URL — it looks like:
   ```
   https://docs.google.com/spreadsheets/d/1AbCdEf...XYZ/edit
                                          └────────┬────────┘
                                              SHEET ID
   ```
4. **Copy the SHEET ID** (the long string between `/d/` and `/edit`)

### Step 2 · Open Apps Script

In your new sheet, click:

> **Extensions → Apps Script**

This opens the script editor in a new tab.

### Step 3 · Paste the Backend Code

1. Open `Code.gs` from this repo (the file next to `index.html`)
2. **Select all** (Ctrl/Cmd-A) and **copy** it
3. Back in the Apps Script editor, **delete the default code** in `Code.gs`
4. **Paste** in the entire contents of our `Code.gs`
5. **Find this line** near the top:
   ```js
   const SHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
   ```
   Replace `PASTE_YOUR_GOOGLE_SHEET_ID_HERE` with the SHEET ID you copied in Step 1.
6. Click 💾 **Save** (or Ctrl/Cmd-S)

### Step 4 · Initialize the Sheets

In the Apps Script editor:

1. From the function dropdown at the top, select **`setupSheets`**
2. Click **▶ Run**
3. Google will ask for permissions — click **Review permissions**, choose your account, click **Advanced** → **Go to (your project name) (unsafe)** → **Allow**
   *(Don't worry — "unsafe" just means it's an unverified personal script, not actually dangerous. You're trusting your own code.)*
4. Once it runs, you'll see a popup: **"Africa54 backend ready! ✓ 4 tabs created..."**

Now switch back to your Google Sheet — you'll see four new tabs: **Questions**, **Sessions**, **Scores**, **Players**, plus **162 starter questions** (every African country × 3 question types) plus 5 example custom questions seeded in the Questions tab.

### Step 5 · Deploy as Web App

Back in Apps Script:

1. Click **Deploy → New deployment**
2. Click the ⚙ gear icon next to "Select type" → choose **Web app**
3. Fill in:
   - **Description**: `Africa54 API v1`
   - **Execute as**: **Me** (your account)
   - **Who has access**: **Anyone**
     ⚠️ This must be "Anyone" (not "Anyone with Google account") so students without Google can join.
4. Click **Deploy**
5. Copy the **Web App URL** that appears. It looks like:
   ```
   https://script.google.com/macros/s/AKfycbz...exec
   ```

### Step 6 · Wire It to the Game

1. Open `index.html` in a code editor
2. Find this line (near the top of the `<script>` block):
   ```js
   const API_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
   ```
3. Replace the placeholder with the Web App URL you just copied
4. Save

That's it. Open `index.html` in a browser, tap **Host a Class Game**, and a real PIN should generate.

---

## 🌐 Deploy to GitHub Pages

Once `API_URL` is set:

```bash
# from the africa54 folder
git init
git add .
git commit -m "Africa54 v2 — SCA brand, Sheets backend"
git branch -M main
git remote add origin https://github.com/andrewstevenboima/africa54.git
git push -u origin main
```

Then on GitHub:
1. **Settings → Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `main` / `/ (root)`
4. **Save**

Site will be live at `https://andrewstevenboima.github.io/africa54/` in about a minute. Share that URL with your class — it's both the host URL and the join URL.

---

## ✏️ Adding New Questions

Open your **Africa54 Backend** sheet → **Questions** tab. Add a row with these columns:

| Column         | Example                                       | Notes                                             |
| -------------- | --------------------------------------------- | ------------------------------------------------- |
| **id**         | `Q9006`                                       | Any unique ID. Keep it short.                     |
| **type**       | `custom`                                      | Or: `flag-country`, `country-capital`, `capital-country` |
| **prompt**     | `LARGEST LAKE`                                | Eyebrow text shown above the question             |
| **text**       | `Which is Africa's largest lake by area?`     | Main question line (leave blank for flag types)   |
| **flag**       | (empty, or `🇷🇼`)                             | Emoji flag if relevant                            |
| **correct**    | `Lake Victoria`                               | The right answer                                  |
| **wrong1**     | `Lake Tanganyika`                             | (Optional for non-custom)                         |
| **wrong2**     | `Lake Malawi`                                 |                                                   |
| **wrong3**     | `Lake Chad`                                   |                                                   |
| **region**     | `East Africa`                                 | Or `all`, or any of: `West Africa`, `North Africa`, `Central Africa`, `Southern Africa` |
| **difficulty** | `medium`                                      | `easy` / `medium` / `hard`                        |
| **active**     | `true`                                        | Set to `false` to hide a question without deleting |
| **fact**       | `Lake Victoria is the world's 2nd-largest freshwater lake.` | Shown after answering              |

**For `flag-country`, `country-capital`, `capital-country` types**: you only need `type`, `correct`, `flag` (for flag types), `region`, and `active`. The system auto-generates wrong answers from the country pool.

**For `custom` type**: fill in `prompt`, `text`, `correct`, and all three `wrong1`–`wrong3`.

Changes are live immediately — no redeploy needed. The next session created will pick from the updated pool.

---

## 🔄 Updating the Backend Code

If you ever change `Code.gs`:

1. Save in Apps Script
2. **Deploy → Manage deployments**
3. Click the ✏ pencil icon next to your deployment
4. **Version**: choose **New version**
5. Click **Deploy**

The Web App URL stays the same — no need to update `index.html`.

---

## 🎨 Brand & Design

**Africa54** is built to embody the **Student Companion AI Chatbot** brand identity:

- **Black canvas** (`#050507`) — premium, contemplative
- **Antique gold** (`#D4AF37`) — wisdom, value, the SCA brand mark
- **Cream** (`#F5E6C8`) — warmth, readability
- **Terracotta + emerald + indigo** — Pan-African accent palette for answer buttons
- **Cinzel** display serif — classical Roman caps matching the SCA logo
- **Cormorant Garamond italic** — editorial accent for taglines
- **Manrope** — clean modern body text
- **JetBrains Mono** — for PINs and stats (precision feel)

The SCA meditation symbol appears in the splash, topbar, and app icon — connecting Africa54 to the broader Student Companion AI platform.

---

## 🏗️ Architecture

```
┌──────────────────────────┐     ┌────────────────────────┐
│   Africa54 PWA           │     │  Google Apps Script    │
│   (GitHub Pages)         │◄───►│  Web App               │
│                          │     │                        │
│   • index.html           │     │   doGet / doPost       │
│   • service-worker.js    │     │   • getQuestions       │
│   • Cinzel + SCA logo    │     │   • createSession      │
│   • Offline practice     │     │   • joinSession        │
│   • Score retry queue    │     │   • submitScore        │
└──────────────────────────┘     │   • getLeaderboard     │
                                 └─────────┬──────────────┘
                                           │
                                           ▼
                                 ┌────────────────────────┐
                                 │  Google Sheet (4 tabs) │
                                 │   Questions            │
                                 │   Sessions             │
                                 │   Scores               │
                                 │   Players              │
                                 └────────────────────────┘
```

### Three game flows

| Flow              | API needed? | Offline?  | Use case                            |
| ----------------- | ----------- | --------- | ----------------------------------- |
| **Practice Solo** | No          | ✅ Full   | Personal study, no setup            |
| **Host (teacher)** | Yes        | ❌        | Generates PIN + locks question set  |
| **Join (student)** | Yes        | Partial\* | Plays the host's session by PIN    |

\* *Once a student joins, all questions are loaded; gameplay continues even if the connection drops. Scores submit when online (with retry queue).*

### Session model (Kahoot-async)

- The host creates a session → backend generates a unique `A54-XXXX` PIN and **locks in a specific question set**
- All students who join with that PIN get the **same questions in the same order**
- Each student plays at their own pace — no real-time pacing required (which would be fragile on classroom WiFi)
- Scores submit on completion → session leaderboard refreshes whenever anyone hits "↻ Refresh"

---

## 🎮 Game Mechanics

- **15 seconds per question**
- **Scoring**: 100 base + up to 50 time bonus + 25 × (streak − 1) per correct answer
- **Grade bands**:
  - 100% → **Ubuntu**
  - 80%+ → **Sankofa**
  - 60%+ → **Harambee**
  - 40%+ → **Karibu**
  - <40% → **Imara**

---

## 📂 File Structure

```
africa54/
├── index.html              ← The game (paste API_URL near the top)
├── manifest.json           ← PWA manifest
├── service-worker.js       ← Offline caching
├── Code.gs                 ← Apps Script backend (paste into your Sheet)
├── assets/
│   ├── sca-logo-full.png        ← Full SCA Chatbot logo, transparent
│   ├── sca-symbol-512.png       ← Just the meditation mark
│   ├── sca-symbol-192.png       ← Same, smaller
│   └── sca-symbol-64.png        ← Same, smallest
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-512.png
│   └── icon-64.png
└── README.md               ← This file
```

---

## 🛠️ Troubleshooting

**"Could not create session" when hosting**
- Did you paste your Web App URL into `index.html` as `API_URL`?
- Did you set "Who has access: **Anyone**" when deploying? (Not "Anyone with Google account")
- Try opening the Web App URL directly in a browser — you should see `{"ok":true,"time":"...","version":"1.0"}`

**"Session not found" when students try to join**
- PINs are case-insensitive but the format must match: `A54-XXXX` (4 digits)
- Check the Sessions tab — is the row there with `status: active`?
- Sessions don't expire automatically. Run `closeSession_({code: 'A54-XXXX'})` from Apps Script if you want to retire one.

**Backend changes don't seem to take effect**
- After editing `Code.gs`, you must **Deploy → Manage deployments → ✏ → Version: New version → Deploy**. Just clicking save isn't enough.

**Questions don't filter by region**
- Region values must exactly match: `West Africa`, `East Africa`, `North Africa`, `Central Africa`, `Southern Africa`, or `all`. Check for typos in the Questions tab.

**Score didn't submit**
- The PWA queues failed score submissions in localStorage and retries when the device comes back online. Check the Network tab in DevTools for any 401/403 errors.

---

## 📜 License

MIT — use, fork, remix freely.

---

**Built at ALU · Re-imagine Africa · v2.0**
