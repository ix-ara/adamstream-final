(() => {
    // Initialization Guard
    let isInitialized = false;
    const appLoader = document.getElementById('app-loader');

    // Basic Elements
    const contentRows = document.getElementById('content-rows');
    const searchInput = document.getElementById('search-input');
    const mainNav = document.getElementById('main-nav');
    const heroSection = document.getElementById('hero');
    const heroBg = document.getElementById('hero-bg');
    const heroTitle = document.getElementById('hero-title');
    const heroDesc = document.getElementById('hero-desc');
    const heroPlay = document.getElementById('hero-play');
    const heroInfo = document.getElementById('hero-info');
    const heroSetup = document.getElementById('hero-setup');
    
    // Modal
    const detailModal = document.getElementById('detail-modal');
    const closeModalBtn = document.getElementById('close-modal');
    
    // Player
    const videoOverlay = document.getElementById('video-overlay');
    const playerIframe = document.getElementById('player-iframe');
    const exitPlayerBtn = document.getElementById('exit-player');
    const playerTitleOverlay = document.getElementById('player-title-overlay');
    const playerTitle = document.getElementById('player-title');
    const playerEpisodeSelector = document.getElementById('player-episode-selector');
    const playerSeasonSelect = document.getElementById('player-season-select');
    const playerEpisodeSelect = document.getElementById('player-episode-select');
    const playerLoader = document.getElementById('player-loader');
    const playerDubToggle = document.getElementById('player-dub-toggle');
    const btnSub = document.getElementById('btn-sub');
    const btnDub = document.getElementById('btn-dub');
    const dubHint = document.getElementById('dub-hint');
    
    // UI Panels Let
    const profileScreen = document.getElementById('profile-screen');
    const homeBtn = document.getElementById('home-btn');
    const animeNavBtn = document.getElementById('anime-nav-btn') || { onclick: null }; // Safety fallback
    const apiKeyModal = document.getElementById('api-key-modal');
    const apiKeyInput = document.getElementById('tmdb-api-input');
    const saveApiBtn = document.getElementById('save-api-btn');
    const seasonSelect = document.getElementById('season-select');

    // Profile Elements
    const profilesList = document.getElementById('profiles-list');
    const profileModal = document.getElementById('profile-modal');
    const profileNameInput = document.getElementById('profile-name-input');
    const avatarPicker = document.getElementById('avatar-picker');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const cancelProfileBtn = document.getElementById('cancel-profile-btn');
    const manageProfilesBtn = document.getElementById('manage-profiles-btn');
    const doneManagingBtn = document.getElementById('done-managing-btn');
    const deleteProfileBtn = document.getElementById('delete-profile-btn');
    const deleteContainer = document.getElementById('delete-profile-container');
    const modalAvatarPreview = document.getElementById('modal-avatar-preview');
    const profileHeadline = document.getElementById('profile-headline');

    const PREMIUM_AVATARS = [
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop"
    ];

    let TMDB_API_KEY = '547c2cf5311a8f4499454a9fddb0fb8d';
    
    let libraryData = {
        movies: [],
        anime: [],
        animeTop: [],
        kdrama: [],
        tv: [],
        popular: [],
        binge: [],
        myList: JSON.parse(localStorage.getItem('adamstream_mylist')) || []
    };
    
    const KURDISH_VTT_CONTENT = `WEBVTT

00:00:01.000 --> 00:00:04.000
سڵاو، بەخێربێیت بۆ فیلمەکە

00:00:05.000 --> 00:00:08.000
ئەمە نموونەی زیرنووسە بە زمانی سۆرانی

00:00:09.000 --> 00:00:12.000
دەتوانیت ئەمە بگۆڕیت بۆ هەر فیلمێک`;

    const KURDISH_VTT_DATA_URI = `data:text/vtt;charset=utf-8,${encodeURIComponent(KURDISH_VTT_CONTENT)}`;

    let currentTab = 'home';
    let currentKurdishSub = false;
    let currentHeroIndex = 0;
    let heroInterval;
    let searchDebounce;
    let currentPlayingItem = null;
    let currentTvSeasons = [];
    let currentAnimeMap = []; // absolute ep index → { season, episode }
    let animeDubMode = false;
    let featuredPool = [];
    let currentServer = 'alpha'; // alpha, delta, prime, legacy

    // Profile State
    let profiles = JSON.parse(localStorage.getItem('adamstream_profiles')) || [
        { id: '1', name: 'Adam', avatar: PREMIUM_AVATARS[0] },
        { id: '2', name: 'Kids', avatar: PREMIUM_AVATARS[1] }
    ];
    let activeProfile = JSON.parse(localStorage.getItem('adamstream_active_profile')) || null;
    let isManageMode = false;
    let editingProfileId = null;
    let selectedAvatarUrl = PREMIUM_AVATARS[0];

    const SERVERS = {
        alpha: {
            name: 'Alpha',
            movie: (id) => `https://vidsrc.icu/embed/movie/${id}`,
            tv: (id, s, e) => `https://vidsrc.icu/embed/tv/${id}/${s}/${e}`
        },
        delta: {
            name: 'Delta',
            movie: (id) => `https://embed.su/embed/movie/${id}`,
            tv: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`
        },
        prime: {
            name: 'Prime',
            movie: (id) => `https://vidlink.pro/movie/${id}?autoplay=true`,
            tv: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?autoplay=true`
        },
        legacy: {
            name: 'Legacy',
            movie: (id) => `https://vidsrc.to/embed/movie/${id}`,
            tv: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`
        }
    };

    const BASE_URL = 'https://api.themoviedb.org/3';
    const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';
    const IMG_BG_BASE = 'https://image.tmdb.org/t/p/original';

    // --- TMDB FETCHING ---
    async function fetchTMDB(endpoint, timeoutMs = 8000) {
        if (!TMDB_API_KEY) return null;
        try {
            const url = new URL(`${BASE_URL}${endpoint}`);
            console.log('Fetching:', url.toString().replace(TMDB_API_KEY, '***'));
            url.searchParams.append('api_key', TMDB_API_KEY);
            url.searchParams.append('language', 'en-US');
            
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeoutMs);
            
            const res = await fetch(url.toString(), { signal: controller.signal });
            clearTimeout(id);
            
            if (!res.ok) {
                if(res.status === 401) throw new Error('Invalid API Key');
                throw new Error('API Error');
            }
            return await res.json();
        } catch (e) {
            console.error('TMDB error:', e);
            if (e.message === 'Invalid API Key') {
                console.error('The hardcoded TMDB API Key is invalid or rate limited.');
            }
            return null;
        }
    }

    async function fetchSearch(query) {
        if (!TMDB_API_KEY || !query) return null;
        try {
            const url = new URL(`${BASE_URL}/search/multi`);
            url.searchParams.append('api_key', TMDB_API_KEY);
            url.searchParams.append('query', query);
            const res = await fetch(url.toString());
            return await res.json();
        } catch(e) {
            return null;
        }
    }

    async function fetchTvDetails(tvId) {
        if (!TMDB_API_KEY) return null;
        try {
            const res = await fetch(`${BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`);
            if(!res.ok) return null;
            return await res.json();
        } catch(e) {
            return null;
        }
    }

    async function loadData() {
        if (!TMDB_API_KEY) {
            if(appLoader) appLoader.classList.add('hidden');
            return;
        }
        if(apiKeyModal) apiKeyModal.classList.add('opacity-0', 'pointer-events-none');
        if(appLoader) appLoader.classList.remove('hidden');

        try {
            // Add a timeout to fetching to prevent hanging indefinitely
            const fetchWithTimeout = (promise, ms = 10000) => {
                return Promise.race([
                    promise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
                ]);
            };

            const endpoints = [
                fetchTMDB('/trending/movie/week'), 
                fetchTMDB('/discover/tv?with_origin_country=JP&with_genres=16&sort_by=popularity.desc'), 
                fetchTMDB('/discover/tv?with_origin_country=JP&with_genres=16&sort_by=vote_average.desc&vote_count.gte=1000'), 
                fetchTMDB('/discover/tv?with_origin_country=KR&without_genres=16&sort_by=popularity.desc'), 
                fetchTMDB('/trending/tv/week'),
                fetchTMDB('/discover/tv?sort_by=popularity.desc&without_origin_country=JP|KR'), 
                fetchTMDB('/movie/popular')
            ];

            const results = await Promise.all(endpoints.map(promise => 
                fetchWithTimeout(promise).catch(e => {
                    console.warn(`Fetch failed:`, e);
                    return null;
                })
            ));

            const [moviesRes, animeRes, animeTopRes, kdramaRes, bingeRes, tvRes, popularRes] = results;

            // Check if ALL critical fetches failed
            if (!moviesRes && !animeRes && !kdramaRes && !tvRes) {
                throw new Error('All fetches failed');
            }

            if (moviesRes) libraryData.movies = moviesRes.results.map(i => formatItem(i, 'movie'));
            if (animeRes) libraryData.anime = animeRes.results.map(i => formatItem(i, 'anime'));
            if (animeTopRes) libraryData.animeTop = animeTopRes.results.map(i => formatItem(i, 'anime'));
            if (kdramaRes) libraryData.kdrama = kdramaRes.results.map(i => formatItem(i, 'tv'));
            if (bingeRes) libraryData.binge = bingeRes.results.map(i => formatItem(i, 'tv'));
            if (tvRes) libraryData.tv = tvRes.results.map(i => formatItem(i, 'tv'));
            if (popularRes) libraryData.popular = popularRes.results.map(i => formatItem(i, 'movie'));

            // Fallback for missing data
            if(libraryData.movies.length === 0) {
                libraryData.movies = [
                    { id: 101, tmdb_id: 823464, title: "Godzilla x Kong", year: "2024", rating: "7.2", overview: "The epic battle continues!", isMovie: true, isAnime: false, poster: "https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=500", backdrop: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2000" },
                    { id: 102, tmdb_id: 1022789, title: "Inside Out 2", year: "2024", rating: "8.1", overview: "Emotions are back!", isMovie: true, isAnime: false, poster: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500", backdrop: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=2000" }
                ];
            }
            if(libraryData.tv.length === 0) {
                libraryData.tv = [
                    { id: 901, tmdb_id: 1396, title: "Breaking Bad", year: "2008", rating: "9.5", overview: "A chemistry teacher turned kingpin.", isMovie: false, isAnime: false, poster: "https://images.unsplash.com/photo-1616530940355-351fabd9524b?q=80&w=500", backdrop: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2000" }
                ];
            }

            updateTabState(currentTab);
        } catch (error) {
            console.error('Critical load failure:', error);
            // Even if everything crashes, show some fallback UI
            libraryData.movies = libraryData.movies.length ? libraryData.movies : [{ id: 101, title: "Offline Library", overview: "Check your connection and TMDB key.", year: "NA", rating: "NA", isMovie: true }];
            updateTabState(currentTab);
            
            // Show setup button if hidden
            if(heroSetup) heroSetup.classList.remove('hidden');
        } finally {
            if(appLoader) {
                setTimeout(() => {
                    appLoader.classList.add('hidden');
                }, 500);
            }
        }
    }

    function formatItem(item, forceType = null) {
        if (!item) return null;
        const isMovie = forceType === 'movie' || item.media_type === 'movie' || !!item.title;
        const isAnime = forceType === 'anime' || (item.origin_country && Array.isArray(item.origin_country) && item.origin_country.includes('JP') && item.genre_ids && Array.isArray(item.genre_ids) && item.genre_ids.includes(16));
        return {
            id: item.id || Math.random(),
            tmdb_id: item.id,
            isMovie: isMovie,
            isAnime: isAnime,
            title: item.title || item.name,
            overview: item.overview || 'No description available for this title.',
            poster: item.poster_path ? `${IMG_BASE_URL}${item.poster_path}` : 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?q=80&w=500',
            backdrop: item.backdrop_path ? `${IMG_BG_BASE}${item.backdrop_path}` : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2000',
            rating: item.vote_average ? item.vote_average.toFixed(1) : 'NR',
            year: (item.release_date || item.first_air_date || '').substring(0,4)
        };
    }

    function showApiKeyModal(error = false) {
        if (!apiKeyModal) return;
        apiKeyModal.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
        apiKeyModal.classList.add('flex');
        if (error) {
            apiKeyInput.value = '';
            apiKeyInput.placeholder = 'Invalid Key! Enter a valid TMDB API Key...';
            apiKeyInput.classList.add('border-red-500');
        }
    }

    saveApiBtn.onclick = () => {
        const key = apiKeyInput.value.trim();
        if (key.length > 20) {
            TMDB_API_KEY = key;
            localStorage.setItem('tmdb_api_key', key);
            apiKeyInput.classList.remove('border-red-500');
            apiKeyInput.placeholder = 'Enter TMDB API Key...';
            
            // Fade out modal
            apiKeyModal.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => {
                apiKeyModal.classList.add('hidden');
                apiKeyModal.classList.remove('flex');
            }, 500);
            
            if(heroSetup) heroSetup.classList.add('hidden');
            
            // Reset to loader ui
            if (heroTitle) heroTitle.textContent = "VERIFYING DATABASE...";
            if (heroDesc) heroDesc.textContent = "Connecting securely to the TMDB cinematic servers with your API key.";
            
            loadData();
        } else {
            apiKeyInput.classList.add('border-red-500');
        }
    };

    apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveApiBtn.click();
        }
    });

    // --- UI/NAVIGATION ---
    function updateTabState(tab) {
        currentTab = tab;
        currentHeroIndex = 0;
        
        const tabs = {
            'home': homeBtn,
            'anime': animeNavBtn,
            'tv': document.getElementById('tv-nav-btn'),
            'kdrama': document.getElementById('kdrama-nav-btn'),
            'movies': document.getElementById('movies-nav-btn'),
            'popular': document.getElementById('popular-nav-btn'),
            'mylist': document.getElementById('mylist-nav-btn')
        };

        Object.entries(tabs).forEach(([key, btn]) => {
            if (btn) {
               // btn.classList.toggle('font-bold', tab === key);
               // btn.classList.toggle('text-white', tab === key);
            }
        });

        if (tab === 'home') {
            featuredPool = [...libraryData.movies].slice(0, 8);
        } else if (tab === 'anime') {
            featuredPool = [...libraryData.anime].slice(0, 8);
        } else if (tab === 'kdrama') {
            featuredPool = [...libraryData.kdrama].slice(0, 8);
        } else if (tab === 'tv') {
            featuredPool = [...libraryData.tv].slice(0, 8);
        } else if (tab === 'movies') {
            featuredPool = [...libraryData.popular].slice(0, 8);
        } else if (tab === 'popular') {
            featuredPool = [...libraryData.popular, ...libraryData.binge].sort(() => 0.5 - Math.random()).slice(0, 8);
        } else if (tab === 'mylist') {
            featuredPool = [...libraryData.myList].slice(0, 8);
        }

        if(searchInput && searchInput.value.length > 0) {
            handleSearch(searchInput.value);
        } else {
            renderLibrary();
            heroSection.style.display = 'flex';
            contentRows.classList.add('-mt-20');
            contentRows.classList.remove('mt-24');
            startHeroRotation();
            if(featuredPool[currentHeroIndex]) updateHeroUI(featuredPool[currentHeroIndex]);
        }
    }

    function goHome() {
        if (!searchInput) return;
        searchInput.value = '';
        updateTabState('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function goAnime() {
        if (!searchInput) return;
        searchInput.value = '';
        updateTabState('anime');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function goKDrama() {
        if (!searchInput) return;
        searchInput.value = '';
        updateTabState('kdrama');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function goTV() {
        if (!searchInput) return;
        searchInput.value = '';
        updateTabState('tv');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function goMovies() {
        if (!searchInput) return;
        searchInput.value = '';
        updateTabState('movies');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function goPopular() {
        if (!searchInput) return;
        searchInput.value = '';
        updateTabState('popular');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function goMyList() {
        if (!searchInput) return;
        searchInput.value = '';
        updateTabState('mylist');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function initProfiles() {
        renderProfiles();
        initAvatarPicker();

        manageProfilesBtn.onclick = () => toggleManageMode(true);
        doneManagingBtn.onclick = () => toggleManageMode(false);
        cancelProfileBtn.onclick = closeProfileModal;
        saveProfileBtn.onclick = saveProfile;
        deleteProfileBtn.onclick = deleteProfile;

        // Overlay Style Injection
        const style = document.createElement('style');
        style.innerHTML = `
            #hero-bg { transition: opacity 1.5s ease-in-out; }
            .skeleton-row {
                background: linear-gradient(90deg, #18181b 25%, #27272a 50%, #18181b 75%);
                background-size: 200% 100%;
                animation: skeleton-pulse 1.5s infinite linear;
            }
            @keyframes skeleton-pulse {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            .profile-card.shimmering { animation: profile-shimmer 1s ease-out; }
            @keyframes profile-shimmer {
                0% { transform: scale(0.9); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        // Parallax Effect for mesh-bg (Disabled on touch for performance)
        if (window.matchMedia('(pointer: fine)').matches) {
            profileScreen.onmousemove = (e) => {
                const mesh = document.querySelector('.mesh-bg');
                if (!mesh) return;
                const x = (e.clientX / window.innerWidth - 0.5) * 50;
                const y = (e.clientY / window.innerHeight - 0.5) * 50;
                mesh.style.transform = `translate(${x}px, ${y}px) rotate(${x/10}deg)`;
            };
        }

        if (activeProfile) {
            // Auto login if profile exists, but showing screen is better for UX
            // Hide the screen if you want persistent login
             selectProfile(activeProfile.id);
        } else {
             document.body.style.overflow = 'hidden';
        }
    }

    function renderProfiles() {
        if (!profilesList) return;
        profilesList.innerHTML = '';

        profiles.forEach((p, index) => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = `profile-card group flex flex-col items-center bg-transparent border-0 p-0 focus:outline-none transition-all duration-300 relative ${isManageMode ? 'managing' : ''}`;
            card.style.animationDelay = `${index * 100}ms`;
            card.classList.add('animate-pop-in');
            
            card.innerHTML = `
                <div class="w-32 h-32 md:w-44 md:h-44 rounded-md overflow-hidden mb-6 relative transition-all duration-700 hover:shadow-[0_0_60px_rgba(229,9,20,0.5)]">
                    <img src="${p.avatar}" class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-1" alt="${p.name}">
                    <div class="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500"></div>
                    <div class="edit-overlay absolute inset-0 flex items-center justify-center bg-black/70 rounded-md">
                         <div class="bg-netflix-red/90 p-4 rounded-full border border-white/40 shadow-2xl transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-12">
                            <span class="material-symbols-outlined text-white text-4xl">edit</span>
                         </div>
                    </div>
                </div>
                <span class="text-zinc-400 group-hover:text-white transition-all duration-500 md:text-2xl font-black tracking-tight drop-shadow-2xl uppercase">${p.name}</span>
            `;
            card.onclick = () => {
                if (isManageMode) openProfileModal(p.id);
                else selectProfile(p.id);
            };
            profilesList.appendChild(card);
        });

        // Add Profile button
        if (profiles.length < 5) {
            const addBtn = document.createElement('button');
            addBtn.innerHTML = `
                <div class="w-32 h-32 md:w-44 md:h-44 rounded-md overflow-hidden mb-6 flex items-center justify-center relative bg-black/40 group focus:bg-black/60 border-2 border-dashed border-zinc-700 hover:border-white hover:bg-white/5 transition-all duration-500">
                    <span class="material-symbols-outlined text-7xl text-zinc-600 group-hover:text-white group-hover:scale-110 transition-all duration-500">add</span>
                </div>
                <span class="text-zinc-600 group-hover:text-white transition-all duration-500 md:text-2xl font-black tracking-tight uppercase">Add Profile</span>
            `;
            addBtn.className = "group flex flex-col items-center bg-transparent border-0 p-0 focus:outline-none";
            addBtn.onclick = () => openProfileModal(null);
            profilesList.appendChild(addBtn);
        }
    }

    function initAvatarPicker() {
        if (!avatarPicker) return;
        avatarPicker.innerHTML = '';
        PREMIUM_AVATARS.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.className = "avatar-option w-full aspect-square object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity border-2 border-transparent";
            img.onclick = () => {
                selectedAvatarUrl = url;
                document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
                img.classList.add('selected');
                modalAvatarPreview.src = url;
            };
            avatarPicker.appendChild(img);
        });
    }

    function toggleManageMode(managing) {
        isManageMode = managing;
        profileHeadline.textContent = managing ? 'Manage Profiles:' : "Who's watching?";
        manageProfilesBtn.classList.toggle('hidden', managing);
        doneManagingBtn.classList.toggle('hidden', !managing);
        renderProfiles();
    }

    function openProfileModal(id = null) {
        editingProfileId = id;
        const p = profiles.find(x => x.id === id);
        
        document.getElementById('modal-profile-title').textContent = id ? 'Edit Profile' : 'Add Profile';
        profileNameInput.value = p ? p.name : '';
        selectedAvatarUrl = p ? p.avatar : PREMIUM_AVATARS[0];
        modalAvatarPreview.src = selectedAvatarUrl;
        
        // Match selection in picker
        document.querySelectorAll('.avatar-option').forEach(el => {
            el.classList.toggle('selected', el.src === selectedAvatarUrl);
        });
        
        deleteContainer.classList.toggle('hidden', !id);
        
        profileModal.classList.remove('opacity-0', 'pointer-events-none');
    }

    function closeProfileModal() {
        profileModal.classList.add('opacity-0', 'pointer-events-none');
    }

    function saveProfile() {
        const name = profileNameInput.value.trim();
        if (!name) return;

        if (editingProfileId) {
            const idx = profiles.findIndex(p => p.id === editingProfileId);
            if (idx !== -1) {
                profiles[idx].name = name;
                profiles[idx].avatar = selectedAvatarUrl;
            }
        } else {
            profiles.push({
                id: Date.now().toString(),
                name: name,
                avatar: selectedAvatarUrl
            });
        }

        localStorage.setItem('adamstream_profiles', JSON.stringify(profiles));
        closeProfileModal();
        renderProfiles();
    }

    function deleteProfile() {
        if (!editingProfileId) return;
        if (confirm(`Are you sure you want to delete ${profiles.find(p => p.id === editingProfileId).name}?`)) {
            profiles = profiles.filter(p => p.id !== editingProfileId);
            localStorage.setItem('adamstream_profiles', JSON.stringify(profiles));
            closeProfileModal();
            renderProfiles();
        }
    }

    function selectProfile(id) {
        const p = profiles.find(x => x.id === id);
        if (!p) return;

        activeProfile = p;
        localStorage.setItem('adamstream_active_profile', JSON.stringify(p));

        // Update Nav Avatar
        const navAvatar = document.getElementById('nav-profile-img');
        if (navAvatar) navAvatar.src = p.avatar;

        // Cinematic Exit
        profileScreen.style.transform = 'scale(1.1)';
        profileScreen.classList.add('opacity-0', 'pointer-events-none');
        
        setTimeout(() => {
            profileScreen.style.display = 'none';
            profileScreen.style.visibility = 'hidden';
            profileScreen.style.pointerEvents = 'none';
            document.body.style.overflow = '';
            loadData();
        }, 750);
    }

    function updateHeroUI(item) {
        const heroContent = document.getElementById('hero-content-wrap');
        heroBg.style.opacity = '0.5';
        if (heroContent) heroContent.style.opacity = '0';
        
        setTimeout(() => {
            heroBg.src = item.backdrop;
            heroTitle.textContent = item.title;
            heroDesc.textContent = item.overview;
            heroBg.style.opacity = '1';
            if (heroContent) heroContent.style.opacity = '1';
        }, 300);

        heroPlay.onclick = () => playMedia(item);
        heroInfo.onclick = () => openModal(item);
    }

    function startHeroRotation() {
        clearInterval(heroInterval);
        const rotate = () => {
            if (featuredPool.length === 0) return;
            currentHeroIndex = (currentHeroIndex + 1) % featuredPool.length;
            const nextItem = featuredPool[currentHeroIndex];
            const heroContent = document.getElementById('hero-content-wrap');
            
            // Seamless Fade Logic
            if (heroBg) {
                heroBg.style.opacity = '0';
                if (heroContent) heroContent.style.opacity = '0';
                
                setTimeout(() => {
                    heroBg.src = nextItem.backdrop;
                    heroBg.style.opacity = '1';
                    if (heroContent) heroContent.style.opacity = '1';
                    
                    heroTitle.textContent = nextItem.title;
                    heroDesc.textContent = nextItem.overview;
                    heroPlay.onclick = () => playMedia(nextItem);
                    heroInfo.onclick = () => openModal(nextItem);
                }, 1500);
            }
        };
        heroInterval = setInterval(rotate, 8000);
    }

    // --- MODAL & EPISODES ---
    async function openModal(item) {
        if (!item || !detailModal) return;
        document.getElementById('modal-image').src = item.backdrop || item.poster;
        document.getElementById('modal-title').textContent = item.title;
        document.getElementById('modal-desc').textContent = item.overview;
        document.getElementById('modal-year').textContent = item.year;
        document.getElementById('modal-rating').textContent = item.rating;
        document.getElementById('modal-duration').textContent = item.isMovie ? 'Movie' : 'TV Series';
        document.getElementById('modal-cast').textContent = 'Loading...';
        document.getElementById('modal-genre').textContent = item.isMovie ? 'Film' : 'Series';

        const epSection = document.getElementById('episodes-section');
        const list = document.getElementById('episodes-list');
        const seasonSelect = document.getElementById('season-select');
        
        if (item.isMovie) {
            epSection.classList.add('hidden');
            document.getElementById('modal-play').onclick = () => {
                 closeModal();
                 playMedia(item);
            };
        } else {
            epSection.classList.remove('hidden');
            list.innerHTML = '<p class="text-zinc-400">Fetching seasons...</p>';
            
            // Default play first ep
            document.getElementById('modal-play').onclick = () => {
                closeModal();
                playMedia(item, 1, 1);
            };

            const details = await fetchTvDetails(item.tmdb_id);
            if(details && details.seasons) {
                seasonSelect.innerHTML = '';
                
                if (item.isAnime) {
                    seasonSelect.classList.add('hidden');
                    if(seasonSelect.previousElementSibling) seasonSelect.previousElementSibling.classList.add('hidden');
                    
                    // Build Absolute→TMDB Translation Map
                    const seasons = details.seasons.filter(s => s.season_number > 0);
                    currentTvSeasons = [{ season_number: 1, episode_count: details.number_of_episodes || 12 }];
                    currentAnimeMap = [];
                    seasons.forEach(season => {
                        const count = season.episode_count || 0;
                        for (let e = 1; e <= count; e++) {
                            currentAnimeMap.push({ season: season.season_number, episode: e });
                        }
                    });

                    const epsCount = currentAnimeMap.length || details.number_of_episodes || 12;
                    list.innerHTML = '';
                    const maxEps = epsCount > 1500 ? 1500 : epsCount;
                    for(let i = 1; i <= maxEps; i++) {
                        const ep = document.createElement('button');
                        ep.type = 'button';
                        ep.className = 'w-full text-left flex items-center gap-4 p-4 rounded-md hover:bg-zinc-800/50 cursor-pointer group transition-colors border border-transparent hover:border-zinc-700';
                        const mapped = currentAnimeMap[i-1];
                        const coordLabel = mapped ? `S${mapped.season} E${mapped.episode}` : `S1 E${i}`;
                        ep.innerHTML = `
                            <span class="text-xl font-bold text-zinc-600 group-hover:text-white w-6 text-center">${i}</span>
                            <div class="relative w-32 h-18 flex-shrink-0">
                                <img src="${item.poster}" class="w-full h-[72px] object-cover rounded opacity-60 group-hover:opacity-100 transition-opacity">
                                <span class="material-symbols-outlined absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-75 text-3xl drop-shadow-lg">play_circle</span>
                            </div>
                            <div class="flex-1">
                                <h5 class="text-sm font-bold mb-1">Episode ${i}</h5>
                                <p class="text-xs text-zinc-500 line-clamp-1">${coordLabel}</p>
                            </div>
                        `;
                        ep.onclick = () => {
                            closeModal();
                            const m = currentAnimeMap[i-1];
                            playMedia(item, m ? m.season : 1, m ? m.episode : i);
                        };
                        list.appendChild(ep);
                    }
                } else {
                    seasonSelect.classList.remove('hidden');
                    if(seasonSelect.previousElementSibling) seasonSelect.previousElementSibling.classList.remove('hidden');
                    
                    const seasons = details.seasons.filter(s => s.season_number > 0);
                    currentTvSeasons = seasons;
                    if(seasons.length > 0) {
                    seasons.forEach(s => {
                        const opt = document.createElement('option');
                        opt.value = s.season_number;
                        opt.textContent = `Season ${s.season_number}`;
                        seasonSelect.appendChild(opt);
                    });
                    
                    const renderEpisodes = (seasonObj) => {
                        list.innerHTML = '';
                        const episodes = seasonObj.episode_count || 12;
                        for(let i = 1; i <= episodes; i++) {
                            const ep = document.createElement('button');
                            ep.type = 'button';
                            ep.className = 'w-full text-left flex items-center gap-4 p-4 rounded-md hover:bg-zinc-800/50 cursor-pointer group transition-colors border border-transparent hover:border-zinc-700';
                            ep.innerHTML = `
                                <span class="text-xl font-bold text-zinc-600 group-hover:text-white w-6 text-center">${i}</span>
                                <div class="relative w-32 h-18 flex-shrink-0">
                                    <img src="${item.poster}" class="w-full h-[72px] object-cover rounded opacity-60 group-hover:opacity-100 transition-opacity">
                                    <span class="material-symbols-outlined absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-75 text-3xl drop-shadow-lg">play_circle</span>
                                </div>
                                <div class="flex-1">
                                    <h5 class="text-sm font-bold mb-1">Episode ${i}</h5>
                                    <p class="text-xs text-zinc-500 line-clamp-1">Stream S${seasonObj.season_number} E${i} of ${item.title}</p>
                                </div>
                            `;
                            ep.onclick = () => {
                                closeModal();
                                playMedia(item, seasonObj.season_number, i);
                            };
                            list.appendChild(ep);
                        }
                    };
                    
                    renderEpisodes(seasons[0]);
                    seasonSelect.onchange = (e) => {
                        const sNum = Number(e.target.value);
                        const selSeason = seasons.find(s => s.season_number === sNum);
                        if(selSeason) renderEpisodes(selSeason);
                    };
                } else {
                    list.innerHTML = '<p class="text-zinc-400">Episodes unavailable.</p>';
                }
                } // This closes the non-anime else block
            }
        }

        // --- My List Toggle Logic ---
        const addListBtn = document.getElementById('modal-add-list');
        if (addListBtn) {
            const isInList = libraryData.myList.some(i => i.tmdb_id === item.tmdb_id);
            addListBtn.innerHTML = `<span class="material-symbols-outlined">${isInList ? 'check' : 'add'}</span>`;
            addListBtn.classList.toggle('bg-white', isInList);
            addListBtn.classList.toggle('text-black', isInList);
            addListBtn.classList.toggle('bg-white/10', !isInList);
            addListBtn.classList.toggle('text-white', !isInList);

            addListBtn.onclick = () => {
                const index = libraryData.myList.findIndex(i => i.tmdb_id === item.tmdb_id);
                if (index === -1) {
                    libraryData.myList.unshift(item);
                } else {
                    libraryData.myList.splice(index, 1);
                }
                localStorage.setItem('adamstream_mylist', JSON.stringify(libraryData.myList));
                
                // Refresh UI
                const nowInList = libraryData.myList.some(i => i.tmdb_id === item.tmdb_id);
                addListBtn.innerHTML = `<span class="material-symbols-outlined">${nowInList ? 'check' : 'add'}</span>`;
                addListBtn.classList.toggle('bg-white', nowInList);
                addListBtn.classList.toggle('text-black', nowInList);
                addListBtn.classList.toggle('bg-white/10', !nowInList);
                addListBtn.classList.toggle('text-white', !nowInList);
                
                if (currentTab === 'mylist' || currentTab === 'home') renderLibrary();
            };
        }

        detailModal.classList.remove('opacity-0', 'pointer-events-none');
        detailModal.querySelector('#modal-content').classList.remove('scale-95');
        detailModal.querySelector('#modal-content').classList.add('scale-100');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        detailModal.classList.add('opacity-0', 'pointer-events-none');
        detailModal.querySelector('#modal-content').classList.remove('scale-100');
        detailModal.querySelector('#modal-content').classList.add('scale-95');
        if (profileScreen && profileScreen.style.display === 'none') {
            document.body.style.overflow = '';
        }
    }

    // --- Vidsrc Embed / Player ---
    function populatePlayerSelectors(currentS, currentE) {
        if (!playerSeasonSelect || !playerEpisodeSelect) return;
        playerSeasonSelect.innerHTML = '';
        if (currentPlayingItem && currentPlayingItem.isAnime) {
            // For anime: show a single placeholder
            const opt = document.createElement('option');
            opt.value = 1;
            opt.textContent = 'Eps';
            opt.style.background = '#18181b';
            opt.style.color = '#fff';
            playerSeasonSelect.appendChild(opt);
            playerSeasonSelect.disabled = true;
            playerSeasonSelect.classList.add('opacity-50');
        } else {
            currentTvSeasons.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.season_number;
                opt.textContent = `S${s.season_number}`;
                opt.style.background = '#18181b';
                opt.style.color = '#fff';
                if (s.season_number === Number(currentS)) opt.selected = true;
                playerSeasonSelect.appendChild(opt);
            });
            playerSeasonSelect.disabled = false;
            playerSeasonSelect.classList.remove('opacity-50');
        }

        const updateEpisodes = (sNum, keepE = false) => {
            playerEpisodeSelect.innerHTML = '';
            if (currentPlayingItem && currentPlayingItem.isAnime) {
                // Use anime map for absolute numbering
                const total = currentAnimeMap.length || 12;
                const maxEps = total > 1500 ? 1500 : total;
                for(let i = 1; i <= maxEps; i++) {
                    const opt = document.createElement('option');
                    opt.value = i;
                    opt.textContent = `Ep ${i}`;
                    opt.style.background = '#18181b';
                    opt.style.color = '#fff';
                    if (keepE && i === Number(currentE)) opt.selected = true;
                    playerEpisodeSelect.appendChild(opt);
                }
            } else {
                const selSeason = currentTvSeasons.find(s => s.season_number === Number(sNum));
                if (!selSeason) return;
                const epCount = selSeason.episode_count || 12;
                for(let i=1; i<=epCount; i++) {
                    const opt = document.createElement('option');
                    opt.value = i;
                    opt.textContent = `Ep ${i}`;
                    opt.style.background = '#18181b';
                    opt.style.color = '#fff';
                    if (keepE && i === Number(currentE)) opt.selected = true;
                    playerEpisodeSelect.appendChild(opt);
                }
            }
        };

        updateEpisodes(currentS || 1, true);

        playerSeasonSelect.onchange = (e) => {
            playMedia(currentPlayingItem, Number(e.target.value), 1);
        };

        playerEpisodeSelect.onchange = (e) => {
            if (currentPlayingItem && currentPlayingItem.isAnime) {
                // Translate absolute ep → TMDB season/episode
                const absIdx = Number(e.target.value) - 1;
                const mapped = currentAnimeMap[absIdx];
                playMedia(currentPlayingItem, mapped ? mapped.season : 1, mapped ? mapped.episode : Number(e.target.value));
            } else {
                playMedia(currentPlayingItem, Number(playerSeasonSelect.value), Number(e.target.value));
            }
        };
    }

    function playMedia(item, season = null, episode = null) {
        if (!item) return;
        currentPlayingItem = item;
        
        let url = '';
        let subtitle = '';
        const server = SERVERS[currentServer] || SERVERS.alpha;

        if (item.isMovie) {
            url = server.movie(item.tmdb_id);
            subtitle = '';
            if (playerEpisodeSelector) {
                playerEpisodeSelector.classList.add('hidden');
                playerEpisodeSelector.classList.remove('flex');
            }
        } else {
            const s = season || 1;
            const e = episode || 1;
            
            if (item.isAnime && animeDubMode) {
                // DUB: 2anime for dubbed anime
                url = `https://2anime.xyz/embed/${item.tmdb_id}-${s}-${e}-dub`;
            } else {
                // TV Default (Subbed): Based on currentServer
                url = server.tv(item.tmdb_id, s, e);
                // Inject Kurdish Subtitle if enabled and server is Alpha (VidLink)
                if (currentKurdishSub && currentServer === 'alpha') {
                    url += `&subtitle=${KURDISH_VTT_DATA_URI}&subtitleLabel=Kurdish%20(Sorani)`;
                }
            }

            // Safe subtitle calculation
            let epLabel = e;
            if (item.isAnime && currentAnimeMap && currentAnimeMap.length > 0) {
                 const idx = currentAnimeMap.findIndex(m => m && m.season === s && m.episode === e);
                 if (idx !== -1) epLabel = idx + 1;
            }
            subtitle = item.isAnime ? ` - Ep ${epLabel}` : ` - S${s} E${e}`;
            
            if (playerEpisodeSelector) {
                playerEpisodeSelector.classList.remove('hidden');
                playerEpisodeSelector.classList.add('flex');
                populatePlayerSelectors(s, e);
            }

            // Show Sub/Dub toggle only for anime
            if (playerDubToggle) {
                if (item.isAnime) {
                    playerDubToggle.classList.remove('hidden');
                    playerDubToggle.classList.add('flex');
                } else {
                    playerDubToggle.classList.add('hidden');
                    playerDubToggle.classList.remove('flex');
                }
            }
        }

        playerIframe.src = url;
        playerTitle.textContent = item.title + subtitle;
        
        videoOverlay.classList.remove('opacity-0', 'pointer-events-none');
        document.body.style.overflow = 'hidden';

        playerTitleOverlay.classList.remove('opacity-0');
        
        // Handle loader
        if (playerLoader) {
            playerLoader.classList.remove('opacity-0', 'pointer-events-none');
            setTimeout(() => {
                playerLoader.classList.add('opacity-0', 'pointer-events-none');
            }, 800);
        }

        setTimeout(() => {
             playerTitleOverlay.classList.add('opacity-0');
        }, 5000);
    }

    function exitPlayer() {
        playerIframe.src = '';
        videoOverlay.classList.add('opacity-0', 'pointer-events-none');
        animeDubMode = false;
        if (dubHint) dubHint.classList.add('hidden');
        if (profileScreen && profileScreen.style.display === 'none') {
            document.body.style.overflow = '';
        }
    }

    // Sub/Dub toggle handlers
    if (btnSub) {
        btnSub.addEventListener('click', () => {
            animeDubMode = false;
            btnSub.classList.add('bg-netflix-red', 'text-white');
            btnSub.classList.remove('text-zinc-400');
            btnDub.classList.remove('bg-netflix-red', 'text-white');
            btnDub.classList.add('text-zinc-400');
            if (dubHint) dubHint.classList.add('hidden');
            // Reload stream
            if (currentPlayingItem) {
                const s = playerSeasonSelect ? Number(playerSeasonSelect.value) : 1;
                const e = playerEpisodeSelect ? Number(playerEpisodeSelect.value) : 1;
                playMedia(currentPlayingItem, s, e);
            }
        });
    }

    if (btnDub) {
        btnDub.onclick = () => {
            animeDubMode = true;
            btnDub.classList.add('bg-netflix-red', 'text-white');
            btnDub.classList.remove('text-zinc-400');
            btnSub.classList.remove('bg-netflix-red', 'text-white');
            btnSub.classList.add('text-zinc-400');
            if (dubHint) {
                dubHint.classList.remove('hidden');
                dubHint.classList.add('flex');
                setTimeout(() => dubHint.classList.add('hidden'), 5000);
            }
            if (currentPlayingItem) {
                const s = playerSeasonSelect ? Number(playerSeasonSelect.value) : 1;
                const e = playerEpisodeSelect ? Number(playerEpisodeSelect.value) : 1;
                playMedia(currentPlayingItem, s, e);
            }
        };
    }

    // Server Switcher Listeners
    document.querySelectorAll('.server-btn').forEach(btn => {
        btn.onclick = (e) => {
            const serverKey = e.target.getAttribute('data-server');
            currentServer = serverKey;

            // Update UI
            document.querySelectorAll('.server-btn').forEach(b => {
                b.classList.remove('bg-netflix-red', 'text-white');
                b.classList.add('bg-zinc-800', 'text-zinc-400');
            });
            e.target.classList.add('bg-netflix-red', 'text-white');
            e.target.classList.remove('bg-zinc-800', 'text-zinc-400');

            // Refresh Player
            if (currentPlayingItem) {
                const s = playerSeasonSelect ? Number(playerSeasonSelect.value) : 1;
                const e = playerEpisodeSelect ? Number(playerEpisodeSelect.value) : 1;
                playMedia(currentPlayingItem, s, e);
            }
        };
    });

    // --- RENDERING DOM ---
    function createMovieCard(item, isTop10 = false) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'flex-shrink-0 w-32 md:w-48 aspect-[2/3] relative rounded-md overflow-hidden cursor-pointer transition-all duration-500 hover:scale-110 hover:z-30 group shadow-xl shadow-black shadow-glow text-left focus:outline-none focus:ring-2 focus:ring-netflix-red';
        
        card.innerHTML = `
            <img src="${item.poster}" class="w-full h-full object-cover" alt="${item.title}" loading="lazy">
            ${isTop10 ? `<div class="absolute top-0 left-0 bg-netflix-red text-white text-[8px] font-black p-1 px-2 uppercase tracking-tighter shadow-lg z-10 w-full text-center">TRENDING</div>` : ''}
            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <div class="flex gap-2 mb-2 translate-y-6 group-hover:translate-y-0 transition-transform duration-500 ease-out">
                   <span class="bg-white text-black w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-200 shadow-2xl scale-90 group-hover:scale-100 transition-transform"><span class="material-symbols-outlined fill text-sm">play_arrow</span></span>
                   <span class="bg-zinc-800/80 text-white w-8 h-8 rounded-full flex items-center justify-center border border-white/20 hover:bg-zinc-700 shadow-2xl"><span class="material-symbols-outlined text-sm">add</span></span>
                </div>
                <h4 class="text-xs font-black truncate drop-shadow-2xl mb-1">${item.title}</h4>
                <div class="flex items-center gap-1 text-[9px] text-zinc-300 font-black tracking-tight">
                    <span class="text-emerald-400 font-bold">${item.rating}</span>
                    <span class="border border-white/30 px-1 rounded-sm">${item.isMovie ? 'Film' : 'Series'}</span>
                    <span>${item.year}</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => openModal(item));
        return card;
    }

    function createRow(title, items, isTrending = false) {
        if (!items || items.length === 0) return null;

        const rowWrapper = document.createElement('div');
        rowWrapper.className = 'px-4 md:px-12 row-animate mb-8';

        const rowTitle = document.createElement('h3');
        rowTitle.className = 'text-lg md:text-xl font-bold mb-2 text-zinc-100 tracking-tight drop-shadow-md';
        rowTitle.textContent = title;

        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'flex gap-3 overflow-x-auto no-scrollbar pb-8 pt-2 scroll-smooth px-1';

        const leftBtn = document.createElement('button');
        leftBtn.className = 'absolute left-0 top-[45%] -translate-y-1/2 z-40 bg-black/60 text-white p-2 rounded-r-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-black/90 hover:scale-110 hidden md:flex items-center justify-center border border-white/5';
        leftBtn.innerHTML = '<span class="material-symbols-outlined text-4xl">chevron_left</span>';
        
        const rightBtn = document.createElement('button');
        rightBtn.className = 'absolute right-0 top-[45%] -translate-y-1/2 z-40 bg-black/60 text-white p-2 rounded-l-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-black/90 hover:scale-110 hidden md:flex items-center justify-center border border-white/5';
        rightBtn.innerHTML = '<span class="material-symbols-outlined text-4xl">chevron_right</span>';

        leftBtn.onclick = (e) => {
            e.stopPropagation();
            scrollContainer.scrollBy({ left: -window.innerWidth * 0.7, behavior: 'smooth' });
        };
        rightBtn.onclick = (e) => {
            e.stopPropagation();
            scrollContainer.scrollBy({ left: window.innerWidth * 0.7, behavior: 'smooth' });
        };

        items.forEach((item, idx) => {
            scrollContainer.appendChild(createMovieCard(item, isTrending && idx < 5));
        });

        rowWrapper.appendChild(rowTitle);
        rowWrapper.classList.add('relative', 'group');
        rowWrapper.appendChild(leftBtn);
        rowWrapper.appendChild(rightBtn);
        rowWrapper.appendChild(scrollContainer);
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05 });
        
        observer.observe(rowWrapper);
        return rowWrapper;
    }

    function renderLibrary() {
        if (!contentRows) return;
        
        // Show Skeletons if no data
        if (libraryData.movies.length === 0) {
            contentRows.innerHTML = `
                <div class="px-12 py-8 animate-pulse space-y-4">
                    <div class="h-6 w-48 bg-zinc-800 rounded"></div>
                    <div class="flex gap-4 overflow-hidden">
                        ${Array(6).fill('<div class="w-48 h-72 bg-zinc-800 rounded flex-shrink-0"></div>').join('')}
                    </div>
                </div>
            `;
            return;
        }

        contentRows.innerHTML = '';
        let categories = {};
        
        if (currentTab === 'anime') {
            categories = {
                "Trending Anime": libraryData.anime,
                "Top Rated Anime Classics": libraryData.animeTop
            };
        } else if (currentTab === 'tv') {
            categories = {
                "Trending TV Shows": libraryData.tv,
                "Binge-Worthy Series": libraryData.binge,
                "Korean Drama Craze": libraryData.kdrama
            };
        } else if (currentTab === 'movies') {
            categories = {
                "Popular Movies": libraryData.movies,
                "Trending Movies of the Week": libraryData.popular
            };
        } else if (currentTab === 'popular') {
            categories = {
                "New & Trending": libraryData.popular,
                "Hot on AdamStream": libraryData.binge
            };
        } else if (currentTab === 'mylist') {
            categories = {
                "Your Personal Collection": libraryData.myList
            };
            if (libraryData.myList.length === 0) {
                contentRows.innerHTML = '<div class="px-12 py-32 text-zinc-600 text-center text-2xl font-black italic tracking-widest uppercase">Your list is a blank canvas. Start adding titles!</div>';
                return;
            }
        } else if (currentTab === 'kdrama') {
            categories = {
                "Trending Korean Dramas": libraryData.kdrama,
                "Romantic Classics": libraryData.kdrama.slice().reverse(),
                "Must-Watch K-Dramas": libraryData.kdrama.slice().sort(() => Math.random() - 0.5)
            };
        } else {
            // Home
            if (libraryData.myList.length > 0) {
                categories["Continue Watching / My List"] = libraryData.myList;
            }
            categories = {
                ...categories,
                "Trending Movies": libraryData.movies,
                "Binge-Worthy Series": libraryData.binge,
            };
        }

        Object.entries(categories).forEach(([name, items]) => {
            if(items.length > 0) {
                const row = createRow(name, items, name.includes("Trending") || name.includes("Popular"));
                if (row) contentRows.appendChild(row);
            }
        });
    }

    async function handleSearch(query) {
        if (!contentRows) return;
        if (query.trim().length === 0) {
            renderLibrary();
            return;
        }

        const data = await fetchSearch(query);
        if(!data || !data.results || data.results.length === 0) {
            contentRows.innerHTML = '<div class="px-12 py-32 text-zinc-600 text-center text-2xl font-black italic tracking-widest uppercase">No cinematic matches for "' + query + '"</div>';
            return;
        }

        const items = data.results
            .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
            .map(r => formatItem(r, r.media_type));
            
        contentRows.innerHTML = '';
        const row = createRow(`Search Results for "${query}"`, items, false);
        if (row) contentRows.appendChild(row);
    }

    function switchToProfileSelector() {
        profileScreen.classList.remove('opacity-0', 'pointer-events-none');
        profileScreen.style.display = 'flex';
        profileScreen.style.transform = 'scale(1)';
        document.body.style.overflow = 'hidden';
        initProfiles();
    }

    function init() {
        if (isInitialized) return;
        isInitialized = true;

        // Safety Timeout: Force hide the loader or show delay message if hung
        setTimeout(() => {
            if (appLoader) {
            appLoader.classList.add('hidden');
            document.body.style.overflow = 'auto';
            profileScreen.style.display = 'none';
            profileScreen.classList.add('hidden');
        }
            // If we're still on the logo, show some feedback unconditionally after timeout
            if (heroTitle && heroTitle.textContent === 'LOADING CONTENT') {
                heroTitle.textContent = 'CINEMATIC SERVER DELAY';
                heroDesc.textContent = 'We are having trouble connecting to the global database. This could be due to a slow connection, an invalid API Key, or running the site from a local file without a server.';
                if(heroSetup) heroSetup.classList.remove('hidden');
            }
        }, 500);
        
        const pr1200ofileIcon = document.getElementById('nav-profile-btn');
        if (profileIcon) {
            profileIcon.onclick = (e) => {
                e.preventDefault();
                switchToProfileSelector();
            };
        }

        const subBtn = document.getElementById('player-sub-btn');
        if (subBtn) {
            subBtn.onclick = () => {
                currentKurdishSub = !currentKurdishSub;
                subBtn.classList.toggle('active', currentKurdishSub);
                // Restart player with subtitle if enabled
                playMedia(currentPlayingItem, Number(playerSeasonSelect.value) || null, Number(playerEpisodeSelect.value) || null);
            };
        }

        if(homeBtn) homeBtn.onclick = goHome;
        if(animeNavBtn) animeNavBtn.onclick = goAnime;
        if(document.getElementById('kdrama-nav-btn')) document.getElementById('kdrama-nav-btn').onclick = goKDrama;
        if(document.getElementById('tv-nav-btn')) document.getElementById('tv-nav-btn').onclick = goTV;
        if(document.getElementById('movies-nav-btn')) document.getElementById('movies-nav-btn').onclick = goMovies;
        if(document.getElementById('popular-nav-btn')) document.getElementById('popular-nav-btn').onclick = goPopular;
        if(document.getElementById('mylist-nav-btn')) document.getElementById('mylist-nav-btn').onclick = goMyList;
        
        if(heroSetup) heroSetup.onclick = () => showApiKeyModal();
        if(document.getElementById('nav-logo')) document.getElementById('nav-logo').onclick = goHome;
        if(closeModalBtn) closeModalBtn.onclick = closeModal;
        if(exitPlayerBtn) exitPlayerBtn.onclick = exitPlayer;

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const value = e.target.value;
                clearTimeout(searchDebounce);
                
                if (value.length > 0) {
                    heroSection.style.display = 'none';
                    contentRows.classList.remove('-mt-20');
                    contentRows.classList.add('mt-24');
                    searchDebounce = setTimeout(() => handleSearch(value), 500);
                } else {
                    heroSection.style.display = 'flex';
                    contentRows.classList.add('-mt-20');
                    contentRows.classList.remove('mt-24');
                    renderLibrary();
                }
            });
        }

        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                mainNav.classList.add('bg-netflix-black', 'shadow-2xl', 'py-2');
                mainNav.classList.remove('bg-transparent', 'py-4');
            } else {
                mainNav.classList.remove('bg-netflix-black', 'shadow-2xl', 'py-2');
                mainNav.classList.add('bg-transparent', 'py-4');
            }
        });

        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal || e.target.classList.contains('modal-blur')) closeModal();
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
                exitPlayer();
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) clearInterval(heroInterval);
            else startHeroRotation();
        });

        // Bootstrap data in background while user selects profile
        loadData();
        
        // Hide initial app loader as soon as we reach profile selection
        if (appLoader) {
            setTimeout(() => {
                appLoader.classList.add('hidden');
            }, 1500); // Small cinematic delay
        }

        if (profileScreen && profileScreen.style.display === 'none') {
            // Already logged in case
        } else {
            initProfiles();
        }
    }

    // Kickoff
    document.addEventListener('DOMContentLoaded', init);
    // Fallback if already loaded
    if(document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 100);
    }

})();