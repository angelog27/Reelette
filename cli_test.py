# cli_test.py
from firebase_helper import (create_user, verify_user, check_email_exists,
                             update_streaming_services, get_user_streaming_services,
                             add_watched_movie, get_watched_movies,
                             is_movie_watched, update_watched_rating,
                             create_post, get_feed, like_post, add_reply, get_replies, delete_post)
from tmdb_api import (discover_movies, search_movies, search_person, get_genres,
                       get_streaming_providers, get_poster_url,
                       get_movie_director, get_movie_details, get_movie_genres, get_movie_actors)
import getpass

print("=" * 60)
print("REELETTE - Login & Movie Discovery")
print("=" * 60)

# ask if user wants to log in or make a new account
print("\nSTEP 1: Login or Register")
print("If you have aleady made an account, Welcome Back! Please log in to continue.")
print("If you're new around here, Start registering to create your account and set up your streaming preferences.")
print("-" * 60)

choice = input("Do you want to (1) Login or (2) Register? Enter 1 or 2: ")
while True:
    if choice in ["1", "2"]:
        break
    else:
        choice = input("Invalid choice. Please enter 1 for Login or 2 for Register: ")
user_id = None
username = None

if choice == "1":
    # LOGIN
    print("\nLOGIN")
    print("-" * 60)
     
    email = input("Enter email: ")
    # keep asking until we find a valid email in the database
    verify_email = check_email_exists(email)
    while not verify_email['success']:
        print(f"⚠️ Error: {verify_email['message']}")
        email = input("Please enter a valid email: ")
        verify_email = check_email_exists(email)
    while True:
        password = input("Enter password:")
        if verify_user(email, password)['success']:
            print("Login successful!")
            break
        else:
            print("⚠️Incorrect password, try again.")    

    print("\n Logging in...")
    result = verify_user(email, password)
    
    if result['success']:
        print(f"Welcome back, {result['username']}!")
        user_id = result['user_id']
        username = result['username']
    else:
        print(f"⚠️Login failed: {result['message']}")
        exit()

elif choice == "2":
    # REGISTER
    print("\n REGISTER")
    print("\nLet's create your account! You'll need a valid email and a secure password.")
    print("-" * 60)
    
    username = input("Enter username: ")
    email = input("Enter email: ")
    password = getpass.getpass("Enter password: ")
    confirm_password = getpass.getpass("Confirm password: ")
    
    if password != confirm_password:
        print("⚠️ Passwords don't match!")
        exit()
    
    print("\n⏳ Creating account...")
    result = create_user(email, password, username)
    
    if not result['success']:
        print(f"⚠️ Error: {result['message']}")
        exit()
    
    print(f"Account created successfully!")
    user_id = result['user_id']
    print(f" User ID: {user_id}")

else:
    print("⚠️ Invalid choice. Please enter 1 or 2.")
    exit()

# check if the user has already set up their streaming services before
print("\n" + "=" * 60)
print("STEP 2: Streaming Services")
print("-" * 60)

existing_services = get_user_streaming_services(user_id)
enabled_services = [k for k, v in existing_services.items() if v]

if enabled_services:
    print(f"\n You already have streaming services configured:")
    friendly_names = {
        'netflix': 'Netflix',
        'hulu': 'Hulu',
        'disneyPlus': 'Disney+',
        'hboMax': 'HBO Max',
        'amazonPrime': 'Prime Video',
        'appleTV': 'Apple TV+',
        'paramount': 'Paramount+',
        'peacock': 'Peacock'
    }
    for service in enabled_services:
        print(f"   • {friendly_names.get(service, service)}")
    
    print("Have you updated your streaming services?")
    update_choice = input("\n If so select y, if not select n (y/n): ")
    
    if update_choice.lower() != 'y':
        print("Keeping existing streaming services")
        # skip straight to movie discovery
    else:
        print("\nUpdate Your Streaming Services")
        print("-" * 60)
        
        print("\nAvailable streaming services:")
        print("1. Netflix")
        print("2. Hulu")
        print("3. Disney+")
        print("4. HBO Max")
        print("5. Amazon Prime Video")
        print("6. Apple TV+")
        print("7. Paramount+")
        print("8. Peacock")
        
        selected = input("\nEnter numbers separated by commas (e.g., 1,2,5): ")
        selected_numbers = [int(x.strip()) for x in selected.split(',')]
        
        services_map = {
            1: 'netflix',
            2: 'hulu',
            3: 'disneyPlus',
            4: 'hboMax',
            5: 'amazonPrime',
            6: 'appleTV',
            7: 'paramount',
            8: 'peacock'
        }
        
        # start everything off, then flip the ones the user picked
        streaming_services = {
            'netflix': False,
            'hulu': False,
            'disneyPlus': False,
            'hboMax': False,
            'amazonPrime': False,
            'appleTV': False,
            'paramount': False,
            'peacock': False
        }
        
        for num in selected_numbers:
            if num in services_map:
                streaming_services[services_map[num]] = True
        
        print("\nUpdating preferences...")
        update_result = update_streaming_services(user_id, streaming_services)
        
        if update_result['success']:
            print("Streaming services updated!")
            enabled = [k for k, v in streaming_services.items() if v]
            print(f"📺 You selected: {', '.join(enabled)}")
        else:
            print(f"Error: {update_result['message']}")
            exit()

