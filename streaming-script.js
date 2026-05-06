let TMDB_API_KEY = '547c2cf5311a8f4499454a9fddb0fb8d';
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
    // Profile Elements removed

    
    
    let libraryData = {
        movies: [],
        anime: [],
        animeTop: [],
        kdrama: [],
        tv: [],
        popular: [],
        binge: [],
        // Genre specific
        actionMovies: [],
        horrorMovies: [],
        romanceMovies: [],
        actionTV: [],
        horrorTV: [],
        romanceTV: [],
        actionAnime: [],
        horrorAnime: [],
        romanceAnime: [],
        actionKDrama: [],
        horrorKDrama: [],
        romanceKDrama: [],
        // Existing categories
        action: [],
        comedy: [],
        horror: [],
        scifi: [],
        crimeTv: [],
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
    let currentServer = 'prime'; // Default to the highest-quality preferred source
    const SERVER_PRIORITY = ['prime', 'alpha', 'delta', 'legacy'];
    let fallbackServerIndex = 0;

    // Profile states removed

    const SERVERS = {
        alpha: {
            name: 'Alpha',
            movie: (id) => `https://vidsrc.icu/embed/movie/${id}`,
            tv: (id, s, e) => `https://vidsrc.icu/embed/tv/${id}/${s}/${e}`
        },
        delta: {
            name: 'Delta',
            movie: (id) => `https://vidsrc.xyz/embed/movie?tmdb=${id}`,
            tv: (id, s, e) => `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
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

    // Higher-reliability anime source order for sub / dub playback
    const ANIME_SUB_SOURCES = [
        (id, s, e) => `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}&lang=ja&language=ja&audio=ja&sub=ja`,
        (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?autoplay=true&lang=ja&language=ja&audio=ja&sub=ja`,
        (id, s, e) => `https://vidsrc.icu/embed/tv/${id}/${s}/${e}?lang=ja&language=ja&audio=ja&sub=ja`,
        (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}?lang=ja&language=ja&audio=ja&sub=ja`
    ];
    const ANIME_DUB_SOURCES = [
        (id, s, e) => `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}&dub=1`,
        (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?autoplay=true&dub=1`,
        (id, s, e) => `https://vidsrc.icu/embed/tv/${id}/${s}/${e}?dub=1`
    ];
    let currentAnimeSourceIdx = 0;
    let animeSourceFailCount = 0;

    function getAnimeSourceUrl(item, season, episode) {
        const sources = animeDubMode ? ANIME_DUB_SOURCES : ANIME_SUB_SOURCES;
        return sources[currentAnimeSourceIdx % sources.length](item.tmdb_id, season, episode);
    }

    function getAnimeSourceLabel() {
        const sources = animeDubMode ? ANIME_DUB_SOURCES : ANIME_SUB_SOURCES;
        return `${animeDubMode ? 'DUB' : 'SUB'} ${currentAnimeSourceIdx + 1}/${sources.length}`;
    }

    function updateAnimeToggleButtons() {
        if (!btnSub || !btnDub) return;
        btnSub.textContent = animeDubMode ? 'Sub' : getAnimeSourceLabel();
        btnDub.textContent = animeDubMode ? 'Dub' : 'Dub';

        btnSub.classList.toggle('bg-white', !animeDubMode);
        btnSub.classList.toggle('text-black', !animeDubMode);
        btnSub.classList.toggle('bg-zinc-900/80', animeDubMode);
        btnSub.classList.toggle('text-zinc-300', animeDubMode);

        btnDub.classList.toggle('bg-white', animeDubMode);
        btnDub.classList.toggle('text-black', animeDubMode);
        btnDub.classList.toggle('bg-zinc-900/80', !animeDubMode);
        btnDub.classList.toggle('text-zinc-300', !animeDubMode);
    }

    // Cache AniList MAL ID lookups so we don't re-fetch
    const anilistCache = {};

    // Fetch MAL ID from AniList by anime title (free API, no key needed)
    async function fetchMalId(title) {
        const key = title.toLowerCase().trim();
        if (anilistCache[key] !== undefined) return anilistCache[key];
        try {
            const query = `{Media(search:${JSON.stringify(title)},type:ANIME){idMal}}`;
            const res = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query }),
                signal: AbortSignal.timeout(4000)
            });
            const data = await res.json();
            const malId = data?.data?.Media?.idMal || null;
            anilistCache[key] = malId;
            return malId;
        } catch (err) {
            anilistCache[key] = null;
            return null;
        }
    }

    const BASE_URL = 'https://api.themoviedb.org/3';
    const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w300';
    const IMG_BG_BASE = 'https://image.tmdb.org/t/p/w780';

    const fetchWithTimeout = (promise, ms = 10000) => {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
        ]);
    };

    function getServerQueue(selected = currentServer) {
        const startIndex = SERVER_PRIORITY.indexOf(selected);
        if (startIndex === -1) return [...SERVER_PRIORITY];
        return [...SERVER_PRIORITY.slice(startIndex), ...SERVER_PRIORITY.slice(0, startIndex)];
    }

    function getServerUrl(item, season, episode, serverKey) {
        const server = SERVERS[serverKey] || SERVERS[currentServer];
        return item.isMovie ? server.movie(item.tmdb_id) : server.tv(item.tmdb_id, season, episode);
    }

    function refreshServerButtons() {
        document.querySelectorAll('.server-btn').forEach(btn => {
            const key = btn.getAttribute('data-server');
            if (!key) return;
            const active = key === currentServer;
            btn.classList.toggle('bg-netflix-red', active);
            btn.classList.toggle('text-white', active);
            btn.classList.toggle('bg-zinc-800', !active);
            btn.classList.toggle('text-zinc-400', !active);
        });
    }

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
            if (appLoader) appLoader.classList.add('hidden', 'pointer-events-none');
            return;
        }
        if (apiKeyModal) apiKeyModal.classList.add('opacity-0', 'pointer-events-none');
        if (appLoader) appLoader.classList.add('hidden', 'pointer-events-none');

        try {
            const essentialEndpoints = {
                movies: fetchTMDB('/trending/movie/week'),
                tv: fetchTMDB('/trending/tv/week'),
                anime: fetchTMDB('/discover/tv?with_origin_country=JP&with_genres=16&sort_by=popularity.desc'),
                kdrama: fetchTMDB('/discover/tv?with_origin_country=KR&without_genres=16&sort_by=popularity.desc'),
                popular: fetchTMDB('/movie/popular'),
                binge: fetchTMDB('/discover/tv?sort_by=popularity.desc&without_origin_country=JP|KR')
            };

            const essentialResults = await Promise.allSettled(Object.values(essentialEndpoints).map(promise => fetchWithTimeout(promise, 10000)));
            const [moviesRes, tvRes, animeRes, kdramaRes, popularRes, bingeRes] = essentialResults.map(result => result.status === 'fulfilled' ? result.value : null);

            if (moviesRes) libraryData.movies = moviesRes.results.map(i => formatItem(i, 'movie'));
            if (tvRes) libraryData.tv = tvRes.results.map(i => formatItem(i, 'tv'));
            if (animeRes) libraryData.anime = animeRes.results.map(i => formatItem(i, 'anime'));
            if (kdramaRes) libraryData.kdrama = kdramaRes.results.map(i => formatItem(i, 'tv'));
            if (popularRes) libraryData.popular = popularRes.results.map(i => formatItem(i, 'movie'));
            if (bingeRes) libraryData.binge = bingeRes.results.map(i => formatItem(i, 'tv'));

            if (!moviesRes && !tvRes && !animeRes && !kdramaRes && !popularRes && !bingeRes) {
                throw new Error('Essential TMDB requests all failed');
            }

            if (libraryData.movies.length === 0) {
                libraryData.movies = [
                    { id: 101, tmdb_id: 823464, title: "Godzilla x Kong", year: "2024", rating: "7.2", overview: "The epic battle continues!", isMovie: true, isAnime: false, poster: "https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=500", backdrop: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2000" },
                    { id: 102, tmdb_id: 1022789, title: "Inside Out 2", year: "2024", rating: "8.1", overview: "Emotions are back!", isMovie: true, isAnime: false, poster: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500", backdrop: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=2000" }
                ];
            }
            if (libraryData.tv.length === 0) {
                libraryData.tv = [
                    { id: 901, tmdb_id: 1396, title: "Breaking Bad", year: "2008", rating: "9.5", overview: "A chemistry teacher turned kingpin.", isMovie: false, isAnime: false, poster: "https://images.unsplash.com/photo-1616530940355-351fabd9524b?q=80&w=500", backdrop: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2000" }
                ];
            }

            updateTabState(currentTab);
            setTimeout(loadDeferredData, 800);
        } catch (error) {
            console.error('Critical load failure:', error);
            libraryData.movies = libraryData.movies.length ? libraryData.movies : [{ id: 101, title: "Offline Library", overview: "Check your connection and TMDB key.", year: "NA", rating: "NA", isMovie: true }];
            updateTabState(currentTab);
            if (heroSetup) heroSetup.classList.remove('hidden');
        } finally {
            if (appLoader) {
                setTimeout(() => {
                    appLoader.classList.add('hidden');
                }, 500);
            }
        }
    }

    async function loadDeferredData() {
        try {
            const deferredEndpoints = {
                action: fetchTMDB('/discover/movie?with_genres=28&sort_by=popularity.desc'),
                comedy: fetchTMDB('/discover/movie?with_genres=35&sort_by=popularity.desc'),
                horror: fetchTMDB('/discover/movie?with_genres=27&sort_by=popularity.desc'),
                scifi: fetchTMDB('/discover/movie?with_genres=878&sort_by=popularity.desc'),
                crimeTv: fetchTMDB('/discover/tv?with_genres=80&sort_by=popularity.desc'),
                actionMovies: fetchTMDB('/discover/movie?with_genres=28&sort_by=popularity.desc'),
                horrorMovies: fetchTMDB('/discover/movie?with_genres=27&sort_by=popularity.desc'),
                romanceMovies: fetchTMDB('/discover/movie?with_genres=10749&sort_by=popularity.desc'),
                actionTV: fetchTMDB('/discover/tv?with_genres=10759&sort_by=popularity.desc'),
                horrorTV: fetchTMDB('/discover/tv?with_genres=9648&sort_by=popularity.desc'),
                romanceTV: fetchTMDB('/discover/tv?with_genres=10766&sort_by=popularity.desc'),
                actionAnime: fetchTMDB('/discover/tv?with_origin_country=JP&with_genres=16,10759&sort_by=popularity.desc'),
                horrorAnime: fetchTMDB('/discover/tv?with_origin_country=JP&with_genres=16,9648&sort_by=popularity.desc'),
                romanceAnime: fetchTMDB('/discover/tv?with_origin_country=JP&with_genres=16,10766&sort_by=popularity.desc'),
                actionKDrama: fetchTMDB('/discover/tv?with_origin_country=KR&with_genres=10759&sort_by=popularity.desc'),
                horrorKDrama: fetchTMDB('/discover/tv?with_origin_country=KR&with_genres=9648&sort_by=popularity.desc'),
                romanceKDrama: fetchTMDB('/discover/tv?with_origin_country=KR&with_genres=10766&sort_by=popularity.desc'),
                animeTop: fetchTMDB('/discover/tv?with_origin_country=JP&with_genres=16&sort_by=vote_average.desc&vote_count.gte=1000')
            };

            const deferredResults = await Promise.allSettled(Object.values(deferredEndpoints).map(promise => fetchWithTimeout(promise, 10000)));
            const deferredValues = deferredResults.map(result => result.status === 'fulfilled' ? result.value : null);
            const [actionRes, comedyRes, horrorRes, scifiRes, crimeTvRes, actionMoviesRes, horrorMoviesRes, romanceMoviesRes, actionTVRes, horrorTVRes, romanceTVRes, actionAnimeRes, horrorAnimeRes, romanceAnimeRes, actionKDramaRes, horrorKDramaRes, romanceKDramaRes, animeTopRes] = deferredValues;

            if (actionRes) libraryData.action = actionRes.results.map(i => formatItem(i, 'movie'));
            if (comedyRes) libraryData.comedy = comedyRes.results.map(i => formatItem(i, 'movie'));
            if (horrorRes) libraryData.horror = horrorRes.results.map(i => formatItem(i, 'movie'));
            if (scifiRes) libraryData.scifi = scifiRes.results.map(i => formatItem(i, 'movie'));
            if (crimeTvRes) libraryData.crimeTv = crimeTvRes.results.map(i => formatItem(i, 'tv'));
            if (actionMoviesRes) libraryData.actionMovies = actionMoviesRes.results.map(i => formatItem(i, 'movie'));
            if (horrorMoviesRes) libraryData.horrorMovies = horrorMoviesRes.results.map(i => formatItem(i, 'movie'));
            if (romanceMoviesRes) libraryData.romanceMovies = romanceMoviesRes.results.map(i => formatItem(i, 'movie'));
            if (actionTVRes) libraryData.actionTV = actionTVRes.results.map(i => formatItem(i, 'tv'));
            if (horrorTVRes) libraryData.horrorTV = horrorTVRes.results.map(i => formatItem(i, 'tv'));
            if (romanceTVRes) libraryData.romanceTV = romanceTVRes.results.map(i => formatItem(i, 'tv'));
            if (actionAnimeRes) libraryData.actionAnime = actionAnimeRes.results.map(i => formatItem(i, 'anime'));
            if (horrorAnimeRes) libraryData.horrorAnime = horrorAnimeRes.results.map(i => formatItem(i, 'anime'));
            if (romanceAnimeRes) libraryData.romanceAnime = romanceAnimeRes.results.map(i => formatItem(i, 'anime'));
            if (actionKDramaRes) libraryData.actionKDrama = actionKDramaRes.results.map(i => formatItem(i, 'tv'));
            if (horrorKDramaRes) libraryData.horrorKDrama = horrorKDramaRes.results.map(i => formatItem(i, 'tv'));
            if (romanceKDramaRes) libraryData.romanceKDrama = romanceKDramaRes.results.map(i => formatItem(i, 'tv'));
            if (animeTopRes) libraryData.animeTop = animeTopRes.results.map(i => formatItem(i, 'anime'));

            renderLibrary();
        } catch (error) {
            console.warn('Deferred load failed:', error);
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

    // Profile functions completely removed

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
                    seasonSelect.classList.remove('hidden');
                    if(seasonSelect.previousElementSibling) seasonSelect.previousElementSibling.classList.remove('hidden');
                    
                    const seasons = details.seasons.filter(s => s.season_number > 0);
                    currentTvSeasons = seasons;
                    currentAnimeMap = [];
                    seasons.forEach(season => {
                        const count = season.episode_count || 0;
                        for (let e = 1; e <= count; e++) {
                            currentAnimeMap.push({ season: season.season_number, episode: e });
                        }
                    });
                    list.innerHTML = '';

                    const renderSeasonEpisodes = (seasonObj) => {
                        list.innerHTML = '';
                        const episodes = seasonObj.episode_count || 12;
                        const seasonLabel = seasonObj.season_number;
                        for (let i = 1; i <= episodes; i++) {
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
                                    <h5 class="text-sm font-bold mb-1">Season ${seasonLabel} · Episode ${i}</h5>
                                    <p class="text-xs text-zinc-500 line-clamp-1">Play S${seasonLabel} E${i} of ${item.title}</p>
                                </div>
                            `;
                            ep.onclick = () => {
                                closeModal();
                                playMedia(item, seasonLabel, i);
                            };
                            list.appendChild(ep);
                        }
                    };

                    if (seasons.length > 0) {
                        seasons.forEach(s => {
                            const opt = document.createElement('option');
                            opt.value = s.season_number;
                            opt.textContent = `Season ${s.season_number}`;
                            seasonSelect.appendChild(opt);
                        });

                        renderSeasonEpisodes(seasons[0]);
                        seasonSelect.onchange = (e) => {
                            const selectedSeason = seasons.find(s => s.season_number === Number(e.target.value));
                            if (selectedSeason) renderSeasonEpisodes(selectedSeason);
                        };
                    } else {
                        list.innerHTML = '<p class="text-zinc-400">Episode details unavailable.</p>';
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
        document.body.style.overflow = '';
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

    async function playMedia(item, season = null, episode = null) {
        if (!item) return;
        const isDifferentAnime = item.isAnime && (!currentPlayingItem || currentPlayingItem.tmdb_id !== item.tmdb_id);
        if (isDifferentAnime) {
            currentAnimeSourceIdx = 0;
            animeSourceFailCount = 0;
        }
        currentPlayingItem = item;

        const s = season || 1;
        const e = episode || 1;
        let url = '';
        let subtitle = '';

        if (item.isMovie) {
            url = getServerUrl(item, s, e, currentServer);
            subtitle = '';
            if (playerEpisodeSelector) {
                playerEpisodeSelector.classList.add('hidden');
                playerEpisodeSelector.classList.remove('flex');
            }
        } else {
            if (item.isAnime) {
                url = getAnimeSourceUrl(item, s, e);
            } else {
                url = getServerUrl(item, s, e, currentServer);
                if (currentKurdishSub && currentServer === 'alpha') {
                    url += `&subtitle=${KURDISH_VTT_DATA_URI}&subtitleLabel=Kurdish%20(Sorani)`;
                }
            }

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

        playerIframe.onerror = async () => {
            if (!currentPlayingItem) return;

            if (currentPlayingItem.isAnime) {
                animeSourceFailCount += 1;
                const sources = animeDubMode ? ANIME_DUB_SOURCES : ANIME_SUB_SOURCES;
                currentAnimeSourceIdx = (currentAnimeSourceIdx + 1) % sources.length;
                updateAnimeToggleButtons();

                if (animeSourceFailCount <= sources.length * 2) {
                    playerIframe.src = sources[currentAnimeSourceIdx](currentPlayingItem.tmdb_id, s, e);
                    return;
                }

                // After exhausting the current mode, fall back to the opposite mode once
                if (animeDubMode) {
                    animeDubMode = false;
                    currentAnimeSourceIdx = 0;
                    updateAnimeToggleButtons();
                    playerIframe.src = getAnimeSourceUrl(currentPlayingItem, s, e);
                    return;
                }

                playerTitle.textContent = `${currentPlayingItem.title} - Playback unavailable`;
                if (playerLoader) {
                    playerLoader.classList.add('opacity-0', 'pointer-events-none');
                }
                return;
            }

            const queue = getServerQueue(currentServer);
            const currentIndex = queue.indexOf(currentServer);
            const nextServer = queue[currentIndex + 1];
            if (nextServer) {
                currentServer = nextServer;
                refreshServerButtons();
                playerIframe.src = getServerUrl(currentPlayingItem, s, e, currentServer);
            }
        };

        playerIframe.onload = () => {
            if (playerLoader) {
                playerLoader.classList.add('opacity-0');
                playerLoader.classList.add('pointer-events-none');
            }
        };

        playerIframe.src = url;
        playerTitle.textContent = item.title + subtitle;

        videoOverlay.classList.remove('opacity-0', 'pointer-events-none');
        document.body.style.overflow = 'hidden';
        playerTitleOverlay.classList.remove('opacity-0');

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
        document.body.style.overflow = '';
    }

    // Sub/Dub toggle handlers
    if (btnSub) {
        btnSub.addEventListener('click', () => {
            if (!animeDubMode) {
                currentAnimeSourceIdx = (currentAnimeSourceIdx + 1) % ANIME_SUB_SOURCES.length;
            } else {
                animeDubMode = false;
                currentAnimeSourceIdx = 0;
            }
            animeSourceFailCount = 0;
            updateAnimeToggleButtons();
            if (dubHint) dubHint.classList.add('hidden');
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
            currentAnimeSourceIdx = 0;
            animeSourceFailCount = 0;
            updateAnimeToggleButtons();
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
            if (!serverKey) return;
            currentServer = serverKey;
            refreshServerButtons();

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

        const titleWrapper = document.createElement('div');
        titleWrapper.className = 'flex items-center justify-between mb-2 pr-4';

        const rowTitle = document.createElement('h3');
        rowTitle.className = 'text-lg md:text-xl font-bold text-zinc-100 tracking-tight drop-shadow-md';
        rowTitle.textContent = title;

        const viewAllBtn = document.createElement('button');
        viewAllBtn.className = 'text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-colors flex items-center gap-1 group';
        viewAllBtn.innerHTML = 'View All <span class="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>';
        viewAllBtn.onclick = () => renderGrid(title, items);

        titleWrapper.appendChild(rowTitle);
        titleWrapper.appendChild(viewAllBtn);

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

        rowWrapper.appendChild(titleWrapper);
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
                "Action Anime Highlights": libraryData.actionAnime,
                "Chilling Horror Anime": libraryData.horrorAnime,
                "Sweet Romance Anime": libraryData.romanceAnime,
                "Top Rated Anime Classics": libraryData.animeTop,
                "New Weekly Releases": [...libraryData.anime].sort(() => Math.random() - 0.5)
            };
        } else if (currentTab === 'tv') {
            categories = {
                "Trending TV Shows": libraryData.tv,
                "Explosive Action TV": libraryData.actionTV,
                "Spine-Tingling Mystery & Horror": libraryData.horrorTV,
                "Romantic TV Dramas": libraryData.romanceTV,
                "Binge-Worthy Series": libraryData.binge,
                "Crime TV Thrillers": libraryData.crimeTv,
                "Korean Drama Craze": libraryData.kdrama
            };
        } else if (currentTab === 'movies') {
            categories = {
                "Popular Movies": libraryData.movies,
                "Adrenaline-Pumping Action": libraryData.actionMovies,
                "Nightmare-Inducing Horror": libraryData.horrorMovies,
                "Heart-Warming Romance": libraryData.romanceMovies,
                "Blockbuster Comedies": libraryData.comedy,
                "Sci-Fi & Fantasy": libraryData.scifi,
                "Trending Movies of the Week": libraryData.popular
            };
        } else if (currentTab === 'popular') {
            categories = {
                "New & Trending": libraryData.popular,
                "Hot on AdamStream": libraryData.binge,
                "Top Action Flicks": libraryData.actionMovies
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
                "Action-Packed K-Dramas": libraryData.actionKDrama,
                "Dark K-Drama Thrillers": libraryData.horrorKDrama,
                "Romantic Korean Classics": libraryData.romanceKDrama,
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
                "New Action Hits": libraryData.actionMovies,
                "Horror Night Features": libraryData.horrorMovies,
                "Romance for You": libraryData.romanceMovies,
                "Binge-Worthy TV Series": libraryData.binge,
                "Anime Hits": libraryData.anime,
                "Korean Drama Trends": libraryData.kdrama
            };
        }

        Object.entries(categories).forEach(([name, items]) => {
            if(items.length > 0) {
                const row = createRow(name, items, name.includes("Trending") || name.includes("Popular"));
                if (row) contentRows.appendChild(row);
            }
        });
    }

    function renderGrid(title, items) {
        if (!contentRows) return;
        heroSection.style.display = 'none';
        contentRows.classList.remove('-mt-20');
        contentRows.classList.add('mt-24');
        
        contentRows.innerHTML = `
            <div class="px-4 md:px-12 mb-8 flex items-center justify-between animate-fade-in">
                <h2 class="text-xl md:text-3xl font-black uppercase tracking-tighter drop-shadow-2xl">${title}</h2>
                <button id="back-to-browse" class="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-bold group bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-700 hover:border-zinc-500">
                    <span class="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    <span class="hidden md:inline uppercase text-[10px] tracking-widest">Back to Browse</span>
                </button>
            </div>
            <div id="grid-container" class="px-4 md:px-12 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-5 pb-32 animate-slide-up">
            </div>
        `;
        
        const grid = document.getElementById('grid-container');
        items.forEach((item, idx) => {
            const card = createMovieCard(item, false);
            card.classList.remove('w-32', 'md:w-48', 'flex-shrink-0');
            card.classList.add('w-full');
            card.style.animationDelay = `${idx * 15}ms`;
            grid.appendChild(card);
        });

        // Massive Background Expansion
        const categoryMap = {
            "Trending Movies": "/trending/movie/week",
            "Trending Anime": "/discover/tv?with_origin_country=JP&with_genres=16&sort_by=popularity.desc",
            "Action Anime Highlights": "/discover/tv?with_origin_country=JP&with_genres=16,10759&sort_by=popularity.desc",
            "Chilling Horror Anime": "/discover/tv?with_origin_country=JP&with_genres=16,9648&sort_by=popularity.desc",
            "Sweet Romance Anime": "/discover/tv?with_origin_country=JP&with_genres=16,10766&sort_by=popularity.desc",
            "Top Rated Anime Classics": "/discover/tv?with_origin_country=JP&with_genres=16&sort_by=vote_average.desc&vote_count.gte=1000",
            "Korean Drama Craze": "/discover/tv?with_origin_country=KR&without_genres=16&sort_by=popularity.desc",
            "Trending Korean Dramas": "/discover/tv?with_origin_country=KR&without_genres=16&sort_by=popularity.desc",
            "Action-Packed K-Dramas": "/discover/tv?with_origin_country=KR&with_genres=10759&sort_by=popularity.desc",
            "Dark K-Drama Thrillers": "/discover/tv?with_origin_country=KR&with_genres=9648&sort_by=popularity.desc",
            "Romantic Korean Classics": "/discover/tv?with_origin_country=KR&with_genres=10766&sort_by=popularity.desc",
            "Binge-Worthy Series": "/trending/tv/week",
            "Binge-Worthy TV Series": "/trending/tv/week",
            "Popular Movies": "/movie/popular",
            "Trending Movies of the Week": "/movie/popular",
            "Adrenaline-Pumping Action": "/discover/movie?with_genres=28&sort_by=popularity.desc",
            "New Action Hits": "/discover/movie?with_genres=28&sort_by=popularity.desc",
            "Top Action Flicks": "/discover/movie?with_genres=28&sort_by=popularity.desc",
            "Blockbuster Comedies": "/discover/movie?with_genres=35&sort_by=popularity.desc",
            "Sci-Fi & Fantasy": "/discover/movie?with_genres=878&sort_by=popularity.desc",
            "Sci-Fi Masterpieces": "/discover/movie?with_genres=878&sort_by=popularity.desc",
            "Nightmare-Inducing Horror": "/discover/movie?with_genres=27&sort_by=popularity.desc",
            "Horror Night Features": "/discover/movie?with_genres=27&sort_by=popularity.desc",
            "Heart-Warming Romance": "/discover/movie?with_genres=10749&sort_by=popularity.desc",
            "Romance for You": "/discover/movie?with_genres=10749&sort_by=popularity.desc",
            "Crime TV Thrillers": "/discover/tv?with_genres=80&sort_by=popularity.desc",
            "Crime TV Shows": "/discover/tv?with_genres=80&sort_by=popularity.desc",
            "Explosive Action TV": "/discover/tv?with_genres=10759&sort_by=popularity.desc",
            "Spine-Tingling Mystery & Horror": "/discover/tv?with_genres=9648&sort_by=popularity.desc",
            "Romantic TV Dramas": "/discover/tv?with_genres=10766&sort_by=popularity.desc"
        };
        
        const baseEndpoint = categoryMap[title];
        if (baseEndpoint) {
            let page = 3;
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.className = 'col-span-full py-5 bg-zinc-900 border border-zinc-800 text-white font-bold rounded-md hover:bg-netflix-red transition-all text-sm uppercase tracking-widest mt-8 shadow-2xl';
            loadMoreBtn.textContent = 'Load More Titles';
            grid.appendChild(loadMoreBtn);

            loadMoreBtn.onclick = async () => {
                loadMoreBtn.innerHTML = 'Connecting to Global Database...';
                loadMoreBtn.classList.add('opacity-50', 'pointer-events-none');
                
                const requests = [
                    fetchTMDB(`${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=${page}`),
                    fetchTMDB(`${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=${page+1}`),
                    fetchTMDB(`${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=${page+2}`)
                ];
                page += 3;
                
                const responses = await Promise.all(requests);
                loadMoreBtn.classList.remove('opacity-50', 'pointer-events-none');
                loadMoreBtn.innerHTML = 'Load More Titles';
                
                responses.forEach(res => {
                    if (res && res.results) {
                        const newItems = res.results.map(i => formatItem(i, baseEndpoint.includes('movie') ? 'movie' : 'tv'));
                        newItems.forEach((item, idx) => {
                            const card = createMovieCard(item, false);
                            card.classList.remove('w-32', 'md:w-48', 'flex-shrink-0');
                            card.classList.add('w-full', 'animate-pop-in');
                            card.style.animationDelay = `${idx * 15}ms`;
                            grid.insertBefore(card, loadMoreBtn);
                        });
                    }
                });
            };
            
        }

        document.getElementById('back-to-browse').onclick = () => {
            updateTabState(currentTab); // Returns to the current row-based view
        };
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    function init() {
        if (isInitialized) return;
        isInitialized = true;

        // Safety Timeout: Force hide the loader or show delay message if hung
        setTimeout(() => {
            if (appLoader) {
                appLoader.classList.add('hidden');
            }
            // If we're still on the logo, show some feedback unconditionally after timeout
            if (heroTitle && heroTitle.textContent === 'LOADING CONTENT') {
                heroTitle.textContent = 'CINEMATIC SERVER DELAY';
                heroDesc.textContent = 'We are having trouble connecting to the global database. Click the button below to try loading the server connection again.';
                if(heroSetup) heroSetup.classList.remove('hidden');
            }
        }, 8000);

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
        
        if(heroSetup) heroSetup.onclick = () => {
            heroSetup.classList.add('hidden');
            if (heroTitle) heroTitle.textContent = 'LOADING CONTENT';
            if (heroDesc) heroDesc.textContent = 'Preparing your premium cinematic experience. Please wait while we synchronize with the global database...';
            loadData();
        };
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

        refreshServerButtons();
        // Execute single data load
        loadData();
    }

    // Kickoff
    document.addEventListener('DOMContentLoaded', init);
    // Fallback if already loaded
    if(document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 100);
    }

})();