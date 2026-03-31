# Reelette 🎬

CSC4330 group project. Reelette is a movie discovery web app that helps users find films available on their streaming services, track what they've watched, and rate movies.

---

## Project Structure

Reelette/
├── reelette-site/            # Frontend (React + Vite, exported from Figma)
│   ├── src/
│   │   ├── app/components/   # UI components (Feed, Filter, Home, Login, etc.)
│   │   ├── styles/           # Tailwind + theme CSS
│   │   └── main.tsx
│   ├── index.html
│   └── package.json
├── cli_test.py               # CLI test interface for the backend
├── firebase_helper.py        # Firebase auth and Firestore operations
├── tmdb_api.py               # TMDb API helper methods
├── config.py                 # Your local config (not committed)
├── config.example.py         # Config template
└── requirements.txt          # Python dependencies

---

## Tech Stack

Frontend  | React, TypeScript, Vite, Tailwind, shadcn/ui
Backend   | Python
Database  | Firebase Firestore
Auth      | Firebase Authentication
Movies    | TMDb API

---

## Frontend Setup (reelette-site/)

cd reelette-site
npm install
npm run dev

App runs at http://localhost:5173 by default.
Original Figma design: https://www.figma.com/design/OIp641I4bVKGlpz7XLseHJ/Reelette-Site

---

## Backend Setup

1. Clone the repo
git clone https://github.com/angelog27/Reelette.git
cd Reelette

2. Install dependencies
pip install -r requirements.txt

3. Configure credentials
cp config.example.py config.py

Fill in config.py with your values:
- TMDB_API_KEY — get one at https://www.themoviedb.org/settings/api
- FIREBASE_CREDENTIALS_PATH — path to your Firebase service account JSON (email the team to receive the credentials file)
- FIREBASE_WEB_API_KEY — found in Firebase project settings

4. Firebase setup
- Create a Firebase project at https://console.firebase.google.com
- Enable Email/Password authentication
- Create a Firestore database
- Download your service account JSON and set FIREBASE_CREDENTIALS_PATH to its path

5. Run the CLI
python cli_test.py

---

## Features

- User registration and login via Firebase Authentication
- Movie discovery and search via TMDb API
- Filter by actor, director, genre, year, rating, and sort order
- Filter results to only movies on your streaming services
- Watched movie tracking with personal ratings in Firestore
- Streaming service preferences saved per user

---

## Contributors

- Angelo
- Jordan
- Marty