else:
    # first time setup — prompt the user to pick their services
    print("\nSelect Your Streaming Services")
    print("-" * 60)
    
    print("\nAvailable streaming services:")
    print("1. Netflix")
    print("2. Hulu")
    print("3. Disney+")
    print("4. HBO Max")
    print("5. Amazon Prime Video")
    print("6. Apple TV+")
    print("7. Paramount+")
    print("8. Peacock")
    
    selected = input("\nEnter numbers separated by commas (e.g., 1,2,5): ")
    selected_numbers = [int(x.strip()) for x in selected.split(',')]
    
    services_map = {
        1: 'netflix',
        2: 'hulu',
        3: 'disneyPlus',
        4: 'hboMax',
        5: 'amazonPrime',
        6: 'appleTV',
        7: 'paramount',
        8: 'peacock'
    }
    
    # start everything off as false, then flip the ones the user picked
    streaming_services = {
        'netflix': False,
        'hulu': False,
        'disneyPlus': False,
        'hboMax': False,
        'amazonPrime': False,
        'appleTV': False,
        'paramount': False,
        'peacock': False
    }
    
    for num in selected_numbers:
        if num in services_map:
            streaming_services[services_map[num]] = True
    
    print("\nSaving preferences...")
    update_result = update_streaming_services(user_id, streaming_services)
    
    if update_result['success']:
        print("Streaming services saved!")
        enabled = [k for k, v in streaming_services.items() if v]
        print(f"📺 You selected: {', '.join(enabled)}")
    else:
        print(f" ⚠️ Error: {update_result['message']}")
        exit()

# provider IDs come from TMDB's API, these map our service keys to their IDs
STREAMING_PROVIDER_IDS = {
    'netflix': 8, 'amazonPrime': 9, 'disneyPlus': 337,
    'hboMax': 384, 'hulu': 15, 'appleTV': 2,
    'paramount': 531, 'peacock': 387
}
FRIENDLY_NAMES = {
    'netflix': 'Netflix', 'hulu': 'Hulu', 'disneyPlus': 'Disney+',
    'hboMax': 'HBO Max', 'amazonPrime': 'Prime Video', 'appleTV': 'Apple TV+',
    'paramount': 'Paramount+', 'peacock': 'Peacock'
}

user_services = get_user_streaming_services(user_id)
enabled_services = [svc for svc, on in user_services.items() if on]
provider_ids = [STREAMING_PROVIDER_IDS[s] for s in enabled_services if s in STREAMING_PROVIDER_IDS]

if not provider_ids:
    print("⚠️ No streaming services selected. Please update your preferences.")
    exit()

# prints a numbered list of movies with their key details
def display_movies(matched_movies, streaming_filtered=True):
    print("\n" + "=" * 60)
    if matched_movies:
        if streaming_filtered:
            print(f"Found {len(matched_movies)} movies on your streaming services!")
        else:
            print(f"Found {len(matched_movies)} movies matching your search!")
    else:
        print(" No matches found. Try refreshing or adjusting your filters.")
    print("=" * 60)
    for i, movie in enumerate(matched_movies, 1):
        print(f"\n{i}. {movie['title']} ({movie['year']})")
        print(f"   🎬 Director: {movie['director']}")
        print(f"   🎭 Main Actors: {', '.join(movie['Popular Actors']) if movie['Popular Actors'] else 'N/A'}")
        print(f"   🎭 Genres: {', '.join(movie['genres']) if movie['genres'] else 'N/A'}")
        print(f"   ⭐ Rating: {movie['rating']}/10")
        if movie['services'] != ['N/A']:
            print(f"   📺 Available on: {', '.join(movie['services'])}")
        print(f"   📝 {movie['overview'][:120]}...")
        if movie['poster']:
            print(f"   🖼️  Poster: {movie['poster']}")

