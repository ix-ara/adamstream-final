let TMDB_API_KEY = localStorage.getItem('tmdb_api_key') || '1a514146c79d17c349b6f20ca517de79';

(() => {
    // ─── Initialization Guard ─────────────────────────────────────────────────
    let isInitialized = false;
    const appLoader = document.getElementById('app-loader');

    // ─── DOM References ───────────────────────────────────────────────────────
    const contentRows        = document.getElementById('content-rows');
    const searchInput        = document.getElementById('search-input');
    const mainNav            = document.getElementById('main-nav');
    const heroSection        = document.getElementById('hero');
    const heroBg             = document.getElementById('hero-bg');
    const heroTitle          = document.getElementById('hero-title');
    const heroDesc           = document.getElementById('hero-desc');
    const heroPlay           = document.getElementById('hero-play');
    const heroInfo           = document.getElementById('hero-info');
    const heroSetup          = document.getElementById('hero-setup');

    // Modal
    const detailModal          = document.getElementById('detail-modal');
    const closeModalBtn        = document.getElementById('close-modal');
    const modalPlayBtn         = document.getElementById('modal-play-btn');
    const modalPlayText        = document.getElementById('modal-play-text');
    const modalAddListBtn      = document.getElementById('modal-add-list-btn');
    const modalImage           = document.getElementById('modal-image');
    const modalTitle           = document.getElementById('modal-title');
    const modalDesc            = document.getElementById('modal-desc');
    const modalYear            = document.getElementById('modal-year');
    const modalRating          = document.getElementById('modal-rating');
    const modalDuration        = document.getElementById('modal-duration');
    const modalCast            = document.getElementById('modal-cast');
    const modalGenre           = document.getElementById('modal-genre');
    const modalSeriesSection   = document.getElementById('modal-series-section');
    const modalSeasonsContainer= document.getElementById('modal-seasons-container');
    const animeSeasonsCarousel = document.getElementById('anime-seasons-carousel');
    const seasonSelect         = document.getElementById('season-select');
    const episodesList         = document.getElementById('episodes-list');

    // Player
    const videoOverlay          = document.getElementById('video-overlay');
    const playerTopbarTitle     = document.getElementById('player-topbar-title');
    const exitPlayerBtn         = document.getElementById('exit-player-btn');
    const closePlayerBtn        = document.getElementById('close-player-btn');
    const reloadStreamBtn       = document.getElementById('reload-stream-btn');
    const playerLoader          = document.getElementById('player-loader');
    const playerLoaderText      = document.getElementById('player-loader-text');
    const playerSidebar         = document.getElementById('player-sidebar');
    const playerSeasonSelect    = document.getElementById('player-season-select');
    const playerEpisodeList     = document.getElementById('player-episode-list');
    const playerContainer       = document.getElementById('player-container');
    const playerVideo           = document.getElementById('player-video');
    const playerIframe          = document.getElementById('streaming-player');
    const watchingEpisodeLabel  = document.getElementById('watching-episode-label');
    const btnSub                = document.getElementById('btn-sub');
    const btnDub                = document.getElementById('btn-dub');
    const serverButtonsContainer= document.getElementById('server-buttons-container');

    // Nav & Setup
    const homeBtn      = document.getElementById('home-btn');
    const apiKeyModal  = document.getElementById('api-key-modal');
    const apiKeyInput  = document.getElementById('tmdb-api-input');
    const saveApiBtn   = document.getElementById('save-api-btn');

    // ─── State ────────────────────────────────────────────────────────────────
    let libraryData = {
        movies: [], kdrama: [], tv: [], anime: [],
        popular: [], binge: [],
        actionMovies: [], horrorMovies: [], romanceMovies: [], scifi: [], comedy: [],
        actionTV: [], horrorTV: [], romanceTV: [], crimeTv: [],
        actionKDrama: [], horrorKDrama: [], romanceKDrama: [],
        action: [], horror: [],
        myList: JSON.parse(localStorage.getItem('adamstream_mylist')) || []
    };

    let currentTab          = 'home';
    let currentHeroIndex    = 0;
    let heroInterval        = null;
    let searchDebounce      = null;
    let featuredPool        = [];

    // Playback State
    let currentPlayingItem    = null;
    let currentPlayingSeason  = 1;
    let currentPlayingEpisode = 1;
    let animeDubMode          = false;
    let currentTvSeasons      = [];
    let currentSeasonsItemId  = null;
    let currentServer         = 'vidsrc_cc';
    let streamFailoverTimer   = null;
    let serverKeys            = [];
    let loadToken             = 0; // incremented on each loadStream call to discard stale callbacks

    // ─── TMDB Config ──────────────────────────────────────────────────────────
    const BASE_URL     = 'https://api.themoviedb.org/3';
    const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';
    const IMG_BG_BASE  = 'https://image.tmdb.org/t/p/w1280';

    // ─── Server Pool ─────────────────────────────────────────────────────────
    // Priority-ordered: best servers first. Each must have movie() and tv().
    const SERVERS = {
        vidsrc_cc: {
            name:  'VidSrc Alpha',
            label: 'Server 1',
            movie: (id)       => `https://vidsrc.cc/v2/embed/movie/${id}`,
            tv:    (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
        },
        vidlink: {
            name:     'VidLink Pro',
            label:    'Server 2',
            movie:    (id)       => `https://vidlink.pro/movie/${id}`,
            tv:       (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
            animeDub: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?dub=true`,
        },
        vidsrc_pro: {
            name:  'VidSrc Pro',
            label: 'Server 3',
            movie: (id)       => `https://vidsrc.pro/embed/movie/${id}`,
            tv:    (id, s, e) => `https://vidsrc.pro/embed/tv/${id}/${s}/${e}`,
        },
        autoembed: {
            name:  'AutoEmbed',
            label: 'Server 4',
            movie: (id)       => `https://player.autoembed.cc/embed/movie/${id}`,
            tv:    (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`,
        },
        embedsu: {
            name:  'EmbedSu',
            label: 'Server 5',
            movie: (id)       => `https://embed.su/embed/movie/${id}`,
            tv:    (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
        },
        vidsrc_me: {
            name:  'VidSrc Beta',
            label: 'Server 6',
            movie: (id)       => `https://v2.vidsrc.me/embed/movie/${id}`,
            tv:    (id, s, e) => `https://v2.vidsrc.me/embed/tv/${id}/${s}/${e}`,
        }
    };
    serverKeys = Object.keys(SERVERS);

    // ─── TMDB Fetching ───────────────────────────────────────────────────────
    async function fetchTMDB(endpoint, timeoutMs = 8000) {
        if (!TMDB_API_KEY) return null;
        try {
            const url = new URL(`${BASE_URL}${endpoint}`);
            url.searchParams.append('api_key', TMDB_API_KEY);
            url.searchParams.append('language', 'en-US');

            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), timeoutMs);
            const res = await fetch(url.toString(), { signal: controller.signal });
            clearTimeout(tid);

            if (!res.ok) {
                if (res.status === 401) throw new Error('Invalid API Key');
                return null;
            }
            return await res.json();
        } catch (error) {
            if (error.message === 'Invalid API Key') showApiKeyModal(true);
            return null;
        }
    }

    async function fetchSearch(query) {
        if (!TMDB_API_KEY) return null;
        try {
            const url = new URL(`${BASE_URL}/search/multi`);
            url.searchParams.append('api_key', TMDB_API_KEY);
            url.searchParams.append('query', query);
            url.searchParams.append('language', 'en-US');
            const res = await fetch(url.toString());
            return await res.json();
        } catch (e) { return null; }
    }

    async function fetchTvDetails(tvId) {
        if (!TMDB_API_KEY || !tvId) return null;
        try {
            const res = await fetch(`${BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`);
            if (!res.ok) return null;
            return await res.json();
        } catch (e) { return null; }
    }

    async function fetchCredits(item) {
        if (!TMDB_API_KEY || !item?.tmdb_id) return [];
        try {
            const type = item.isMovie ? 'movie' : 'tv';
            const res  = await fetch(`${BASE_URL}/${type}/${item.tmdb_id}/credits?api_key=${TMDB_API_KEY}&language=en-US`);
            if (!res.ok) return [];
            const data = await res.json();
            return (data.cast || []).slice(0, 6).map(c => c.name);
        } catch (e) { return []; }
    }

    async function ensureSeasonData(item) {
        if (!item || item.isMovie) return [];
        const cacheId = item.tmdb_id || item.id;
        if (currentSeasonsItemId === cacheId && currentTvSeasons.length > 0) return currentTvSeasons;

        const details = item.tmdb_id ? await fetchTvDetails(item.tmdb_id) : null;
        let seasons = (details?.seasons || []).filter(s => s.season_number > 0);

        if (seasons.length === 0) {
            seasons = [{ season_number: 1, name: 'Season 1', episode_count: 12 }];
        }

        currentSeasonsItemId = cacheId;
        currentTvSeasons     = seasons;
        return seasons;
    }

    function formatItem(item, forceType = null) {
        if (!item) return null;
        const isMovie = forceType === 'movie' ||
            (forceType !== 'tv' && forceType !== 'anime' &&
                (item.media_type === 'movie' || (!item.first_air_date && item.title)));
        const isAnime = forceType === 'anime' ||
            (item.origin_country && Array.isArray(item.origin_country) &&
                item.origin_country.includes('JP') &&
                item.genre_ids && Array.isArray(item.genre_ids) &&
                item.genre_ids.includes(16));

        return {
            id:            item.id || Math.floor(Math.random() * 100000),
            tmdb_id:       item.id,
            isMovie,
            isAnime,
            title:         item.title || item.name || 'Untitled',
            originalTitle: item.original_title || item.original_name || '',
            overview:      item.overview || 'No description available for this title.',
            poster:        item.poster_path
                           ? `${IMG_BASE_URL}${item.poster_path}`
                           : (item.backdrop_path ? `${IMG_BASE_URL}${item.backdrop_path}` : 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?q=80&w=500'),
            backdrop:      item.backdrop_path
                           ? `${IMG_BG_BASE}${item.backdrop_path}`
                           : (item.poster_path ? `${IMG_BG_BASE}${item.poster_path}` : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2000'),
            rating:        item.vote_average ? item.vote_average.toFixed(1) : '8.5',
            year:          (item.release_date || item.first_air_date || '').substring(0, 4) || '2024',
            genres:        item.genres?.map(g => g.name) || []
        };
    }

    // ─── MODAL ───────────────────────────────────────────────────────────────
    async function openModal(item) {
        if (!item || !detailModal) return;

        if (modalImage)    modalImage.src = item.backdrop || item.poster;
        if (modalTitle)    modalTitle.textContent = item.title;
        if (modalDesc)     modalDesc.textContent = item.overview;
        if (modalYear)     modalYear.textContent = item.year;
        if (modalRating)   modalRating.textContent = item.rating;
        if (modalDuration) modalDuration.textContent =
            item.isMovie ? 'Movie' : (item.isAnime ? 'Anime Series' : 'TV Series');
        if (modalCast)  modalCast.textContent  = 'Loading cast...';
        if (modalGenre) modalGenre.textContent = item.genres?.length
            ? item.genres.join(', ')
            : (item.isMovie ? 'Film • Cinema' : (item.isAnime ? 'Anime • Animation' : 'TV Series'));

        // Series section — STRICTLY hidden for movies
        if (modalSeriesSection) {
            if (item.isMovie) {
                modalSeriesSection.classList.add('hidden');
            } else {
                modalSeriesSection.classList.remove('hidden');
            }
        }
        if (modalSeasonsContainer) modalSeasonsContainer.classList.add('hidden');
        if (animeSeasonsCarousel)  animeSeasonsCarousel.innerHTML = '';
        if (seasonSelect)          seasonSelect.innerHTML = '';
        if (episodesList)          episodesList.innerHTML = '';

        // Async cast fetch
        fetchCredits(item).then(castList => {
            if (modalCast) modalCast.textContent = castList.length ? castList.join(', ') : 'Featured Ensemble';
        });

        // Main action button
        if (modalPlayBtn) {
            if (item.isMovie) {
                if (modalPlayText) modalPlayText.textContent = 'Watch Movie';
                modalPlayBtn.onclick = () => { closeModal(); playMedia(item); };
            } else {
                if (modalPlayText) modalPlayText.textContent = 'Watch Episode 1';
                modalPlayBtn.onclick = () => { closeModal(); playMedia(item, 1, 1); };

                // Populate season + episode grid
                ensureSeasonData(item).then(seasons => {
                    if (!seasons?.length) return;

                    // Season dropdown
                    if (seasonSelect) {
                        seasonSelect.innerHTML = '';
                        seasons.forEach(s => {
                            const opt = document.createElement('option');
                            opt.value       = String(s.season_number);
                            opt.textContent = `Season ${s.season_number}`;
                            seasonSelect.appendChild(opt);
                        });
                    }

                    // Multi-season pill carousel
                    if (seasons.length > 1 && animeSeasonsCarousel && modalSeasonsContainer) {
                        modalSeasonsContainer.classList.remove('hidden');
                        animeSeasonsCarousel.innerHTML = seasons.map(s => `
                            <button type="button" class="season-pill-btn shrink-0 text-xs font-bold px-4 py-1.5 rounded-full border ${s.season_number === 1 ? 'bg-netflix-red text-white border-netflix-red' : 'bg-zinc-800 text-zinc-300 border-white/10 hover:text-white'}" data-season="${s.season_number}">
                                Season ${s.season_number}
                            </button>
                        `).join('');

                        animeSeasonsCarousel.querySelectorAll('.season-pill-btn').forEach(btn => {
                            btn.onclick = () => {
                                const sNum = Number(btn.dataset.season || 1);
                                if (seasonSelect) seasonSelect.value = String(sNum);
                                animeSeasonsCarousel.querySelectorAll('.season-pill-btn').forEach(b => {
                                    const active = Number(b.dataset.season) === sNum;
                                    b.className = `season-pill-btn shrink-0 text-xs font-bold px-4 py-1.5 rounded-full border ${active ? 'bg-netflix-red text-white border-netflix-red' : 'bg-zinc-800 text-zinc-300 border-white/10 hover:text-white'}`;
                                });
                                renderModalEpisodes(item, sNum);
                            };
                        });
                    }

                    renderModalEpisodes(item, 1);

                    if (seasonSelect) {
                        seasonSelect.onchange = e => {
                            const sNum = Number(e.target.value || 1);
                            if (animeSeasonsCarousel) {
                                animeSeasonsCarousel.querySelectorAll('.season-pill-btn').forEach(b => {
                                    const active = Number(b.dataset.season) === sNum;
                                    b.className = `season-pill-btn shrink-0 text-xs font-bold px-4 py-1.5 rounded-full border ${active ? 'bg-netflix-red text-white border-netflix-red' : 'bg-zinc-800 text-zinc-300 border-white/10 hover:text-white'}`;
                                });
                            }
                            renderModalEpisodes(item, sNum);
                        };
                    }
                });
            }
        }

        // My List toggle
        if (modalAddListBtn) {
            const isInList = libraryData.myList.some(i => i.tmdb_id === item.tmdb_id);
            modalAddListBtn.innerHTML = `<span class="material-symbols-outlined">${isInList ? 'check' : 'add'}</span>`;
            modalAddListBtn.className = `w-12 h-12 rounded-full flex items-center justify-center transition-colors border ${isInList ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/30 hover:bg-white/20'}`;

            modalAddListBtn.onclick = () => {
                const index = libraryData.myList.findIndex(i => i.tmdb_id === item.tmdb_id);
                if (index === -1) libraryData.myList.unshift(item);
                else libraryData.myList.splice(index, 1);
                localStorage.setItem('adamstream_mylist', JSON.stringify(libraryData.myList));

                const nowIn = libraryData.myList.some(i => i.tmdb_id === item.tmdb_id);
                modalAddListBtn.innerHTML = `<span class="material-symbols-outlined">${nowIn ? 'check' : 'add'}</span>`;
                modalAddListBtn.className = `w-12 h-12 rounded-full flex items-center justify-center transition-colors border ${nowIn ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/30 hover:bg-white/20'}`;

                if (currentTab === 'mylist') updateTabState('mylist');
                else if (currentTab === 'home') renderLibrary();
            };
        }

        detailModal.classList.remove('opacity-0', 'pointer-events-none');
        const mc = detailModal.querySelector('#modal-content');
        if (mc) { mc.classList.remove('scale-95'); mc.classList.add('scale-100'); }
        document.body.style.overflow = 'hidden';
    }

    function renderModalEpisodes(item, seasonNumber = 1) {
        if (!episodesList) return;
        const season = currentTvSeasons.find(s => s.season_number === seasonNumber) || currentTvSeasons[0];
        const count  = season?.episode_count || 12;

        episodesList.innerHTML = '';
        for (let ep = 1; ep <= count; ep++) {
            const btn   = document.createElement('button');
            btn.type    = 'button';
            btn.className = 'flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/15 transition-colors text-left group';
            btn.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="text-xs font-black text-netflix-red">E${ep}</span>
                    <span class="text-xs font-bold text-zinc-200 group-hover:text-white">Episode ${ep}</span>
                </div>
                <span class="material-symbols-outlined text-sm text-zinc-400 group-hover:text-white">play_arrow</span>
            `;
            btn.onclick = () => { closeModal(); playMedia(item, seasonNumber, ep); };
            episodesList.appendChild(btn);
        }
    }

    function closeModal() {
        if (!detailModal) return;
        detailModal.classList.add('opacity-0', 'pointer-events-none');
        const mc = detailModal.querySelector('#modal-content');
        if (mc) { mc.classList.remove('scale-100'); mc.classList.add('scale-95'); }
        document.body.style.overflow = '';
    }

    // ─── VIDEO PLAYER & STREAM ENGINE ────────────────────────────────────────

    function showPlayerLoader(text = 'Connecting to AdamStream Server...') {
        if (!playerLoader) return;
        if (playerLoaderText) playerLoaderText.textContent = text;
        playerLoader.classList.remove('opacity-0', 'pointer-events-none');
    }

    function hidePlayerLoader() {
        if (!playerLoader) return;
        playerLoader.classList.add('opacity-0', 'pointer-events-none');
    }

    // Auto-failover: if iframe doesn't fire a load event within 7s, try the next server.
    function startFailoverTimer() {
        clearTimeout(streamFailoverTimer);
        streamFailoverTimer = setTimeout(() => {
            const currentIdx = serverKeys.indexOf(currentServer);
            if (currentIdx < serverKeys.length - 1) {
                // Try next server automatically
                currentServer = serverKeys[currentIdx + 1];
                buildServerButtons();
                showPlayerLoader(`Server ${currentIdx + 1} failed — switching to ${SERVERS[currentServer].label}...`);
                loadStream(currentPlayingItem, currentPlayingSeason, currentPlayingEpisode, currentServer);
            } else {
                // All servers tried — show manual switch prompt
                hidePlayerLoader();
                showStreamError();
            }
        }, 7000);
    }

    function showStreamError() {
        if (!playerContainer) return;

        // Show error UI inside the player container (not floating over it)
        const errDiv = document.createElement('div');
        errDiv.id        = 'stream-error-panel';
        errDiv.className = 'absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/95 backdrop-blur-sm text-center p-6';
        errDiv.innerHTML = `
            <span class="material-symbols-outlined text-5xl text-zinc-500">videocam_off</span>
            <h3 class="text-lg font-black text-white">Stream Unavailable</h3>
            <p class="text-sm text-zinc-400 max-w-xs">All servers were tried. Try switching manually or reloading.</p>
            <div class="flex gap-3 flex-wrap justify-center">
                <button id="err-reload-btn" class="bg-netflix-red hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full text-sm transition-colors flex items-center gap-2">
                    <span class="material-symbols-outlined text-base">refresh</span> Retry
                </button>
            </div>
            <div class="flex gap-2 flex-wrap justify-center mt-2">
                ${serverKeys.map(k => `<button class="err-server-btn text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-full border border-white/10 transition-colors" data-server="${k}">${SERVERS[k].label}</button>`).join('')}
            </div>
        `;
        // Remove existing error panels
        const existing = playerContainer.querySelector('#stream-error-panel');
        if (existing) existing.remove();
        playerContainer.appendChild(errDiv);

        errDiv.querySelector('#err-reload-btn').onclick = () => {
            errDiv.remove();
            loadStream(currentPlayingItem, currentPlayingSeason, currentPlayingEpisode, currentServer);
        };
        errDiv.querySelectorAll('.err-server-btn').forEach(btn => {
            btn.onclick = () => {
                currentServer = btn.dataset.server;
                buildServerButtons();
                errDiv.remove();
                loadStream(currentPlayingItem, currentPlayingSeason, currentPlayingEpisode, currentServer);
            };
        });
    }

    function buildServerButtons() {
        if (!serverButtonsContainer) return;
        serverButtonsContainer.innerHTML = '';
        serverKeys.forEach(key => {
            const server = SERVERS[key];
            const btn    = document.createElement('button');
            btn.type     = 'button';
            btn.className = `server-btn ${key === currentServer ? 'active' : 'bg-zinc-800/90 text-zinc-300 hover:text-white'}`;
            btn.dataset.server = key;
            btn.textContent    = server.label;
            btn.title          = server.name;
            btn.onclick = () => {
                currentServer = key;
                buildServerButtons();
                if (currentPlayingItem) {
                    // Remove error panel if visible
                    const ep = playerContainer?.querySelector('#stream-error-panel');
                    if (ep) ep.remove();
                    loadStream(currentPlayingItem, currentPlayingSeason, currentPlayingEpisode, currentServer);
                }
            };
            serverButtonsContainer.appendChild(btn);
        });
    }

    function loadStream(item, season, episode, serverKey = currentServer) {
        if (!item) return;

        // Always re-query the iframe from DOM — never rely on the stale const reference
        // (the const captured at init time is still valid since we no longer clone/replace it)
        const iframe = document.getElementById('streaming-player');
        if (!iframe) return;

        clearTimeout(streamFailoverTimer);

        // Mint a new load token — stale onload/onerror callbacks will self-discard
        const myToken = ++loadToken;

        // Remove any lingering error panel
        const errPanel = playerContainer?.querySelector('#stream-error-panel');
        if (errPanel) errPanel.remove();

        const server = SERVERS[serverKey] || SERVERS.vidsrc_cc;
        const id     = item.tmdb_id || item.id;

        let streamUrl = '';
        if (item.isMovie) {
            streamUrl = server.movie(id);
        } else {
            if (item.isAnime && animeDubMode && server.animeDub) {
                streamUrl = server.animeDub(id, season || 1, episode || 1);
            } else {
                streamUrl = server.tv(id, season || 1, episode || 1);
            }
        }

        showPlayerLoader(`Connecting via ${server.name}...`);

        // Hide HTML5 video, show iframe
        if (playerVideo) {
            playerVideo.pause();
            playerVideo.classList.add('hidden');
        }
        iframe.style.display = '';

        // Assign onload / onerror using the token to discard stale callbacks
        iframe.onload = () => {
            if (loadToken !== myToken) return; // stale — a newer loadStream already ran
            clearTimeout(streamFailoverTimer);
            hidePlayerLoader();
        };
        iframe.onerror = () => {
            if (loadToken !== myToken) return;
            clearTimeout(streamFailoverTimer);
            startFailoverTimer();
        };

        // Blank the src first so browsers re-trigger load on the same URL
        iframe.src = 'about:blank';

        // Use requestAnimationFrame to let the browser process the blank src before
        // setting the real URL — avoids same-src no-op in some browsers
        requestAnimationFrame(() => {
            if (loadToken !== myToken) return;
            iframe.src = streamUrl;
        });

        // Safety net: if the load event never fires (cross-origin iframes often don't),
        // auto-failover after 7 seconds.
        startFailoverTimer();
    }

    async function playMedia(item, season = null, episode = null) {
        if (!item) return;

        currentPlayingItem    = item;
        currentPlayingSeason  = Number(season) || 1;
        currentPlayingEpisode = Number(episode) || 1;
        animeDubMode          = false; // reset dub mode on new title

        // Show watch overlay
        if (videoOverlay) videoOverlay.classList.remove('opacity-0', 'pointer-events-none');
        document.body.style.overflow = 'hidden';

        // Topbar title
        if (playerTopbarTitle) {
            playerTopbarTitle.textContent = item.isMovie
                ? `${item.title}${item.year ? ' (' + item.year + ')' : ''}`
                : `${item.title} • S${currentPlayingSeason} E${currentPlayingEpisode}`;
        }

        // ── MOVIE MODE ────────────────────────────────────────────────────────
        if (item.isMovie) {
            // Hide sidebar — strictly no episode list for movies
            if (playerSidebar) {
                playerSidebar.style.display = 'none';
            }
            // Hide SUB/DUB — movies don't use these
            if (btnSub) btnSub.style.display = 'none';
            if (btnDub) btnDub.style.display = 'none';

            if (watchingEpisodeLabel) watchingEpisodeLabel.textContent = `${item.title} (Feature Film)`;

        // ── ANIME / TV SERIES MODE ────────────────────────────────────────────
        } else {
            // Show sidebar
            if (playerSidebar) {
                playerSidebar.style.display = 'flex';
                playerSidebar.style.flexDirection = 'column';
            }

            // Anime: show SUB/DUB toggles. TV: hide them.
            if (item.isAnime) {
                setSubDubUI(false); // start in SUB mode
            } else {
                if (btnSub) btnSub.style.display = 'none';
                if (btnDub) btnDub.style.display = 'none';
            }

            if (watchingEpisodeLabel) {
                watchingEpisodeLabel.textContent = `${item.title} • Season ${currentPlayingSeason} Episode ${currentPlayingEpisode}`;
            }

            // Populate sidebar seasons + episodes
            ensureSeasonData(item).then(seasons => {
                if (!seasons?.length) return;

                if (playerSeasonSelect) {
                    playerSeasonSelect.innerHTML = '';
                    seasons.forEach(s => {
                        const opt = document.createElement('option');
                        opt.value       = String(s.season_number);
                        opt.textContent = `S${s.season_number}`;
                        if (s.season_number === currentPlayingSeason) opt.selected = true;
                        playerSeasonSelect.appendChild(opt);
                    });
                    playerSeasonSelect.onchange = e => {
                        currentPlayingSeason  = Number(e.target.value || 1);
                        currentPlayingEpisode = 1;
                        renderSidebarEpisodes(item, currentPlayingSeason, 1);
                        loadStream(item, currentPlayingSeason, 1);
                        updateWatchingLabel(item);
                    };
                }

                renderSidebarEpisodes(item, currentPlayingSeason, currentPlayingEpisode);
            });
        }

        // Build server buttons and start streaming
        buildServerButtons();
        loadStream(item, currentPlayingSeason, currentPlayingEpisode, currentServer);
    }

    // Helper: set SUB/DUB button visual state using inline style (avoids className collision)
    function setSubDubUI(dubActive) {
        animeDubMode = dubActive;

        if (btnSub) {
            btnSub.style.display    = 'flex';
            btnSub.style.alignItems = 'center';
            if (!dubActive) {
                btnSub.style.background = '#ffffff';
                btnSub.style.color      = '#000000';
                btnSub.style.border     = 'none';
            } else {
                btnSub.style.background = 'rgba(39,39,42,0.9)';
                btnSub.style.color      = '#a1a1aa';
                btnSub.style.border     = '1px solid rgba(255,255,255,0.1)';
            }
        }
        if (btnDub) {
            btnDub.style.display    = 'flex';
            btnDub.style.alignItems = 'center';
            if (dubActive) {
                btnDub.style.background = '#ffffff';
                btnDub.style.color      = '#000000';
                btnDub.style.border     = 'none';
            } else {
                btnDub.style.background = 'rgba(39,39,42,0.9)';
                btnDub.style.color      = '#a1a1aa';
                btnDub.style.border     = '1px solid rgba(255,255,255,0.1)';
            }
        }
    }

    function updateWatchingLabel(item) {
        if (!watchingEpisodeLabel) return;
        watchingEpisodeLabel.textContent = item.isMovie
            ? `${item.title} (Feature Film)`
            : `${item.title} • Season ${currentPlayingSeason} Episode ${currentPlayingEpisode}`;

        if (playerTopbarTitle) {
            playerTopbarTitle.textContent = item.isMovie
                ? `${item.title}${item.year ? ' (' + item.year + ')' : ''}`
                : `${item.title} • S${currentPlayingSeason} E${currentPlayingEpisode}`;
        }
    }

    function renderSidebarEpisodes(item, season, activeEpisode) {
        if (!playerEpisodeList) return;
        const seasonObj = currentTvSeasons.find(s => s.season_number === season) || currentTvSeasons[0];
        const count     = seasonObj?.episode_count || 12;

        playerEpisodeList.innerHTML = '';
        for (let ep = 1; ep <= count; ep++) {
            const isActive = ep === Number(activeEpisode);
            const btn      = document.createElement('button');
            btn.type       = 'button';
            btn.className  = `episode-btn w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold ${isActive ? 'active' : 'bg-white/5 text-zinc-300 border-white/5 hover:bg-white/10 hover:text-white'}`;
            btn.innerHTML  = `
                <span class="flex items-center gap-2">
                    <span class="text-[10px] ${isActive ? 'text-white' : 'text-zinc-500'} font-black">${String(ep).padStart(2, '0')}</span>
                    <span>Episode ${ep}</span>
                </span>
                <span class="material-symbols-outlined text-sm ${isActive ? 'text-white' : 'text-zinc-500'}">${isActive ? 'equalizer' : 'play_arrow'}</span>
            `;
            btn.onclick = () => {
                currentPlayingEpisode = ep;
                renderSidebarEpisodes(item, season, ep);
                loadStream(item, season, ep);
                updateWatchingLabel(item);
                if (playerTopbarTitle) {
                    playerTopbarTitle.textContent = `${item.title} • S${season} E${ep}`;
                }
            };
            playerEpisodeList.appendChild(btn);
            if (isActive) btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    function exitPlayer() {
        clearTimeout(streamFailoverTimer);

        if (videoOverlay) videoOverlay.classList.add('opacity-0', 'pointer-events-none');

        // Blank the iframe src to stop any ongoing video
        const liveIframe = document.getElementById('streaming-player');
        if (liveIframe) { liveIframe.src = 'about:blank'; }

        if (playerVideo) { playerVideo.pause(); playerVideo.classList.add('hidden'); }
        document.body.style.overflow = '';

        // Remove error panel if visible
        const ep = playerContainer?.querySelector('#stream-error-panel');
        if (ep) ep.remove();
    }

    // SUB / DUB button listeners
    if (btnSub) {
        btnSub.onclick = () => {
            if (!currentPlayingItem?.isAnime) return;
            setSubDubUI(false);
            loadStream(currentPlayingItem, currentPlayingSeason, currentPlayingEpisode);
        };
    }
    if (btnDub) {
        btnDub.onclick = () => {
            if (!currentPlayingItem?.isAnime) return;
            setSubDubUI(true);
            loadStream(currentPlayingItem, currentPlayingSeason, currentPlayingEpisode);
        };
    }

    if (exitPlayerBtn)   exitPlayerBtn.onclick = exitPlayer;
    if (closePlayerBtn)  closePlayerBtn.onclick = exitPlayer;
    if (reloadStreamBtn) {
        reloadStreamBtn.onclick = () => {
            if (currentPlayingItem) {
                const ep = playerContainer?.querySelector('#stream-error-panel');
                if (ep) ep.remove();
                loadStream(currentPlayingItem, currentPlayingSeason, currentPlayingEpisode, currentServer);
            }
        };
    }

    // ─── CARD & ROW RENDERING ────────────────────────────────────────────────
    function createMovieCard(item, isSpotlight = false) {
        const card    = document.createElement('button');
        card.type     = 'button';
        card.className = 'movie-card flex-shrink-0 w-32 md:w-48 aspect-[2/3] relative rounded-md overflow-hidden cursor-pointer transition-all duration-500 hover:z-30 group shadow-xl shadow-black text-left focus:outline-none focus:ring-2 focus:ring-netflix-red';

        card.innerHTML = `
            <img src="${item.poster}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="${item.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1616530940355-351fabd9524b?q=80&w=500'">
            ${isSpotlight ? `<div class="absolute top-2 left-2 bg-netflix-red text-white text-[8px] font-black py-1 px-2 uppercase tracking-[0.16em] shadow-lg z-10 rounded">Spotlight</div>` : ''}
            <div class="absolute inset-x-0 bottom-0 bg-[#1d1b17]/95 border-t border-white/10 backdrop-blur-md p-3">
                <div class="flex gap-2 mb-2">
                   <span class="bg-netflix-red text-white w-8 h-8 rounded-md flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105"><span class="material-symbols-outlined fill text-sm">play_arrow</span></span>
                   <span class="bg-white/10 text-white w-8 h-8 rounded-md flex items-center justify-center border border-white/15 hover:bg-white/15 shadow-2xl"><span class="material-symbols-outlined text-sm">add</span></span>
                </div>
                <h4 class="text-xs font-black truncate drop-shadow-2xl mb-1">${item.title}</h4>
                <div class="flex items-center gap-1 text-[9px] text-zinc-300 font-black tracking-tight">
                    <span class="text-[#6ee7b7] font-bold">${item.rating}</span>
                    <span class="border border-white/30 px-1 rounded-sm">${item.isMovie ? 'Film' : (item.isAnime ? 'Anime' : 'Series')}</span>
                    <span>${item.year}</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => openModal(item));
        return card;
    }

    function createRow(title, items, isTrending = false) {
        if (!items?.length) return null;

        const rowWrapper    = document.createElement('div');
        rowWrapper.className = 'px-4 md:px-12 row-animate mb-8';

        const titleWrapper = document.createElement('div');
        titleWrapper.className = 'flex items-center justify-between mb-2 pr-4';

        const rowTitle = document.createElement('h3');
        rowTitle.className = 'text-lg md:text-xl font-bold text-zinc-100 tracking-tight drop-shadow-md';
        rowTitle.textContent = title;

        const viewAllBtn = document.createElement('button');
        viewAllBtn.className = 'text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-colors flex items-center gap-1 group';
        viewAllBtn.innerHTML = 'View All <span class="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>';
        viewAllBtn.onclick   = () => renderGrid(title, items);

        titleWrapper.appendChild(rowTitle);
        titleWrapper.appendChild(viewAllBtn);

        const scrollContainer  = document.createElement('div');
        scrollContainer.className = 'flex gap-3 overflow-x-auto no-scrollbar pb-8 pt-2 scroll-smooth px-1';
        scrollContainer.style.minHeight = '320px';

        const leftBtn   = document.createElement('button');
        leftBtn.className = 'absolute left-0 top-[45%] -translate-y-1/2 z-40 bg-black/60 text-white p-2 rounded-r-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all hover:bg-black/90 hover:scale-110 hidden md:flex items-center justify-center border border-white/5';
        leftBtn.innerHTML = '<span class="material-symbols-outlined text-4xl">chevron_left</span>';

        const rightBtn  = document.createElement('button');
        rightBtn.className = 'absolute right-0 top-[45%] -translate-y-1/2 z-40 bg-black/60 text-white p-2 rounded-l-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all hover:bg-black/90 hover:scale-110 hidden md:flex items-center justify-center border border-white/5';
        rightBtn.innerHTML = '<span class="material-symbols-outlined text-4xl">chevron_right</span>';

        leftBtn.onclick  = e => { e.stopPropagation(); scrollContainer.scrollBy({ left: -window.innerWidth * 0.7, behavior: 'smooth' }); };
        rightBtn.onclick = e => { e.stopPropagation(); scrollContainer.scrollBy({ left: window.innerWidth * 0.7, behavior: 'smooth' }); };

        rowWrapper.appendChild(titleWrapper);
        rowWrapper.classList.add('relative', 'group');
        rowWrapper.appendChild(leftBtn);
        rowWrapper.appendChild(rightBtn);
        rowWrapper.appendChild(scrollContainer);

        const fragment = document.createDocumentFragment();
        items.forEach((item, idx) => fragment.appendChild(createMovieCard(item, isTrending && idx < 5)));
        scrollContainer.appendChild(fragment);
        rowWrapper.classList.add('visible');

        return rowWrapper;
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
            <div id="grid-container" class="px-4 md:px-12 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-5 pb-32 animate-slide-up"></div>
        `;

        const grid = document.getElementById('grid-container');
        items.forEach(item => {
            const card = createMovieCard(item, false);
            card.classList.remove('w-32', 'md:w-48', 'flex-shrink-0');
            card.classList.add('w-full');
            grid.appendChild(card);
        });

        const backBtn = document.getElementById('back-to-browse');
        if (backBtn) backBtn.onclick = () => updateTabState(currentTab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderLibrary() {
        if (!contentRows) return;
        contentRows.innerHTML = '';

        let categories = {};

        if (currentTab === 'tv') {
            categories = {
                'Trending TV Shows':            libraryData.tv,
                'Explosive Action TV':          libraryData.actionTV,
                'Spine-Tingling Mystery & Horror': libraryData.horrorTV,
                'Romantic TV Dramas':           libraryData.romanceTV,
                'Crime TV Thrillers':           libraryData.crimeTv,
                'Binge-Worthy Series':          libraryData.binge,
                'Korean Drama Craze':           libraryData.kdrama
            };
        } else if (currentTab === 'movies') {
            categories = {
                'Popular Movies':               libraryData.movies,
                'Adrenaline-Pumping Action':    libraryData.actionMovies,
                'Nightmare-Inducing Horror':    libraryData.horrorMovies,
                'Heart-Warming Romance':        libraryData.romanceMovies,
                'Sci-Fi & Fantasy':             libraryData.scifi,
                'Blockbuster Comedies':         libraryData.comedy,
                'Trending Movies This Week':    libraryData.popular
            };
        } else if (currentTab === 'popular') {
            categories = {
                'New & Trending':               libraryData.popular,
                'Hot on AdamStream':            libraryData.binge,
                'Top Action Flicks':            libraryData.actionMovies
            };
        } else if (currentTab === 'mylist') {
            if (libraryData.myList.length === 0) {
                contentRows.innerHTML = '<div class="px-12 py-32 text-zinc-600 text-center text-2xl font-black italic tracking-widest uppercase">Your list is a blank canvas. Start adding titles!</div>';
                return;
            }
            categories = { 'Your Personal Collection': libraryData.myList };
        } else if (currentTab === 'kdrama') {
            categories = {
                'Trending Korean Dramas':       libraryData.kdrama,
                'Action-Packed K-Dramas':       libraryData.actionKDrama,
                'Dark K-Drama Thrillers':       libraryData.horrorKDrama,
                'Romantic Korean Classics':     libraryData.romanceKDrama
            };
        } else if (currentTab === 'anime') {
            categories = {
                'Trending Anime':               libraryData.anime,
                'Top Action Anime':             [...libraryData.anime].reverse(),
                'Must-Watch Anime Series':      [...libraryData.anime].slice(0, 10)
            };
        } else {
            // Home
            if (libraryData.myList.length > 0) {
                categories['Continue Watching / My List'] = libraryData.myList;
            }
            categories = {
                ...categories,
                'Trending Movies':              libraryData.movies,
                'Trending Anime':               libraryData.anime,
                'New Action Hits':              libraryData.actionMovies,
                'Binge-Worthy TV Series':       libraryData.binge,
                'Korean Drama Trends':          libraryData.kdrama
            };
        }

        Object.entries(categories).forEach(([name, items]) => {
            if (items?.length > 0) {
                const row = createRow(name, items, name.includes('Trending') || name.includes('Popular'));
                if (row && contentRows) contentRows.appendChild(row);
            }
        });
    }

    // ─── HERO SECTION ────────────────────────────────────────────────────────
    function updateHeroUI(item) {
        if (!item) return;
        if (heroBg)    heroBg.src = item.backdrop || item.poster;
        if (heroTitle) heroTitle.textContent = item.title;
        if (heroDesc)  heroDesc.textContent  = item.overview;
        if (heroPlay)  heroPlay.onclick  = () => item.isMovie ? playMedia(item) : playMedia(item, 1, 1);
        if (heroInfo)  heroInfo.onclick  = () => openModal(item);
    }

    function startHeroRotation() {
        clearInterval(heroInterval);
        if (!featuredPool?.length) return;
        heroInterval = setInterval(() => {
            currentHeroIndex = (currentHeroIndex + 1) % featuredPool.length;
            updateHeroUI(featuredPool[currentHeroIndex]);
        }, 8000);
    }

    // ─── TAB NAVIGATION ───────────────────────────────────────────────────────
    function updateTabState(tab) {
        currentTab       = tab;
        currentHeroIndex = 0;

        const tabs = {
            home:    homeBtn,
            tv:      document.getElementById('tv-nav-btn'),
            kdrama:  document.getElementById('kdrama-nav-btn'),
            anime:   document.getElementById('anime-nav-btn'),
            movies:  document.getElementById('movies-nav-btn'),
            popular: document.getElementById('popular-nav-btn'),
            mylist:  document.getElementById('mylist-nav-btn')
        };

        Object.entries(tabs).forEach(([key, btn]) => {
            if (btn?.classList) {
                btn.classList.toggle('text-white',        tab === key);
                btn.classList.toggle('font-bold',         tab === key);
                btn.classList.toggle('border-b-2',        tab === key);
                btn.classList.toggle('border-netflix-red',tab === key);
                btn.classList.toggle('text-zinc-400',     tab !== key);
            }
        });

        const poolMap = {
            home:    [...libraryData.movies, ...libraryData.anime],
            kdrama:  [...libraryData.kdrama],
            tv:      [...libraryData.tv],
            movies:  [...libraryData.movies, ...libraryData.popular],
            anime:   [...libraryData.anime],
            popular: [...libraryData.popular, ...libraryData.binge],
            mylist:  [...libraryData.myList]
        };
        featuredPool = (poolMap[tab] || []).slice(0, 8);

        if (searchInput?.value.length > 0) {
            handleSearch(searchInput.value);
        } else {
            renderLibrary();
            if (heroSection) heroSection.style.display = 'flex';
            if (contentRows) {
                contentRows.classList.add('-mt-20');
                contentRows.classList.remove('mt-24');
            }
            if (featuredPool.length > 0) {
                updateHeroUI(featuredPool[0]);
                startHeroRotation();
            }
        }
    }

    // ─── SEARCH ───────────────────────────────────────────────────────────────
    async function handleSearch(query) {
        if (!contentRows) return;
        if (!query.trim()) { renderLibrary(); return; }

        const data  = await fetchSearch(query);
        const items = (data?.results || [])
            .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
            .map(r  => formatItem(r, r.media_type));

        if (!items.length) {
            contentRows.innerHTML = `<div class="px-12 py-32 text-zinc-600 text-center text-2xl font-black italic tracking-widest uppercase">No cinematic matches for "${query}"</div>`;
            return;
        }

        contentRows.innerHTML = '';
        const row = createRow(`Search Results for "${query}"`, items, false);
        if (row) contentRows.appendChild(row);
    }

    // ─── DATA LOADING ─────────────────────────────────────────────────────────
    async function loadData() {
        // Fallback static seed data so app works without API
        if (!libraryData.movies.length) {
            libraryData.movies = [
                { id: 101, tmdb_id: 823464, title: 'Godzilla x Kong: The New Empire', year: '2024', rating: '7.2', overview: 'An all-new adventure that pits the almighty Kong and the fearsome Godzilla against a colossal undiscovered threat hidden within our world.', isMovie: true, isAnime: false, poster: 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=500', backdrop: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2000' },
                { id: 102, tmdb_id: 1022789, title: 'Inside Out 2', year: '2024', rating: '8.1', overview: "Teenager Riley's mind headquarters is undergoing a sudden demolition to make room for unexpected new Emotions!", isMovie: true, isAnime: false, poster: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500', backdrop: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=2000' }
            ];
        }
        if (!libraryData.tv.length) {
            libraryData.tv = [
                { id: 901, tmdb_id: 1396, title: 'Breaking Bad', year: '2008', rating: '9.5', overview: 'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.', isMovie: false, isAnime: false, poster: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?q=80&w=500', backdrop: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2000' }
            ];
        }
        if (!libraryData.anime.length) {
            libraryData.anime = [
                { id: 201, tmdb_id: 1429,  title: 'Attack on Titan',  year: '2013', rating: '8.8', overview: 'After his hometown is destroyed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans.', isMovie: false, isAnime: true, poster: 'https://images.unsplash.com/photo-1542204165-1c7b5f7fea2c?q=80&w=500', backdrop: 'https://images.unsplash.com/photo-1558980664-10b2f1e0f1d0?q=80&w=2000' },
                { id: 202, tmdb_id: 37854, title: 'One Piece',         year: '1999', rating: '8.6', overview: "Monkey D. Luffy sets off on an adventure with his pirate crew in order to find the greatest treasure ever left by the legendary Pirate King.", isMovie: false, isAnime: true, poster: 'https://images.unsplash.com/photo-1543163521-1bf539c55a66?q=80&w=500', backdrop: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=2000' },
                { id: 203, tmdb_id: 46260, title: 'Naruto',            year: '2002', rating: '8.1', overview: "A ninja's journey to gain the respect of his village and become the greatest Hokage.", isMovie: false, isAnime: true, poster: 'https://images.unsplash.com/photo-1520975698511-0bde3b0b8d1b?q=80&w=500', backdrop: 'https://images.unsplash.com/photo-1505685296765-3a2736de412f?q=80&w=2000' }
            ];
        }

        updateTabState(currentTab);

        if (!TMDB_API_KEY) {
            showApiKeyModal();
            if (appLoader) appLoader.classList.add('hidden');
            return;
        }

        try {
            const endpointMap = {
                movies:       fetchTMDB('/trending/movie/week'),
                tv:           fetchTMDB('/trending/tv/week'),
                kdrama:       fetchTMDB('/discover/tv?with_origin_country=KR&without_genres=16&sort_by=popularity.desc'),
                popular:      fetchTMDB('/movie/popular'),
                binge:        fetchTMDB('/discover/tv?sort_by=popularity.desc&without_origin_country=JP%7CKR'),
                anime:        fetchTMDB('/discover/tv?with_origin_country=JP&with_genres=16&sort_by=popularity.desc'),
                actionMovies: fetchTMDB('/discover/movie?with_genres=28&sort_by=popularity.desc'),
                horrorMovies: fetchTMDB('/discover/movie?with_genres=27&sort_by=popularity.desc'),
                romanceMovies:fetchTMDB('/discover/movie?with_genres=10749&sort_by=popularity.desc'),
                scifi:        fetchTMDB('/discover/movie?with_genres=878&sort_by=popularity.desc'),
                comedy:       fetchTMDB('/discover/movie?with_genres=35&sort_by=popularity.desc'),
                actionTV:     fetchTMDB('/discover/tv?with_genres=10759&sort_by=popularity.desc'),
                horrorTV:     fetchTMDB('/discover/tv?with_genres=9648&sort_by=popularity.desc'),
                romanceTV:    fetchTMDB('/discover/tv?with_genres=10766&sort_by=popularity.desc'),
                crimeTv:      fetchTMDB('/discover/tv?with_genres=80&sort_by=popularity.desc'),
                actionKDrama: fetchTMDB('/discover/tv?with_origin_country=KR&with_genres=10759&sort_by=popularity.desc'),
                horrorKDrama: fetchTMDB('/discover/tv?with_origin_country=KR&with_genres=9648&sort_by=popularity.desc'),
                romanceKDrama:fetchTMDB('/discover/tv?with_origin_country=KR&with_genres=10766&sort_by=popularity.desc')
            };

            const keys    = Object.keys(endpointMap);
            const results = await Promise.allSettled(Object.values(endpointMap));

            results.forEach((r, i) => {
                if (r.status !== 'fulfilled' || !r.value?.results) return;
                const key  = keys[i];
                const type = key.toLowerCase().includes('movie') || key === 'popular' || key === 'scifi' || key === 'comedy' ? 'movie' : (key === 'anime' ? 'anime' : 'tv');
                libraryData[key] = r.value.results.map(item => formatItem(item, type));
            });

            updateTabState(currentTab);
        } catch (error) {
            console.error('Error fetching catalog data:', error);
            updateTabState(currentTab);
        } finally {
            if (appLoader) setTimeout(() => appLoader.classList.add('hidden'), 300);
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

    // ─── INIT ─────────────────────────────────────────────────────────────────
    function init() {
        if (isInitialized) return;
        isInitialized = true;

        // Nav buttons
        const navBindings = {
            'home-btn':       'home',
            'tv-nav-btn':     'tv',
            'kdrama-nav-btn': 'kdrama',
            'anime-nav-btn':  'anime',
            'movies-nav-btn': 'movies',
            'popular-nav-btn':'popular',
            'mylist-nav-btn': 'mylist'
        };
        Object.entries(navBindings).forEach(([id, tab]) => {
            const el = document.getElementById(id);
            if (el) el.onclick = () => updateTabState(tab);
        });

        const navLogo = document.getElementById('nav-logo');
        if (navLogo) navLogo.onclick = () => updateTabState('home');

        if (closeModalBtn) closeModalBtn.onclick = closeModal;

        if (heroSetup) heroSetup.onclick = () => { heroSetup.classList.add('hidden'); loadData(); };

        if (saveApiBtn && apiKeyInput) {
            saveApiBtn.onclick = () => {
                const key = apiKeyInput.value.trim();
                if (key.length > 20) {
                    TMDB_API_KEY = key;
                    localStorage.setItem('tmdb_api_key', key);
                    apiKeyModal.classList.add('opacity-0', 'pointer-events-none');
                    setTimeout(() => {
                        apiKeyModal.classList.add('hidden');
                        apiKeyModal.classList.remove('flex');
                    }, 400);
                    loadData();
                } else {
                    apiKeyInput.classList.add('border-red-500');
                }
            };
        }

        if (searchInput) {
            searchInput.addEventListener('input', e => {
                const value = e.target.value;
                clearTimeout(searchDebounce);
                if (value.length > 0) {
                    if (heroSection) heroSection.style.display = 'none';
                    if (contentRows) { contentRows.classList.remove('-mt-20'); contentRows.classList.add('mt-24'); }
                    searchDebounce = setTimeout(() => handleSearch(value), 400);
                } else {
                    if (heroSection) heroSection.style.display = 'flex';
                    if (contentRows) { contentRows.classList.remove('mt-24'); contentRows.classList.add('-mt-20'); }
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
            detailModal.addEventListener('click', e => {
                if (e.target === detailModal || e.target?.classList?.contains('modal-blur')) closeModal();
            });
        }

        window.addEventListener('keydown', e => {
            if (e.key === 'Escape') { closeModal(); exitPlayer(); }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) clearInterval(heroInterval);
            else startHeroRotation();
        });

        buildServerButtons();
        loadData();
    }

    document.addEventListener('DOMContentLoaded', init);
    if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(init, 50);
})();