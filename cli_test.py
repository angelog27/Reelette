# cli_test.py
from firebase_helper import create_user, verify_user, update_streaming_services, get_user_streaming_services
from tmdb_api import discover_movies, get_streaming_providers, get_poster_url
import getpass

print("=" * 60)
print("🎬 REELETTE - User Registration & Movie Discovery")
print("=" * 60)

# Step 1: Login or Register
print("\n📝 STEP 1: Login or Register")
print("-" * 60)

choice = input("Do you want to (1) Login or (2) Register? Enter 1 or 2: ")

user_id = None
username = None

if choice == "1":
    # LOGIN
    print("\n🔐 LOGIN")
    print("-" * 60)
    
    email = input("Enter email: ")
    password = getpass.getpass("Enter password: ")
    
    print("\n⏳ Logging in...")
    result = verify_user(email, password)
    
    if result['success']:
        print(f"✅ Welcome back, {result['username']}!")
        user_id = result['user_id']
        username = result['username']
    else:
        print(f"❌ Login failed: {result['message']}")
        exit()

elif choice == "2":
    # REGISTER
    print("\n📝 REGISTER")
    print("-" * 60)
    
    username = input("Enter username: ")
    email = input("Enter email: ")
    password = getpass.getpass("Enter password: ")
    confirm_password = getpass.getpass("Confirm password: ")
    
    if password != confirm_password:
        print("❌ Passwords don't match!")
        exit()
    
    print("\n⏳ Creating account...")
    result = create_user(email, password, username)
    
    if not result['success']:
        print(f"❌ Error: {result['message']}")
        exit()
    
    print(f"✅ Account created successfully!")
    user_id = result['user_id']
    print(f"🆔 User ID: {user_id}")

else:
    print("❌ Invalid choice. Please enter 1 or 2.")
    exit()

# Step 2: Check if user already has streaming services set
print("\n" + "=" * 60)
print("📺 STEP 2: Streaming Services")
print("-" * 60)

existing_services = get_user_streaming_services(user_id)
enabled_services = [k for k, v in existing_services.items() if v]

if enabled_services:
    print(f"\n✅ You already have streaming services configured:")
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
    
    update_choice = input("\nDo you want to update your services? (y/n): ")
    
    if update_choice.lower() != 'y':
        print("✅ Keeping existing streaming services")
        # Skip to movie discovery
    else:
        # Allow update
        print("\n📺 Update Your Streaming Services")
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
        
        print("\n⏳ Updating preferences...")
        update_result = update_streaming_services(user_id, streaming_services)
        
        if update_result['success']:
            print("✅ Streaming services updated!")
            enabled = [k for k, v in streaming_services.items() if v]
            print(f"📺 You selected: {', '.join(enabled)}")
        else:
            print(f"❌ Error: {update_result['message']}")
            exit()

else:
    # New user - prompt for services
    print("\n📺 Select Your Streaming Services")
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
    
    print("\n⏳ Saving preferences...")
    update_result = update_streaming_services(user_id, streaming_services)
    
    if update_result['success']:
        print("✅ Streaming services saved!")
        enabled = [k for k, v in streaming_services.items() if v]
        print(f"📺 You selected: {', '.join(enabled)}")
    else:
        print(f"❌ Error: {update_result['message']}")
        exit()

# Step 3: Discover Movies
print("\n" + "=" * 60)
print("🎬 STEP 3: Discovering Movies for You...")
print("-" * 60)

# Get provider IDs
STREAMING_PROVIDER_IDS = {
    'netflix': 8,
    'amazonPrime': 9,
    'disneyPlus': 337,
    'hboMax': 384,
    'hulu': 15,
    'appleTV': 2,
    'paramount': 531,
    'peacock': 387
}

user_services = get_user_streaming_services(user_id)
enabled_services = [service for service, enabled in user_services.items() if enabled]
provider_ids = [STREAMING_PROVIDER_IDS[service] for service in enabled_services if service in STREAMING_PROVIDER_IDS]

if not provider_ids:
    print("❌ No streaming services selected. Please update your preferences.")
    exit()

# Discover popular movies
movies_data = discover_movies(sort_by="popularity.desc")

if not movies_data or 'results' not in movies_data:
    print("❌ Could not fetch movies")
    exit()

print(f"⏳ Checking {len(movies_data['results'])} popular movies...")
print()

matched_movies = []

for movie in movies_data['results'][:50]:  # Check first 50 to find matches
    if len(matched_movies) >= 10:
        break
    
    movie_id = movie['id']
    streaming_info = get_streaming_providers(movie_id)
    
    if streaming_info and 'flatrate' in streaming_info:
        available_providers = {provider['provider_id'] for provider in streaming_info['flatrate']}
        
        if any(provider_id in available_providers for provider_id in provider_ids):
            matching_services = []
            for service_name, provider_id in STREAMING_PROVIDER_IDS.items():
                if provider_id in available_providers and service_name in enabled_services:
                    # Friendly names
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
                    matching_services.append(friendly_names.get(service_name, service_name))
            
            matched_movies.append({
                'title': movie['title'],
                'year': movie.get('release_date', 'N/A')[:4],
                'rating': movie.get('vote_average', 0),
                'overview': movie.get('overview', ''),
                'poster': get_poster_url(movie.get('poster_path')),
                'services': matching_services
            })

print("=" * 60)
print(f"✅ Found {len(matched_movies)} movies on your streaming services!")
print("=" * 60)

for i, movie in enumerate(matched_movies, 1):
    print(f"\n{i}. {movie['title']} ({movie['year']})")
    print(f"   ⭐ Rating: {movie['rating']}/10")
    print(f"   📺 Available on: {', '.join(movie['services'])}")
    print(f"   📝 {movie['overview'][:100]}...")
    if movie['poster']:
        print(f"   🖼️  Poster: {movie['poster']}")

print("\n" + "=" * 60)
print(f"🎉 Welcome to Reelette, {username}! Enjoy discovering movies!")
print("=" * 60)