# checks each movie against the user's streaming services and only keeps matches
def filter_by_streaming(raw_movies):
    matched = []
    for movie in raw_movies:
        movie_id = movie['id']
        streaming_info = get_streaming_providers(movie_id)
        if streaming_info and 'flatrate' in streaming_info:
            available = {p['provider_id'] for p in streaming_info['flatrate']}
            if any(pid in available for pid in provider_ids):
                services = [
                    FRIENDLY_NAMES.get(svc, svc)
                    for svc, pid in STREAMING_PROVIDER_IDS.items()
                    if pid in available and svc in enabled_services
                ]
                details = get_movie_details(movie_id)
                release_date = movie.get('release_date') or ''
                matched.append({
                    'movie_id': movie_id,
                    'title': movie['title'],
                    'year': release_date[:4] if release_date else 'N/A',
                    'rating': movie.get('vote_average', 0),
                    'overview': movie.get('overview', ''),
                    'poster': get_poster_url(movie.get('poster_path')),
                    'services': services,
                    'director': get_movie_director(details) if details else "Unknown",
                    'Popular Actors': get_movie_actors(details) if details else [],
                    'genres': get_movie_genres(details) if details else []
                })
    return matched

# same as filter_by_streaming but skips the service check — used when user wants all results
def enrich_movies(raw_movies):
    results = []
    for movie in raw_movies:
        movie_id = movie['id']
        details = get_movie_details(movie_id)
        release_date = movie.get('release_date') or ''
        streaming_info = get_streaming_providers(movie_id)
        if streaming_info and 'flatrate' in streaming_info:
            services = [p['provider_name'] for p in streaming_info['flatrate']]
        else:
            services = ['N/A']
        results.append({
            'movie_id': movie_id,
            'title': movie['title'],
            'year': release_date[:4] if release_date else 'N/A',
            'rating': movie.get('vote_average', 0),
            'overview': movie.get('overview', ''),
            'poster': get_poster_url(movie.get('poster_path')),
            'services': services,
            'director': get_movie_director(details) if details else "Unknown",
            'Popular Actors': get_movie_actors(details) if details else [],
            'genres': get_movie_genres(details) if details else []
        })
    return results


# searches TMDB for a person by name and lets the user pick the right one
def resolve_person(prompt_label):
    name = input(f"   {prompt_label} name (or Enter to skip): ").strip()
    if not name:
        return None, None
    results = search_person(name)
    if not results or not results.get('results'):
        print(f"   ⚠️  No person found for '{name}', skipping.")
        return None, None
    people = results['results'][:4]
    print(f"   Found {len(people)} result(s):")
    for i, p in enumerate(people, 1):
        known = p.get('known_for_department', 'Unknown')
        print(f"     {i}. {p['name']} ({known})")
    while True:
        pick = input(f"   Pick 1-{len(people)} or Enter to skip: ").strip()
        if pick == '':
            print(f"   ⚠️  No {prompt_label.lower()} selected, skipping filter.")
            return None, None
        if pick.isdigit() and 1 <= int(pick) <= len(people):
            chosen = people[int(pick) - 1]
            print(f"   {prompt_label} filter set: {chosen['name']}")
            return chosen['id'], chosen['name']
        print(f"   Invalid choice. Enter a number 1-{len(people)} or press Enter to skip.")

