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

### 1. Pull the latest changes

```bash
git pull origin main
```

> If you haven't cloned yet:
> ```bash
> git clone https://github.com/angelog27/reelette.git
> cd reelette
> ```

### 2. Set up your config

You need to make a copy of `config.example.py` and name it `config.py`. This is where your personal API keys go — it's already in `.gitignore` so it won't get pushed to GitHub.

**Mac/Linux:**
```bash
cp config.example.py config.py
```

**Windows:**
```bash
copy config.example.py config.py
```

> Or you can just right-click `config.example.py` in VS Code's file explorer, copy it, paste it, and rename it to `config.py`.

Now open `config.py` and fill in these values (leave everything else as-is):

- `TMDB_API_KEY` — to get your free API key:
  1. Go to [themoviedb.org](https://www.themoviedb.org/) and create a free account
  2. Once logged in, go to **Settings → API** (or visit [this link](https://www.themoviedb.org/settings/api))
  3. Click **Create** → select **Developer**
  4. Fill out the form (for "Application URL" you can just put `http://localhost`, and for the description just say it's a school project)
  5. Copy the **API Key (v3 auth)** and paste it into your `config.py`
- `FIREBASE_CREDENTIALS_PATH` — leave this as `"firebase-credentials.json"`. Angelo will email you the actual file. **Important:** the file you receive might have a long name like `reelette-project-firebase-adminsdk-...json`. Rename it to `firebase-credentials.json` and save it in the root of the project folder (same folder as `app.py`).
- `FIREBASE_WEB_API_KEY` — Angelo will email this to you along with the credentials file. Just paste it in.
- `SECRET_KEY` — change this to any random string, doesn't matter what

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 4. Install frontend dependencies

```bash
cd "REACT PAGES"
npm install
cd ..
```

### 5. Run the app

You need **two terminals** running at the same time.

> **How to open a second terminal in VS Code:** Click the **+** icon at the top-right of the terminal panel to create a new terminal. You can switch between them using the dropdown next to it.

**Terminal 1 — Flask backend:**
```bash
python app.py
```

**Terminal 2 — React frontend:**
```bash
cd "REACT PAGES"
npm run dev
```

Once the frontend starts, Vite will print a local URL in the terminal (something like `http://localhost:5173`). **Click that link** or paste it into your browser to open the app.

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
