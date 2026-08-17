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

    // Modal Elements
    const detailModal = document.getElementById('detail-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalPlayBtn = document.getElementById('modal-play-btn');
    const modalPlayText = document.getElementById('modal-play-text');
    const modalAddListBtn = document.getElementById('modal-add-list-btn');
    const modalImage = document.getElementById('modal-image');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const modalYear = document.getElementById('modal-year');
    const modalRating = document.getElementById('modal-rating');
    const modalDuration = document.getElementById('modal-duration');
    const modalCast = document.getElementById('modal-cast');
    const modalGenre = document.getElementById('modal-genre');
    const modalSeriesSection = document.getElementById('modal-series-section');
    const modalSeasonsContainer = document.getElementById('modal-seasons-container');
    const animeSeasonsCarousel = document.getElementById('anime-seasons-carousel');
    const seasonSelect = document.getElementById('season-select');
    const episodesList = document.getElementById('episodes-list');

    // Player Elements
    const videoOverlay = document.getElementById('video-overlay');
    const playerTopbarTitle = document.getElementById('player-topbar-title');
    const exitPlayerBtn = document.getElementById('exit-player-btn');
    const closePlayerBtn = document.getElementById('close-player-btn');
    const reloadStreamBtn = document.getElementById('reload-stream-btn');
    const playerLoader = document.getElementById('player-loader');
    const playerSidebar = document.getElementById('player-sidebar');
    const playerSeasonSelect = document.getElementById('player-season-select');
    const playerEpisodeList = document.getElementById('player-episode-list');
    const playerContainer = document.getElementById('player-container');
    const playerVideo = document.getElementById('player-video');
    const playerIframe = document.getElementById('streaming-player');
    const watchingEpisodeLabel = document.getElementById('watching-episode-label');
    const btnSub = document.getElementById('btn-sub');
    const btnDub = document.getElementById('btn-dub');
    const serverButtonsContainer = document.getElementById('server-buttons-container');

    // Nav Tabs & Setup
    const homeBtn = document.getElementById('home-btn');
    const apiKeyModal = document.getElementById('api-key-modal');
    const apiKeyInput = document.getElementById('tmdb-api-input');
    const saveApiBtn = document.getElementById('save-api-btn');

    let libraryData = {
        movies: [],
        kdrama: [],
        tv: [],
        anime: [],
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
        action: [],
        comedy: [],
        horror: [],
        scifi: [],
        crimeTv: [],
        myList: JSON.parse(localStorage.getItem('adamstream_mylist')) || []
    };

    let currentTab = 'home';
    let currentHeroIndex = 0;
    let heroInterval = null;
    let searchDebounce = null;
    let featuredPool = [];

    // Playback State
    let currentPlayingItem = null;
    let currentPlayingSeason = 1;
    let currentPlayingEpisode = 1;
    let animeDubMode = false;
    let currentTvSeasons = [];
    let currentSeasonsItemId = null;
    let currentServer = 'vidsrc_cc';

    const BASE_URL = 'https://api.themoviedb.org/3';
    const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';
    const IMG_BG_BASE = 'https://image.tmdb.org/t/p/w1280';

    // Multi-Server Pool for Movies and TV/Anime
    const SERVERS = {
        vidsrc_cc: {
            name: 'VidSrc Alpha',
            label: 'Server 1',
            movie: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
            tv: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
        },
        vidlink: {
            name: 'VidLink Pro',
            label: 'Server 2',
            movie: (id) => `https://vidlink.pro/movie/${id}`,
            tv: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
            animeDub: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?dub=true`,
        },
        vidsrc_pro: {
            name: 'VidSrc Pro',
            label: 'Server 3',
            movie: (id) => `https://vidsrc.pro/embed/movie/${id}`,
            tv: (id, s, e) => `https://vidsrc.pro/embed/tv/${id}/${s}/${e}`,
        },
        autoembed: {
            name: 'AutoEmbed',
            label: 'Server 4',
            movie: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
            tv: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`,
        },
        embedsu: {
            name: 'EmbedSu',
            label: 'Server 5',
            movie: (id) => `https://embed.su/embed/movie/${id}`,
            tv: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
        },
        vidsrc_me: {
            name: 'VidSrc Beta',
            label: 'Server 6',
            movie: (id) => `https://v2.vidsrc.me/embed/movie/${id}`,
            tv: (id, s, e) => `https://v2.vidsrc.me/embed/tv/${id}/${s}/${e}`,
        }
    };

    const fetchWithTimeout = (promise, ms = 10000) => {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
        ]);
    };

    // --- TMDB FETCHING ---
    async function fetchTMDB(endpoint, timeoutMs = 8000) {
        if (!TMDB_API_KEY) return null;
        try {
            const url = new URL(`${BASE_URL}${endpoint}`);
            url.searchParams.append('api_key', TMDB_API_KEY);
            url.searchParams.append('language', 'en-US');

            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeoutMs);

            const res = await fetch(url.toString(), { signal: controller.signal });
            clearTimeout(id);

            if (!res.ok) {
                if (res.status === 401) throw new Error('Invalid API Key');
                return null;
            }
            return await res.json();
        } catch (error) {
            if (error.message === 'Invalid API Key') {
                showApiKeyModal(true);
            }
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
        } catch (e) {
            return null;
        }
    }

    async function fetchTvDetails(tvId) {
        if (!TMDB_API_KEY || !tvId) return null;
        try {
            const res = await fetch(`${BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`);
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            return null;
        }
    }

    async function fetchCredits(item) {
        if (!TMDB_API_KEY || !item?.tmdb_id) return [];
        try {
            const type = item.isMovie ? 'movie' : 'tv';
            const res = await fetch(`${BASE_URL}/${type}/${item.tmdb_id}/credits?api_key=${TMDB_API_KEY}&language=en-US`);
            if (!res.ok) return [];
            const data = await res.json();
            return (data.cast || []).slice(0, 6).map(c => c.name);
        } catch (e) {
            return [];
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

        if (seasons.length === 0) {
            seasons = [{
                season_number: 1,
                name: 'Season 1',
                episode_count: Number(item.animeEpisodes) || 12
            }];
        }

        currentSeasonsItemId = seasonCacheId;
        currentTvSeasons = seasons;
        return seasons;
    }

    function formatItem(item, forceType = null) {
        if (!item) return null;
        const isMovie = forceType === 'movie' || (forceType !== 'tv' && forceType !== 'anime' && (item.media_type === 'movie' || (!item.first_air_date && item.title)));
        const isAnime = forceType === 'anime' || (item.origin_country && Array.isArray(item.origin_country) && item.origin_country.includes('JP') && item.genre_ids && Array.isArray(item.genre_ids) && item.genre_ids.includes(16));

        return {
            id: item.id || Math.floor(Math.random() * 100000),
            tmdb_id: item.id,
            isMovie: isMovie,
            isAnime: isAnime,
            title: item.title || item.name || 'Untitled',
            originalTitle: item.original_title || item.original_name || item.title || item.name || '',
            overview: item.overview || 'No description available for this title.',
            poster: item.poster_path ? `${IMG_BASE_URL}${item.poster_path}` : (item.backdrop_path ? `${IMG_BASE_URL}${item.backdrop_path}` : 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?q=80&w=500'),
            backdrop: item.backdrop_path ? `${IMG_BG_BASE}${item.backdrop_path}` : (item.poster_path ? `${IMG_BG_BASE}${item.poster_path}` : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2000'),
            rating: item.vote_average ? item.vote_average.toFixed(1) : '8.5',
            year: (item.release_date || item.first_air_date || '').substring(0, 4) || '2024',
            genres: item.genres?.map(g => g.name) || []
        };
    }

    // --- MODAL RENDERING LOGIC ---
    async function openModal(item) {
        if (!item || !detailModal) return;

        if (modalImage) modalImage.src = item.backdrop || item.poster;
        if (modalTitle) modalTitle.textContent = item.title;
        if (modalDesc) modalDesc.textContent = item.overview;
        if (modalYear) modalYear.textContent = item.year;
        if (modalRating) modalRating.textContent = item.rating;
        if (modalDuration) modalDuration.textContent = item.isMovie ? 'Movie' : (item.isAnime ? 'Anime Series' : 'TV Series');
        if (modalCast) modalCast.textContent = 'Loading cast...';
        if (modalGenre) modalGenre.textContent = item.genres?.length ? item.genres.join(', ') : (item.isMovie ? 'Film • Cinema' : (item.isAnime ? 'Anime • Animation' : 'TV Series'));

        // Reset series sections
        if (modalSeriesSection) {
            modalSeriesSection.classList.toggle('hidden', item.isMovie);
        }
        if (modalSeasonsContainer) {
            modalSeasonsContainer.classList.add('hidden');
        }
        if (animeSeasonsCarousel) animeSeasonsCarousel.innerHTML = '';
        if (seasonSelect) seasonSelect.innerHTML = '';
        if (episodesList) episodesList.innerHTML = '';

        // Dynamic Cast Credits Fetch
        fetchCredits(item).then(castList => {
            if (modalCast) {
                modalCast.textContent = castList.length ? castList.join(', ') : 'Featured Ensemble';
            }
        });

        // Setup Main Action Button
        if (modalPlayBtn) {
            if (item.isMovie) {
                if (modalPlayText) modalPlayText.textContent = 'Watch Movie';
                modalPlayBtn.onclick = () => {
                    closeModal();
                    playMedia(item);
                };
            } else {
                if (modalPlayText) modalPlayText.textContent = 'Watch Episode 1';
                modalPlayBtn.onclick = () => {
                    closeModal();
                    playMedia(item, 1, 1);
                };

                // Populate Seasons & Episode Grid for Anime / Series
                ensureSeasonData(item).then(seasons => {
                    if (!seasons || !seasons.length) return;

                    // Season Selector Dropdown
                    if (seasonSelect) {
                        seasonSelect.innerHTML = '';
                        seasons.forEach(s => {
                            const opt = document.createElement('option');
                            opt.value = String(s.season_number);
                            opt.textContent = `Season ${s.season_number}`;
                            seasonSelect.appendChild(opt);
                        });
                    }

                    // Season Carousel Pills if multiple seasons
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
                        seasonSelect.onchange = (e) => {
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

        // My List Toggle
        if (modalAddListBtn) {
            const isInList = libraryData.myList.some(i => i.tmdb_id === item.tmdb_id);
            modalAddListBtn.innerHTML = `<span class="material-symbols-outlined">${isInList ? 'check' : 'add'}</span>`;
            modalAddListBtn.className = `w-12 h-12 rounded-full flex items-center justify-center transition-colors border ${isInList ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/30 hover:bg-white/20'}`;

            modalAddListBtn.onclick = () => {
                const index = libraryData.myList.findIndex(i => i.tmdb_id === item.tmdb_id);
                if (index === -1) {
                    libraryData.myList.unshift(item);
                } else {
                    libraryData.myList.splice(index, 1);
                }
                localStorage.setItem('adamstream_mylist', JSON.stringify(libraryData.myList));

                const nowInList = libraryData.myList.some(i => i.tmdb_id === item.tmdb_id);
                modalAddListBtn.innerHTML = `<span class="material-symbols-outlined">${nowInList ? 'check' : 'add'}</span>`;
                modalAddListBtn.className = `w-12 h-12 rounded-full flex items-center justify-center transition-colors border ${nowInList ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/30 hover:bg-white/20'}`;

                if (currentTab === 'mylist') {
                    updateTabState('mylist');
                } else if (currentTab === 'home') {
                    renderLibrary();
                }
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

    function renderModalEpisodes(item, seasonNumber = 1) {
        if (!episodesList) return;
        const currentSeasonObj = currentTvSeasons.find(s => s.season_number === seasonNumber) || currentTvSeasons[0];
        const episodeCount = currentSeasonObj?.episode_count || 12;

        episodesList.innerHTML = '';
        for (let ep = 1; ep <= episodeCount; ep++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/15 transition-colors text-left group';
            btn.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="text-xs font-black text-netflix-red">E${ep}</span>
                    <span class="text-xs font-bold text-zinc-200 group-hover:text-white">Episode ${ep}</span>
                </div>
                <span class="material-symbols-outlined text-sm text-zinc-400 group-hover:text-white">play_arrow</span>
            `;
            btn.onclick = () => {
                closeModal();
                playMedia(item, seasonNumber, ep);
            };
            episodesList.appendChild(btn);
        }
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

    // --- VIDEO PLAYER & STREAM ENGINE ---
    function buildServerButtons() {
        if (!serverButtonsContainer) return;
        serverButtonsContainer.innerHTML = '';

        Object.keys(SERVERS).forEach(key => {
            const server = SERVERS[key];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `server-btn ${key === currentServer ? 'active' : 'bg-zinc-800/90 text-zinc-300 hover:text-white'}`;
            btn.dataset.server = key;
            btn.textContent = server.label;
            btn.title = server.name;

            btn.onclick = () => {
                currentServer = key;
                buildServerButtons();
                if (currentPlayingItem) {
                    loadStream(currentPlayingItem, currentPlayingSeason, currentPlayingEpisode, currentServer);
                }
            };
            serverButtonsContainer.appendChild(btn);
        });
    }

    function loadStream(item, season, episode, serverKey = currentServer) {
        if (!item || !playerIframe) return;

        const server = SERVERS[serverKey] || SERVERS.vidsrc_cc;
        const id = item.tmdb_id || item.id;

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

        // Show player loader briefly for visual feedback
        if (playerLoader) {
            playerLoader.classList.remove('opacity-0', 'pointer-events-none');
        }

        // Configure iframe
        playerIframe.setAttribute('allowfullscreen', 'true');
        playerIframe.setAttribute('webkitallowfullscreen', 'true');
        playerIframe.setAttribute('mozallowfullscreen', 'true');
        playerIframe.setAttribute('referrerpolicy', 'origin');
        playerIframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');

        // Hide HTML5 video and show iframe
        if (playerVideo) playerVideo.classList.add('hidden');
        playerIframe.classList.remove('hidden');

        try {
            playerIframe.src = streamUrl;
        } catch (e) {
            console.error('Error setting stream URL:', e);
        }

        setTimeout(() => {
            if (playerLoader) playerLoader.classList.add('opacity-0', 'pointer-events-none');
        }, 900);
    }

    async function playMedia(item, season = null, episode = null) {
        if (!item) return;

        currentPlayingItem = item;
        currentPlayingSeason = Number(season) || 1;
        currentPlayingEpisode = Number(episode) || 1;

        // Open Watch Overlay
        if (videoOverlay) {
            videoOverlay.classList.remove('opacity-0', 'pointer-events-none');
        }
        document.body.style.overflow = 'hidden';

        // Update Topbar Title
        if (playerTopbarTitle) {
            if (item.isMovie) {
                playerTopbarTitle.textContent = `${item.title}${item.year ? ' (' + item.year + ')' : ''}`;
            } else {
                playerTopbarTitle.textContent = `${item.title} • S${currentPlayingSeason} E${currentPlayingEpisode}`;
            }
        }

        // Configure Movie vs Series UI
        if (item.isMovie) {
            // MOVIE MODE: Hide left sidebar and SUB/DUB toggles
            if (playerSidebar) playerSidebar.classList.add('hidden');
            if (btnSub) btnSub.classList.add('hidden');
            if (btnDub) btnDub.classList.add('hidden');
            if (watchingEpisodeLabel) {
                watchingEpisodeLabel.textContent = `${item.title} (Feature Film)`;
            }
        } else {
            // SERIES / ANIME MODE: Show left episode sidebar
            if (playerSidebar) {
                playerSidebar.classList.remove('hidden');
                playerSidebar.classList.add('flex');
            }

            // Anime Sub / Dub buttons
            if (item.isAnime) {
                if (btnSub) {
                    btnSub.classList.remove('hidden');
                    btnSub.classList.add('flex');
                    btnSub.className = `items-center text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 ${!animeDubMode ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300 border border-white/10'}`;
                }
                if (btnDub) {
                    btnDub.classList.remove('hidden');
                    btnDub.classList.add('flex');
                    btnDub.className = `items-center text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 ${animeDubMode ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300 border border-white/10'}`;
                }
            } else {
                if (btnSub) btnSub.classList.add('hidden');
                if (btnDub) btnDub.classList.add('hidden');
            }

            if (watchingEpisodeLabel) {
                watchingEpisodeLabel.textContent = `${item.title} • Season ${currentPlayingSeason} Episode ${currentPlayingEpisode}`;
            }

            // Populate Sidebar Seasons & Episodes
            ensureSeasonData(item).then(seasons => {
                if (!seasons || !seasons.length) return;

                if (playerSeasonSelect) {
                    playerSeasonSelect.innerHTML = '';
                    seasons.forEach(s => {
                        const opt = document.createElement('option');
                        opt.value = String(s.season_number);
                        opt.textContent = `S${s.season_number}`;
                        if (s.season_number === currentPlayingSeason) opt.selected = true;
                        playerSeasonSelect.appendChild(opt);
                    });

                    playerSeasonSelect.onchange = (e) => {
                        currentPlayingSeason = Number(e.target.value || 1);
                        currentPlayingEpisode = 1;
                        renderSidebarEpisodes(item, currentPlayingSeason, currentPlayingEpisode);
                        loadStream(item, currentPlayingSeason, currentPlayingEpisode);
                        if (playerTopbarTitle) {
                            playerTopbarTitle.textContent = `${item.title} • S${currentPlayingSeason} E${currentPlayingEpisode}`;
                        }
                        if (watchingEpisodeLabel) {
                            watchingEpisodeLabel.textContent = `${item.title} • Season ${currentPlayingSeason} Episode ${currentPlayingEpisode}`;
                        }
                    };
                }

                renderSidebarEpisodes(item, currentPlayingSeason, currentPlayingEpisode);
            });
        }

        // Build server buttons and trigger stream loading
        buildServerButtons();
        loadStream(item, currentPlayingSeason, currentPlayingEpisode, currentServer);
    }

    function renderSidebarEpisodes(item, season, activeEpisode) {
        if (!playerEpisodeList) return;
        const currentSeasonObj = currentTvSeasons.find(s => s.season_number === season) || currentTvSeasons[0];
        const episodeCount = currentSeasonObj?.episode_count || 12;

        playerEpisodeList.innerHTML = '';
        for (let ep = 1; ep <= episodeCount; ep++) {
            const isActive = ep === Number(activeEpisode);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `episode-btn w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold ${isActive ? 'active' : 'bg-white/5 text-zinc-300 border-white/5 hover:bg-white/10 hover:text-white'}`;
            btn.innerHTML = `
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
                if (playerTopbarTitle) {
                    playerTopbarTitle.textContent = `${item.title} • S${season} E${ep}`;
                }
                if (watchingEpisodeLabel) {
                    watchingEpisodeLabel.textContent = `${item.title} • Season ${season} Episode ${ep}`;
                }
            };
            playerEpisodeList.appendChild(btn);

            if (isActive) {
                btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }

    function exitPlayer() {
        if (videoOverlay) {
            videoOverlay.classList.add('opacity-0', 'pointer-events-none');
        }
        if (playerIframe) {
            playerIframe.src = '';
        }
        if (playerVideo) {
            playerVideo.pause();
            playerVideo.classList.add('hidden');
        }
        document.body.style.overflow = '';
    }

    // Sub / Dub Toggle Event Listeners
    if (btnSub) {
        btnSub.onclick = () => {
            if (!currentPlayingItem || !currentPlayingItem.isAnime) return;
            animeDubMode = false;
            btnSub.className = 'items-center text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 bg-white text-black';
            if (btnDub) btnDub.className = 'items-center text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 bg-zinc-800 text-zinc-300 border border-white/10';
            loadStream(currentPlayingItem, currentPlayingSeason, currentPlayingEpisode);
        };
    }

    if (btnDub) {
        btnDub.onclick = () => {
            if (!currentPlayingItem || !currentPlayingItem.isAnime) return;
            animeDubMode = true;
            btnDub.className = 'items-center text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 bg-white text-black';
            if (btnSub) btnSub.className = 'items-center text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-200 bg-zinc-800 text-zinc-300 border border-white/10';
            loadStream(currentPlayingItem, currentPlayingSeason, currentPlayingEpisode);
        };
    }

    if (exitPlayerBtn) exitPlayerBtn.onclick = exitPlayer;
    if (closePlayerBtn) closePlayerBtn.onclick = exitPlayer;
    if (reloadStreamBtn) {
        reloadStreamBtn.onclick = () => {
            if (currentPlayingItem) {
                loadStream(currentPlayingItem, currentPlayingSeason, currentPlayingEpisode, currentServer);
            }
        };
    }

    // --- CARD & ROW RENDERING ---
    function createMovieCard(item, isTop10 = false) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'movie-card flex-shrink-0 w-32 md:w-48 aspect-[2/3] relative rounded-md overflow-hidden cursor-pointer transition-all duration-500 hover:z-30 group shadow-xl shadow-black text-left focus:outline-none focus:ring-2 focus:ring-netflix-red';

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
                    <span class="border border-white/30 px-1 rounded-sm">${item.isMovie ? 'Film' : (item.isAnime ? 'Anime' : 'Series')}</span>
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
        scrollContainer.style.minHeight = '320px';

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

        const fragment = document.createDocumentFragment();
        items.forEach((item, idx) => {
            const card = createMovieCard(item, isTrending && idx < 5);
            fragment.appendChild(card);
        });
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
            <div id="grid-container" class="px-4 md:px-12 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-5 pb-32 animate-slide-up">
            </div>
        `;

        const grid = document.getElementById('grid-container');
        items.forEach(item => {
            const card = createMovieCard(item, false);
            card.classList.remove('w-32', 'md:w-48', 'flex-shrink-0');
            card.classList.add('w-full');
            grid.appendChild(card);
        });

        const backBtn = document.getElementById('back-to-browse');
        if (backBtn) {
            backBtn.onclick = () => updateTabState(currentTab);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderLibrary() {
        if (!contentRows) return;
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
                "Romantic Korean Classics": libraryData.romanceKDrama
            };
        } else if (currentTab === 'anime') {
            categories = {
                "Trending Anime": libraryData.anime,
                "Top Action Anime": libraryData.anime.slice().reverse(),
                "Must-Watch Anime Series": libraryData.anime
            };
        } else {
            // Home Tab
            if (libraryData.myList.length > 0) {
                categories["Continue Watching / My List"] = libraryData.myList;
            }
            categories = {
                ...categories,
                "Trending Movies": libraryData.movies,
                "Trending Anime": libraryData.anime,
                "New Action Hits": libraryData.actionMovies,
                "Binge-Worthy TV Series": libraryData.binge,
                "Korean Drama Trends": libraryData.kdrama
            };
        }

        Object.entries(categories).forEach(([name, items]) => {
            if (items && items.length > 0) {
                const row = createRow(name, items, name.includes("Trending") || name.includes("Popular"));
                if (row && contentRows) contentRows.appendChild(row);
            }
        });
    }

    // --- HERO SECTION ---
    function updateHeroUI(item) {
        if (!item) return;
        if (heroBg) heroBg.src = item.backdrop || item.poster;
        if (heroTitle) heroTitle.textContent = item.title;
        if (heroDesc) heroDesc.textContent = item.overview;

        if (heroPlay) {
            heroPlay.onclick = () => {
                if (item.isMovie) {
                    playMedia(item);
                } else {
                    playMedia(item, 1, 1);
                }
            };
        }
        if (heroInfo) {
            heroInfo.onclick = () => openModal(item);
        }
    }

    function startHeroRotation() {
        clearInterval(heroInterval);
        if (!featuredPool || !featuredPool.length) return;
        heroInterval = setInterval(() => {
            currentHeroIndex = (currentHeroIndex + 1) % featuredPool.length;
            updateHeroUI(featuredPool[currentHeroIndex]);
        }, 8000);
    }

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
            featuredPool = [...libraryData.movies, ...libraryData.anime].slice(0, 8);
        } else if (tab === 'kdrama') {
            featuredPool = [...libraryData.kdrama].slice(0, 8);
        } else if (tab === 'tv') {
            featuredPool = [...libraryData.tv].slice(0, 8);
        } else if (tab === 'movies') {
            featuredPool = [...libraryData.movies, ...libraryData.popular].slice(0, 8);
        } else if (tab === 'anime') {
            featuredPool = [...libraryData.anime].slice(0, 8);
        } else if (tab === 'popular') {
            featuredPool = [...libraryData.popular, ...libraryData.binge].slice(0, 8);
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

            if (featuredPool.length > 0) {
                updateHeroUI(featuredPool[0]);
                startHeroRotation();
            }
        }
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

    // --- DATA LOADING ---
    async function loadData() {
        // Fallback default dataset
        if (!libraryData.movies.length) {
            libraryData.movies = [
                { id: 101, tmdb_id: 823464, title: "Godzilla x Kong: The New Empire", year: "2024", rating: "7.2", overview: "An all-new adventure that pits the almighty Kong and the fearsome Godzilla against a colossal undiscovered threat hidden within our world.", isMovie: true, isAnime: false, poster: "https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=500", backdrop: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2000" },
                { id: 102, tmdb_id: 1022789, title: "Inside Out 2", year: "2024", rating: "8.1", overview: "Teenager Riley's mind headquarters is undergoing a sudden demolition to make room for unexpected new Emotions!", isMovie: true, isAnime: false, poster: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500", backdrop: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=2000" }
            ];
        }
        if (!libraryData.tv.length) {
            libraryData.tv = [
                { id: 901, tmdb_id: 1396, title: "Breaking Bad", year: "2008", rating: "9.5", overview: "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.", isMovie: false, isAnime: false, poster: "https://images.unsplash.com/photo-1616530940355-351fabd9524b?q=80&w=500", backdrop: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2000" }
            ];
        }
        if (!libraryData.anime.length) {
            libraryData.anime = [
                { id: 201, tmdb_id: 1429, title: "Attack on Titan", year: "2013", rating: "8.8", overview: "After his hometown is destroyed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans.", isMovie: false, isAnime: true, poster: "https://images.unsplash.com/photo-1542204165-1c7b5f7fea2c?q=80&w=500", backdrop: "https://images.unsplash.com/photo-1558980664-10b2f1e0f1d0?q=80&w=2000" },
                { id: 202, tmdb_id: 37854, title: "One Piece", year: "1999", rating: "8.6", overview: "Monkey D. Luffy sets off on an adventure with his pirate crew in order to find the greatest treasure ever left by the legendary Pirate King.", isMovie: false, isAnime: true, poster: "https://images.unsplash.com/photo-1543163521-1bf539c55a66?q=80&w=500", backdrop: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=2000" },
                { id: 203, tmdb_id: 46260, title: "Naruto", year: "2002", rating: "8.1", overview: "A ninja's journey to gain the respect of his village and become the greatest Hokage.", isMovie: false, isAnime: true, poster: "https://images.unsplash.com/photo-1520975698511-0bde3b0b8d1b?q=80&w=500", backdrop: "https://images.unsplash.com/photo-1505685296765-3a2736de412f?q=80&w=2000" }
            ];
        }

        updateTabState(currentTab);

        if (!TMDB_API_KEY) {
            if (apiKeyModal) showApiKeyModal();
            if (appLoader) appLoader.classList.add('hidden');
            return;
        }

        try {
            const endpoints = {
                movies: fetchTMDB('/trending/movie/week'),
                tv: fetchTMDB('/trending/tv/week'),
                kdrama: fetchTMDB('/discover/tv?with_origin_country=KR&without_genres=16&sort_by=popularity.desc'),
                popular: fetchTMDB('/movie/popular'),
                binge: fetchTMDB('/discover/tv?sort_by=popularity.desc&without_origin_country=JP|KR'),
                anime: fetchTMDB('/discover/tv?with_origin_country=JP&with_genres=16&sort_by=popularity.desc'),
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

            const results = await Promise.allSettled(Object.values(endpoints).map(p => fetchWithTimeout(p, 10000)));
            const [
                moviesRes, tvRes, kdramaRes, popularRes, bingeRes, animeRes,
                actionMoviesRes, horrorMoviesRes, romanceMoviesRes,
                actionTVRes, horrorTVRes, romanceTVRes,
                actionKDramaRes, horrorKDramaRes, romanceKDramaRes
            ] = results.map(r => r.status === 'fulfilled' ? r.value : null);

            if (moviesRes?.results) libraryData.movies = moviesRes.results.map(i => formatItem(i, 'movie'));
            if (tvRes?.results) libraryData.tv = tvRes.results.map(i => formatItem(i, 'tv'));
            if (kdramaRes?.results) libraryData.kdrama = kdramaRes.results.map(i => formatItem(i, 'tv'));
            if (popularRes?.results) libraryData.popular = popularRes.results.map(i => formatItem(i, 'movie'));
            if (bingeRes?.results) libraryData.binge = bingeRes.results.map(i => formatItem(i, 'tv'));
            if (animeRes?.results) libraryData.anime = animeRes.results.map(i => formatItem(i, 'anime'));

            if (actionMoviesRes?.results) libraryData.actionMovies = actionMoviesRes.results.map(i => formatItem(i, 'movie'));
            if (horrorMoviesRes?.results) libraryData.horrorMovies = horrorMoviesRes.results.map(i => formatItem(i, 'movie'));
            if (romanceMoviesRes?.results) libraryData.romanceMovies = romanceMoviesRes.results.map(i => formatItem(i, 'movie'));
            if (actionTVRes?.results) libraryData.actionTV = actionTVRes.results.map(i => formatItem(i, 'tv'));
            if (horrorTVRes?.results) libraryData.horrorTV = horrorTVRes.results.map(i => formatItem(i, 'tv'));
            if (romanceTVRes?.results) libraryData.romanceTV = romanceTVRes.results.map(i => formatItem(i, 'tv'));
            if (actionKDramaRes?.results) libraryData.actionKDrama = actionKDramaRes.results.map(i => formatItem(i, 'tv'));
            if (horrorKDramaRes?.results) libraryData.horrorKDrama = horrorKDramaRes.results.map(i => formatItem(i, 'tv'));
            if (romanceKDramaRes?.results) libraryData.romanceKDrama = romanceKDramaRes.results.map(i => formatItem(i, 'tv'));

            updateTabState(currentTab);
        } catch (error) {
            console.error('Error fetching catalog data:', error);
            updateTabState(currentTab);
        } finally {
            if (appLoader) {
                setTimeout(() => {
                    appLoader.classList.add('hidden');
                }, 300);
            }
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

    // --- INITIALIZATION ---
    function init() {
        if (isInitialized) return;
        isInitialized = true;

        if (homeBtn) homeBtn.onclick = () => updateTabState('home');
        if (document.getElementById('tv-nav-btn')) document.getElementById('tv-nav-btn').onclick = () => updateTabState('tv');
        if (document.getElementById('kdrama-nav-btn')) document.getElementById('kdrama-nav-btn').onclick = () => updateTabState('kdrama');
        if (document.getElementById('anime-nav-btn')) document.getElementById('anime-nav-btn').onclick = () => updateTabState('anime');
        if (document.getElementById('movies-nav-btn')) document.getElementById('movies-nav-btn').onclick = () => updateTabState('movies');
        if (document.getElementById('popular-nav-btn')) document.getElementById('popular-nav-btn').onclick = () => updateTabState('popular');
        if (document.getElementById('mylist-nav-btn')) document.getElementById('mylist-nav-btn').onclick = () => updateTabState('mylist');

        if (document.getElementById('nav-logo')) document.getElementById('nav-logo').onclick = () => updateTabState('home');
        if (closeModalBtn) closeModalBtn.onclick = closeModal;

        if (heroSetup) {
            heroSetup.onclick = () => {
                heroSetup.classList.add('hidden');
                loadData();
            };
        }

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
            searchInput.addEventListener('input', (e) => {
                const value = e.target.value;
                clearTimeout(searchDebounce);
                if (value.length > 0) {
                    if (heroSection) heroSection.style.display = 'none';
                    if (contentRows) {
                        contentRows.classList.remove('-mt-20');
                        contentRows.classList.add('mt-24');
                    }
                    searchDebounce = setTimeout(() => handleSearch(value), 400);
                } else {
                    if (heroSection) heroSection.style.display = 'flex';
                    if (contentRows) {
                        contentRows.classList.remove('-mt-20');
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
                if (e.target === detailModal || (e.target && e.target.classList && e.target.classList.contains('modal-blur'))) {
                    closeModal();
                }
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

        buildServerButtons();
        loadData();
    }

    document.addEventListener('DOMContentLoaded', init);
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 50);
    }
})();