# shows full movie details and lets the user rate or update their rating
def handle_movie_selection(movie, user_id):
    print("\n" + "=" * 60)
    print(f"🎬 {movie['title']} ({movie['year']})")
    print("-" * 60)
    print(f"   🎬 Director:    {movie['director']}")
    print(f"   🎭 Actors:      {', '.join(movie['Popular Actors']) if movie['Popular Actors'] else 'N/A'}")
    print(f"   🎭 Genres:      {', '.join(movie['genres']) if movie['genres'] else 'N/A'}")
    print(f"   ⭐ TMDB Rating: {movie['rating']}/10")
    if movie['services'] != ['N/A']:
        print(f"   📺 Available on: {', '.join(movie['services'])}")
    print(f"   📝 {movie['overview']}")
    if movie.get('poster'):
        print(f"   🖼️  Poster: {movie['poster']}")

    already_watched = is_movie_watched(user_id, movie['movie_id'])
    print("\n" + "-" * 60)
    if already_watched:
        print("1. Update my rating")
    else:
        print("1. Mark as Watched & Rate")
    print("2. Back to results")

    choice = input("\nEnter 1 or 2: ").strip()
    if choice != "1":
        return

    while True:
        rating_input = input("Enter your rating (0-10): ").strip()
        if rating_input.replace('.', '', 1).isdigit():
            rating = float(rating_input)
            if 0 <= rating <= 10:
                break
        print("Please enter a number between 0 and 10.")

    if already_watched:
        result = update_watched_rating(user_id, movie['movie_id'], rating)
        if result['success']:
            print(f"✅ Rating updated to {rating}/10!")
        else:
            print(f"❌ Error: {result['message']}")
    else:
        result = add_watched_movie(user_id, movie, rating)
        if result['success']:
            print(f"✅ \"{movie['title']}\" added to your watched movies with a {rating}/10!")
        else:
            print(f"❌ Error: {result['message']}")

# prints a single post with its likes and timestamp
def display_post(i, post):
    created = post.get('created_at')
    date_str = created.strftime('%b %d, %Y %I:%M %p') if hasattr(created, 'strftime') else str(created)
    print(f"\n{i}. {post['username']}")
    print(f"   {post['message']}")
    print(f"   {post['movie_title']}  ⭐ {post['rating']}/10")
    print(f"    {post['likes']} likes  •  🕐 {date_str}")

# handles viewing replies and writing one for a given post
def handle_post_replies(post, user_id, username):
    post_id = post['post_id']
    replies = get_replies(post_id)

    print(f"\n── Replies ({len(replies)}) ─────────────────────────────────")
    if not replies:
        print("   No replies yet.")
    for r in replies:
        print(f"   {r['username']}: {r['message']}")

    print("\n1. Write a reply")
    print("2. Back")
    choice = input("\nEnter 1 or 2: ").strip()
    if choice != "1":
        return

    msg = input("Your reply: ").strip()
    if not msg:
        return
    result = add_reply(post_id, user_id, username, msg)
    if result['success']:
        print("Reply posted!")
    else:
        print(f"⚠️ Error: {result['message']}")

