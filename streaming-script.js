/* streaming-script.js - guarded DOM access and small robustness fixes */
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

    // ─── ANIME STREAMING SOURCES ────────────────────────────────────────────────
    // Priority: VidSrc-family embeds only — no local backends required.
    // NOTE: VidLink.pro and public Consumet APIs require a local server (localhost:8080)
    // and are therefore excluded. VidSrc.cc / vidsrc.icu work as pure iframes.

    // SUB SOURCES — Pure iframe embeds (AniKai style)
    const ANIME_SUB_SOURCES = [
        // 1. VidSrc.to (AniList ID) — Exact AniKai style mapping
        {
            name: 'VidSrc.to Sub',
            needsAnimeIds: true,
            build: async ({ anilistId, animeEpisode }) => anilistId ? `https://vidsrc.to/embed/anime/${anilistId}/${animeEpisode}` : null
        },
        // 2. VidSrc.to (TMDB Fallback)
        {
            name: 'VidSrc.to TV',
            build: ({ tmdbId, season, episode }) => tmdbId ? `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}` : null
        },
        // 2. VidSrc.me — Extremely stable fallback
        {
            name: 'VidSrc.me Sub',
            build: ({ tmdbId, season, episode }) => tmdbId ? `https://vidsrc.me/embed/tv/${tmdbId}/${season}/${episode}` : null
        },
        // 3. Vidsrc.cc (AniList ID) — Only as a backup
        {
            name: 'VidSrc.cc Sub',
            needsAnimeIds: true,
            build: async ({ anilistId, animeEpisode }) => anilistId ? `https://vidsrc.cc/v2/embed/anime/${anilistId}/${animeEpisode}/sub` : null
        },
        // 4. MultiEmbed
        {
            name: 'MultiEmbed Sub',
            build: ({ tmdbId, season, episode }) => tmdbId ? `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}` : null
        }
    ];

    // DUB SOURCES — Pure iframe embeds
    const ANIME_DUB_SOURCES = [
        // 1. VidSrc.to Dub (AniList ID)
        {
            name: 'VidSrc.to Dub',
            needsAnimeIds: true,
            build: async ({ anilistId, animeEpisode }) => anilistId ? `https://vidsrc.to/embed/anime/${anilistId}/${animeEpisode}` : null
        },
        // 2. VidSrc.to Dub (TMDB Fallback)
        {
            name: 'VidSrc.to TV',
            build: ({ tmdbId, season, episode }) => tmdbId ? `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}` : null
        },
        // 2. VidSrc.me Dub
        {
            name: 'VidSrc.me Dub',
            build: ({ tmdbId, season, episode }) => tmdbId ? `https://vidsrc.me/embed/tv/${tmdbId}/${season}/${episode}` : null
        },
        // 3. VidSrc ICU (Reliable for Dubs)
        {
            name: 'VidSrc ICU Dub',
            needsAnimeIds: true,
            build: async ({ anilistId, animeEpisode }) => anilistId ? `https://vidsrc.icu/embed/anime/${anilistId}/${animeEpisode}/1` : null
        },
        // 4. Cinezo Dub
        {
            name: 'Cinezo Dub',
            needsAnimeIds: true,
            build: async ({ anilistId, animeEpisode }) => anilistId ? `https://player.cinezo.live/embed/anime/${anilistId}/${animeEpisode}?dub=true` : null
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
        let ids = { anilistId: null, malId: item.malId || null, imdbId: null, useSeasonEpisode: false };
        let idsResolved = false;

        for (let i = 0; i < sources.length; i++) {
            const sourceIndex = currentAnimeSourceIdx % sources.length;
            const source = sources[sourceIndex];

            // Only fetch external IDs if this source actually needs them
            if (source.needsAnimeIds && !idsResolved) {
                ids = await fetchAnimeIds(item, episodeInfo.season);
                idsResolved = true;
            }

            const animeEpisode = ids.useSeasonEpisode ? episodeInfo.episode : episodeInfo.absoluteEpisode;

            let url = null;
            try {
                url = await source.build({
                    tmdbId: item.tmdb_id,
                    malId: ids.malId,
                    anilistId: ids.anilistId,
                    imdbId: ids.imdbId,
                    title: item.title || item.originalTitle || '',
                    animeEpisode,
                    season: episodeInfo.season,
                    episode: episodeInfo.episode,
                    absoluteEpisode: episodeInfo.absoluteEpisode
                });
            } catch (e) {
                console.warn(`Anime source [${source.name}] threw:`, e);
            }

            if (url) {
                console.log(`✅ Anime source: [${source.name}] → ${url}`);
                return url;
            }

            console.log(`⚠️ Anime source [${source.name}] returned null, trying next...`);
            currentAnimeSourceIdx = (currentAnimeSourceIdx + 1) % sources.length;
        }

        // NUCLEAR OPTION: If all anime sources fail, use the standard TV fallback
        // This uses the same logic as regular movies/TV which we know works.
        const tvFallback = `https://vidsrc.to/embed/tv/${item.tmdb_id}/${episodeInfo.season}/${episodeInfo.episode}`;
        console.log(`🚀 All anime sources failed. Using TV Fallback: ${tvFallback}`);
        return tvFallback;
    }

    function getAnimeSourceLabel() {
        return animeDubMode ? 'Dub' : 'Sub';
    }

    function updateAnimeToggleButtons() {
        if (!btnSub || !btnDub) return;
        // Sub button — always labelled 'Sub'
        btnSub.textContent = 'Sub';
        btnDub.textContent = 'Dub';

        // Active = white pill, inactive = dark pill
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
        const visible = mode === 'preview' || mode === 'stream' || mode === 'anime';
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
        // Source badge — anime only
        if (playerSourceBadge) {
            playerSourceBadge.classList.toggle('hidden', mode !== 'anime');
            playerSourceBadge.classList.toggle('flex', mode === 'anime');
        }
        if (btnSub) btnSub.classList.toggle('hidden', mode !== 'anime');
        if (btnDub) btnDub.classList.toggle('hidden', mode !== 'anime');
        if (btnNextSource) {
            btnNextSource.classList.toggle('hidden', mode !== 'anime');
            btnNextSource.classList.toggle('flex', mode === 'anime');
        }
        if (playerTrailerBtn) {
            playerTrailerBtn.classList.toggle('hidden', mode !== 'stream' && mode !== 'anime');
            playerTrailerBtn.classList.toggle('flex', mode === 'stream' || mode === 'anime');
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
            if (currentPlayingItem && currentPlayingItem.isAnime) {
                const sources = animeDubMode ? ANIME_DUB_SOURCES : ANIME_SUB_SOURCES;
                const src = sources[currentAnimeSourceIdx % sources.length];
                loaderText.textContent = src ? `Connecting to ${src.name}...` : 'Optimizing Stream...';
            } else {
                loaderText.textContent = 'Optimizing Stream...';
            }
        }

        if (!playerIframe) {
            // No iframe present — just hide loader after timeout to avoid blocking UI
            setTimeout(() => {
                if (playbackToken === currentPlaybackToken) hidePlayerLoader();
            }, loaderTimeout);
            return;
        }

        playerIframe.onerror = null;
        playerIframe.onload = () => {
            if (playbackToken === currentPlaybackToken) hidePlayerLoader();
        };
        try {
            playerIframe.src = url;
        } catch (e) {
            console.warn('Failed to set iframe src', e);
            setTimeout(() => {
                if (playbackToken === currentPlaybackToken) hidePlayerLoader();
            }, loaderTimeout);
        }

        setTimeout(() => {
            if (playbackToken === currentPlaybackToken) hidePlayerLoader();
        }, loaderTimeout);
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
        const isAnime = item && item.isAnime;
        // For anime: wait 12 s then auto-try the next source.
        // For movies/TV: wait 9 s then show a help toast.
        const delay = isAnime ? 12000 : 9000;

        playerHelpTimer = setTimeout(async () => {
            if (token !== currentPlaybackToken || !videoOverlay || videoOverlay.classList.contains('pointer-events-none')) return;

            if (isAnime) {
                // Auto-advance to next source
                const sources = animeDubMode ? ANIME_DUB_SOURCES : ANIME_SUB_SOURCES;
                const nextIdx = (currentAnimeSourceIdx + 1) % sources.length;
                currentAnimeSourceIdx = nextIdx;
                const nextName = sources[nextIdx]?.name || 'next source';
                if (playerSourceName) playerSourceName.textContent = `Trying ${nextName}...`;
                showToast(`Source timed out — switching to ${nextName}`, false);

                const position = getCurrentPlaybackPosition();
                // Re-play only if still watching the same thing
                if (token === currentPlaybackToken) {
                    playMedia(currentPlayingItem, position.season, position.episode);
                }
            } else {
                hidePlayerLoader();
                if (playerTitleOverlay) playerTitleOverlay.classList.remove('opacity-0');
                showToast('Stream is loading slowly. Try a different server below.', false);
            }
        }, delay);
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
            'anime': animeNavBtn,
            'tv': document.getElementById('tv-nav-btn'),
            'kdrama': document.getElementById('kdrama-nav-btn'),
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
                }, 1500);
            }
        };
        heroInterval = setInterval(rotate, 8000);
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
        if (modalGenre) modalGenre.textContent = item.genres?.length ? item.genres.join(', ') : (item.isMovie ? 'Film' : (item.isAnime ? 'Anime' : 'Series'));

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

        if (item.isAnime) {
            setPlayerControlsMode('anime');
            updateAnimeToggleButtons();

            const seasons = await ensureSeasonData(item);
            if (playbackToken !== currentPlaybackToken) return;

            const firstSeason = seasons[0]?.season_number || 1;
            const selectedSeason = Number(season) || firstSeason;
            const selectedEpisode = Number(episode) || 1;
            populatePlayerSelectors(selectedSeason, selectedEpisode);

            let animeUrl = null;
            try {
                animeUrl = await getAnimeSourceUrl(item, selectedSeason, selectedEpisode);
            } catch (error) {
                console.warn('Anime source failed:', error);
            }
            if (playbackToken !== currentPlaybackToken) return;

            if (animeUrl) {
                // Show active source in the badge
                const sources = animeDubMode ? ANIME_DUB_SOURCES : ANIME_SUB_SOURCES;
                const activeSrc = sources[currentAnimeSourceIdx % sources.length];
                if (playerSourceName) playerSourceName.textContent = activeSrc?.name || 'Streaming';

                setPlayerFrameUrl(animeUrl, playbackToken);
                if (playerTitle) playerTitle.textContent = `${item.title} - S${selectedSeason} E${selectedEpisode} - ${animeDubMode ? 'Dub' : 'Sub'}`;
                schedulePlayerHelp(item, playbackToken);
            } else {
                const fallbackUrl = buildPreviewFallbackFrame(item);
                setPlayerFrameUrl(fallbackUrl, playbackToken, 1800);
                if (playerTitle) playerTitle.textContent = `${item.title} - Anime source unavailable`;
                showToast('Anime source unavailable for this episode.', false);
            }

            setTimeout(() => {
                if (playbackToken === currentPlaybackToken && playerTitleOverlay) playerTitleOverlay.classList.add('opacity-0');
            }, 5000);
            return;
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

        const streamUrl = item.tmdb_id ? getServerUrl(item, season, episode) : null;
        if (streamUrl) {
            setPlayerFrameUrl(streamUrl, playbackToken);
            if (playerTitle) {
                if (item.isMovie) {
                    playerTitle.textContent = `${item.title} - Playing`;
                } else {
                    playerTitle.textContent = `${item.title} - S${season} E${episode}`;
                }
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
                            fragment.appendChild(createMovieCard(item, isTrending && idx < 5));
                        });
                        scrollContainer.appendChild(fragment);
                    }
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.01, rootMargin: '300px' });

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
            if (items.length > 0) {
                const row = createRow(name, items, name.includes("Trending") || name.includes("Popular"));
                if (row && contentRows) contentRows.appendChild(row);
            }
        });
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

        if (currentTab === 'anime' || items.length === 0) {
            const animeMatches = await fetchJikanAnimeList('/anime', { q: query, order_by: 'popularity', sort: 'asc' });
            items = currentTab === 'anime' ? mergeAnimeLists(animeMatches, items.filter(item => item.isAnime)) : mergeAnimeLists(items, animeMatches);
        }

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
        if (animeNavBtn) animeNavBtn.onclick = goAnime;
        if (document.getElementById('kdrama-nav-btn')) document.getElementById('kdrama-nav-btn').onclick = goKDrama;
        if (document.getElementById('tv-nav-btn')) document.getElementById('tv-nav-btn').onclick = goTV;
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