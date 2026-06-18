let TMDB_API_KEY = localStorage.getItem('tmdb_api_key') || '1a514146c79d17c349b6f20ca517de79';
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
    const playerTitleLabel = document.getElementById('player-title-label');
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
    const btnNextSource = document.getElementById('btn-next-source');
    const playerSourceBadge = document.getElementById('player-source-badge');
    const playerSourceName = document.getElementById('player-source-name');
    const dubHint = document.getElementById('dub-hint');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const authUser = document.getElementById('auth-user');
    const authAvatar = document.getElementById('auth-avatar');
    const authName = document.getElementById('auth-name');
    const authLogout = document.getElementById('auth-logout');

    // UI Panels Let
    const profileScreen = document.getElementById('profile-screen');
    const homeBtn = document.getElementById('home-btn');
    const apiKeyModal = document.getElementById('api-key-modal');
    const apiKeyInput = document.getElementById('tmdb-api-input');
    const saveApiBtn = document.getElementById('save-api-btn');
    const seasonSelect = document.getElementById('season-select');
    // Profile Elements removed

    let libraryData = {
        movies: [],
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
    let featuredPool = [];
    let currentServer = 'vidlink'; // default preferred server
    const SERVER_PRIORITY = ['vidlink', 'vidsrc_cc', 'vidsrc_to']; // 3 preferred servers in order
    let fallbackServerIndex = 0;
    let playerHelpTimer = null;
    let currentPlaybackToken = 0;
    const trailerCache = {};
    const GOOGLE_CLIENT_ID = 'PASTE_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com';
    // When true the player will prefer official trailers/previews instead of
    // loading third-party embed players that frequently return "Video Not Found".
    // We default to false so the app will attempt real streaming providers first.
    const PREFER_TRAILER_FOR_PLAY = false;

    // Profile states removed

    const SERVERS = {
        vidlink: {
            name: 'VidLink',
            movie: (id) => `https://player.vidlink.to/embed/movie/${id}`,
            tv: (id, s, e) => `https://player.vidlink.to/embed/tv/${id}/${s}/${e}`
        },
        vidsrc_cc: {
            name: 'VidSrc.cc',
            movie: (id) => `https://vidsrc.cc/v2/embed/movie/${id}?autoPlay=true`,
            tv: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}?autoPlay=true`
        },
        vidsrc_to: {
            name: 'VidSrc.to',
            movie: (id) => `https://vidsrc.to/v2/embed/movie/${id}?autoPlay=true`,
            tv: (id, s, e) => `https://vidsrc.to/v2/embed/tv/${id}/${s}/${e}?autoPlay=true`
        }
    };

    // Anime source toggles (restore minimal defaults removed by prior commit)
    let animeDubMode = false;
    let currentAnimeSourceIdx = 0;
    let animeSourceFailCount = 0;
    const ANIME_SUB_SOURCES = [
        { key: 'vidlink', name: 'VidLink' },
        { key: 'vidsrc_cc', name: 'VidSrc.cc' },
        { key: 'vidsrc_to', name: 'VidSrc.to' }
    ];
    const ANIME_DUB_SOURCES = ANIME_SUB_SOURCES.slice();

    function updateAnimeToggleButtons() {
        if (!btnSub || !btnDub) return;
        // Toggle visual states
        btnSub.classList.toggle('bg-white', !animeDubMode);
        btnSub.classList.toggle('text-black', !animeDubMode);
        btnSub.classList.toggle('bg-zinc-900/80', animeDubMode);
        btnSub.classList.toggle('text-zinc-300', animeDubMode);
        btnDub.classList.toggle('bg-white', animeDubMode);
        btnDub.classList.toggle('text-black', animeDubMode);
        btnDub.classList.toggle('bg-zinc-900/80', !animeDubMode);
        btnDub.classList.toggle('text-zinc-300', !animeDubMode);
        const sources = animeDubMode ? ANIME_DUB_SOURCES : ANIME_SUB_SOURCES;
        if (playerSourceName) playerSourceName.textContent = sources[currentAnimeSourceIdx % sources.length]?.name || 'Switching...';
    }

    const SERVER_FAILURES_KEY = 'adamstream_server_failures';
    const SERVER_BLACKLIST_KEY = 'adamstream_server_blacklist';
    const SERVER_BLACKLIST_TTL = 1000 * 60 * 60 * 6; // 6 hours
    const MAX_FAILURES_BEFORE_BLACKLIST = 2;

    function loadServerFailures() {
        try { return JSON.parse(localStorage.getItem(SERVER_FAILURES_KEY) || '{}'); } catch (e) { return {}; }
    }

    function saveServerFailures(obj) { try { localStorage.setItem(SERVER_FAILURES_KEY, JSON.stringify(obj)); } catch (e) {} }

    function loadServerBlacklist() {
        try { return JSON.parse(localStorage.getItem(SERVER_BLACKLIST_KEY) || '{}'); } catch (e) { return {}; }
    }

    function saveServerBlacklist(obj) { try { localStorage.setItem(SERVER_BLACKLIST_KEY, JSON.stringify(obj)); } catch (e) {} }

    function markHostFailure(host) {
        const failures = loadServerFailures();
        failures[host] = (failures[host] || 0) + 1;
        saveServerFailures(failures);
        if (failures[host] >= MAX_FAILURES_BEFORE_BLACKLIST) {
            const bl = loadServerBlacklist();
            bl[host] = Date.now() + SERVER_BLACKLIST_TTL;
            saveServerBlacklist(bl);
            // clear failure count to avoid re-blacklisting later
            delete failures[host];
            saveServerFailures(failures);
        }
    }

    function isHostBlacklisted(host) {
        const bl = loadServerBlacklist();
        if (!bl[host]) return false;
        if (Date.now() > bl[host]) {
            delete bl[host];
            saveServerBlacklist(bl);
            return false;
        }
        return true;
    }

    // ─── SERVERS ───────────────────────────────────────────────────────────────────

    const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';
    const BASE_URL = 'https://api.themoviedb.org/3';
    const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';
    const IMG_BG_BASE = 'https://image.tmdb.org/t/p/w1280';
    const ANIME_PLACEHOLDER_BACKDROP = 'https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=1600';

    function getNextServer() {
        const queue = getServerQueue(currentServer);
        const currentIndex = queue.indexOf(currentServer);
        return queue[(currentIndex + 1) % queue.length] || queue[0];
    }

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
        const type = item.isMovie ? 'movie' : 'tv';
        return `${type}:${item.tmdb_id || item.id || item.title || ''}`;
    }

    function setPlayerControlsMode(mode) {
        const visible = mode === 'preview' || mode === 'stream';
        if (playerEpisodeSelector) {
            playerEpisodeSelector.classList.toggle('hidden', !visible);
            playerEpisodeSelector.classList.toggle('flex', visible);
        }
        if (playerEpisodeControls) {
            playerEpisodeControls.classList.toggle('hidden', !visible);
            playerEpisodeControls.classList.toggle('flex', visible);
        }
        if (playerServerControls) {
            playerServerControls.classList.toggle('hidden', mode !== 'stream');
            playerServerControls.classList.toggle('flex', mode === 'stream');
        }
        if (playerTrailerBtn) {
            playerTrailerBtn.classList.toggle('hidden', mode !== 'stream');
            playerTrailerBtn.classList.toggle('flex', mode === 'stream');
        }
        if (playerTitleLabel) playerTitleLabel.textContent = mode === 'preview' ? 'Preview' : 'Episode';
    }

    function hidePlayerLoader() {
        if (playerLoader) {
            playerLoader.classList.add('opacity-0', 'pointer-events-none');
        }
    }

    function setPlayerFrameUrl(url, playbackToken, loaderTimeout = 7000) {
        // Update loader text with the active source for anime
        const loaderText = document.getElementById('player-loader-text');
        if (loaderText) {
            loaderText.textContent = 'Optimizing Stream...';
        }

        if (!playerIframe) {
            // No iframe present — just hide loader after timeout to avoid blocking UI
            setTimeout(() => {
                if (playbackToken === currentPlaybackToken) hidePlayerLoader();
            }, loaderTimeout);
            return;
        }

        // When the iframe errors (for example the external embed returns a 404),
        // attempt an automatic graceful fallback: first try the official trailer,
        // then the preview fallback HTML page. This prevents showing raw 404 pages.
        let handledError = false;

        playerIframe.onerror = async () => {
            if (playbackToken !== currentPlaybackToken) return;
            if (handledError) return; // avoid retry loops
            handledError = true;
            hidePlayerLoader();

            // Try to load an official trailer as a safer fallback
            try {
                const trailer = await fetchTrailerUrl(currentPlayingItem);
                if (trailer) {
                    playerIframe.onerror = null;
                    playerIframe.onload = () => { if (playbackToken === currentPlaybackToken) hidePlayerLoader(); };
                    try { playerIframe.src = trailer; } catch (e) { /* ignore */ }
                    if (playerTitle) playerTitle.textContent = `${currentPlayingItem?.title || 'Preview'} - Official Preview`;
                    return;
                }
            } catch (e) {
                console.warn('Trailer fallback attempt failed', e);
            }

            // Last resort: show internal preview page so user never sees remote 404
            try {
                playerIframe.onerror = null;
                playerIframe.onload = () => { if (playbackToken === currentPlaybackToken) hidePlayerLoader(); };
                playerIframe.src = buildPreviewFallbackFrame(currentPlayingItem || {});
                if (playerTitle) playerTitle.textContent = `${currentPlayingItem?.title || 'Preview'} - Preview unavailable`;
            } catch (e) {
                console.warn('Preview fallback failed', e);
                setTimeout(() => {
                    if (playbackToken === currentPlaybackToken) hidePlayerLoader();
                }, loaderTimeout);
            }
        };

        playerIframe.onload = () => {
            if (playbackToken === currentPlaybackToken) hidePlayerLoader();
        };

        try {
            playerIframe.src = url;
        } catch (e) {
            console.warn('Failed to set iframe src', e);
            // Try trailer/preview immediately if direct assignment errors
            (async () => {
                try {
                    const trailer = await fetchTrailerUrl(currentPlayingItem);
                    if (trailer) {
                        try { playerIframe.src = trailer; } catch (e) { /* ignore */ }
                        return;
                    }
                } catch (err) {}
                try { playerIframe.src = buildPreviewFallbackFrame(currentPlayingItem || {}); } catch (err) {}
            })();
            setTimeout(() => {
                if (playbackToken === currentPlaybackToken) hidePlayerLoader();
            }, loaderTimeout);
        }

        setTimeout(() => {
            if (playbackToken === currentPlaybackToken) hidePlayerLoader();
        }, loaderTimeout);
    }

    // Attempt to load a URL into the iframe and resolve on load/reject on error or timeout.
    function loadIframeUrl(url, timeoutMs = 8000) {
        return new Promise((resolve, reject) => {
            if (!playerIframe) return reject(new Error('No iframe'));
            let settled = false;
            const onLoad = () => { if (settled) return; settled = true; cleanup(); resolve(true); };
            const onError = () => { if (settled) return; settled = true; cleanup(); reject(new Error('iframe error')); };
            const onTimeout = () => { if (settled) return; settled = true; cleanup(); reject(new Error('timeout')); };

            function cleanup() {
                playerIframe.removeEventListener('load', onLoad);
                playerIframe.removeEventListener('error', onError);
                clearTimeout(timer);
            }

            playerIframe.addEventListener('load', onLoad);
            playerIframe.addEventListener('error', onError);
            try { playerIframe.src = url; } catch (e) { cleanup(); return reject(e); }
            const timer = setTimeout(onTimeout, timeoutMs);
        });
    }

    async function tryStreamWithServers(item, season, episode, playbackToken, loaderTimeout = 8000) {
        if (!item || !item.tmdb_id) return false;
        const allServers = Object.keys(SERVERS || {});
        const queue = getServerQueue(currentServer).concat(allServers.filter(s => !getServerQueue(currentServer).includes(s)));

        for (const key of queue) {
            const server = SERVERS[key];
            if (!server) continue;
            // build url
            const url = item.isMovie ? server.movie(item.tmdb_id) : server.tv(item.tmdb_id, season || 1, episode || 1);
            try {
                const host = (new URL(url)).hostname;
                if (isHostBlacklisted(host)) continue;
            } catch (e) {}

            try {
                // show loader
                if (playerLoader) playerLoader.classList.remove('opacity-0', 'pointer-events-none');
                await loadIframeUrl(url, loaderTimeout);
                // success
                if (playerTitle) {
                    if (item.isMovie) playerTitle.textContent = `${item.title} - Playing`;
                    else playerTitle.textContent = `${item.title} - S${season} E${episode}`;
                }
                // update currentServer to the successful one
                currentServer = key;
                refreshServerButtons();
                return true;
            } catch (err) {
                // record failure and try next
                try { const host = (new URL(url)).hostname; markHostFailure(host); } catch (e) {}
                continue;
            } finally {
                hidePlayerLoader();
            }
        }

        // If all server-by-id attempts failed, try title-based URL patterns
        try {
            const titleFallback = await tryTitleBasedProviders(item, season, episode, playbackToken, loaderTimeout);
            if (titleFallback) return true;
        } catch (e) {}

        return false;
    }

    // Try alternative title-based URL patterns (slug, id-slug) for providers
    async function tryTitleBasedProviders(item, season, episode, playbackToken, loaderTimeout = 8000) {
        if (!item || !item.title) return false;
        const slugify = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const titleSlug = slugify(item.title + (item.year ? `-${item.year}` : ''));
        const tried = [];

        const keys = Object.keys(SERVERS || {});
        for (const key of keys) {
            const server = SERVERS[key];
            if (!server) continue;
            // candidate forms: slug, id-slug
            const candidates = [];
            try {
                candidates.push(item.isMovie ? server.movie(titleSlug) : server.tv(titleSlug, season || 1, episode || 1));
            } catch (e) {}
            try {
                if (item.tmdb_id) candidates.push(item.isMovie ? server.movie(item.tmdb_id + '-' + titleSlug) : server.tv(item.tmdb_id + '-' + titleSlug, season || 1, episode || 1));
            } catch (e) {}

            for (const url of candidates) {
                if (!url) continue;
                tried.push(url);
                try {
                    const host = (new URL(url)).hostname;
                    if (isHostBlacklisted(host)) continue;
                } catch (e) {}

                try {
                    if (playerLoader) playerLoader.classList.remove('opacity-0', 'pointer-events-none');
                    await loadIframeUrl(url, loaderTimeout);
                    // success
                    currentServer = key;
                    refreshServerButtons();
                    if (playerTitle) playerTitle.textContent = `${item.title} - Playing (${SERVERS[key].name})`;
                    return true;
                } catch (err) {
                    try { const host = (new URL(url)).hostname; markHostFailure(host); } catch (e) {}
                    continue;
                } finally {
                    hidePlayerLoader();
                }
            }
        }

        // Log failure for debugging (persist small record)
        try {
            const key = 'adamstream_failed_titles';
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            existing.unshift({ title: item.title, tmdb_id: item.tmdb_id || null, tried: tried.slice(0,6), when: Date.now() });
            localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
        } catch (e) {}

        return false;
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

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function buildPreviewFallbackFrame(item) {
        const title = escapeHtml(item?.title || 'Preview unavailable');
        const poster = escapeHtml(item?.backdrop || item?.poster || ANIME_PLACEHOLDER_BACKDROP);
        const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{margin:0;height:100%;background:#12110f;color:#f8f3e8;font-family:Inter,Arial,sans-serif;overflow:hidden}
.wrap{position:relative;display:grid;place-items:center;height:100%;isolation:isolate;text-align:center;padding:32px}
.bg{position:absolute;inset:0;background:linear-gradient(90deg,rgba(18,17,15,.98),rgba(18,17,15,.76),rgba(18,17,15,.48)),url("${poster}") center/cover no-repeat;filter:saturate(.85);z-index:-2}
.shade{position:absolute;inset:0;background:radial-gradient(circle at 50% 35%,rgba(255,118,87,.18),transparent 34%),linear-gradient(to top,#12110f,transparent 52%);z-index:-1}
.panel{max-width:620px}
.mark{display:inline-grid;place-items:center;width:58px;height:58px;border-radius:16px;background:#ff7657;color:#12110f;font-size:28px;font-weight:900;margin-bottom:22px;box-shadow:0 22px 60px rgba(255,118,87,.25)}
h1{font-size:clamp(32px,5vw,64px);line-height:.95;letter-spacing:-.04em;margin:0 0 14px;font-weight:900}
p{margin:0 auto;color:#d8d0c2;font-size:16px;line-height:1.6;max-width:520px}
.tag{margin-top:24px;display:inline-block;border:1px solid rgba(248,243,232,.18);border-radius:999px;padding:10px 14px;color:#f8f3e8;background:rgba(248,243,232,.07);font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}
</style>
</head>
<body>
<main class="wrap">
<div class="bg"></div><div class="shade"></div>
<section class="panel">
<div class="mark">i</div>
<h1>${title}</h1>
<p>An official preview is not available for this title right now. The broken third-party players were removed so AdamStream does not send you into 404 pages.</p>
<div class="tag">Premium catalog view</div>
</section>
</main>
</body>
</html>`;
        return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    }

    async function playTrailerFallback(item = currentPlayingItem) {
        if (!item) return;
        currentPlaybackToken += 1;
        clearTimeout(playerHelpTimer);
        if (playerLoader) playerLoader.classList.remove('opacity-0', 'pointer-events-none');
        const trailerUrl = await fetchTrailerUrl(item);

        setPlayerControlsMode('preview');

        if (playerIframe) {
            playerIframe.onerror = null;
            playerIframe.onload = hidePlayerLoader;
            try {
                playerIframe.src = trailerUrl || buildPreviewFallbackFrame(item);
            } catch (e) {
                console.warn('Failed to set iframe src for trailer fallback', e);
            }
        } else {
            // If no iframe, ensure loader is hidden eventually
            setTimeout(() => {
                if (currentPlaybackToken) hidePlayerLoader();
            }, 1500);
        }

        if (playerTitle) playerTitle.textContent = `${item.title} - ${trailerUrl ? 'Official Preview' : 'Preview unavailable'}`;
        if (videoOverlay) videoOverlay.classList.remove('opacity-0', 'pointer-events-none');
        if (playerTitleOverlay) playerTitleOverlay.classList.remove('opacity-0');
        document.body.style.overflow = 'hidden';
    }

    function schedulePlayerHelp(item, token) {
        clearTimeout(playerHelpTimer);
        // No auto-switching. Server will load indefinitely until user manually switches.
        // Removed automatic timeout and server switching logic per user request.
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
                if (res.status === 401) throw new Error('Invalid API Key');
                throw new Error('API Error');
            }
            return await res.json();
        } catch (e) {
            console.error('TMDB error:', e);
            if (e.message === 'Invalid API Key') {
                console.error('The stored TMDB API Key is invalid or rate limited.');
                showApiKeyModal(true);
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
        } catch (e) {
            return null;
        }
    }

    async function fetchTvDetails(tvId) {
        if (!TMDB_API_KEY) return null;
        try {
            const res = await fetch(`${BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`);
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
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

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
            if (apiKeyModal) showApiKeyModal();
            if (appLoader) appLoader.classList.add('hidden', 'pointer-events-none');
            if (heroSetup) heroSetup.classList.remove('hidden');
            if (!libraryData.movies.length) {
                libraryData.movies = [
                    { id: 101, tmdb_id: 823464, title: "Godzilla x Kong", year: "2024", rating: "7.2", overview: "The epic battle continues!", isMovie: true, isAnime: false, poster: "https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=500", backdrop: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2000" },
                    { id: 102, tmdb_id: 1022789, title: "Inside Out 2", year: "2024", rating: "8.1", overview: "Emotions are back!", isMovie: true, isAnime: false, poster: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500", backdrop: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=2000" }
                ];
            }
            if (!libraryData.tv.length) {
                libraryData.tv = [
                    { id: 901, tmdb_id: 1396, title: "Breaking Bad", year: "2008", rating: "9.5", overview: "A chemistry teacher turned kingpin.", isMovie: false, isAnime: false, poster: "https://images.unsplash.com/photo-1616530940355-351fabd9524b?q=80&w=500", backdrop: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2000" }
                ];
            }
            updateTabState(currentTab);
            return;
        }
        if (apiKeyModal) apiKeyModal.classList.add('opacity-0', 'pointer-events-none');
        if (appLoader) appLoader.classList.add('hidden', 'pointer-events-none');

        try {
            const essentialEndpoints = {
                movies: fetchTMDB('/trending/movie/week'),
                tv: fetchTMDB('/trending/tv/week'),
                kdrama: fetchTMDB('/discover/tv?with_origin_country=KR&without_genres=16&sort_by=popularity.desc'),
                popular: fetchTMDB('/movie/popular'),
                binge: fetchTMDB('/discover/tv?sort_by=popularity.desc&without_origin_country=JP|KR')
            };

            const essentialResults = await Promise.allSettled(Object.values(essentialEndpoints).map(promise => fetchWithTimeout(promise, 10000)));
            const [moviesRes, tvRes, kdramaRes, popularRes, bingeRes] = essentialResults.map(result => result.status === 'fulfilled' ? result.value : null);

            if (moviesRes) libraryData.movies = moviesRes.results.map(i => formatItem(i, 'movie'));
            if (tvRes) libraryData.tv = tvRes.results.map(i => formatItem(i, 'tv'));
            if (kdramaRes) libraryData.kdrama = kdramaRes.results.map(i => formatItem(i, 'tv'));
            if (popularRes) libraryData.popular = popularRes.results.map(i => formatItem(i, 'movie'));
            if (bingeRes) libraryData.binge = bingeRes.results.map(i => formatItem(i, 'tv'));

            const isBrowsingRows = !searchInput?.value.trim() && heroSection?.style.display !== 'none';
            if (isBrowsingRows) {
                updateTabState(currentTab);
            }

            if (!moviesRes && !tvRes && !kdramaRes && !popularRes && !bingeRes) {
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
                actionKDrama: fetchTMDB('/discover/tv?with_origin_country=KR&with_genres=10759&sort_by=popularity.desc'),
                horrorKDrama: fetchTMDB('/discover/tv?with_origin_country=KR&with_genres=9648&sort_by=popularity.desc'),
                romanceKDrama: fetchTMDB('/discover/tv?with_origin_country=KR&with_genres=10766&sort_by=popularity.desc')
            };

            const deferredResults = await Promise.allSettled(Object.values(deferredEndpoints).map(promise => fetchWithTimeout(promise, 10000)));
            const deferredValues = deferredResults.map(result => result.status === 'fulfilled' ? result.value : null);
            const [actionRes, comedyRes, horrorRes, scifiRes, crimeTvRes, actionMoviesRes, horrorMoviesRes, romanceMoviesRes, actionTVRes, horrorTVRes, romanceTVRes, actionKDramaRes, horrorKDramaRes, romanceKDramaRes] = deferredValues;

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
            if (actionKDramaRes) libraryData.actionKDrama = actionKDramaRes.results.map(i => formatItem(i, 'tv'));
            if (horrorKDramaRes) libraryData.horrorKDrama = horrorKDramaRes.results.map(i => formatItem(i, 'tv'));
            if (romanceKDramaRes) libraryData.romanceKDrama = romanceKDramaRes.results.map(i => formatItem(i, 'tv'));

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
            poster: item.poster_path ? `${IMG_BASE_URL}${item.poster_path}` : (item.backdrop_path ? `${IMG_BASE_URL}${item.backdrop_path}` : 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?q=80&w=500'),
            backdrop: item.backdrop_path ? `${IMG_BG_BASE}${item.backdrop_path}` : (item.poster_path ? `${IMG_BG_BASE}${item.poster_path}` : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2000'),
            rating: item.vote_average ? item.vote_average.toFixed(1) : 'NR',
            year: (item.release_date || item.first_air_date || '').substring(0, 4)
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
        if (error && apiKeyInput) {
            apiKeyInput.value = '';
            apiKeyInput.placeholder = 'Invalid Key! Enter a valid TMDB API Key...';
            apiKeyInput.classList.add('border-red-500');
        }
    }

    if (saveApiBtn && apiKeyInput) {
        saveApiBtn.onclick = () => {
            const key = apiKeyInput.value.trim();
            if (key.length > 20) {
                TMDB_API_KEY = key;
                localStorage.setItem('tmdb_api_key', key);
                apiKeyInput.classList.remove('border-red-500');
                apiKeyInput.placeholder = 'Enter TMDB API Key...';

                // Fade out modal
                apiKeyModal && apiKeyModal.classList.add('opacity-0', 'pointer-events-none');
                setTimeout(() => {
                    if (apiKeyModal) {
                        apiKeyModal.classList.add('hidden');
                        apiKeyModal.classList.remove('flex');
                    }
                }, 500);

                if (heroSetup) heroSetup.classList.add('hidden');

                // Reset to loader ui
                if (heroTitle) heroTitle.textContent = "VERIFYING DATABASE...";
                if (heroDesc) heroDesc.textContent = "Connecting securely to TMDB with your API key.";

                loadData();
            } else {
                apiKeyInput.classList.add('border-red-500');
            }
        };
    }

    if (apiKeyInput) {
        apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (saveApiBtn) saveApiBtn.click();
            }
        });
    }

    // --- UI/NAVIGATION ---
    function updateTabState(tab) {
        currentTab = tab;
        currentHeroIndex = 0;

        const tabs = {
            'home': homeBtn,
            'tv': document.getElementById('tv-nav-btn'),
            'kdrama': document.getElementById('kdrama-nav-btn'),
            'anime': document.getElementById('anime-nav-btn'),
            'movies': document.getElementById('movies-nav-btn'),
            'popular': document.getElementById('popular-nav-btn'),
            'mylist': document.getElementById('mylist-nav-btn')
        };

        Object.entries(tabs).forEach(([key, btn]) => {
            if (btn && btn.classList) {
                btn.classList.toggle('text-white', tab === key);
                btn.classList.toggle('font-bold', tab === key);
                btn.classList.toggle('border-b-2', tab === key);
                btn.classList.toggle('border-netflix-red', tab === key);
                btn.classList.toggle('text-zinc-400', tab !== key);
            }
        });

        if (tab === 'home') {
            featuredPool = [...libraryData.movies].slice(0, 8);
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

        if (searchInput && searchInput.value.length > 0) {
            handleSearch(searchInput.value);
        } else {
            renderLibrary();
            if (heroSection) heroSection.style.display = 'flex';
            if (contentRows) {
                contentRows.classList.add('-mt-20');
                contentRows.classList.remove('mt-24');
            }
            startHeroRotation();
            if (featuredPool[currentHeroIndex]) updateHeroUI(featuredPool[currentHeroIndex]);
        }
    }

    function goHome() {
        if (!searchInput) return;
        searchInput.value = '';
        updateTabState('home');
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

    function goAnime() {
        if (!searchInput) return;
        searchInput.value = '';
        updateTabState('anime');
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
        if (heroBg) heroBg.style.opacity = '0.5';
        if (heroContent) heroContent.style.opacity = '0';

        setTimeout(() => {
            if (heroBg) heroBg.src = item.backdrop;
            if (heroTitle) heroTitle.textContent = item.title;
            if (heroDesc) heroDesc.textContent = item.overview;
            if (heroBg) heroBg.style.opacity = '1';
            if (heroContent) heroContent.style.opacity = '1';
        }, 300);

        if (heroPlay) heroPlay.onclick = () => playMedia(item);
        if (heroInfo) heroInfo.onclick = () => openModal(item);
    }

    function startHeroRotation() {
        clearInterval(heroInterval);
        // Ensure hero dots exist
        ensureHeroDots();

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
                    if (heroBg) heroBg.src = nextItem.backdrop;
                    if (heroBg) heroBg.style.opacity = '1';
                    if (heroContent) heroContent.style.opacity = '1';

                    if (heroTitle) heroTitle.textContent = nextItem.title;
                    if (heroDesc) heroDesc.textContent = nextItem.overview;
                    if (heroPlay) heroPlay.onclick = () => playMedia(nextItem);
                    if (heroInfo) heroInfo.onclick = () => openModal(nextItem);
                    updateHeroDots();
                }, 1500);
            }
        };
        heroInterval = setInterval(rotate, 8000);

        // Mobile swipe handlers to allow manual carousel control
        if (heroSection) {
            let touchStartX = 0;
            const minSwipe = 40;

            const onTouchStart = (e) => {
                if (!e.touches || !e.touches[0]) return;
                touchStartX = e.touches[0].clientX;
                clearInterval(heroInterval);
            };

            const onTouchEnd = (e) => {
                const touchEndX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : 0;
                const dx = touchEndX - touchStartX;
                if (Math.abs(dx) > minSwipe && featuredPool.length > 0) {
                    if (dx < 0) currentHeroIndex = (currentHeroIndex + 1) % featuredPool.length;
                    else currentHeroIndex = (currentHeroIndex - 1 + featuredPool.length) % featuredPool.length;
                    const nextItem = featuredPool[currentHeroIndex];
                    updateHeroUI(nextItem);
                }
                // restart auto-rotate after brief delay
                setTimeout(startHeroRotation, 1200);
            };

            heroSection.removeEventListener('touchstart', onTouchStart);
            heroSection.removeEventListener('touchend', onTouchEnd);
            heroSection.addEventListener('touchstart', onTouchStart, { passive: true });
            heroSection.addEventListener('touchend', onTouchEnd, { passive: true });
        }
    }

    function ensureHeroDots() {
        const existing = document.getElementById('hero-dots');
        if (existing) return existing;
        const container = document.createElement('div');
        container.id = 'hero-dots';
        container.setAttribute('aria-hidden', 'true');
        (featuredPool || []).forEach((_, idx) => {
            const dot = document.createElement('div');
            dot.className = 'dot' + (idx === currentHeroIndex ? ' active' : '');
            dot.dataset.index = String(idx);
            dot.onclick = (e) => {
                const i = Number(e.currentTarget.dataset.index || 0);
                currentHeroIndex = i;
                const item = featuredPool[currentHeroIndex];
                updateHeroUI(item);
                // reset rotation timer
                clearInterval(heroInterval);
                startHeroRotation();
            };
            container.appendChild(dot);
        });
        const heroWrap = document.getElementById('hero');
        if (heroWrap) heroWrap.appendChild(container);
        return container;
    }

    function updateHeroDots() {
        const container = document.getElementById('hero-dots');
        if (!container) return;
        Array.from(container.children).forEach((c, idx) => {
            c.classList.toggle('active', idx === currentHeroIndex);
        });
    }

    // --- MODAL ---
    async function openModal(item) {
        if (!item || !detailModal) return;
        const modalImage = document.getElementById('modal-image');
        const modalTitle = document.getElementById('modal-title');
        const modalDesc = document.getElementById('modal-desc');
        const modalYear = document.getElementById('modal-year');
        const modalRating = document.getElementById('modal-rating');
        const modalDuration = document.getElementById('modal-duration');
        const modalCast = document.getElementById('modal-cast');
        const modalGenre = document.getElementById('modal-genre');

        if (modalImage) modalImage.src = item.backdrop || item.poster;
        if (modalTitle) modalTitle.textContent = item.title;
        if (modalDesc) modalDesc.textContent = item.overview;
        if (modalYear) modalYear.textContent = item.year;
        if (modalRating) modalRating.textContent = item.rating;
        if (modalDuration) modalDuration.textContent = item.isMovie ? 'Movie' : 'TV Series';
        if (modalCast) modalCast.textContent = 'Loading...';
        if (modalGenre) modalGenre.textContent = item.genres?.length ? item.genres.join(', ') : (item.isMovie ? 'Film' : 'Series');

        const epSection = document.getElementById('episodes-section');
        const list = document.getElementById('episodes-list');
        const seasonSelect = document.getElementById('season-select');

        if (epSection) epSection.classList.add('hidden');
        if (list) list.innerHTML = '';
        if (seasonSelect) seasonSelect.innerHTML = '';

        const modalPlay = document.getElementById('modal-play');
        if (modalPlay) {
            modalPlay.onclick = () => {
                closeModal();
                playMedia(item);
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
        const modalContent = detailModal.querySelector('#modal-content');
        if (modalContent) {
            modalContent.classList.remove('scale-95');
            modalContent.classList.add('scale-100');
        }
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        if (!detailModal) return;
        detailModal.classList.add('opacity-0', 'pointer-events-none');
        const modalContent = detailModal.querySelector('#modal-content');
        if (modalContent) {
            modalContent.classList.remove('scale-100');
            modalContent.classList.add('scale-95');
        }
        document.body.style.overflow = '';
    }

    // --- Preview Player ---
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
            for (let i = 1; i <= epCount; i++) {
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
        if (videoOverlay) videoOverlay.classList.remove('opacity-0', 'pointer-events-none');
        document.body.style.overflow = 'hidden';
        if (playerTitleOverlay) playerTitleOverlay.classList.remove('opacity-0');
        if (playerTitle) playerTitle.textContent = `${item.title} - Loading...`;

        currentPlayingItem = item;

        // Prefer trailers/previews to avoid remote 404 pages from unreliable embeds.
        // If `PREFER_TRAILER_FOR_PLAY` is false, fallback to original server embeds.
        if (PREFER_TRAILER_FOR_PLAY) {
            const trailerUrl = await fetchTrailerUrl(item);
            if (playbackToken !== currentPlaybackToken) return;
            if (trailerUrl) {
                setPlayerControlsMode('preview');
                setPlayerFrameUrl(trailerUrl, playbackToken, 5000);
                if (playerTitle) playerTitle.textContent = `${item.title} - Official Preview`;
                schedulePlayerHelp(item, playbackToken);
                return;
            }
            // if no trailer, fallthrough to original stream behavior below
        }

        setPlayerControlsMode('stream');
        if (item.isMovie) {
            if (playerSeasonSelect) playerSeasonSelect.classList.add('hidden');
            if (playerEpisodeControls) playerEpisodeControls.classList.add('hidden');
        } else {
            const seasons = await ensureSeasonData(item);
            if (playbackToken !== currentPlaybackToken) return;

            const firstSeason = seasons[0]?.season_number || 1;
            const selectedSeason = Number(season) || firstSeason;
            const selectedEpisode = Number(episode) || 1;
            populatePlayerSelectors(selectedSeason, selectedEpisode);
            season = selectedSeason;
            episode = selectedEpisode;
        }

        const canStream = !!(item.tmdb_id);
        if (canStream) {
            // try cycling servers (this will update currentServer on success)
            const success = await tryStreamWithServers(item, season, episode, playbackToken, 9000);
            if (playbackToken !== currentPlaybackToken) return;
            if (!success) {
                // fallback to trailer / preview if all servers failed
                const trailerUrl = await fetchTrailerUrl(item);
                if (playbackToken !== currentPlaybackToken) return;
                setPlayerFrameUrl(trailerUrl || buildPreviewFallbackFrame(item), playbackToken, 1800);
                if (playerTitle) playerTitle.textContent = `${item.title} - ${trailerUrl ? 'Official Preview' : 'Preview unavailable'}`;
            }
            schedulePlayerHelp(item, playbackToken);
        } else {
            const trailerUrl = await fetchTrailerUrl(item);
            if (playbackToken !== currentPlaybackToken) return;
            setPlayerFrameUrl(trailerUrl || buildPreviewFallbackFrame(item), playbackToken, 1800);
            if (playerTitle) playerTitle.textContent = `${item.title} - ${trailerUrl ? 'Official Preview' : 'Preview unavailable'}`;
        }

        setTimeout(() => {
            if (playbackToken === currentPlaybackToken && playerTitleOverlay) playerTitleOverlay.classList.add('opacity-0');
        }, 5000);
    }

    function exitPlayer() {
        currentPlaybackToken += 1;
        clearTimeout(playerHelpTimer);
        if (playerIframe) {
            try { playerIframe.src = ''; } catch (e) { /* ignore */ }
        }
        if (videoOverlay) videoOverlay.classList.add('opacity-0', 'pointer-events-none');
        setPlayerControlsMode('hidden');
        hidePlayerLoader();
        // Reset anime state
        animeDubMode = false;
        currentAnimeSourceIdx = 0;
        animeSourceFailCount = 0;
        if (dubHint) dubHint.classList.add('hidden');
        if (playerSourceName) playerSourceName.textContent = 'Loading source...';
        // Restore loader text default
        const loaderText = document.getElementById('player-loader-text');
        if (loaderText) loaderText.textContent = 'Optimizing Stream...';
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

    // Next Source (anime) — cycles to the next provider immediately
    if (btnNextSource) {
        btnNextSource.addEventListener('click', () => {
            if (!currentPlayingItem || !currentPlayingItem.isAnime) return;
            const sources = animeDubMode ? ANIME_DUB_SOURCES : ANIME_SUB_SOURCES;
            currentAnimeSourceIdx = (currentAnimeSourceIdx + 1) % sources.length;
            animeSourceFailCount = 0;
            // Update badge preview text
            if (playerSourceName) {
                playerSourceName.textContent = sources[currentAnimeSourceIdx % sources.length]?.name || 'Switching...';
            }
            const position = getCurrentPlaybackPosition();
            playMedia(currentPlayingItem, position.season, position.episode);
        });
    }

    // Server Switcher Listeners
    document.querySelectorAll('.server-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const serverKey = e.currentTarget.getAttribute('data-server');
            if (!serverKey) return;
            // set the server preference immediately
            currentServer = serverKey;
            refreshServerButtons();

            // If something is playing, try to switch to the selected provider immediately
            if (currentPlayingItem) {
                const position = getCurrentPlaybackPosition();
                // attempt to load the selected server first, then fallback to others
                const server = SERVERS[serverKey];
                if (server) {
                    const tryUrl = currentPlayingItem.isMovie ? server.movie(currentPlayingItem.tmdb_id) : server.tv(currentPlayingItem.tmdb_id, position.season || 1, position.episode || 1);
                    try {
                        if (playerLoader) playerLoader.classList.remove('opacity-0', 'pointer-events-none');
                        await loadIframeUrl(tryUrl, 9000);
                        // success: update currentServer and display
                        currentServer = serverKey;
                        refreshServerButtons();
                        if (playerTitle) playerTitle.textContent = `${currentPlayingItem.title} - Playing (${SERVERS[serverKey].name})`;
                        return;
                    } catch (err) {
                        // on fail, mark host failure and try cycling through other servers
                        try { const host = (new URL(tryUrl)).hostname; markHostFailure(host); } catch (e) {}
                        await tryStreamWithServers(currentPlayingItem, position.season, position.episode, currentPlaybackToken, 9000);
                    } finally {
                        hidePlayerLoader();
                    }
                }
            }
        };
    });

    // --- RENDERING DOM ---
    function createMovieCard(item, isTop10 = false) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'movie-card flex-shrink-0 w-32 md:w-48 aspect-[2/3] relative rounded-md overflow-hidden cursor-pointer transition-all duration-500 hover:z-30 group shadow-xl shadow-black shadow-glow text-left focus:outline-none focus:ring-2 focus:ring-netflix-red';

        card.innerHTML = `
            <img src="${item.poster}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="${item.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1616530940355-351fabd9524b?q=80&w=500'">
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
            <div class="shine"></div>
        `;

        // Pointer-based 3D tilt + shine
        const maxTilt = 10; // degrees
        const rect = () => card.getBoundingClientRect();
        const onPointerMove = (e) => {
            const r = rect();
            const px = (e.clientX - r.left) / r.width; // 0..1
            const py = (e.clientY - r.top) / r.height;
            const tiltY = (px - 0.5) * maxTilt * 2;
            const tiltX = -((py - 0.5) * maxTilt * 2);
            card.style.transform = `translateZ(12px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
            card.classList.add('hover-shine');
            const shine = card.querySelector('.shine');
            if (shine) {
                const sx = (px * 140) - 60; // move shine across
                shine.style.transform = `translateX(${sx}%) skewX(-18deg)`;
            }
        };

        const onPointerLeave = () => {
            card.style.transform = '';
            card.classList.remove('hover-shine');
            const shine = card.querySelector('.shine');
            if (shine) shine.style.transform = 'translateX(-60%) skewX(-18deg)';
        };

        card.addEventListener('pointermove', onPointerMove);
        card.addEventListener('pointerleave', onPointerLeave);

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
        // animated header class for scroll entrance
        rowTitle.classList.add('row-header');

        const viewAllBtn = document.createElement('button');
        viewAllBtn.className = 'text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-colors flex items-center gap-1 group';
        viewAllBtn.innerHTML = 'View All <span class="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>';
        viewAllBtn.onclick = () => renderGrid(title, items);

        titleWrapper.appendChild(rowTitle);
        titleWrapper.appendChild(viewAllBtn);

        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'flex gap-3 overflow-x-auto no-scrollbar pb-8 pt-2 scroll-smooth px-1';
        scrollContainer.style.minHeight = '320px'; // Optimization: Prevent layout shift

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

        rowWrapper.appendChild(titleWrapper);
        rowWrapper.classList.add('relative', 'group');
        rowWrapper.appendChild(leftBtn);
        rowWrapper.appendChild(rightBtn);
        rowWrapper.appendChild(scrollContainer);

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Optimization: Deferred rendering of cards
                    if (scrollContainer.children.length === 0) {
                        const fragment = document.createDocumentFragment();
                        items.forEach((item, idx) => {
                            const card = createMovieCard(item, isTrending && idx < 5);
                            card.classList.add('animate-pop-in');
                            card.style.animationDelay = `${idx * 60}ms`;
                            fragment.appendChild(card);
                        });
                        scrollContainer.appendChild(fragment);
                    }
                    entry.target.classList.add('visible');
                    // animate header
                    try {
                        const hdr = entry.target.querySelector('h3');
                        if (hdr) hdr.classList.add('row-header-animate');
                    } catch (e) {}
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.01, rootMargin: '300px' });

        observer.observe(rowWrapper);
        return rowWrapper;
    }

    // --- Parallax Hero ---
    function initParallax() {
        const heroEl = document.getElementById('hero');
        if (!heroEl) return;

        let lastMove = 0;
        const limit = 16; // ms

        const onMove = (clientX, clientY) => {
            const now = Date.now();
            if (now - lastMove < limit) return;
            lastMove = now;
            const rect = heroEl.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const px = (clientX - cx) / rect.width; // -0.5..0.5
            const py = (clientY - cy) / rect.height;

            const rotateY = px * 8; // degrees
            const rotateX = -py * 6;
            const translateBgX = -px * 18; // pixels
            const translateBgY = -py * 10;

            if (heroContent) heroContent.style.transform = `translateZ(18px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate(${ -px * 8 }px, ${ -py * 6 }px)`;
            if (heroBg) heroBg.style.transform = `scale(1.08) translate(${translateBgX}px, ${translateBgY}px)`;
        };

        const onLeave = () => {
            if (heroContent) heroContent.style.transform = '';
            if (heroBg) heroBg.style.transform = 'scale(1.06)';
        };

        heroEl.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
        heroEl.addEventListener('mouseleave', onLeave);
        heroEl.addEventListener('touchmove', (e) => { if (e.touches && e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
        heroEl.addEventListener('touchend', onLeave);
    }

    // --- Particle background for hero ---
    function initParticles() {
        const canvas = document.getElementById('hero-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let w = canvas.width = canvas.offsetWidth;
        let h = canvas.height = canvas.offsetHeight;
        const particles = [];

        function rand(min, max) { return Math.random() * (max - min) + min; }

        for (let i = 0; i < Math.max(18, Math.floor(w / 60)); i++) {
            particles.push({ x: rand(0, w), y: rand(0, h), r: rand(1, 3), vx: rand(-0.2, 0.6), vy: rand(-0.05, 0.05), alpha: rand(0.08, 0.28) });
        }

        function resize() { w = canvas.width = canvas.offsetWidth; h = canvas.height = canvas.offsetHeight; }
        window.addEventListener('resize', resize);

        function step() {
            ctx.clearRect(0, 0, w, h);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x > w + 20) p.x = -20;
                if (p.x < -20) p.x = w + 20;
                if (p.y > h + 20) p.y = -20;
                if (p.y < -20) p.y = h + 20;
                ctx.beginPath();
                ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            });
            requestAnimationFrame(step);
        }

        step();
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

        if (currentTab === 'tv') {
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
        } else if (currentTab === 'anime') {
            // build anime list from fetched tv/movie pools
            const animePool = [];
            ['tv','popular','binge','movies'].forEach(k => {
                (libraryData[k] || []).forEach(it => { if (it && it.isAnime) animePool.push(it); });
            });
            categories = {
                "Trending Anime": animePool,
                "Action Anime": animePool.filter(a => a.title && a.title.toLowerCase().includes('action')).slice(0, 20),
                "Must-Watch Anime": animePool.slice().sort(() => Math.random() - 0.5)
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
                "Korean Drama Trends": libraryData.kdrama
            };
        }

        Object.entries(categories).forEach(([name, items]) => {
            if (items.length > 0) {
                const row = createRow(name, items, name.includes("Trending") || name.includes("Popular"));
                if (row && contentRows) contentRows.appendChild(row);
            }
        });

        // Mobile: collapse extra rows by default and add an expand toggle
        if (window.innerWidth <= 768) {
            // Ensure collapsed state by default
            contentRows.classList.remove('expanded');

            if (!document.getElementById('mobile-expand-btn')) {
                const expandBtn = document.createElement('button');
                expandBtn.id = 'mobile-expand-btn';
                expandBtn.className = 'bg-netflix-red text-white px-6 py-2 rounded-full font-black shadow-lg';
                expandBtn.textContent = 'Show More';
                expandBtn.onclick = () => {
                    const expanded = contentRows.classList.toggle('expanded');
                    expandBtn.textContent = expanded ? 'Show Less' : 'Show More';
                    // Smooth scroll to keep context
                    if (!expanded) window.scrollTo({ top: 0, behavior: 'smooth' });
                };
                contentRows.appendChild(expandBtn);
            }
        } else {
            // Remove mobile expand button on larger screens
            const existing = document.getElementById('mobile-expand-btn');
            if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
            contentRows.classList.add('expanded');
        }
    }

    function renderGrid(title, items) {
        if (!contentRows) return;
        if (heroSection) heroSection.style.display = 'none';
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
                    fetchTMDB(`${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=${page + 1}`),
                    fetchTMDB(`${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}page=${page + 2}`)
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

        const backBtn = document.getElementById('back-to-browse');
        if (backBtn) backBtn.onclick = () => {
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


        if (items.length === 0) {
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

        // Initialize hero particles and parallax
        initParticles();
        initParallax();

        if (!TMDB_API_KEY) {
            showApiKeyModal();
        }

        // Safety Timeout: Force hide the loader or show delay message if hung
        setTimeout(() => {
            if (appLoader) {
                appLoader.classList.add('hidden');
            }
            // If we're still on the logo, show some feedback unconditionally after timeout
            if (heroTitle && heroTitle.textContent === 'LOADING CONTENT') {
                heroTitle.textContent = 'LIBRARY CONNECTION DELAY';
                if (heroDesc) heroDesc.textContent = 'We are having trouble connecting to the title database. Try loading the catalog again.';
                if (heroSetup) heroSetup.classList.remove('hidden');
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

        if (playerTrailerBtn) {
            playerTrailerBtn.onclick = () => {
                if (currentPlayingItem) {
                    playTrailerFallback(currentPlayingItem);
                }
            };
        }

        if (homeBtn) homeBtn.onclick = goHome;
        if (document.getElementById('kdrama-nav-btn')) document.getElementById('kdrama-nav-btn').onclick = goKDrama;
        if (document.getElementById('tv-nav-btn')) document.getElementById('tv-nav-btn').onclick = goTV;
        if (document.getElementById('anime-nav-btn')) document.getElementById('anime-nav-btn').onclick = goAnime;
        if (document.getElementById('movies-nav-btn')) document.getElementById('movies-nav-btn').onclick = goMovies;
        if (document.getElementById('popular-nav-btn')) document.getElementById('popular-nav-btn').onclick = goPopular;
        if (document.getElementById('mylist-nav-btn')) document.getElementById('mylist-nav-btn').onclick = goMyList;

        if (heroSetup) heroSetup.onclick = () => {
            heroSetup.classList.add('hidden');
            if (heroTitle) heroTitle.textContent = 'LOADING CONTENT';
            if (heroDesc) heroDesc.textContent = 'Preparing your library. Please wait while we sync fresh picks from the global database...';
            loadData();
        };
        if (document.getElementById('nav-logo')) document.getElementById('nav-logo').onclick = goHome;
        if (closeModalBtn) closeModalBtn.onclick = closeModal;
        if (exitPlayerBtn) exitPlayerBtn.onclick = exitPlayer;

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const value = e.target.value;
                clearTimeout(searchDebounce);

                if (value.length > 0) {
                    if (heroSection) heroSection.style.display = 'none';
                    if (contentRows) {
                        contentRows.classList.remove('-mt-20');
                        contentRows.classList.add('mt-24');
                    }
                    searchDebounce = setTimeout(() => handleSearch(value), 500);
                } else {
                    if (heroSection) heroSection.style.display = 'flex';
                    if (contentRows) {
                        contentRows.classList.add('-mt-20');
                        contentRows.classList.remove('mt-24');
                    }
                    renderLibrary();
                }
            });
        }

        window.addEventListener('scroll', () => {
            if (!mainNav) return;
            if (window.scrollY > 50) {
                mainNav.classList.add('bg-netflix-black', 'shadow-2xl', 'py-2');
                mainNav.classList.remove('bg-transparent', 'py-4');
            } else {
                mainNav.classList.remove('bg-netflix-black', 'shadow-2xl', 'py-2');
                mainNav.classList.add('bg-transparent', 'py-4');
            }
        });

        if (detailModal) {
            detailModal.addEventListener('click', (e) => {
                if (e.target === detailModal || (e.target && e.target.classList && e.target.classList.contains('modal-blur'))) closeModal();
            });
        }

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
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 100);
    }

})();