# main loop — keeps running until the user quits
while True:
    print("\n" + "=" * 60)
    print("STEP 3: Welcome to Reelette! What would you like to do?")
    print("-" * 60)
    print("1. Browse Movies    (Popular now or All Time Best)")
    print("2. Search & Filter  (by title, actor, director, year, rating, genre)")
    print("3. Watched Movies   (view your rated movies)")
    print("4. Social Feed      (see what others are watching)")
    print("5. Quit")

    main_choice = input("\nEnter 1, 2, 3, 4, or 5: ").strip()
    while main_choice not in ["1", "2", "3", "4", "5"]:
        main_choice = input("Invalid choice. Enter 1, 2, 3, 4, or 5: ").strip()

    if main_choice == "5":
        break

    # BROWSE MODE
    if main_choice == "1":
        print("\nWhat type of movies would you like to see?")
        print("1. Currently Popular  (trending right now)")
        print("2. All Time Best      (highest rated classics)")
        print("Type 'menu' to go back.")
        browse_choice = input("\nEnter 1 or 2: ").strip()
        if browse_choice.lower() == 'menu':
            continue

        while browse_choice not in ["1", "2"]:
            browse_choice = input("Invalid choice. Enter 1 or 2 (or 'menu'): ").strip()
            if browse_choice.lower() == 'menu':
                break
        if browse_choice.lower() == 'menu':
            continue

        # set sort params based on browse type
        if browse_choice == "1":
            sort_by = "popularity.desc"
            movie_type_label = "Currently Popular"
            b_min_rating, b_min_votes = None, None
        else:
            sort_by = "vote_average.desc"
            movie_type_label = "All Time Best"
            b_min_rating, b_min_votes = 7.0, 1000

        # ask whether to filter by streaming services for this browse session
        print("\nWould you like to filter results to only movies on your streaming services?")
        print("(Say 'no' to see all movies, e.g. to browse what's popular right now)")
        use_streaming_filter = input("Apply your streaming services? (yes/no): ").strip().lower()
        while use_streaming_filter not in ["yes", "no", "y", "n"]:
            use_streaming_filter = input("Please enter 'yes' or 'no': ").strip().lower()
        use_streaming_filter = use_streaming_filter in ["yes", "y"]

        # fetch two TMDB pages per batch so we have enough results after streaming filter
        batch = 1
        while True:
            print("\n" + "=" * 60)
            print(f"{movie_type_label} — Batch {batch}")
            print("-" * 60)

            raw = []
            for page_num in [batch * 2 - 1, batch * 2]:
                data = discover_movies(sort_by=sort_by, page=page_num,
                                       min_rating=b_min_rating, min_vote_count=b_min_votes)
                if data and 'results' in data:
                    raw.extend(data['results'])

            if not raw:
                print("⚠️Could not fetch movies.")
                break

            if use_streaming_filter:
                print(f"⏳ Checking {len(raw)} movies against your streaming services...")
                matched = filter_by_streaming(raw)
            else:
                print(f"⏳ Loading {len(raw)} movies...")
                matched = enrich_movies(raw)
            display_movies(matched, streaming_filtered=use_streaming_filter)

            go_menu = False
            while True:
                print("\n" + "=" * 60)
                action = input("Enter a movie number to rate it, Enter for more, 'menu', or 'quit': ").strip().lower()
                if action == 'quit':
                    exit()
                if action == 'menu':
                    go_menu = True
                    break
                if action.isdigit() and 1 <= int(action) <= len(matched):
                    handle_movie_selection(matched[int(action) - 1], user_id)
                    continue
                break  # load next batch

            if go_menu:
                break
            batch += 1

    # SEARCH & FILTER MODE
    elif main_choice == "2":
        print("\n" + "=" * 60)
        print("SEARCH & FILTER MOVIES")
        print("-" * 60)

        title = input("Movie title or keyword (or Enter to browse with filters only): ").strip()

        # reset all filter values before collecting input
        actor_id = director_id = None
        actor_name = director_name = None
        year_from = year_to = exact_year = None
        s_min_rating = None
        genre_id = None
        genre_name = None
        search_sort = "popularity.desc"

        apply_filters = input("\nWould you like to apply filters? (y/n): ").strip().lower()
        if apply_filters == 'y':
            print("\nSelect which filters to apply:")
            print("  1. Actor")
            print("  2. Director")
            print("  3. Year / Year Range")
            print("  4. Minimum Rating")
            print("  5. Genre")
            print("  6. Sort Order")
            filter_input = input("\nEnter filter numbers separated by commas (e.g. 1,3,5): ").strip()
            selected_filters = {f.strip() for f in filter_input.split(',') if f.strip().isdigit()}

            actor_name = director_name = None

            if '1' in selected_filters:
                actor_id, actor_name = resolve_person("Actor")

            if '2' in selected_filters:
                director_id, director_name = resolve_person("Director")

            if '3' in selected_filters:
                year_input = input("   Year or range (e.g. 2020  or  2010-2020): ").strip()
                if '-' in year_input and year_input.count('-') == 1:
                    parts = year_input.split('-')
                    if parts[0].isdigit() and parts[1].isdigit():
                        year_from, year_to = int(parts[0]), int(parts[1])
                elif year_input.isdigit():
                    exact_year = int(year_input)

            if '4' in selected_filters:
                rating_input = input("   Minimum rating 0-10: ").strip()
                if rating_input.replace('.', '', 1).isdigit():
                    s_min_rating = float(rating_input)

            if '5' in selected_filters:
                genres_data = get_genres()
                if genres_data and 'genres' in genres_data:
                    genre_list = genres_data['genres']
                    print("\n   Available genres:")
                    for i, g in enumerate(genre_list, 1):
                        print(f"     {i:2}. {g['name']}")
                    genre_input = input("   Pick a genre number: ").strip()
                    if genre_input.isdigit() and 1 <= int(genre_input) <= len(genre_list):
                        chosen_genre = genre_list[int(genre_input) - 1]
                        genre_id = chosen_genre['id']
                        genre_name = chosen_genre['name']

            if '6' in selected_filters:
                print("\n   Sort results by:")
                print("     1. Popularity (default)")
                print("     2. Rating")
                print("     3. Newest first")
                sort_input = input("   Enter 1, 2, or 3: ").strip()
                if sort_input == "2":
                    search_sort = "vote_average.desc"
                elif sort_input == "3":
                    search_sort = "primary_release_date.desc"

        use_streaming = input("\nFilter results to your streaming services only? (y/n): ").strip().lower() == 'y'

        # show a summary of everything the user picked before running the search
        print("\n── Active filters ──────────────────────────────────")
        if title:
            print(f"  Title:     {title}")
        if actor_name:
            print(f"  Actor:     {actor_name}")
        if director_name:
            print(f"  Director:  {director_name}")
        if exact_year:
            print(f"  Year:      {exact_year}")
        if year_from or year_to:
            print(f"  Years:     {year_from or '?'} – {year_to or '?'}")
        if s_min_rating:
            print(f"  Min rating:{s_min_rating}/10")
        if genre_name:
            print(f"  Genre:     {genre_name}")
        print(f"  Streaming: {'Your services only' if use_streaming else 'All results'}")
        print("────────────────────────────────────────────────────")

        s_batch = 1
        while True:
            print("\n" + "=" * 60)
            print(f"Search Results — Page {s_batch}")
            print("-" * 60)

            # title search uses a different endpoint than discover
            if title:
                data = search_movies(title, page=s_batch)
                raw = data['results'] if data and 'results' in data else []
            else:
                raw = []
                for page_num in [s_batch * 2 - 1, s_batch * 2]:
                    data = discover_movies(
                        sort_by=search_sort,
                        page=page_num,
                        year=exact_year,
                        year_from=year_from,
                        year_to=year_to,
                        min_rating=s_min_rating,
                        with_cast=actor_id,
                        with_crew=director_id,
                        genre_id=genre_id
                    )
                    if data and 'results' in data:
                        raw.extend(data['results'])

            if not raw:
                print("⚠️ No results found.")
                break

            if use_streaming:
                print(f"Checking {len(raw)} movies against your streaming services...")
                matched = filter_by_streaming(raw)
                display_movies(matched)
            else:
                print(f"Fetching details for {len(raw)} movies...")
                matched = enrich_movies(raw)
                display_movies(matched, streaming_filtered=False)

            go_menu = False
            while True:
                print("\n" + "=" * 60)
                action = input("Enter a movie number to rate it, Enter for more, 'menu', or 'quit': ").strip().lower()
                if action == 'quit':
                    exit()
                if action == 'menu':
                    go_menu = True
                    break
                if action.isdigit() and 1 <= int(action) <= len(matched):
                    handle_movie_selection(matched[int(action) - 1], user_id)
                    continue
                break  # load next page

            if go_menu:
                break
            s_batch += 1

    # WATCHED MOVIES — shows what the user has rated and lets them view details or update a rating
    elif main_choice == "3":
        while True:
            print("\n" + "=" * 60)
            print("YOUR WATCHED MOVIES")
            print("-" * 60)

            watched = get_watched_movies(user_id)

            if not watched:
                print("You haven't watched any movies yet.")
                print("   Browse or search for movies and rate them to build your list!")
                input("\nPress Enter to return to the menu.")
                break

            print(f"You've watched {len(watched)} movie(s)!\n")
            for i, m in enumerate(watched, 1):
                print(f"  {i:2}. {m['title']} ({m['year']})  —  ⭐ Your rating: {m['user_rating']}/10")

            print("\n" + "=" * 60)
            action = input("Enter a movie number for details, or 'menu' to go back: ").strip().lower()
            if action == 'menu':
                break

            if action.isdigit() and 1 <= int(action) <= len(watched):
                m = watched[int(action) - 1]
                print("\n" + "=" * 60)
                print(f"🎬 {m['title']} ({m['year']})")
                print("-" * 60)
                print(f"   🎬 Director:     {m.get('director', 'Unknown')}")
                print(f"   🎭 Actors:       {', '.join(m.get('actors', [])) or 'N/A'}")
                print(f"   🎭 Genres:       {', '.join(m.get('genres', [])) or 'N/A'}")
                print(f"   📺 Streaming:    {', '.join(m.get('services', [])) or 'N/A'}")
                print(f"   ⭐ TMDB Rating:  {m.get('tmdb_rating', 'N/A')}/10")
                print(f"   ⭐ Your Rating:  {m['user_rating']}/10")
                print(f"   📝 {m.get('overview', 'No overview available.')}")
                if m.get('poster'):
                    print(f"   🖼️  Poster: {m['poster']}")
                watched_at = m.get('watched_at')
                if watched_at:
                    date_str = watched_at.strftime('%B %d, %Y') if hasattr(watched_at, 'strftime') else str(watched_at)
                    print(f"   📅 Watched: {date_str}")
                input("\nPress Enter to go back.")
            else:
                print("Invalid choice.")

    # SOCIAL FEED — browse posts, like them, reply, create your own, or delete yours
    elif main_choice == "4":
        while True:
            print("\n" + "=" * 60)
            print("🗣️  SOCIAL FEED")
            print("-" * 60)
            print("1. Browse feed")
            print("2. Create a post")
            print("3. Back to menu")

            feed_choice = input("\nEnter 1, 2, or 3: ").strip()
            while feed_choice not in ["1", "2", "3"]:
                feed_choice = input("Invalid choice. Enter 1, 2, or 3: ").strip()

            if feed_choice == "3":
                break

            # CREATE A POST
            if feed_choice == "2":
                print("\n── New Post ─────────────────────────────────────────")
                movie_title = input("Movie title: ").strip()
                if not movie_title:
                    print("⚠️ Movie title is required.")
                    continue

                # search TMDB so we can attach the real movie ID to the post
                print(f" Searching for '{movie_title}'...")
                search_result = search_movies(movie_title, page=1)
                raw_results = search_result['results'][:5] if search_result and 'results' in search_result else []

                if not raw_results:
                    print("⚠️ No movies found with that title.")
                    continue

                print("\nPick the right movie:")
                for i, m in enumerate(raw_results, 1):
                    year = m.get('release_date', '')[:4] or 'N/A'
                    print(f"  {i}. {m['title']} ({year})")

                pick = input(f"\nEnter 1-{len(raw_results)}: ").strip()
                if not pick.isdigit() or not (1 <= int(pick) <= len(raw_results)):
                    print("⚠️ Invalid choice.")
                    continue

                chosen_movie = raw_results[int(pick) - 1]

                while True:
                    rating_input = input("Your rating (0-10): ").strip()
                    if rating_input.replace('.', '', 1).isdigit():
                        post_rating = float(rating_input)
                        if 0 <= post_rating <= 10:
                            break
                    print("Please enter a number between 0 and 10.")

                message = input("What did you think? ").strip()
                if not message:
                    print("⚠️ Message can't be empty.")
                    continue

                result = create_post(user_id, username, message, chosen_movie['title'], chosen_movie['id'], post_rating)
                if result['success']:
                    print(f" Post created!")
                else:
                    print(f"⚠️ Error: {result['message']}")

            # BROWSE FEED
            elif feed_choice == "1":
                while True:
                    print("\n⏳ Loading feed...")
                    posts = get_feed()

                    if not posts:
                        print(" No posts yet. Be the first to post!")
                        input("\nPress Enter to go back.")
                        break

                    print("\n" + "=" * 60)
                    for i, post in enumerate(posts, 1):
                        display_post(i, post)

                    print("\n" + "=" * 60)
                    action = input("Enter a post number to interact, 'refresh', or 'menu': ").strip().lower()

                    if action == 'menu':
                        break

                    if action == 'refresh':
                        continue

                    if action.isdigit() and 1 <= int(action) <= len(posts):
                        post = posts[int(action) - 1]
                        print("\n" + "=" * 60)
                        display_post(int(action), post)
                        print("\n1. Like / Unlike")
                        print("2. View replies & comment")
                        print("3. Delete post (yours only)")
                        print("4. Back")

                        interact = input("\nEnter 1, 2, 3, or 4: ").strip()

                        if interact == "1":
                            result = like_post(post['post_id'], user_id)
                            if result['success']:
                                label = "❤️  Liked!" if result['action'] == 'liked' else "💔 Unliked."
                                print(label)
                            else:
                                print(f"⚠️ Error: {result['message']}")

                        elif interact == "2":
                            handle_post_replies(post, user_id, username)

                        elif interact == "3":
                            result = delete_post(post['post_id'], user_id)
                            if result['success']:
                                print("✅ Post deleted.")
                                break  # refresh the feed
                            else:
                                print(f"⚠️ {result['message']}")

print("\n" + "=" * 60)
print(f"🎉 Thanks for using Reelette, {username}! Enjoy your movies!")
print("=" * 60)