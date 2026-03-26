# Reelette

A movie discovery web app built with Flask and React. Search for movies, track what you've watched, build watchlists, and see what your friends are watching.

## Tech Stack

- **Flask** — Python backend API
- **React** — frontend (Vite + Tailwind)
- **Firebase** — authentication and Firestore database
- **TMDb API** — movie data, search, and streaming info

## Project Structure

```
reelette/
├── REACT PAGES/          # React frontend (Vite)
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── postcss.config.mjs
├── app.py                # Flask API server
├── firebase_helper.py    # Firebase auth and Firestore operations
├── tmdb_api.py           # TMDb API helper methods
├── config.py             # Your local config (not committed)
├── config.example.py     # Config template
├── cli_test.py           # CLI test interface (optional)
├── firebase-credentials.json  # Firebase service account key (not committed)
└── requirements.txt      # Python dependencies
```

## Getting Started

### Before you start

1. Create a new folder somewhere on your computer called `Reelette` (Desktop, Documents, wherever you want)
2. Open **VS Code**
3. Go to **File → Open Folder** and select the `Reelette` folder you just made
4. Open the terminal by pressing `` Ctrl + ` `` (the backtick key, above Tab) or go to **Terminal → New Terminal** at the top menu

You should now have VS Code open with an empty folder and a terminal ready to go at the bottom.

### 1. Clone the project

In your VS Code terminal, type:
```bash
git clone https://github.com/angelog27/reelette.git .
```

> **Important:** Don't forget the `.` at the end — that tells Git to clone the files directly into your current folder instead of creating another subfolder.

> **Already have the project?** Just open your existing `Reelette` folder in VS Code, open the terminal, and pull the latest changes:
> ```bash
> git pull origin FrontEnd-v1
> ```

### 2. Set up Firebase credentials

Angelo will email you two things: a **firebase-credentials.json** file and a **Firebase Web API Key**.

1. Save the file Angelo emailed you into the root of the project folder (the same folder where `app.py` is). **Important:** the file might have a long name like `reelette-project-firebase-adminsdk-...json` — **rename it to `firebase-credentials.json`**.
2. Keep the Web API Key handy — you'll paste it in the next step.

### 3. Set up your config

You need to make a copy of `config.example.py` and name it `config.py`. This is where your personal API keys go — it's already in `.gitignore` so it won't get pushed to GitHub.

**Easiest way:** In VS Code's file explorer on the left, right-click `config.example.py` → **Copy**, then right-click in the same folder → **Paste**, then right-click the copy → **Rename** it to `config.py`.

**Or in the terminal:**

Mac/Linux:
```bash
cp config.example.py config.py
```

Windows:
```bash
copy config.example.py config.py
```

Now open `config.py` and fill in these values (leave everything else as-is):

- `TMDB_API_KEY` — to get your free API key:
  1. Go to [themoviedb.org](https://www.themoviedb.org/) and create a free account
  2. Once logged in, go to **Settings → API** (or visit [this link](https://www.themoviedb.org/settings/api))
  3. Click **Create** → select **Developer**
  4. Fill out the form (for "Application URL" you can just put `http://localhost`, and for the description just say it's a school project)
  5. Copy the **API Key (v3 auth)** and paste it into your `config.py`
- `FIREBASE_CREDENTIALS_PATH` — leave this as `"firebase-credentials.json"` (no changes needed if you renamed the file in Step 2)
- for the firebase_credentials you need to put your full pathway, like 
   FIREBASE_CREDENTIALS_PATH = r"C:\Users\Owner\OneDrive\Documents\4330\Reelette\firebase-credentials.json"

- `FIREBASE_WEB_API_KEY` — paste the key Angelo emailed you
- `SECRET_KEY` — change this to any random string, doesn't matter what

### 4. Install Python dependencies

In your VS Code terminal, type:
```bash
pip install -r requirements.txt
```

### 5. Install frontend dependencies

In the same terminal, type:
```bash
cd "REACT PAGES"
npm install
cd ..
```

> **Note:** The folder name has a space in it, so the quotes around `"REACT PAGES"` are required.

### 6. Run the app

You need **two terminals** running at the same time.

**Terminal 1 — start the Flask backend:**

In your current VS Code terminal, type:
```bash
python app.py
```

**Terminal 2 — start the React frontend:**

Click the **+** icon at the top-right of the terminal panel in VS Code to open a second terminal. Then type:
```bash
cd "REACT PAGES"
npm run dev
```

After a few seconds, Vite will print a URL in the terminal that looks something like:

```
  ➜  Local:   http://localhost:5173/
```

**Click that link** (hold Ctrl and click on Windows, or Cmd+click on Mac) to open the app in your browser. You're good to go!

## Features

- User registration and login via Firebase
- Movie search and discovery via TMDb
- Filter by actor, director, genre, year, and rating
- Streaming service preferences per user
- Watchlist and watched movie tracking with ratings
- Social feed — create posts, like, and reply

## Contributors

- Angelo
- Jordan
