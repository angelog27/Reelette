# Reelette backend dev
CSC4330 Rellette group repo. This is our movie website idea. 


When running the code, everybody must change the FIREBASE_CREDENTIALS_PATH = "" in the config.py file to the actual path of the firebase-credentials.json file. I can email you all the actual file in order for it to run. Once youve recieved the email you just have to copy the path and change the FIREBASE_CREDENTIALS_PATH. 

## Tech Stack//FOR BACKEND

- **Python** — backend logic and CLI
- **Firebase** — Authentication and Firestore database
- **TMDb API** — movie data, search, and streaming provider info

## PFILE Structure

```
reelette/
├── cli_test.py           # CLI test interface for the backend
├── firebase_helper.py    # Firebase auth and Firestore operations
├── tmdb_api.py           # TMDb API helper methods
├── config.py             # Your local config (not committed)
├── config.example.py     # Config template
└── requirements.txt      # Python dependencies
```

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/angelog27/reelette.git
cd reelette
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure credentials
```bash
cp config.example.py config.py
```
Then fill in `config.py` with your values:
- `TMDB_API_KEY` — get one at [themoviedb.org](https://www.themoviedb.org/settings/api)
- `FIREBASE_CREDENTIALS_PATH` — path to your Firebase service account JSON
- `FIREBASE_WEB_API_KEY` — found in Firebase project settings

### 4. Firebase setup
- Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
- Enable **Email/Password** authentication
- Create a **Firestore** database
- Download your service account credentials JSON and point `FIREBASE_CREDENTIALS_PATH` to it

### 5. Run the CLI
```bash
python cli_test.py
```

## Features (Backend v1)

- User registration and login via Firebase Authentication
- Streaming service preferences saved per user in Firestore
- Movie discovery and search via TMDb API
- Filter results by actor, director, genre, year, rating, and sort order
- Filter movies to only those available on the user's streaming services
- Watched movie tracking with user ratings stored in Firestore

## Contributors

- Angelo
- Jordan
