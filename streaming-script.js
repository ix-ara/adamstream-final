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
    const playerEpisodeControls = document.getElementById('player-episode-controls');
    const playerSeasonSelect = document.getElementById('player-season-select');
    const playerEpisodeSelect = document.getElementById('player-episode-select');
    const playerSubBtn = document.getElementById('player-sub-btn');
    const playerTrailerBtn = document.getElementById('player-trailer-btn');
    const playerLoader = document.getElementById('player-loader');
    const playerServerControls = document.getElementById('player-server-controls');
    const playerDubToggle = document.getElementById('player-dub-toggle');
    const btnSub = document.getElementById('btn-sub');
    const btnDub = document.getElementById('btn-dub');
    const dubHint = document.getElementById('dub-hint');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const authUser = document.getElementById('auth-user');
    const authAvatar = document.getElementById('auth-avatar');
    const authName = document.getElementById('auth-name');
    const authLogout = document.getElementById('auth-logout');
    
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
    let currentSeasonsItemId = null;
    let currentAnimeMap = []; // absolute ep index → { season, episode }
    let currentAnimeSeasonNames = {};
    let animeDubMode = false;
    let featuredPool = [];
    let currentServer = 'alpha'; // Default to the broadest TMDB-backed source
    const SERVER_PRIORITY = ['alpha', 'delta', 'prime', 'legacy'];
    let fallbackServerIndex = 0;
    let playerHelpTimer = null;
    let currentPlaybackToken = 0;
    const trailerCache = {};
    const GOOGLE_CLIENT_ID = 'PASTE_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com';

    // Profile states removed

    const SERVERS = {
        alpha: {
            name: 'Alpha',
            movie: (id) => `https://player.vidsrc.co/embed/movie/${id}`,
            tv: (id, s, e) => `https://player.vidsrc.co/embed/tv/${id}/${s}/${e}`
        },
        delta: {
            name: 'Delta',
            movie: (id) => `https://vidsrc.cc/v2/embed/movie/${id}?autoPlay=true`,
            tv: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}?autoPlay=true`
        },
        prime: {
            name: 'Prime',
            movie: (id) => `https://vidsrc.xyz/embed/movie?tmdb=${id}&autoplay=1`,
            tv: (id, s, e) => `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}&autoplay=1`
        },
        legacy: {
            name: 'Legacy',
            movie: (id) => `https://vidsrc.store/embed/movie/${id}`,
            tv: (id, s, e) => `https://vidsrc.store/embed/tv/${id}/${s}/${e}`
        }
    };

    // Anime endpoints need explicit sub/dub routes. TV endpoints can ignore language hints.
    const ANIME_SUB_SOURCES = [
        {
            name: 'VidSrc ICU',
            needsAnimeIds: true,
            build: async ({ anilistId, animeEpisode }) => anilistId ? `https://vidsrc.icu/embed/anime/${anilistId}/${animeEpisode}/0` : null
        },
        {
            name: 'Cinezo',
            needsAnimeIds: true,
            build: async ({ anilistId, animeEpisode }) => anilistId ? `https://player.cinezo.live/embed/anime/${anilistId}/${animeEpisode}?dub=false&primarycolor=ff7657&autoplay=true` : null
        },
        {
            name: 'Vidsrc Player',
            needsAnimeIds: true,
            build: async ({ anilistId, animeEpisode }) => anilistId ? `https://player.vidsrc.co/embed/anime/${anilistId}/${animeEpisode}?dub=false` : null
        },
        {
            name: 'Cinetaro',
            needsAnimeIds: true,
            build: async ({ anilistId, season, episode }) => anilistId ? `https://api.cinetaro.buzz/anime/${anilistId}/${season}/${episode}/sub?autoplay=true&color=ff7657` : null
        },
        {
            name: 'Vidsrc CC TMDB',
            build: ({ tmdbId, absoluteEpisode }) => `https://vidsrc.cc/v2/embed/anime/tmdb${tmdbId}/${absoluteEpisode}/sub?autoPlay=true`
        },
        {
            name: 'Vidsrc CC Anilist',
            needsAnimeIds: true,
            build: async ({ anilistId, animeEpisode }) => anilistId ? `https://vidsrc.cc/v2/embed/anime/${anilistId}/${animeEpisode}/sub?autoPlay=true` : null
        },
        {
            name: 'Vidsrc CC Ani',
            needsAnimeIds: true,
            build: async ({ anilistId, animeEpisode }) => anilistId ? `https://vidsrc.cc/v2/embed/anime/ani${anilistId}/${animeEpisode}/sub?autoPlay=true` : null
        },
        {
            name: 'Vidsrc CC IMDb',
            needsAnimeIds: true,
            build: async ({ imdbId, absoluteEpisode }) => imdbId ? `https://vidsrc.cc/v2/embed/anime/imdb${imdbId}/${absoluteEpisode}/sub?autoPlay=true` : null
        },
        {
            name: 'VidLink',
            needsAnimeIds: true,
            build: async ({ malId, animeEpisode }) => malId ? `https://vidlink.pro/anime/${malId}/${animeEpisode}/sub` : null
        },
        {
            name: 'Vidsrc TV',
            build: ({ tmdbId, season, episode }) => `https://player.vidsrc.co/embed/tv/${tmdbId}/${season}/${episode}`
        },
        {
            name: 'Vidsrc XYZ TV',
            build: ({ tmdbId, season, episode }) => `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&autoplay=1`
        },
        {
            name: 'Vidsrc CC TV',
            build: ({ tmdbId, season, episode }) => `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}?autoPlay=true`
        }
    ];
    const ANIME_DUB_SOURCES = [
        {
            name: 'VidSrc ICU',
            needsAnimeIds: true,
            build: async ({ anilistId, animeEpisode }) => anilistId ? `https://vidsrc.icu/embed/anime/${anilistId}/${animeEpisode}/1` : null
        },
        {
            name: 'Cinezo',
            needsAnimeIds: true,
            build: async ({ anilistId, animeEpisode }) => anilistId ? `https://player.cinezo.live/embed/anime/${anilistId}/${animeEpisode}?dub=true&primarycolor=ff7657&autoplay=true` : null
        },
        {
            name: 'Cinetaro',
            needsAnimeIds: true,
            build: async ({ anilistId, season, episode }) => anilistId ? `https://api.cinetaro.buzz/anime/${anilistId}/${season}/${episode}/dub?autoplay=true&color=ff7657` : null
        },
        {
            name: 'Vidsrc CC TMDB',
            build: ({ tmdbId, absoluteEpisode }) => `https://vidsrc.cc/v2/embed/anime/tmdb${tmdbId}/${absoluteEpisode}/dub?autoPlay=true`
        },
        {
            name: 'Vidsrc Player',
            needsAnimeIds: true,
            build: async ({ anilistId, animeEpisode }) => anilistId ? `https://player.vidsrc.co/embed/anime/${anilistId}/${animeEpisode}?dub=true` : null
        },
        {
            name: 'Vidsrc CC Anilist',
            needsAnimeIds: true,
            build: async ({ anilistId, animeEpisode }) => anilistId ? `https://vidsrc.cc/v2/embed/anime/${anilistId}/${animeEpisode}/dub?autoPlay=true` : null
        },
        {
            name: 'Vidsrc CC Ani',
            needsAnimeIds: true,
            build: async ({ anilistId, animeEpisode }) => anilistId ? `https://vidsrc.cc/v2/embed/anime/ani${anilistId}/${animeEpisode}/dub?autoPlay=true` : null
        },
        {
            name: 'Vidsrc CC IMDb',
            needsAnimeIds: true,
            build: async ({ imdbId, absoluteEpisode }) => imdbId ? `https://vidsrc.cc/v2/embed/anime/imdb${imdbId}/${absoluteEpisode}/dub?autoPlay=true` : null
        },
        {
            name: 'VidLink',
            needsAnimeIds: true,
            build: async ({ malId, animeEpisode }) => malId ? `https://vidlink.pro/anime/${malId}/${animeEpisode}/dub?fallback=true` : null
        },
        {
            name: 'Vidsrc TV',
            build: ({ tmdbId, season, episode }) => `https://player.vidsrc.co/embed/tv/${tmdbId}/${season}/${episode}`
        }
    ];
    let currentAnimeSourceIdx = 0;
    let animeSourceFailCount = 0;

    function getAnimeEpisodeInfo(season, episode) {
        const mappedIndex = currentAnimeMap.findIndex(m => m && m.season === Number(season) && m.episode === Number(episode));
        if (mappedIndex !== -1) {
            return {
                season: currentAnimeMap[mappedIndex].season,
                episode: currentAnimeMap[mappedIndex].episode,
                absoluteEpisode: mappedIndex + 1
            };
        }

        const absoluteEpisode = Number(episode) || 1;
        const mapped = currentAnimeMap[absoluteEpisode - 1];
        return {
            season: mapped ? mapped.season : (Number(season) || 1),
            episode: mapped ? mapped.episode : absoluteEpisode,
            absoluteEpisode
        };
    }

    function getCurrentPlaybackPosition() {
        return {
            season: playerSeasonSelect ? (Number(playerSeasonSelect.value) || 1) : 1,
            episode: playerEpisodeSelect ? (Number(playerEpisodeSelect.value) || 1) : 1
        };
    }

    async function getAnimeSourceUrl(item, season, episode) {
        const sources = animeDubMode ? ANIME_DUB_SOURCES : ANIME_SUB_SOURCES;
        const episodeInfo = getAnimeEpisodeInfo(season, episode);
        let ids = { anilistId: null, malId: null, imdbId: null, useSeasonEpisode: false };

        for (let i = 0; i < sources.length; i++) {
            const sourceIndex = currentAnimeSourceIdx % sources.length;
            if (sources[sourceIndex].needsAnimeIds && !ids.anilistId && !ids.malId && !ids.imdbId) {
                ids = await fetchAnimeIds(item, episodeInfo.season);
            }
            const animeEpisode = ids.useSeasonEpisode ? episodeInfo.episode : episodeInfo.absoluteEpisode;
            const url = await sources[sourceIndex].build({
                tmdbId: item.tmdb_id,
                malId: ids.malId,
                anilistId: ids.anilistId,
                imdbId: ids.imdbId,
                animeEpisode,
                season: episodeInfo.season,
                episode: episodeInfo.episode,
                absoluteEpisode: episodeInfo.absoluteEpisode
            });

            if (url) return url;
            currentAnimeSourceIdx = (currentAnimeSourceIdx + 1) % sources.length;
        }

        return null;
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

    // Cache AniList lookups so we don't re-fetch anime-specific embed ids
    const anilistCache = {};

    function normalizeAnimeTitle(title) {
        return (title || '')
            .toLowerCase()
            .replace(/&/g, 'and')
            .replace(/\([^)]*\)/g, '')
            .replace(/season\s+\d+/g, '')
            .replace(/part\s+\d+/g, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    function isGenericSeasonName(name) {
        return !name || /^season\s+\d+$/i.test(name) || /^specials$/i.test(name);
    }

    function getAnimeTitleCandidates(item, seasonNumber) {
        const seasonName = currentAnimeSeasonNames[seasonNumber] || '';
        const candidates = [];

        const pushCandidate = (title, useSeasonEpisode = false) => {
            const value = (title || '').trim();
            if (!value) return;
            if (!candidates.some(candidate => normalizeAnimeTitle(candidate.title) === normalizeAnimeTitle(value))) {
                candidates.push({ title: value, useSeasonEpisode });
            }
        };

        if (!isGenericSeasonName(seasonName)) {
            pushCandidate(`${item.title}: ${seasonName}`, true);
            pushCandidate(`${item.title} ${seasonName}`, true);
            pushCandidate(seasonName, true);
        }

        if (Number(seasonNumber) > 1) {
            pushCandidate(`${item.title} Season ${seasonNumber}`, true);
            pushCandidate(`${item.title} ${seasonNumber}`, true);
            pushCandidate(`${item.originalTitle} Season ${seasonNumber}`, true);
            pushCandidate(`${item.originalTitle} ${seasonNumber}`, true);
        }

        pushCandidate(item.title, Number(seasonNumber) === 1);
        pushCandidate(item.originalTitle, Number(seasonNumber) === 1);
        pushCandidate(item.title && item.title.split(':')[0], Number(seasonNumber) === 1);
        pushCandidate(item.originalTitle && item.originalTitle.split(':')[0], Number(seasonNumber) === 1);

        return candidates;
    }

    async function fetchTmdbExternalIds(tmdbId) {
        if (!TMDB_API_KEY || !tmdbId) return {};
        try {
            const res = await fetch(`${BASE_URL}/tv/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`);
            if (!res.ok) return {};
            const data = await res.json();
            return {
                imdbId: data.imdb_id || null,
                tvdbId: data.tvdb_id || null
            };
        } catch (error) {
            return {};
        }
    }

    async function fetchAniListIds(candidates) {
        try {
            const query = `
                query ($search: String) {
                    Page(page: 1, perPage: 5) {
                        media(search: $search, type: ANIME) {
                            id
                            idMal
                            title { romaji english native userPreferred }
                            synonyms
                        }
                    }
                }
            `;

            for (const candidate of candidates) {
                const res = await fetch('https://graphql.anilist.co', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ query, variables: { search: candidate.title } }),
                    signal: AbortSignal.timeout(5000)
                });
                if (!res.ok) continue;

                const data = await res.json();
                const results = data?.data?.Page?.media || [];
                if (results.length === 0) continue;

                const normalizedCandidate = normalizeAnimeTitle(candidate.title);
                const exact = results.find(media => {
                    const names = [
                        media.title?.romaji,
                        media.title?.english,
                        media.title?.native,
                        media.title?.userPreferred,
                        ...(media.synonyms || [])
                    ].map(normalizeAnimeTitle);
                    return names.some(name => {
                        if (!name || !normalizedCandidate) return false;
                        return name === normalizedCandidate ||
                            (normalizedCandidate.length > 4 && name.includes(normalizedCandidate)) ||
                            (name.length > 4 && normalizedCandidate.includes(name));
                    });
                });
                const match = exact || results[0];
                return {
                    anilistId: match?.id || null,
                    malId: match?.idMal || null,
                    useSeasonEpisode: Boolean(candidate.useSeasonEpisode && exact)
                };
            }
        } catch (error) {
            return {};
        }

        return {};
    }

    async function fetchJikanIds(candidates) {
        for (const candidate of candidates) {
            try {
                const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(candidate.title)}&limit=1`, {
                    signal: AbortSignal.timeout(5000)
                });
                if (!res.ok) continue;
                const data = await res.json();
                const match = data?.data?.[0];
                if (match?.mal_id) {
                    return { malId: match.mal_id, useSeasonEpisode: candidate.useSeasonEpisode };
                }
            } catch (error) {
                // Try the next title candidate.
            }
        }

        return {};
    }

    async function fetchAnimeIds(item, seasonNumber = 1) {
        const key = `${item.tmdb_id || ''}:${seasonNumber}:${item.title || ''}`.toLowerCase().trim();
        if (anilistCache[key] !== undefined) return anilistCache[key];

        const candidates = getAnimeTitleCandidates(item, seasonNumber);
        const [externalIds, aniListIds] = await Promise.all([
            fetchTmdbExternalIds(item.tmdb_id),
            fetchAniListIds(candidates)
        ]);
        const jikanIds = aniListIds.malId ? {} : await fetchJikanIds(candidates);
        const ids = {
            anilistId: aniListIds.anilistId || null,
            malId: aniListIds.malId || item.malId || jikanIds.malId || null,
            imdbId: externalIds.imdbId || null,
            tvdbId: externalIds.tvdbId || null,
            useSeasonEpisode: Boolean(aniListIds.useSeasonEpisode || jikanIds.useSeasonEpisode)
        };
        anilistCache[key] = ids;
        return ids;
    }

    const BASE_URL = 'https://api.themoviedb.org/3';
    const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w300';
    const IMG_BG_BASE = 'https://image.tmdb.org/t/p/w780';
    const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';
    const ANIME_PLACEHOLDER_POSTER = 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=500';
    const ANIME_PLACEHOLDER_BACKDROP = 'https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=1600';

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

    function getItemPlaybackKey(item) {
        if (!item) return '';
        const type = item.isAnime ? 'anime' : (item.isMovie ? 'movie' : 'tv');
        return `${type}:${item.tmdb_id || item.malId || item.id || item.title || ''}`;
    }

    function setPlayerControlsMode(mode) {
        const visible = mode !== 'hidden';
        if (playerEpisodeSelector) {
            playerEpisodeSelector.classList.toggle('hidden', !visible);
            playerEpisodeSelector.classList.toggle('flex', visible);
        }
        if (playerEpisodeControls) {
            playerEpisodeControls.classList.toggle('hidden', !(mode === 'series' || mode === 'anime'));
            playerEpisodeControls.classList.toggle('flex', mode === 'series' || mode === 'anime');
        }
        if (playerServerControls) {
            playerServerControls.classList.toggle('hidden', mode === 'hidden' || mode === 'anime');
            playerServerControls.classList.toggle('flex', mode === 'movie' || mode === 'series');
        }
        if (playerSubBtn) {
            playerSubBtn.classList.toggle('hidden', mode === 'hidden' || mode === 'anime');
            if (mode !== 'anime') playerSubBtn.textContent = 'subtitles';
        }
        if (playerTrailerBtn) playerTrailerBtn.classList.toggle('hidden', !visible);
        if (playerDubToggle) {
            playerDubToggle.classList.toggle('hidden', mode !== 'anime');
            playerDubToggle.classList.toggle('flex', mode === 'anime');
        }
    }

    function hidePlayerLoader() {
        if (playerLoader) {
            playerLoader.classList.add('opacity-0', 'pointer-events-none');
        }
    }

    async function fetchTrailerUrl(item) {
        if (!item) return null;
        const key = getItemPlaybackKey(item);
        if (trailerCache[key] !== undefined) return trailerCache[key];

        if (item.trailerEmbedUrl) {
            trailerCache[key] = item.trailerEmbedUrl;
            return trailerCache[key];
        }

        if (!item.tmdb_id) {
            trailerCache[key] = null;
            return null;
        }

        const mediaType = item.isMovie ? 'movie' : 'tv';
        const data = await fetchTMDB(`/${mediaType}/${item.tmdb_id}/videos`, 6000);
        const videos = (data?.results || []).filter(video => video.site === 'YouTube' && video.key);
        const trailer = videos.find(video => video.type === 'Trailer' && video.official) ||
            videos.find(video => video.type === 'Trailer') ||
            videos.find(video => video.type === 'Teaser') ||
            videos[0];

        trailerCache[key] = trailer ? `https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&rel=0` : null;
        return trailerCache[key];
    }

    async function playTrailerFallback(item = currentPlayingItem) {
        if (!item) return;
        currentPlaybackToken += 1;
        clearTimeout(playerHelpTimer);
        if (playerLoader) playerLoader.classList.remove('opacity-0', 'pointer-events-none');
        const trailerUrl = await fetchTrailerUrl(item);
        if (!trailerUrl) {
            hidePlayerLoader();
            showToast('No official trailer is available for this title.', false);
            return;
        }

        const mode = item.isAnime ? 'anime' : (item.isMovie ? 'movie' : 'series');
        setPlayerControlsMode(mode);
        playerIframe.onerror = null;
        playerIframe.onload = hidePlayerLoader;
        playerIframe.src = trailerUrl;
        playerTitle.textContent = `${item.title} - Official Trailer`;
        videoOverlay.classList.remove('opacity-0', 'pointer-events-none');
        playerTitleOverlay.classList.remove('opacity-0');
        document.body.style.overflow = 'hidden';
    }

    function schedulePlayerHelp(item, token) {
        clearTimeout(playerHelpTimer);
        playerHelpTimer = setTimeout(() => {
            if (token !== currentPlaybackToken || !videoOverlay || videoOverlay.classList.contains('pointer-events-none')) return;
            hidePlayerLoader();
            playerTitleOverlay.classList.remove('opacity-0');
            showToast(item?.isAnime ? 'Still loading? Switch SUB source, try DUB, or play the trailer.' : 'If this source says File not found, switch source or play the trailer.', false);
        }, 7000);
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

    async function fetchJikan(endpoint, params = {}, timeoutMs = 8000) {
        try {
            const url = new URL(`${JIKAN_BASE_URL}${endpoint}`);
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    url.searchParams.set(key, value);
                }
            });

            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeoutMs);
            const res = await fetch(url.toString(), { signal: controller.signal });
            clearTimeout(id);

            if (!res.ok) throw new Error('Jikan API Error');
            return await res.json();
        } catch (error) {
            console.warn('Jikan fallback failed:', endpoint, error);
            return null;
        }
    }

    function formatJikanAnime(item) {
        if (!item || !item.mal_id) return null;
        const image = item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || ANIME_PLACEHOLDER_POSTER;
        const year = item.year || (item.aired?.from || '').substring(0, 4) || 'Anime';
        const episodes = Number(item.episodes) || (item.type === 'Movie' ? 1 : 12);

        return {
            id: `mal-${item.mal_id}`,
            tmdb_id: null,
            malId: item.mal_id,
            isMovie: false,
            isAnime: true,
            title: item.title_english || item.title || item.title_japanese || 'Untitled Anime',
            originalTitle: item.title || item.title_japanese || item.title_english || 'Untitled Anime',
            overview: item.synopsis || item.background || 'No description available for this anime.',
            poster: image,
            backdrop: item.trailer?.images?.maximum_image_url || item.trailer?.images?.large_image_url || image || ANIME_PLACEHOLDER_BACKDROP,
            rating: item.score ? Number(item.score).toFixed(1) : 'NR',
            year,
            animeEpisodes: episodes,
            animeType: item.type || 'TV',
            trailerEmbedUrl: item.trailer?.embed_url ? `${item.trailer.embed_url}${item.trailer.embed_url.includes('autoplay=') ? '' : (item.trailer.embed_url.includes('?') ? '&autoplay=1' : '?autoplay=1')}` : null,
            genres: (item.genres || []).map(genre => genre.name).filter(Boolean)
        };
    }

    function mergeAnimeLists(...lists) {
        const seen = new Set();
        return lists
            .flat()
            .filter(Boolean)
            .filter(item => {
                const key = item.malId ? `mal:${item.malId}` : `${item.tmdb_id || item.id || item.title}`.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }

    async function fetchJikanAnimeList(endpoint, params = {}) {
        const data = await fetchJikan(endpoint, { sfw: true, limit: 24, ...params });
        return (data?.data || []).map(formatJikanAnime).filter(Boolean);
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function loadAnimeFallbackData(includeGenres = false) {
        const requests = [
            () => fetchJikanAnimeList('/seasons/now'),
            () => fetchJikanAnimeList('/top/anime', { type: 'tv', filter: 'bypopularity' }),
            () => fetchJikanAnimeList('/top/anime', { type: 'tv', filter: 'favorite' })
        ];

        if (includeGenres) {
            requests.push(
                () => fetchJikanAnimeList('/anime', { genres: 1, order_by: 'popularity', sort: 'asc' }),
                () => fetchJikanAnimeList('/anime', { genres: 14, order_by: 'popularity', sort: 'asc' }),
                () => fetchJikanAnimeList('/anime', { genres: 22, order_by: 'popularity', sort: 'asc' })
            );
        }

        const values = [];
        for (const request of requests) {
            try {
                values.push(await request());
            } catch (error) {
                values.push([]);
            }
            await delay(250);
        }

        libraryData.anime = mergeAnimeLists(values[0], values[1], libraryData.anime).slice(0, 40);
        libraryData.animeTop = mergeAnimeLists(values[2], values[1], libraryData.animeTop).slice(0, 40);

        if (includeGenres) {
            libraryData.actionAnime = mergeAnimeLists(libraryData.actionAnime, values[3], libraryData.anime).slice(0, 40);
            libraryData.horrorAnime = mergeAnimeLists(libraryData.horrorAnime, values[4], libraryData.anime).slice(0, 40);
            libraryData.romanceAnime = mergeAnimeLists(libraryData.romanceAnime, values[5], libraryData.anime).slice(0, 40);
        }
    }

    async function ensureSeasonData(item) {
        if (!item || item.isMovie) return [];
        const seasonCacheId = item.tmdb_id || item.id;
        if (currentSeasonsItemId === seasonCacheId && currentTvSeasons.length > 0) {
            return currentTvSeasons;
        }

        const details = item.tmdb_id ? await fetchTvDetails(item.tmdb_id) : null;
        let seasons = (details?.seasons || []).filter(s => s.season_number > 0);

        if (item.isAnime && seasons.length === 0) {
            seasons = [{
                season_number: 1,
                name: item.animeType || 'Season 1',
                episode_count: Number(item.animeEpisodes) || 12
            }];
        }

        currentSeasonsItemId = seasonCacheId;
        currentTvSeasons = seasons;
        currentAnimeMap = [];
        currentAnimeSeasonNames = {};

        if (item.isAnime) {
            seasons.forEach(season => {
                currentAnimeSeasonNames[season.season_number] = season.name || `Season ${season.season_number}`;
                const count = season.episode_count || 0;
                for (let e = 1; e <= count; e++) {
                    currentAnimeMap.push({ season: season.season_number, episode: e });
                }
            });
        }

        return seasons;
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

            loadAnimeFallbackData(false).then(() => {
                const isBrowsingRows = !searchInput?.value.trim() && heroSection?.style.display !== 'none';
                if (isBrowsingRows && (currentTab === 'home' || currentTab === 'anime')) {
                    updateTabState(currentTab);
                }
            }).catch(error => console.warn('Anime fallback refresh failed:', error));

            if (!moviesRes && !tvRes && !animeRes && !kdramaRes && !popularRes && !bingeRes && libraryData.anime.length === 0) {
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

            if (
                libraryData.actionAnime.length === 0 ||
                libraryData.horrorAnime.length === 0 ||
                libraryData.romanceAnime.length === 0 ||
                libraryData.animeTop.length === 0
            ) {
                await loadAnimeFallbackData(true);
            }

            renderLibrary();
        } catch (error) {
            console.warn('Deferred load failed:', error);
            await loadAnimeFallbackData(true);
            renderLibrary();
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
            originalTitle: item.original_title || item.original_name || item.title || item.name,
            overview: item.overview || 'No description available for this title.',
            poster: item.poster_path ? `${IMG_BASE_URL}${item.poster_path}` : 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?q=80&w=500',
            backdrop: item.backdrop_path ? `${IMG_BG_BASE}${item.backdrop_path}` : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2000',
            rating: item.vote_average ? item.vote_average.toFixed(1) : 'NR',
            year: (item.release_date || item.first_air_date || '').substring(0,4)
        };
    }

    function showToast(message, isPositive = true) {
        const toast = document.getElementById('network-status');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.toggle('bg-emerald-600', isPositive);
        toast.classList.toggle('bg-netflix-red', !isPositive);
        toast.classList.remove('opacity-0', 'translate-y-10');
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-10');
        }, 3600);
    }

    function setAuthProfile(profile) {
        if (profile) {
            localStorage.setItem('adamstream_google_profile', JSON.stringify(profile));
        } else {
            localStorage.removeItem('adamstream_google_profile');
        }

        if (googleLoginBtn) googleLoginBtn.classList.toggle('hidden', !!profile);
        if (authUser) {
            authUser.classList.toggle('hidden', !profile);
            authUser.classList.toggle('flex', !!profile);
        }
        if (profile && authName) authName.textContent = profile.name || 'Google user';
        if (profile && authAvatar) authAvatar.src = profile.picture || authAvatar.src;
    }

    async function handleGoogleToken(response) {
        try {
            if (!response || response.error || !response.access_token) {
                throw new Error(response?.error || 'Missing Google access token');
            }
            const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` }
            });
            if (!profileResponse.ok) throw new Error('Google profile request failed');
            const profile = await profileResponse.json();
            setAuthProfile({
                name: profile.name || profile.email || 'Google user',
                email: profile.email || '',
                picture: profile.picture || ''
            });
            showToast('Signed in with Google');
        } catch (error) {
            showToast('Google sign-in could not finish.', false);
        }
    }

    let googleTokenClient = null;

    function hasGoogleClientId() {
        return GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('PASTE_GOOGLE_CLIENT_ID');
    }

    function ensureGoogleAuth() {
        if (!hasGoogleClientId()) {
            showToast('Add your Google Client ID in streaming-script.js first.', false);
            return false;
        }
        if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
            showToast('Google sign-in is still loading. Try again in a moment.', false);
            return false;
        }
        if (!googleTokenClient) {
            googleTokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'openid email profile',
                callback: handleGoogleToken
            });
        }
        return true;
    }

    function initAuth() {
        const savedProfile = JSON.parse(localStorage.getItem('adamstream_google_profile') || 'null');
        setAuthProfile(savedProfile);

        if (googleLoginBtn) {
            googleLoginBtn.onclick = () => {
                if (ensureGoogleAuth()) {
                    googleTokenClient.requestAccessToken({ prompt: 'select_account' });
                }
            };
        }

        if (authLogout) {
            authLogout.onclick = () => {
                if (window.google && window.google.accounts && window.google.accounts.id) {
                    window.google.accounts.id.disableAutoSelect();
                }
                setAuthProfile(null);
                showToast('Signed out');
            };
        }
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
            if (heroDesc) heroDesc.textContent = "Connecting securely to TMDB with your API key.";
            
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
        document.getElementById('modal-genre').textContent = item.genres?.length ? item.genres.join(', ') : (item.isMovie ? 'Film' : (item.isAnime ? 'Anime' : 'Series'));

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
            // Show episodes section for TV/Anime
            epSection.classList.remove('hidden');
            list.innerHTML = '<p class="text-zinc-400">Fetching seasons...</p>';
            seasonSelect.innerHTML = '';
            
            document.getElementById('modal-play').onclick = () => {
                closeModal();
                playMedia(item, 1, 1);
            };

            const seasons = await ensureSeasonData(item);
            if (!seasons || seasons.length === 0) {
                list.innerHTML = '<p class="text-zinc-400">Episode details unavailable.</p>';
                seasonSelect.classList.add('hidden');
                return;
            }

            // Always show season selector
            seasonSelect.classList.remove('hidden');

            // Populate season dropdown
            seasons.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.season_number;
                opt.textContent = `Season ${s.season_number}`;
                seasonSelect.appendChild(opt);
            });

            // Function to render episodes for a given season
            const renderEpisodes = (seasonObj) => {
                list.innerHTML = '';
                const episodes = seasonObj.episode_count || 12;
                const seasonNum = seasonObj.season_number;
                
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
                            <h5 class="text-sm font-bold mb-1">Episode ${i}</h5>
                            <p class="text-xs text-zinc-500 line-clamp-1">Season ${seasonNum} - Episode ${i}</p>
                        </div>
                    `;
                    
                    ep.onclick = () => {
                        closeModal();
                        playMedia(item, seasonNum, i);
                    };
                    
                    list.appendChild(ep);
                }
            };

            // Render first season by default
            renderEpisodes(seasons[0]);

            // Handle season selection
            seasonSelect.onchange = (e) => {
                const selectedSeasonNum = Number(e.target.value);
                const selectedSeason = seasons.find(s => s.season_number === selectedSeasonNum);
                if (selectedSeason) {
                    renderEpisodes(selectedSeason);
                }
            };
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

        const updateEpisodes = (sNum, keepE = false) => {
            playerEpisodeSelect.innerHTML = '';
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
        };

        updateEpisodes(currentS || 1, true);

        playerSeasonSelect.onchange = (e) => {
            updateEpisodes(Number(e.target.value), false);
            playMedia(currentPlayingItem, Number(e.target.value), 1);
        };

        playerEpisodeSelect.onchange = (e) => {
            playMedia(currentPlayingItem, Number(playerSeasonSelect.value), Number(e.target.value));
        };
    }

    async function playMedia(item, season = null, episode = null) {
        if (!item) return;
        const playbackToken = ++currentPlaybackToken;
        clearTimeout(playerHelpTimer);
        if (playerLoader) playerLoader.classList.remove('opacity-0', 'pointer-events-none');
        videoOverlay.classList.remove('opacity-0', 'pointer-events-none');
        document.body.style.overflow = 'hidden';
        playerTitleOverlay.classList.remove('opacity-0');
        playerTitle.textContent = `${item.title} - Loading...`;

        if (!item.isMovie) {
            await ensureSeasonData(item);
        }
        const isDifferentAnime = item.isAnime && (!currentPlayingItem || getItemPlaybackKey(currentPlayingItem) !== getItemPlaybackKey(item));
        if (isDifferentAnime) {
            currentAnimeSourceIdx = 0;
            animeSourceFailCount = 0;
        }
        currentPlayingItem = item;
        if (playerTrailerBtn) playerTrailerBtn.onclick = () => playTrailerFallback(item);

        const s = season || 1;
        const e = episode || 1;
        const animeEpisodeInfo = item.isAnime ? getAnimeEpisodeInfo(s, e) : null;
        let url = '';
        let subtitle = '';

        if (item.isMovie) {
            url = getServerUrl(item, s, e, currentServer);
            subtitle = '';
            setPlayerControlsMode('movie');
        } else {
            if (item.isAnime) {
                url = await getAnimeSourceUrl(item, s, e);
                if (!url) {
                    playerTitle.textContent = `${item.title} - Playback unavailable`;
                    setPlayerControlsMode('anime');
                    hidePlayerLoader();
                    return;
                }
            } else {
                url = getServerUrl(item, s, e, currentServer);
                if (currentKurdishSub && currentServer === 'alpha') {
                    url += `&subtitle=${KURDISH_VTT_DATA_URI}&subtitleLabel=Kurdish%20(Sorani)`;
                }
            }

            let epLabel = e;
            if (animeEpisodeInfo) {
                epLabel = animeEpisodeInfo.absoluteEpisode;
            }
            subtitle = item.isAnime ? ` - Ep ${epLabel}` : ` - S${s} E${e}`;

            if (playerEpisodeSelector) {
                playerEpisodeSelector.classList.remove('hidden');
                playerEpisodeSelector.classList.add('flex');
                populatePlayerSelectors(s, e);
            }

            setPlayerControlsMode(item.isAnime ? 'anime' : 'series');
        }

        playerIframe.onerror = async () => {
            if (!currentPlayingItem) return;

            if (currentPlayingItem.isAnime) {
                animeSourceFailCount += 1;
                const sources = animeDubMode ? ANIME_DUB_SOURCES : ANIME_SUB_SOURCES;
                currentAnimeSourceIdx = (currentAnimeSourceIdx + 1) % sources.length;
                updateAnimeToggleButtons();

                if (animeSourceFailCount <= sources.length * 2) {
                    const nextAnimeUrl = await getAnimeSourceUrl(currentPlayingItem, s, e);
                    if (nextAnimeUrl) {
                        playerIframe.src = nextAnimeUrl;
                    }
                    return;
                }

                playerTitle.textContent = `${currentPlayingItem.title} - Playback unavailable`;
                hidePlayerLoader();
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
            hidePlayerLoader();
        };

        playerIframe.src = url;
        playerTitle.textContent = item.title + subtitle;

        if (playerLoader) {
            playerLoader.classList.remove('opacity-0', 'pointer-events-none');
            setTimeout(() => {
                if (playbackToken === currentPlaybackToken) hidePlayerLoader();
            }, 1800);
        }

        schedulePlayerHelp(item, playbackToken);

        setTimeout(() => {
            if (playbackToken === currentPlaybackToken) playerTitleOverlay.classList.add('opacity-0');
        }, 5000);
    }

    function exitPlayer() {
        currentPlaybackToken += 1;
        clearTimeout(playerHelpTimer);
        playerIframe.src = '';
        videoOverlay.classList.add('opacity-0', 'pointer-events-none');
        setPlayerControlsMode('hidden');
        hidePlayerLoader();
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
                const position = getCurrentPlaybackPosition();
                playMedia(currentPlayingItem, position.season, position.episode);
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
                const position = getCurrentPlaybackPosition();
                playMedia(currentPlayingItem, position.season, position.episode);
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
                const position = getCurrentPlaybackPosition();
                playMedia(currentPlayingItem, position.season, position.episode);
            }
        };
    });

    // --- RENDERING DOM ---
    function createMovieCard(item, isTop10 = false) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'movie-card flex-shrink-0 w-32 md:w-48 aspect-[2/3] relative rounded-md overflow-hidden cursor-pointer transition-all duration-500 hover:z-30 group shadow-xl shadow-black shadow-glow text-left focus:outline-none focus:ring-2 focus:ring-netflix-red';
        
        card.innerHTML = `
            <img src="${item.poster}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="${item.title}" loading="lazy">
            ${isTop10 ? `<div class="absolute top-2 left-2 bg-netflix-red text-white text-[8px] font-black py-1 px-2 uppercase tracking-[0.16em] shadow-lg z-10 rounded">Spotlight</div>` : ''}
            <div class="absolute inset-x-0 bottom-0 bg-[#1d1b17]/95 border-t border-white/10 backdrop-blur-md p-3">
                <div class="flex gap-2 mb-2">
                   <span class="bg-netflix-red text-white w-8 h-8 rounded-md flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105"><span class="material-symbols-outlined fill text-sm">play_arrow</span></span>
                   <span class="bg-white/10 text-white w-8 h-8 rounded-md flex items-center justify-center border border-white/15 hover:bg-white/15 shadow-2xl"><span class="material-symbols-outlined text-sm">add</span></span>
                </div>
                <h4 class="text-xs font-black truncate drop-shadow-2xl mb-1">${item.title}</h4>
                <div class="flex items-center gap-1 text-[9px] text-zinc-300 font-black tracking-tight">
                    <span class="text-[#6ee7b7] font-bold">${item.rating}</span>
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
                        const forceType = title.toLowerCase().includes('anime') ? 'anime' : (baseEndpoint.includes('movie') ? 'movie' : 'tv');
                        const newItems = res.results.map(i => formatItem(i, forceType));
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
        let items = (data?.results || [])
            .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
            .map(r => formatItem(r, r.media_type));

        if (currentTab === 'anime' || items.length === 0) {
            const animeMatches = await fetchJikanAnimeList('/anime', { q: query, order_by: 'popularity', sort: 'asc' });
            items = currentTab === 'anime' ? mergeAnimeLists(animeMatches, items.filter(item => item.isAnime)) : mergeAnimeLists(items, animeMatches);
        }

        if(items.length === 0) {
            contentRows.innerHTML = '<div class="px-12 py-32 text-zinc-600 text-center text-2xl font-black italic tracking-widest uppercase">No cinematic matches for "' + query + '"</div>';
            return;
        }
            
        contentRows.innerHTML = '';
        const row = createRow(`Search Results for "${query}"`, items, false);
        if (row) contentRows.appendChild(row);
    }

    function init() {
        if (isInitialized) return;
        isInitialized = true;
        initAuth();

        // Safety Timeout: Force hide the loader or show delay message if hung
        setTimeout(() => {
            if (appLoader) {
                appLoader.classList.add('hidden');
            }
            // If we're still on the logo, show some feedback unconditionally after timeout
            if (heroTitle && heroTitle.textContent === 'LOADING CONTENT') {
                heroTitle.textContent = 'LIBRARY CONNECTION DELAY';
                heroDesc.textContent = 'We are having trouble connecting to the title database. Try loading the catalog again.';
                if(heroSetup) heroSetup.classList.remove('hidden');
            }
        }, 8000);

        if (playerSubBtn) {
            playerSubBtn.onclick = () => {
                if (currentPlayingItem && currentPlayingItem.isAnime) return;
                currentKurdishSub = !currentKurdishSub;
                playerSubBtn.classList.toggle('active', currentKurdishSub);
                // Restart player with subtitle if enabled
                const position = getCurrentPlaybackPosition();
                playMedia(currentPlayingItem, position.season, position.episode);
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
            if (heroDesc) heroDesc.textContent = 'Preparing your library. Please wait while we sync fresh picks from the global database...';
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
