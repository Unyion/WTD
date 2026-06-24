// DOM elements
const weatherDependentCheckbox = document.getElementById('weatherDependent');
const weatherOptions = document.getElementById('weatherOptions');
const temperatureDependentCheckbox = document.getElementById('temperatureDependent');
const temperatureControls = document.getElementById('temperatureControls');
const temperatureMinSlider = document.getElementById('temperatureMin');
const temperatureMaxSlider = document.getElementById('temperatureMax');
const tempMinDisplay = document.getElementById('tempMinDisplay');
const tempMaxDisplay = document.getElementById('tempMaxDisplay');
const seasonalCheckbox = document.getElementById('seasonal');
const seasonalOptions = document.getElementById('seasonalOptions');
const timeDependentCheckbox = document.getElementById('timeDependent');
const timeOptions = document.getElementById('timeOptions');
const daylightOnlyCheckbox = document.getElementById('daylightOnly');
const timeControls = document.getElementById('timeControls');
const startTimeSelect = document.getElementById('startTime');
const endTimeSelect = document.getElementById('endTime');
const dayOfWeekCheckbox = document.getElementById('dayOfWeek');
const dayOfWeekOptions = document.getElementById('dayOfWeekOptions');
const addActivityButton = document.getElementById('addActivity');
const activityNameInput = document.getElementById('activityName');
const tellMeWhatToDoButton = document.getElementById('tellMeWhatToDo');
const weatherDisplay = document.getElementById('weatherDisplay');
const settingsButton = document.getElementById('settingsButton');
const { version: appVersion } = require('../package.json');
const { ipcRenderer } = require('electron');

let updaterListenersInitialized = false;
let updaterDownloadInProgress = false;
let lastUpdateProgressNotice = -1;

// Weather forecast caching
const weatherForecast = {
    data: [],
    lastFetchTime: 0,
    cacheExpiry: 30 * 60 * 1000, // 30 minutes in milliseconds
    
    isCacheValid() {
        return this.lastFetchTime && (Date.now() - this.lastFetchTime) < this.cacheExpiry;
    },
    
    setData(forecastData) {
        this.data = forecastData;
        this.lastFetchTime = Date.now();
    },
    
    clearCache() {
        this.data = [];
        this.lastFetchTime = 0;
    }
};

// Weather rate limiting
const weatherRateLimit = {
    requests: [],
    maxRequests: 3,
    timeWindow: 60 * 1000, // 1 minute in milliseconds
    
    canMakeRequest() {
        const now = Date.now();
        // Remove requests older than the time window
        this.requests = this.requests.filter(timestamp => now - timestamp < this.timeWindow);
        
        // Check if we can make a new request
        if (this.requests.length < this.maxRequests) {
            this.requests.push(now);
            return true;
        }
        return false;
    },
    
    getTimeUntilNextRequest() {
        if (this.requests.length < this.maxRequests) return 0;
        
        const oldestRequest = Math.min(...this.requests);
        const timeUntilReset = this.timeWindow - (Date.now() - oldestRequest);
        return Math.max(0, Math.ceil(timeUntilReset / 1000)); // Return seconds
    }
};

// Location autocomplete functionality
const locationAutocomplete = {
    suggestions: [],
    selectedIndex: -1,
    isVisible: false,
    searchTimeout: null,
    
    async searchLocations(query) {
        console.log('searchLocations called with query:', query);
        
        if (query.length < 2) {
            console.log('Query too short, hiding suggestions');
            this.hideSuggestions();
            return;
        }
        
        try {
            const API_KEY = '1b3f996b321116580a695dbe6ae7f026';
            let url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=8&appid=${API_KEY}`;
            
            console.log('Fetching from URL:', url);
            let response = await fetch(url);
            console.log('API response status:', response.status);
            
            if (response.ok) {
                let locations = await response.json();
                console.log('Raw API response:', locations);
                
                // If no results and query contains a space, try fallback search with first word only
                if (locations.length === 0 && query.includes(' ')) {
                    const firstWord = query.split(' ')[0].trim();
                    console.log('No results found, trying fallback search with first word:', firstWord);
                    
                    // Only try fallback if first word is at least 2 characters
                    if (firstWord.length >= 2) {
                        const fallbackUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(firstWord)}&limit=8&appid=${API_KEY}`;
                        console.log('Fallback URL:', fallbackUrl);
                        
                        const fallbackResponse = await fetch(fallbackUrl);
                        if (fallbackResponse.ok) {
                            const fallbackLocations = await fallbackResponse.json();
                            console.log('Fallback API response:', fallbackLocations);
                            locations = fallbackLocations; // Use fallback results
                        }
                    }
                }
                
                // Format locations for display
                this.suggestions = locations.map(location => {
                    let displayName = location.name;
                    let searchValue = location.name;
                    
                    // Add state for US locations
                    if (location.country === 'US' && location.state) {
                        displayName += `, ${location.state}`;
                        searchValue += `,${location.state}`;
                    }
                    
                    // Add country
                    displayName += `, ${location.country}`;
                    searchValue += `,${location.country}`;
                    
                    return {
                        display: displayName,
                        value: searchValue,
                        lat: location.lat,
                        lon: location.lon
                    };
                });
                
                console.log('Formatted suggestions:', this.suggestions);
                this.showSuggestions();
            } else {
                console.error('API request failed with status:', response.status);
                this.hideSuggestions();
            }
        } catch (error) {
            console.error('Location search error:', error);
            this.hideSuggestions();
        }
    },
    
    showSuggestions() {
        const input = document.getElementById('settingsLocation');
        const dropdown = this.getOrCreateDropdown();
        
        if (!input || this.suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        // Clear existing suggestions
        dropdown.innerHTML = '';
        
        this.suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                font-size: 12px;
                color: var(--fg-light);
                border-bottom: 1px solid var(--button-bg);
                transition: background-color 0.2s ease;
            `;
            
            item.textContent = suggestion.display;
            
            // Hover effects
            item.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this.updateSelection();
            });
            
            item.addEventListener('mouseleave', () => {
                this.selectedIndex = -1;
                this.updateSelection();
            });
            
            // Click handler
            item.addEventListener('click', () => {
                this.selectSuggestion(index);
            });
            
            dropdown.appendChild(item);
        });
        
        // Position dropdown
        const inputRect = input.getBoundingClientRect();
        dropdown.style.cssText += `
            position: fixed;
            top: ${inputRect.bottom + 2}px;
            left: ${inputRect.left}px;
            width: ${inputRect.width}px;
            max-height: 200px;
            overflow-y: auto;
            background-color: var(--input-bg);
            border: 1px solid var(--button-bg);
            border-radius: 3px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1001;
            display: block;
        `;
        
        this.isVisible = true;
        this.selectedIndex = -1;
    },
    
    hideSuggestions() {
        const dropdown = document.getElementById('location-autocomplete-dropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
        this.isVisible = false;
        this.selectedIndex = -1;
    },
    
    getOrCreateDropdown() {
        let dropdown = document.getElementById('location-autocomplete-dropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'location-autocomplete-dropdown';
            dropdown.style.display = 'none';
            document.body.appendChild(dropdown);
        }
        return dropdown;
    },
    
    updateSelection() {
        const dropdown = document.getElementById('location-autocomplete-dropdown');
        if (!dropdown) return;
        
        const items = dropdown.querySelectorAll('.autocomplete-item');
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.style.backgroundColor = 'var(--button-active-bg)';
            } else {
                item.style.backgroundColor = 'transparent';
            }
        });
    },
    
    selectSuggestion(index) {
        if (index >= 0 && index < this.suggestions.length) {
            const suggestion = this.suggestions[index];
            const input = document.getElementById('settingsLocation');
            if (input) {
                input.value = suggestion.value;
                this.hideSuggestions();
                input.focus();
            }
        }
    },
    
    handleKeyDown(e) {
        if (!this.isVisible) return false;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
                this.updateSelection();
                return true;
                
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.updateSelection();
                return true;
                
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0) {
                    this.selectSuggestion(this.selectedIndex);
                } else if (this.suggestions.length > 0) {
                    this.selectSuggestion(0);
                }
                return true;
                
            case 'Escape':
                this.hideSuggestions();
                return true;
                
            default:
                return false;
        }
    }
};

// Enhanced app initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('App initialized at:', new Date().toLocaleTimeString());

    setupUpdaterEventListeners();
    
    // Setup basic functionality first
    setupEventListeners();
    populateTimeOptions();
    
    // Initialize theme
    initializeTheme();
    setupSystemThemeListener();
    
    // Load existing activities - will be called after weather is loaded in updateWeather()
    validateForm();
    
    // Initialize temperature unit display
    updateTemperatureUnitDisplay();
    
    // Initialize temperature slider bounds based on unit preference
    const tempUnit = localStorage.getItem('wtd-temp-unit') || 'F';
    if (temperatureMinSlider && temperatureMaxSlider) {
        if (tempUnit === 'C') {
            temperatureMinSlider.min = '-30';
            temperatureMinSlider.max = '50';
            temperatureMaxSlider.min = '-30';
            temperatureMaxSlider.max = '50';
        } else {
            temperatureMinSlider.min = '-20';
            temperatureMinSlider.max = '120';
            temperatureMaxSlider.min = '-20';
            temperatureMaxSlider.max = '120';
        }
    }
    
    // Show initial loading state
    weatherDisplay.textContent = '🔄 Starting up...';
    
    // One-time update opt-in prompt on first launch
    await showAutoUpdatePromptIfNeeded();

    const autoUpdateEnabled = localStorage.getItem('wtd-auto-update-enabled') === 'true';
    if (autoUpdateEnabled) {
        await requestUpdateCheck({ showStatus: false });
    }

    // Initialize weather with auto-detection
    console.log('Initializing location detection...');
    
    // Add a small delay to let the UI render first
    setTimeout(async () => {
        await updateWeather();
        // Note: No auto-refresh interval - only manual updates and startup
    }, 500);
});

// Setup all event listeners
function setupEventListeners() {
    // Main checkbox toggles
    weatherDependentCheckbox.addEventListener('change', toggleWeatherOptions);
    temperatureDependentCheckbox.addEventListener('change', toggleTemperatureControls);
    seasonalCheckbox.addEventListener('change', toggleSeasonalOptions);
    timeDependentCheckbox.addEventListener('change', toggleTimeOptions);
    daylightOnlyCheckbox.addEventListener('change', toggleDaylightOnly);
    if (dayOfWeekCheckbox) dayOfWeekCheckbox.addEventListener('change', toggleDayOfWeekOptions);
    
    // Temperature range sliders
    if (temperatureMinSlider && temperatureMaxSlider) {
        temperatureMinSlider.addEventListener('input', updateTemperatureSliders);
        temperatureMaxSlider.addEventListener('input', updateTemperatureSliders);
    }
    
    // Button clicks
    addActivityButton.addEventListener('click', addActivity);
    tellMeWhatToDoButton.addEventListener('click', suggestActivity);
    
    // Enhanced weather display click listener with rate limiting
    weatherDisplay.addEventListener('click', () => {
        const weatherText = weatherDisplay.textContent;
        if (weatherText.includes('Location not found') || weatherText.includes('Unable to get location') || weatherText.includes('Click to set')) {
            console.log('Location not found - opening settings');
            showSettingsModal();
        } else {
            // Check rate limiting
            if (!weatherRateLimit.canMakeRequest()) {
                const waitTime = weatherRateLimit.getTimeUntilNextRequest();
                showNotification(`Please wait ${waitTime} seconds before refreshing weather again`, 'warning');
                return;
            }
            
            console.log('Manual weather refresh requested');
            weatherDisplay.textContent = '🔄 Refreshing...';
            updateWeather();
        }
    });
    
    // Enhanced weather display hover for tooltip
    let hoverTimeout;
    weatherDisplay.addEventListener('mouseenter', (e) => {
        // Only show tooltip if weather has been loaded successfully
        const weatherText = weatherDisplay.textContent;
        if (!weatherText.includes('🔄') && !weatherText.includes('📍') && !weatherText.includes('❌') && !weatherText.includes('⏱️') && !weatherText.includes('🌐')) {
            const lastUpdated = localStorage.getItem('wtd-weather-last-updated');
            if (lastUpdated) {
                const minutesAgo = Math.floor((Date.now() - parseInt(lastUpdated)) / (1000 * 60));
                let timeText;
                if (minutesAgo === 0) {
                    timeText = 'just now';
                } else if (minutesAgo === 1) {
                    timeText = '1 minute ago';
                } else if (minutesAgo < 60) {
                    timeText = `${minutesAgo} minutes ago`;
                } else {
                    const hoursAgo = Math.floor(minutesAgo / 60);
                    if (hoursAgo === 1) {
                        timeText = '1 hour ago';
                    } else {
                        timeText = `${hoursAgo} hours ago`;
                    }
                }
                
                hoverTimeout = setTimeout(() => {
                    showTooltip(e, `Last updated ${timeText}. Click to refresh.`);
                }, 500); // Small delay before showing tooltip
            }
        }
    });
    
    weatherDisplay.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimeout);
        hideTooltip();
    });
    
    weatherDisplay.addEventListener('mousemove', (e) => {
        updateTooltipPosition(e);
    });
    
    weatherDisplay.style.cursor = 'pointer';
    
    // Settings button click
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            console.log('Settings button clicked');
            showSettingsModal();
        });
    }
    
    // History button click
    const historyButton = document.getElementById('historyButton');
    if (historyButton) {
        historyButton.addEventListener('click', () => {
            console.log('History button clicked');
            const historyPanel = document.getElementById('historyPanel');
            historyPanel.classList.toggle('open');
            if (historyPanel.classList.contains('open')) {
                displayHistory();
            }
        });
    }
    
    // History close button
    const historyCloseButton = document.getElementById('historyCloseButton');
    if (historyCloseButton) {
        historyCloseButton.addEventListener('click', () => {
            const historyPanel = document.getElementById('historyPanel');
            historyPanel.classList.remove('open');
        });
    }
    
    // History delete button (for selected entries)
    const historyUndoButton = document.getElementById('historyUndoButton');
    if (historyUndoButton) {
        historyUndoButton.addEventListener('click', () => {
            undoLastDeletion();
        });
    }
    
    // History clear all button
    const historyClearAllButton = document.getElementById('historyClearAllButton');
    if (historyClearAllButton) {
        historyClearAllButton.addEventListener('click', () => {
            clearAllHistory();
        });
    }
    
    // Input validation
    activityNameInput.addEventListener('input', validateForm);
    
    // Enter key in activity input
    activityNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !addActivityButton.disabled) {
            addActivity();
        }
    });
    
    // Keyboard shortcut for undo (Ctrl+Z or Cmd+Z)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            const undoButton = document.getElementById('historyUndoButton');
            if (undoButton && !undoButton.disabled) {
                undoLastDeletion();
            }
        }
    });
}

function setupUpdaterEventListeners() {
    if (updaterListenersInitialized || !ipcRenderer) {
        return;
    }

    ipcRenderer.on('updater:event', (event, payload) => {
        handleUpdaterEvent(payload);
    });

    updaterListenersInitialized = true;
}

function handleUpdaterEvent(payload = {}) {
    console.log('[updater:event]', payload);

    switch (payload.status) {
        case 'checking':
            if (payload.manual) {
                showNotification('Checking for updates...', 'info');
            }
            break;

        case 'available':
            showUpdateAvailableModal(payload.version || 'new version', payload.releaseNotes || '');
            break;

        case 'not-available':
            if (payload.manual) {
                showNotification('You are running the latest version.', 'success');
            }
            break;

        case 'download-progress': {
            const percent = Math.max(0, Math.min(100, Math.round(payload.percent || 0)));
            if (percent % 10 === 0 && percent !== lastUpdateProgressNotice) {
                lastUpdateProgressNotice = percent;
                showNotification(`Downloading update... ${percent}%`, 'info');
            }
            break;
        }

        case 'downloaded':
            updaterDownloadInProgress = false;
            lastUpdateProgressNotice = -1;
            showUpdateReadyModal(payload.version || 'latest');
            break;

        case 'error':
            updaterDownloadInProgress = false;
            lastUpdateProgressNotice = -1;
            showNotification(`Updater error: ${formatUpdaterError(payload.message)}`, 'warning');
            break;

        default:
            break;
    }
}

function formatUpdaterError(message) {
    const raw = typeof message === 'string' ? message : '';
    const normalized = raw.toLowerCase();

    if (normalized.includes('.yml') && (normalized.includes('cannot find') || normalized.includes('not found') || normalized.includes('404'))) {
        return 'Update metadata is not ready on GitHub yet. Try again in a few minutes.';
    }

    if (!raw) {
        return 'Unknown error.';
    }

    const compact = raw.replace(/\s+/g, ' ').trim();
    return compact.length > 220 ? `${compact.slice(0, 217)}...` : compact;
}

function normalizeReleaseNotes(releaseNotes) {
    if (!releaseNotes) {
        return '';
    }

    let raw = '';

    if (Array.isArray(releaseNotes)) {
        raw = releaseNotes.map((item) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
                return item.note || item.body || '';
            }
            return '';
        }).join('\n\n');
    } else if (typeof releaseNotes === 'object') {
        raw = releaseNotes.note || releaseNotes.body || '';
    } else {
        raw = String(releaseNotes);
    }

    const scratch = document.createElement('div');
    scratch.innerHTML = raw;
    const plain = (scratch.textContent || scratch.innerText || '').trim();
    if (!plain) {
        return '';
    }

    return plain.length > 700 ? `${plain.slice(0, 697)}...` : plain;
}

async function showAutoUpdatePromptIfNeeded() {
    const hasPrompted = localStorage.getItem('wtd-update-prompt-shown');
    if (hasPrompted) return;

    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.id = 'update-optin-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.75);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background-color: var(--bg-dark);
            border: 2px solid var(--accent);
            border-radius: 12px;
            padding: 28px;
            max-width: 420px;
            width: 100%;
            color: var(--fg-light);
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
            font-size: 13px;
            position: relative;
        `;

        modal.innerHTML = `
            <h2 style="color: var(--accent); margin-bottom: 16px; font-size: 20px; text-align: center;">Enable Auto Updates?</h2>
            <p style="margin-bottom: 16px; color: var(--fg-muted); line-height: 1.5;">Should What To Do automatically check for updates when it starts? You can also check manually from Settings anytime.</p>
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px; flex-wrap: wrap;">
                <button id="allowAutoUpdateBtn" style="background-color: var(--accent); color: white; border: none; padding: 10px 16px; border-radius: 5px; cursor: pointer; min-width: 130px;">Enable auto updates</button>
                <button id="declineAutoUpdateBtn" style="background-color: var(--button-bg); color: var(--fg-light); border: none; padding: 10px 16px; border-radius: 5px; cursor: pointer; min-width: 130px;">No thanks</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const allowBtn = document.getElementById('allowAutoUpdateBtn');
        const declineBtn = document.getElementById('declineAutoUpdateBtn');

        const close = () => {
            localStorage.setItem('wtd-update-prompt-shown', 'true');
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            resolve();
        };

        allowBtn.addEventListener('click', () => {
            localStorage.setItem('wtd-auto-update-enabled', 'true');
            showNotification('Auto updates enabled. Checking now...', 'success');
            close();
        });

        declineBtn.addEventListener('click', () => {
            localStorage.setItem('wtd-auto-update-enabled', 'false');
            close();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                localStorage.setItem('wtd-auto-update-enabled', 'false');
                close();
            }
        });
    });
}

async function requestUpdateCheck({ showStatus = false } = {}) {
    if (!ipcRenderer) {
        if (showStatus) {
            showNotification('Updater is unavailable in this build.', 'warning');
        }
        return;
    }

    try {
        const result = await ipcRenderer.invoke('updater:check-for-updates', { manual: showStatus });
        if (!result?.ok && showStatus) {
            showNotification(result?.message || 'Unable to check for updates.', 'warning');
        }
    } catch (error) {
        console.error('Error requesting update check:', error);
        if (showStatus) {
            showNotification('Unable to check for updates.', 'warning');
        }
    }
}

async function startUpdateDownload(latestVersion) {
    if (updaterDownloadInProgress) {
        showNotification('An update is already downloading.', 'info');
        return;
    }

    try {
        const result = await ipcRenderer.invoke('updater:download-update');
        if (!result?.ok) {
            showNotification(result?.message || 'Unable to download update.', 'warning');
            return;
        }

        updaterDownloadInProgress = true;
        lastUpdateProgressNotice = -1;
        showNotification(`Downloading update ${latestVersion}...`, 'info');
    } catch (error) {
        console.error('Error starting update download:', error);
        showNotification('Unable to download update.', 'warning');
    }
}

async function installDownloadedUpdate() {
    try {
        const result = await ipcRenderer.invoke('updater:quit-and-install');
        if (!result?.ok) {
            showNotification(result?.message || 'Unable to install update.', 'warning');
        }
    } catch (error) {
        console.error('Error installing update:', error);
        showNotification('Unable to install update.', 'warning');
    }
}

function showUpdateAvailableModal(latestVersion, releaseNotes) {
    const existing = document.getElementById('update-available-overlay');
    if (existing) {
        existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'update-available-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.75);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background-color: var(--bg-dark);
        border: 2px solid var(--accent);
        border-radius: 12px;
        padding: 28px;
        max-width: 400px;
        width: 100%;
        color: var(--fg-light);
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
        font-size: 13px;
    `;

    const readableReleaseNotes = normalizeReleaseNotes(releaseNotes);

    modal.innerHTML = `
        <h2 style="color: var(--accent); margin-bottom: 18px; font-size: 20px; text-align: center;">Update Available</h2>
        <p style="margin-bottom: 16px; text-align: center; font-weight: 700; font-size: 14px;">Current: ${appVersion} — Latest: ${latestVersion}</p>
        ${readableReleaseNotes ? `<p style="font-size: 11px; color: var(--fg-muted); margin-bottom: 14px; max-height: 140px; overflow-y: auto; white-space: pre-wrap;">${readableReleaseNotes}</p>` : ''}
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button id="downloadUpdateBtn" style="background-color: var(--accent); color: white; border: none; padding: 10px 16px; border-radius: 5px; cursor: pointer; font-weight: 600;">Download Update</button>
            <button id="dismissUpdateBtn" style="background-color: var(--button-bg); color: var(--fg-light); border: none; padding: 10px 16px; border-radius: 5px; cursor: pointer;">Later</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('downloadUpdateBtn').addEventListener('click', async () => {
        await startUpdateDownload(latestVersion);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });

    document.getElementById('dismissUpdateBtn').addEventListener('click', () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
}

function showUpdateReadyModal(latestVersion) {
    const existing = document.getElementById('update-ready-overlay');
    if (existing) {
        existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'update-ready-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.75);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background-color: var(--bg-dark);
        border: 2px solid var(--accent);
        border-radius: 12px;
        padding: 28px;
        max-width: 400px;
        width: 100%;
        color: var(--fg-light);
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
        font-size: 13px;
    `;

    modal.innerHTML = `
        <h2 style="color: var(--accent); margin-bottom: 18px; font-size: 20px; text-align: center;">Update Ready</h2>
        <p style="margin-bottom: 16px; text-align: center; font-weight: 700; font-size: 14px;">Version ${latestVersion} has been downloaded.</p>
        <p style="margin-bottom: 16px; text-align: center; color: var(--fg-muted);">Restart now to install the update.</p>
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button id="restartToUpdateBtn" style="background-color: var(--accent); color: white; border: none; padding: 10px 16px; border-radius: 5px; cursor: pointer; font-weight: 600;">Restart and Install</button>
            <button id="laterToUpdateBtn" style="background-color: var(--button-bg); color: var(--fg-light); border: none; padding: 10px 16px; border-radius: 5px; cursor: pointer;">Later</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('restartToUpdateBtn').addEventListener('click', async () => {
        await installDownloadedUpdate();
    });

    document.getElementById('laterToUpdateBtn').addEventListener('click', () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
}

// Enhanced getUserLocation function with auto-detection
async function getUserLocation() {
    // First check if we have a saved location preference
    const savedLocation = localStorage.getItem('wtd-location');
    if (savedLocation && savedLocation.trim() !== '') {
        console.log('Using saved location:', savedLocation);
        return savedLocation;
    }
    
    // Check if we have a recent cached location to avoid repeated API calls
    const cachedLocation = localStorage.getItem('wtd-cached-location');
    const cacheTimestamp = localStorage.getItem('wtd-cache-timestamp');
    const now = Date.now();
    
    // Use cached location if less than 1 hour old
    if (cachedLocation && cacheTimestamp && (now - parseInt(cacheTimestamp)) < 60 * 60 * 1000) {
        console.log('Using cached location:', cachedLocation);
        return cachedLocation;
    }
    
    // Try auto-detection methods
    console.log('Attempting auto location detection...');
    
    // Method 1: Try geolocation API with fallback to IP-based detection
    try {
        const autoLocation = await attemptAutoLocationDetection();
        if (autoLocation) {
            // Cache the detected location
            localStorage.setItem('wtd-cached-location', autoLocation);
            localStorage.setItem('wtd-cache-timestamp', now.toString());
            console.log('Auto-detected location:', autoLocation);
            return autoLocation;
        }
    } catch (error) {
        console.log('Auto-detection failed:', error.message);
    }
    
    // If all auto-detection methods fail, return null to prompt user
    console.log('All auto-detection methods failed - will prompt for manual location');
    return null;
}

// Attempt auto location detection with multiple methods
async function attemptAutoLocationDetection() {
    // Method 1: Try HTML5 Geolocation API first
    try {
        const geoLocation = await getGeolocation();
        if (geoLocation) {
            console.log('Geolocation successful:', geoLocation);
            return geoLocation;
        }
    } catch (error) {
        console.log('Geolocation failed:', error.message);
    }
    
    // Method 2: Try IP-based location as fallback
    try {
        const ipLocation = await getLocationByIP();
        if (ipLocation) {
            console.log('IP-based location successful:', ipLocation);
            return ipLocation;
        }
    } catch (error) {
        console.log('IP-based location failed:', error.message);
    }
    
    return null;
}

// Get location using HTML5 Geolocation API
function getGeolocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'));
            return;
        }
        
        // Show user that we're detecting location
        weatherDisplay.textContent = '📍 Detecting your location...';
        
        const options = {
            enableHighAccuracy: false, // Faster, less battery
            timeout: 15000, // 15 second timeout
            maximumAge: 300000 // Accept 5-minute old position
        };
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                console.log('Geolocation coordinates:', { lat, lon });
                
                try {
                    // Use reverse geocoding to get city name
                    const cityName = await reverseGeocode(lat, lon);
                    if (cityName) {
                        resolve(cityName);
                    } else {
                        // Fall back to coordinates if reverse geocoding fails
                        resolve(`lat=${lat}&lon=${lon}`);
                    }
                } catch (error) {
                    console.log('Reverse geocoding failed, using coordinates:', error);
                    resolve(`lat=${lat}&lon=${lon}`);
                }
            },
            (error) => {
                console.log('Geolocation error:', error.message);
                let errorMessage = 'Geolocation failed';
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied by user';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out';
                        break;
                }
                
                reject(new Error(errorMessage));
            },
            options
        );
    });
}

// Reverse geocoding to convert coordinates to city name
async function reverseGeocode(lat, lon) {
    try {
        const API_KEY = '1b3f996b321116580a695dbe6ae7f026';
        const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
        
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                const location = data[0];
                let locationString = location.name;
                
                // Add state for US locations
                if (location.country === 'US' && location.state) {
                    locationString += `,${location.state}`;
                }
                
                // Add country code
                locationString += `,${location.country}`;
                
                console.log('Reverse geocoded to:', locationString);
                return locationString;
            }
        }
    } catch (error) {
        console.log('Reverse geocoding error:', error);
    }
    
    return null;
}

// Get location by IP address
async function getLocationByIP() {
    try {
        console.log('Trying IP-based location detection...');
        weatherDisplay.textContent = '🌐 Detecting location by IP...';
        
        // Try ipapi.co first (free tier, good accuracy)
        const response = await fetch('https://ipapi.co/json/', {
            timeout: 10000
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data && data.city && data.country_code) {
                let locationString = data.city;
                
                // Add state/region for US locations
                if (data.country_code === 'US' && data.region_code) {
                    locationString += `,${data.region_code}`;
                }
                
                // Add country code
                locationString += `,${data.country_code}`;
                
                console.log('IP-based location detected:', locationString);
                return locationString;
            }
        }
    } catch (error) {
        console.log('IP-based location error:', error);
    }
    
    // Fallback to a simpler IP service
    try {
        const response = await fetch('http://ip-api.com/json/', {
            timeout: 10000
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data && data.status === 'success' && data.city && data.countryCode) {
                let locationString = data.city;
                
                // Add state/region for US locations
                if (data.countryCode === 'US' && data.region) {
                    locationString += `,${data.region}`;
                }
                
                locationString += `,${data.countryCode}`;
                
                console.log('Fallback IP location detected:', locationString);
                return locationString;
            }
        }
    } catch (error) {
        console.log('Fallback IP location error:', error);
    }
    
    return null;
}

// Fetch weather forecast for lookahead checking
async function fetchWeatherForecast(lat, lon) {
    try {
        // Return cached data if still valid
        if (weatherForecast.isCacheValid()) {
            console.log('Using cached forecast data');
            return weatherForecast.data;
        }
        
        const API_KEY = '1b3f996b321116580a695dbe6ae7f026';
        const tempUnit = localStorage.getItem('wtd-temp-unit') || 'F';
        const units = tempUnit === 'F' ? 'imperial' : 'metric';
        const timestamp = Date.now();
        
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}&_=${timestamp}`;
        
        console.log('Fetching forecast from API...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(url, {
            signal: controller.signal,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'WTD-App/1.0'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            const forecastItems = data.list || [];
            
            // Store forecast data
            weatherForecast.setData(forecastItems);
            console.log('Forecast data cached:', forecastItems.length, 'items');
            
            return forecastItems;
        } else {
            console.error('Forecast API error:', response.status);
            return [];
        }
    } catch (error) {
        console.error('Error fetching forecast:', error.message);
        return [];
    }
}

// Get upcoming weather conditions within the lookahead buffer
function getUpcomingWeatherConditions(bufferMinutes = 120) {
    const now = new Date();
    const futureTime = new Date(now.getTime() + bufferMinutes * 60 * 1000);
    const conditions = [];
    
    weatherForecast.data.forEach(item => {
        const itemTime = new Date(item.dt * 1000);
        if (itemTime >= now && itemTime <= futureTime) {
            const condition = item.weather[0]?.main?.toLowerCase() || 'unknown';
            conditions.push({
                time: itemTime,
                condition: condition,
                description: item.weather[0]?.description || ''
            });
        }
    });
    
    return conditions;
}

// Check if bad weather is predicted within the buffer period
function willWeatherBlockActivity(activity, upcomingConditions) {
    if (!activity.weatherDependent || activity.weatherRestrictions.length === 0) {
        return false; // Activity doesn't have weather restrictions
    }
    
    // For activities with time windows, filter conditions to relevant times
    let relevantConditions = upcomingConditions;
    
    if (activity.timeDependent && !activity.daylightOnly) {
        // Filter conditions to only those during the activity's time window
        const startHour = parseInt(activity.startTime.split(':')[0]);
        const endHour = parseInt(activity.endTime.split(':')[0]);
        
        relevantConditions = upcomingConditions.filter(item => {
            const hour = item.time.getHours();
            return hour >= startHour && hour < endHour;
        });
    }
    
    // Check if any condition matches a restriction
    return relevantConditions.some(item => 
        activity.weatherRestrictions.some(restriction => 
            item.condition.includes(restriction.toLowerCase())
        )
    );
}

// Get time until weather event
function getTimeUntilWeatherEvent(activity, upcomingConditions) {
    if (!activity.weatherDependent || activity.weatherRestrictions.length === 0) {
        return null;
    }
    
    const now = new Date();
    
    for (const item of upcomingConditions) {
        if (activity.weatherRestrictions.some(restriction => 
            item.condition.includes(restriction.toLowerCase()))) {
            const minutesUntil = Math.round((item.time - now) / 60000);
            return {
                minutesUntil: minutesUntil,
                condition: item.condition
            };
        }
    }
    
    return null;
}

// Enhanced updateWeather function with better error handling
async function updateWeather() {
    console.log('updateWeather() called at:', new Date().toLocaleTimeString());
    
    try {
        const API_KEY = '1b3f996b321116580a695dbe6ae7f026';
        
        // Show loading state
        weatherDisplay.textContent = '🔄 Loading weather...';
        weatherDisplay.style.color = 'var(--fg-muted)';
        
        // Get user's location (auto-detect or saved preference)
        const location = await getUserLocation();
        
        if (!location) {
            // No location available - show clickable error message
            weatherDisplay.textContent = '📍 Click to set location';
            weatherDisplay.style.cursor = 'pointer';
            weatherDisplay.style.color = '#ff9800'; // Orange warning color
            
            // Disable "Tell Me What To Do" button
            updateTellMeWhatToDoButton(false);
            
            // Show helpful notification on first run
            const hasShownLocationHelp = localStorage.getItem('wtd-shown-location-help');
            if (!hasShownLocationHelp) {
                setTimeout(() => {
                    showNotification('Click the weather area to set your location', 'info');
                    localStorage.setItem('wtd-shown-location-help', 'true');
                }, 1000);
            }
            
            return;
        }
        
        console.log('Using location for weather:', location);
        
        // Build URL - different format for coordinates vs city name
        let url;
        const timestamp = Date.now();
        const tempUnit = localStorage.getItem('wtd-temp-unit') || 'F';
        const units = tempUnit === 'F' ? 'imperial' : 'metric';
        
        if (location.includes('lat=')) {
            // Using coordinates
            url = `https://api.openweathermap.org/data/2.5/weather?${location}&appid=${API_KEY}&units=${units}&_=${timestamp}`;
        } else {
            // Using city name
            url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${API_KEY}&units=${units}&_=${timestamp}`;
        }
        
        console.log('Fetching weather from:', url);
        
        // Add explicit timeout and error handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch(url, { 
            signal: controller.signal,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'WTD-App/1.0'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const weatherData = await response.json();
            console.log('Weather data received for:', weatherData.name);
            
            const condition = weatherData.weather[0].main.toLowerCase();
            const description = weatherData.weather[0].description;
            const temp = Math.round(weatherData.main.temp);
            const emoji = getWeatherEmoji(condition);
            
            // Get sunrise and sunset times
            const sunrise = new Date(weatherData.sys.sunrise * 1000);
            const sunset = new Date(weatherData.sys.sunset * 1000);
            
            // Store sunrise/sunset times globally for daylight checks
            window.sunriseTime = sunrise;
            window.sunsetTime = sunset;
            
            // Get temperature unit preference
            const tempUnit = localStorage.getItem('wtd-temp-unit') || 'F';
            const tempSuffix = tempUnit === 'F' ? '°F' : '°C';
            
            // Capitalize first letter of description
            const capitalizedDescription = description.charAt(0).toUpperCase() + description.slice(1);
            
            // Get city name and format location
            const cityName = weatherData.name || 'Unknown Location';
            const countryCode = weatherData.sys.country;
            
            let locationText = cityName;
            if (countryCode === 'US') {
                // Try to get state from the original location string
                const originalLocation = location.toLowerCase();
                if (originalLocation.includes(',')) {
                    const parts = originalLocation.split(',');
                    if (parts.length >= 2) {
                        const statePart = parts[1].trim();
                        if (statePart.length === 2) {
                            locationText = `${cityName}, ${statePart.toUpperCase()}`;
                        }
                    }
                }
            }
            
            const weatherText = `${locationText}\n${emoji} ${capitalizedDescription}, ${temp}${tempSuffix}`;
            weatherDisplay.textContent = weatherText;
            weatherDisplay.style.color = 'var(--fg-muted)';
            weatherDisplay.style.cursor = 'pointer';
            
            // Store the timestamp when weather was last updated
            localStorage.setItem('wtd-weather-last-updated', Date.now().toString());
            
            // Enable "Tell Me What To Do" button
            updateTellMeWhatToDoButton(true);
            
            // Store successful location for future use
            if (weatherData.name && !location.includes('lat=')) {
                localStorage.setItem('wtd-last-successful-location', location);
            }
            
            // Update daylight label with real times
            updateDaylightLabel();
            
            // Fetch forecast data asynchronously (don't block on it)
            const lat = weatherData.coord.lat;
            const lon = weatherData.coord.lon;
            fetchWeatherForecast(lat, lon).catch(error => {
                console.error('Forecast fetch failed:', error);
                // Continue without forecast data
            });
            
            // Update activities list based on new weather
            loadActivities();
            
            console.log('Weather updated successfully');
            
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Weather API error:', response.status, errorData);
            
            if (response.status === 404) {
                // Location not found - clear cached location and prompt for manual entry
                localStorage.removeItem('wtd-cached-location');
                localStorage.removeItem('wtd-cache-timestamp');
                weatherDisplay.textContent = '📍 Location not found - Click to set';
                weatherDisplay.style.color = '#ff6b6b';
                showNotification('Location not found. Please set your location manually.', 'warning');
            } else {
                throw new Error(`Weather API error: ${response.status}`);
            }
            
            updateTellMeWhatToDoButton(false);
        }
        
    } catch (error) {
        console.error('Error in updateWeather():', error);
        
        // Show specific error messages
        if (error.name === 'AbortError') {
            weatherDisplay.textContent = '⏱️ Request timed out - Click to retry';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
            weatherDisplay.textContent = '🌐 No internet connection';
        } else {
            weatherDisplay.textContent = '❌ Weather unavailable - Click to retry';
        }
        
        weatherDisplay.style.color = '#ff6b6b';
        weatherDisplay.style.cursor = 'pointer';
        
        // Disable "Tell Me What To Do" button on error
        updateTellMeWhatToDoButton(false);
        
        // Still try to load activities with default conditions
        loadActivities();
    }
}

// Toggle weather options visibility
function toggleWeatherOptions() {
    if (weatherDependentCheckbox.checked) {
        weatherOptions.style.display = 'block';
        setTimeout(() => weatherOptions.classList.add('show'), 10);
    } else {
        weatherOptions.classList.remove('show');
        setTimeout(() => weatherOptions.style.display = 'none', 300);
        
        // Uncheck all weather sub-options
        const weatherCheckboxes = weatherOptions.querySelectorAll('input[type="checkbox"]');
        weatherCheckboxes.forEach(cb => cb.checked = false);
    }
}

// Toggle temperature controls visibility
function toggleTemperatureControls() {
    if (temperatureDependentCheckbox.checked) {
        temperatureControls.style.display = 'block';
        setTimeout(() => temperatureControls.classList.add('show'), 10);
    } else {
        temperatureControls.classList.remove('show');
        setTimeout(() => temperatureControls.style.display = 'none', 300);
        
        // Reset temperature sliders to default
        if (temperatureMinSlider && temperatureMaxSlider) {
            temperatureMinSlider.value = -20;
            temperatureMaxSlider.value = 120;
            updateTemperatureDisplay();
        }
    }
}

// Update temperature display values
function updateTemperatureDisplay() {
    if (tempMinDisplay && tempMaxDisplay) {
        tempMinDisplay.textContent = temperatureMinSlider.value;
        tempMaxDisplay.textContent = temperatureMaxSlider.value;
    }
}

// Handle temperature slider changes (ensure min doesn't exceed max and vice versa)
function updateTemperatureSliders() {
    const minVal = parseInt(temperatureMinSlider.value);
    const maxVal = parseInt(temperatureMaxSlider.value);
    
    if (minVal > maxVal) {
        temperatureMinSlider.value = maxVal;
    } else if (maxVal < minVal) {
        temperatureMaxSlider.value = minVal;
    }
    
    updateTemperatureDisplay();
}

// Update temperature unit display
function updateTemperatureUnitDisplay() {
    const tempUnit = localStorage.getItem('wtd-temp-unit') || 'F';
    const unitSuffix = tempUnit === 'F' ? '°F' : '°C';
    
    const unitDisplays = document.querySelectorAll('.temp-unit-letter');
    unitDisplays.forEach(display => {
        display.textContent = unitSuffix;
    });
}

// Convert temperature values when unit changes
function convertTemperatureUnit(oldUnit, newUnit) {
    if (!temperatureMinSlider || !temperatureMaxSlider) return;
    
    let minVal = parseInt(temperatureMinSlider.value);
    let maxVal = parseInt(temperatureMaxSlider.value);
    
    // Convert from old unit to new unit
    if (oldUnit === 'F' && newUnit === 'C') {
        // F to C: (F - 32) × 5/9
        minVal = Math.round((minVal - 32) * 5/9);
        maxVal = Math.round((maxVal - 32) * 5/9);
        
        // Update slider bounds for Celsius range
        temperatureMinSlider.min = '-30';
        temperatureMinSlider.max = '50';
        temperatureMaxSlider.min = '-30';
        temperatureMaxSlider.max = '50';
    } else if (oldUnit === 'C' && newUnit === 'F') {
        // C to F: (C × 9/5) + 32
        minVal = Math.round((minVal * 9/5) + 32);
        maxVal = Math.round((maxVal * 9/5) + 32);
        
        // Update slider bounds for Fahrenheit range
        temperatureMinSlider.min = '-20';
        temperatureMinSlider.max = '120';
        temperatureMaxSlider.min = '-20';
        temperatureMaxSlider.max = '120';
    }
    
    // Set new values
    temperatureMinSlider.value = minVal;
    temperatureMaxSlider.value = maxVal;
    updateTemperatureDisplay();
    updateTemperatureUnitDisplay();
}

// Toggle seasonal options visibility
function toggleSeasonalOptions() {
    if (seasonalCheckbox.checked) {
        seasonalOptions.style.display = 'block';
        setTimeout(() => seasonalOptions.classList.add('show'), 10);
    } else {
        seasonalOptions.classList.remove('show');
        setTimeout(() => seasonalOptions.style.display = 'none', 300);
        
        // Uncheck all seasonal sub-options
        const seasonalCheckboxes = seasonalOptions.querySelectorAll('input[type="checkbox"]');
        seasonalCheckboxes.forEach(cb => cb.checked = false);
    }
}

// Toggle time options visibility
function toggleTimeOptions() {
    if (timeDependentCheckbox.checked) {
        timeOptions.style.display = 'block';
        setTimeout(() => timeOptions.classList.add('show'), 10);
    } else {
        timeOptions.classList.remove('show');
        setTimeout(() => timeOptions.style.display = 'none', 300);
        
        // Reset time options
        daylightOnlyCheckbox.checked = false;
        if (dayOfWeekCheckbox) dayOfWeekCheckbox.checked = false;
        toggleDaylightOnly();
        toggleDayOfWeekOptions();
    }
}

// Toggle day of week options visibility
function toggleDayOfWeekOptions() {
    if (dayOfWeekCheckbox && dayOfWeekCheckbox.checked && dayOfWeekOptions) {
        dayOfWeekOptions.style.display = 'block';
        setTimeout(() => dayOfWeekOptions.classList.add('show'), 10);
    } else if (dayOfWeekOptions) {
        dayOfWeekOptions.classList.remove('show');
        setTimeout(() => dayOfWeekOptions.style.display = 'none', 300);
        
        // Uncheck all day sub-options
        const dayCheckboxes = dayOfWeekOptions.querySelectorAll('input[type="checkbox"]');
        dayCheckboxes.forEach(cb => cb.checked = false);
    }
}

// Toggle daylight only controls
function toggleDaylightOnly() {
    const timeLabels = document.querySelectorAll('.time-input-group label');
    
    if (daylightOnlyCheckbox.checked) {
        startTimeSelect.disabled = true;
        endTimeSelect.disabled = true;
        timeLabels.forEach(label => label.classList.add('disabled'));
    } else {
        startTimeSelect.disabled = false;
        endTimeSelect.disabled = false;
        timeLabels.forEach(label => label.classList.remove('disabled'));
    }
}

// Populate time dropdown options
function populateTimeOptions() {
    const hours = [];
    const timeFormat = localStorage.getItem('wtd-time-format') || '24hr';
    
    if (timeFormat === '12hr') {
        // 12-hour format
        for (let i = 0; i < 24; i++) {
            let displayHour = i;
            let ampm = 'AM';
            
            if (i === 0) {
                displayHour = 12;
            } else if (i === 12) {
                displayHour = 12;
                ampm = 'PM';
            } else if (i > 12) {
                displayHour = i - 12;
                ampm = 'PM';
            }
            
            const value = i.toString().padStart(2, '0') + ':00';
            const display = `${displayHour}:00 ${ampm}`;
            hours.push({ value, display });
        }
    } else {
        // 24-hour format
        for (let i = 0; i < 24; i++) {
            const time = i.toString().padStart(2, '0') + ':00';
            hours.push({ value: time, display: time });
        }
    }
    
    // Clear existing options
    startTimeSelect.innerHTML = '';
    endTimeSelect.innerHTML = '';
    
    hours.forEach(hour => {
        const startOption = new Option(hour.display, hour.value);
        const endOption = new Option(hour.display, hour.value);
        startTimeSelect.appendChild(startOption);
        endTimeSelect.appendChild(endOption);
    });
    
    // Set default values
    startTimeSelect.value = '09:00';
    endTimeSelect.value = '17:00';
}

// Validate form inputs
function validateForm() {
    const isValid = activityNameInput.value.trim().length > 0;
    addActivityButton.disabled = !isValid;
    
    if (isValid) {
        addActivityButton.style.opacity = '1';
        addActivityButton.style.cursor = 'pointer';
    } else {
        addActivityButton.style.opacity = '0.5';
        addActivityButton.style.cursor = 'not-allowed';
    }
}

// Add new activity
async function addActivity() {
    const activityName = activityNameInput.value.trim();
    
    if (!activityName) {
        showNotification('Please enter an activity name', 'error');
        return;
    }
    
    // Collect form data
    const activity = {
        id: Date.now().toString(), // Simple ID generation
        name: activityName,
        weatherDependent: weatherDependentCheckbox.checked,
        weatherRestrictions: [],
        temperatureDependent: temperatureDependentCheckbox.checked,
        temperatureRange: { min: null, max: null },
        seasonal: seasonalCheckbox.checked,
        seasons: [],
        timeDependent: timeDependentCheckbox.checked,
        daylightOnly: daylightOnlyCheckbox.checked,
        startTime: startTimeSelect.value,
        endTime: endTimeSelect.value,
        dayOfWeekDependent: dayOfWeekCheckbox ? dayOfWeekCheckbox.checked : false,
        daysOfWeek: [],
        createdAt: new Date().toISOString(),
        enabled: true
    };
    
    // Collect weather restrictions
    if (activity.weatherDependent) {
        const weatherCheckboxes = weatherOptions.querySelectorAll('input[type="checkbox"]:not(#temperatureDependent):checked');
        activity.weatherRestrictions = Array.from(weatherCheckboxes).map(cb => cb.value);
    }
    
    // Collect temperature restrictions
    if (activity.temperatureDependent && temperatureMinSlider && temperatureMaxSlider) {
        activity.temperatureRange = {
            min: parseInt(temperatureMinSlider.value),
            max: parseInt(temperatureMaxSlider.value)
        };
    }
    
    // Collect seasonal restrictions
    if (activity.seasonal) {
        const seasonalCheckboxes = seasonalOptions.querySelectorAll('input[type="checkbox"]:checked');
        activity.seasons = Array.from(seasonalCheckboxes).map(cb => cb.value);
        
        // Validate that at least one season is selected
        if (activity.seasons.length === 0) {
            showNotification('Please select at least one season', 'error');
            return;
        }
    }
    
    // Collect day of week restrictions
    if (activity.dayOfWeekDependent && dayOfWeekOptions) {
        const dayCheckboxes = dayOfWeekOptions.querySelectorAll('input[type="checkbox"]:checked');
        activity.daysOfWeek = Array.from(dayCheckboxes).map(cb => cb.value);
        
        // Validate that at least one day is selected
        if (activity.daysOfWeek.length === 0) {
            showNotification('Please select at least one day of the week', 'error');
            return;
        }
    }
    
    // Validate time restrictions
    if (activity.timeDependent && !activity.daylightOnly) {
        const startHour = parseInt(activity.startTime.split(':')[0]);
        const endHour = parseInt(activity.endTime.split(':')[0]);
        
        if (startHour >= endHour) {
            showNotification('End time must be after start time', 'error');
            return;
        }
    }
    
    try {
        // Save activity
        console.log('Adding activity:', activity);
        
        // Store in localStorage
        saveActivityToStorage(activity);
        
        // Reset form
        resetForm();
        
        // Refresh activities list
        loadActivities();
        
        // Show success message
        showNotification('Activity added successfully!', 'success');
        
        // Focus back on input for quick adding
        activityNameInput.focus();
        
    } catch (error) {
        console.error('Error adding activity:', error);
        showNotification('Error adding activity', 'error');
    }
}

// Save activity to localStorage (temporary storage)
function saveActivityToStorage(activity) {
    let activities = JSON.parse(localStorage.getItem('wtd-activities') || '[]');
    
    // Check for duplicate names
    const existingActivity = activities.find(a => a.name.toLowerCase() === activity.name.toLowerCase());
    if (existingActivity) {
        throw new Error('Activity with this name already exists');
    }
    
    activities.push(activity);
    localStorage.setItem('wtd-activities', JSON.stringify(activities));
}

// Load activities from storage
function loadActivities() {
    const activities = JSON.parse(localStorage.getItem('wtd-activities') || '[]');
    const activitiesList = document.getElementById('activitiesList');
    
    activitiesList.innerHTML = '';
    
    if (activities.length === 0) {
        activitiesList.innerHTML = '<p style="color: var(--fg-muted); font-size: 11px; text-align: center; margin-top: 20px;">No activities saved yet</p>';
        return;
    }
    
    // Separate available and unavailable activities, then sort alphabetically
    const currentConditions = getCurrentConditions();
    const availableActivities = [];
    const unavailableActivities = [];
    
    activities.forEach((activity, index) => {
        const isAvailable = isActivityAvailable(activity, currentConditions);
        if (isAvailable) {
            availableActivities.push({ activity, index, isAvailable, currentConditions });
        } else {
            unavailableActivities.push({ activity, index, isAvailable, currentConditions });
        }
    });
    
    // Sort both groups alphabetically by activity name
    availableActivities.sort((a, b) => a.activity.name.toLowerCase().localeCompare(b.activity.name.toLowerCase()));
    unavailableActivities.sort((a, b) => a.activity.name.toLowerCase().localeCompare(b.activity.name.toLowerCase()));
    
    // Combine arrays - available first (alphabetical), then unavailable (alphabetical)
    const sortedActivities = [...availableActivities, ...unavailableActivities];
    
    sortedActivities.forEach(({ activity, index, isAvailable, currentConditions }) => {
        const activityElement = createActivityElement(activity, index, isAvailable, currentConditions);
        activitiesList.appendChild(activityElement);
    });
}

// Create activity element for the list
function createActivityElement(activity, index, isAvailable, currentConditions) {
    const div = document.createElement('div');
    div.className = 'activity-item';
    
    const baseStyle = `
        background-color: var(--button-bg);
        padding: 10px;
        margin-bottom: 8px;
        border-radius: 3px;
        cursor: pointer;
        transition: all 0.2s ease;
        border-left: 3px solid ${isAvailable ? 'var(--accent)' : 'var(--fg-muted)'};
        position: relative;
    `;
    
    const disabledStyle = isAvailable ? '' : 'opacity: 0.5; filter: grayscale(100%);';
    
    div.style.cssText = baseStyle + disabledStyle;
    
    // Create tooltip for unavailable activities
    let tooltipContent = '';
    if (!isAvailable) {
        tooltipContent = getUnavailabilityReason(activity, currentConditions);
    }
    
    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
                <div style="font-weight: bold; margin-bottom: 5px; ${isAvailable ? '' : 'color: var(--fg-muted);'}">${activity.name}</div>
                <div class="activity-details" style="font-size: 10px; color: var(--fg-muted); display: none;">
                    ${getActivityDetails(activity)}
                </div>
                ${!isAvailable ? '<div style="font-size: 9px; color: #ff6b6b; margin-top: 3px;">Currently unavailable</div>' : ''}
            </div>
            <div style="display: flex; gap: 5px;">
                <button class="edit-btn" style="background: none; border: none; color: var(--fg-muted); cursor: pointer; font-size: 12px; padding: 2px 5px; transition: color 0.2s ease;" title="Edit">✎</button>
                <button class="delete-btn" style="background: none; border: none; color: #ff6b6b; cursor: pointer; font-size: 12px; padding: 2px 5px; transition: all 0.2s ease; position: relative; display: inline-block; width: 16px; height: 16px;" title="Delete">
                    <span class="delete-icon" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">🗑</span>
                    <span class="delete-icon-hover" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; opacity: 0; filter: hue-rotate(0deg) brightness(1.5) saturate(2);">🗑</span>
                </button>
            </div>
        </div>
    `;
    
    // Add tooltip for unavailable activities
    if (!isAvailable && tooltipContent) {
        div.setAttribute('data-tooltip', tooltipContent);
    }
    
    // Event listeners
    div.addEventListener('mouseenter', (e) => {
        if (isAvailable) {
            div.style.backgroundColor = 'var(--button-active-bg)';
        }
        
        // Show tooltip for unavailable activities
        if (!isAvailable && tooltipContent) {
            showTooltip(e, tooltipContent);
        }
    });
    
    div.addEventListener('mouseleave', () => {
        div.style.backgroundColor = 'var(--button-bg)';
        hideTooltip();
    });
    
    div.addEventListener('mousemove', (e) => {
        if (!isAvailable && tooltipContent) {
            updateTooltipPosition(e);
        }
    });
    
    // Click to show/hide details
    div.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-btn') || e.target.classList.contains('delete-btn')) {
            return; // Don't toggle details if clicking buttons
        }
        
        const detailsDiv = div.querySelector('.activity-details');
        if (detailsDiv.style.display === 'none') {
            detailsDiv.style.display = 'block';
        } else {
            detailsDiv.style.display = 'none';
        }
    });
    
    // Right-click context menu
    div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, activity);
    });
    
    // Edit button with hover effect (works even when activity is grayed out)
    const editBtn = div.querySelector('.edit-btn');
    editBtn.addEventListener('mouseenter', () => {
        editBtn.style.color = 'var(--accent)';
    });
    editBtn.addEventListener('mouseleave', () => {
        editBtn.style.color = 'var(--fg-muted)';
    });
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showEditModal(activity);
    });
    
    // Delete button with hover effect (works even when activity is grayed out)
    const deleteBtn = div.querySelector('.delete-btn');
    const deleteIcon = deleteBtn.querySelector('.delete-icon');
    const deleteIconHover = deleteBtn.querySelector('.delete-icon-hover');
    
    deleteBtn.addEventListener('mouseenter', () => {
        deleteIcon.style.opacity = '0';
        deleteIconHover.style.opacity = '1';
        
        // Check current theme for appropriate hover effect
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const isLightMode = currentTheme === 'light' || 
                           (currentTheme === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches);
        
        if (isLightMode) {
            // In light mode, make it darker on hover
            deleteIconHover.style.filter = 'hue-rotate(0deg) brightness(0.3) saturate(2) contrast(2)';
        } else {
            // In dark mode, make it brighter on hover
            deleteIconHover.style.filter = 'hue-rotate(0deg) brightness(2) saturate(3) contrast(1.5)';
        }
    });
    deleteBtn.addEventListener('mouseleave', () => {
        deleteIcon.style.opacity = '1';
        deleteIconHover.style.opacity = '0';
    });
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteActivity(activity.id);
    });
    
    return div;
}

function getActivityDetails(activity) {
    const details = [];
    
    if (activity.weatherDependent && activity.weatherRestrictions.length > 0) {
        details.push(`Weather: No ${activity.weatherRestrictions.join(', ')}`);
    }
    
    if (activity.temperatureDependent && activity.temperatureRange && 
        activity.temperatureRange.min !== null && activity.temperatureRange.max !== null) {
        const tempUnit = localStorage.getItem('wtd-temp-unit') || 'F';
        const tempSuffix = tempUnit === 'F' ? '°F' : '°C';
        details.push(`Temp: ${activity.temperatureRange.min}-${activity.temperatureRange.max}${tempSuffix}`);
    }
    
    if (activity.seasonal && activity.seasons.length > 0) {
        details.push(`Seasons: ${activity.seasons.join(', ')}`);
    }
    
    if (activity.timeDependent) {
        if (activity.daylightOnly) {
            details.push('Time: Daylight only');
        } else {
            details.push(`Time: ${activity.startTime} - ${activity.endTime}`);
        }
    }
    
    return details.length > 0 ? details.join(' • ') : 'No restrictions';
}

// Check if activity is available based on current conditions
function isActivityAvailable(activity, conditions) {
    // Weather check - current conditions
    if (activity.weatherDependent && activity.weatherRestrictions.length > 0) {
        if (activity.weatherRestrictions.some(restriction => 
            conditions.weather.toLowerCase().includes(restriction.toLowerCase()))) {
            return false;
        }
    }
    
    // Weather check - upcoming conditions within buffer
    if (activity.weatherDependent && activity.weatherRestrictions.length > 0 && conditions.upcomingConditions) {
        if (willWeatherBlockActivity(activity, conditions.upcomingConditions)) {
            return false;
        }
    }
    
    // Temperature check
    if (activity.temperatureDependent && activity.temperatureRange && 
        activity.temperatureRange.min !== null && activity.temperatureRange.max !== null) {
        if (conditions.temperature !== null && conditions.temperature !== undefined) {
            if (conditions.temperature < activity.temperatureRange.min || 
                conditions.temperature > activity.temperatureRange.max) {
                return false;
            }
        }
    }
    
    // Season check
    if (activity.seasonal && activity.seasons.length > 0) {
        if (!activity.seasons.includes(conditions.season.toLowerCase())) {
            return false;
        }
    }
    
    // Day of week check
    if (activity.dayOfWeekDependent && activity.daysOfWeek && activity.daysOfWeek.length > 0) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDay = dayNames[conditions.currentTime.getDay()];
        if (!activity.daysOfWeek.includes(currentDay)) {
            return false;
        }
    }
    
    // Time check
    if (activity.timeDependent) {
        if (activity.daylightOnly) {
            // Use actual sunrise/sunset times if available
            if (window.sunriseTime && window.sunsetTime) {
                const now = conditions.currentTime;
                const currentTime = now.getTime();
                const sunriseTime = window.sunriseTime.getTime();
                const sunsetTime = window.sunsetTime.getTime();
                
                // Stop daylight activities 30 minutes before sunset to allow completion
                const effectiveSunsetTime = sunsetTime - (30 * 60 * 1000); // 30 minutes before sunset
                
                if (currentTime < sunriseTime || currentTime >= effectiveSunsetTime) {
                    return false;
                }
            } else {
                // Fallback to hardcoded times if sunrise/sunset not available
                const currentHour = conditions.currentTime.getHours();
                if (currentHour < 6 || currentHour >= 19) {
                    return false;
                }
            }
        } else {
            // Check custom time range
            const currentHour = conditions.currentTime.getHours();
            const startHour = parseInt(activity.startTime.split(':')[0]);
            const endHour = parseInt(activity.endTime.split(':')[0]);
            
            if (currentHour < startHour || currentHour >= endHour) {
                return false;
            }
        }
    }
    
    return true;
}

// Get reason why activity is unavailable
function getUnavailabilityReason(activity, conditions) {
    const reasons = [];
    
    // Weather check - current conditions
    if (activity.weatherDependent && activity.weatherRestrictions.length > 0) {
        if (activity.weatherRestrictions.some(restriction => 
            conditions.weather.toLowerCase().includes(restriction.toLowerCase()))) {
            reasons.push(`Current weather: ${conditions.weather}`);
        }
    }
    
    // Weather check - upcoming conditions
    if (activity.weatherDependent && activity.weatherRestrictions.length > 0 && conditions.upcomingConditions) {
        const weatherEvent = getTimeUntilWeatherEvent(activity, conditions.upcomingConditions);
        if (weatherEvent !== null) {
            const { minutesUntil, condition } = weatherEvent;
            let timeStr;
            if (minutesUntil < 60) {
                timeStr = `${minutesUntil}m`;
            } else {
                const hours = Math.floor(minutesUntil / 60);
                const mins = minutesUntil % 60;
                timeStr = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
            }
            // Capitalize condition (rain -> Rain, storm -> Storm, etc.)
            const capitalizedCondition = condition.charAt(0).toUpperCase() + condition.slice(1);
            reasons.push(`${capitalizedCondition} predicted in ${timeStr}`);
        }
    }
    
    // Temperature check
    if (activity.temperatureDependent && activity.temperatureRange && 
        activity.temperatureRange.min !== null && activity.temperatureRange.max !== null) {
        if (conditions.temperature !== null && conditions.temperature !== undefined) {
            const tempUnit = localStorage.getItem('wtd-temp-unit') || 'F';
            const tempSuffix = tempUnit === 'F' ? '°F' : '°C';
            
            if (conditions.temperature < activity.temperatureRange.min || 
                conditions.temperature > activity.temperatureRange.max) {
                reasons.push(`Temperature outside range (${activity.temperatureRange.min}-${activity.temperatureRange.max}${tempSuffix}, current: ${conditions.temperature}${tempSuffix})`);
            }
        }
    }
    
    // Season check
    if (activity.seasonal && activity.seasons.length > 0) {
        if (!activity.seasons.includes(conditions.season.toLowerCase())) {
            reasons.push(`Wrong season (current: ${conditions.season})`);
        }
    }
    
    // Day of week check
    if (activity.dayOfWeekDependent && activity.daysOfWeek && activity.daysOfWeek.length > 0) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = dayNames[conditions.currentTime.getDay()];
        if (!activity.daysOfWeek.includes(currentDay.toLowerCase())) {
            reasons.push(`Wrong day (current: ${currentDay})`);
        }
    }
    
    // Time check
    if (activity.timeDependent) {
        if (activity.daylightOnly) {
            // Use actual sunrise/sunset times if available
            if (window.sunriseTime && window.sunsetTime) {
                const now = conditions.currentTime;
                const currentTime = now.getTime();
                const sunriseTime = window.sunriseTime.getTime();
                const sunsetTime = window.sunsetTime.getTime();
                
                // Stop daylight activities 30 minutes before sunset (changed from 1 hour)
                const effectiveSunsetTime = sunsetTime - (30 * 60 * 1000); // 30 minutes before sunset
                
                if (currentTime < sunriseTime || currentTime >= effectiveSunsetTime) {
                    const sunriseStr = window.sunriseTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const actualSunsetStr = window.sunsetTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); // Show actual sunset time
                    
                    // Check if we're in the "need time to complete" window (effective sunset to actual sunset)
                    const isInPreSunsetWindow = currentTime >= effectiveSunsetTime && currentTime < sunsetTime;
                    
                    if (isInPreSunsetWindow) {
                        // We're in the 30-minute window before sunset - mention completion time
                        reasons.push(`Outside daylight hours (${sunriseStr} - ${actualSunsetStr}, need time to complete before dark)`);
                    } else {
                        // Either before sunrise or after actual sunset - just mention daylight hours
                        reasons.push(`Outside daylight hours (${sunriseStr} - ${actualSunsetStr})`);
                    }
                }
            } else {
                // Fallback message when sunrise/sunset not available
                const currentHour = conditions.currentTime.getHours();
                if (currentHour < 6 || currentHour >= 19) {
                    reasons.push('Outside daylight hours');
                }
            }
        } else {
            const currentHour = conditions.currentTime.getHours();
            const startHour = parseInt(activity.startTime.split(':')[0]);
            const endHour = parseInt(activity.endTime.split(':')[0]);
            
            if (currentHour < startHour || currentHour >= endHour) {
                reasons.push(`Outside time range (${activity.startTime}-${activity.endTime})`);
            }
        }
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Currently unavailable';
}

// Show tooltip
function showTooltip(event, text) {
    hideTooltip(); // Hide any existing tooltip
    
    const tooltip = document.createElement('div');
    tooltip.id = 'activity-tooltip';
    tooltip.style.cssText = `
        position: fixed;
        background-color: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 11px;
        max-width: 200px;
        z-index: 1000;
        pointer-events: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    `;
    tooltip.textContent = text;
    
    document.body.appendChild(tooltip);
    updateTooltipPosition(event);
}

// Update tooltip position
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('activity-tooltip');
    if (tooltip) {
        tooltip.style.left = (event.clientX + 10) + 'px';
        tooltip.style.top = (event.clientY - 10) + 'px';
    }
}

// Hide tooltip
function hideTooltip() {
    const tooltip = document.getElementById('activity-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

// Show context menu
function showContextMenu(event, activity) {
    hideContextMenu(); // Hide any existing context menu
    
    const contextMenu = document.createElement('div');
    contextMenu.id = 'context-menu';
    contextMenu.style.cssText = `
        position: fixed;
        background-color: var(--button-bg);
        border: 1px solid var(--fg-muted);
        border-radius: 4px;
        padding: 5px 0;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    
    const editOption = document.createElement('div');
    editOption.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        color: var(--fg-light);
        font-size: 12px;
        transition: background-color 0.2s ease;
    `;
    editOption.textContent = '✎ Edit';
    editOption.addEventListener('mouseenter', () => {
        editOption.style.backgroundColor = 'var(--button-active-bg)';
    });
    editOption.addEventListener('mouseleave', () => {
        editOption.style.backgroundColor = 'transparent';
    });
    editOption.addEventListener('click', () => {
        showEditModal(activity);
        hideContextMenu();
    });
    
    const deleteOption = document.createElement('div');
    deleteOption.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        color: #ff6b6b;
        font-size: 12px;
        transition: background-color 0.2s ease;
    `;
    deleteOption.textContent = '🗑 Delete';
    deleteOption.addEventListener('mouseenter', () => {
        deleteOption.style.backgroundColor = 'var(--button-active-bg)';
    });
    deleteOption.addEventListener('mouseleave', () => {
        deleteOption.style.backgroundColor = 'transparent';
    });
    deleteOption.addEventListener('click', () => {
        deleteActivity(activity.id);
        hideContextMenu();
    });
    
    contextMenu.appendChild(editOption);
    contextMenu.appendChild(deleteOption);
    document.body.appendChild(contextMenu);
    
    // Position the context menu
    contextMenu.style.left = event.clientX + 'px';
    contextMenu.style.top = event.clientY + 'px';
    
    // Close context menu when clicking elsewhere
    setTimeout(() => {
        document.addEventListener('click', hideContextMenu, { once: true });
    }, 0);
}

// Hide context menu
function hideContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    if (contextMenu) {
        contextMenu.remove();
    }
}

// Update daylight label with real sunrise/sunset times
function updateDaylightLabel() {
    const daylightLabel = document.getElementById('daylightOnlyLabel');
    if (daylightLabel && window.sunriseTime && window.sunsetTime) {
        const sunriseStr = window.sunriseTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const effectiveSunsetTime = new Date(window.sunsetTime.getTime() - (60 * 60 * 1000));
        const effectiveSunsetStr = effectiveSunsetTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        daylightLabel.textContent = `Daylight Only (${sunriseStr} - ${effectiveSunsetStr})`;
    } else if (daylightLabel) {
        // Fallback text when times not available
        daylightLabel.textContent = 'Daylight Only (Sunrise to Sunset)';
    }
}

function getCurrentConditions() {
    const now = new Date();
    const month = now.getMonth();
    
    // Determine season based on month
    let season;
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'fall';
    else season = 'winter';
    
    // Extract current weather from display
    const weatherText = weatherDisplay.textContent.toLowerCase();
    let weather = 'clear'; // default to clear/sunny
    
    // Map weather conditions from API to our activity restrictions
    if (weatherText.includes('rain') || weatherText.includes('drizzle')) weather = 'rain';
    else if (weatherText.includes('storm') || weatherText.includes('thunderstorm')) weather = 'storm';
    else if (weatherText.includes('wind') || weatherText.includes('squall')) weather = 'wind';
    else if (weatherText.includes('snow')) weather = 'snow';
    else if (weatherText.includes('cloud')) weather = 'cloudy';
    else if (weatherText.includes('clear') || weatherText.includes('sunny')) weather = 'clear';
    
    // Extract current temperature from weather display
    // Temperature format is typically "Description, ##°F" or "Description, ##°C"
    let temperature = null;
    const tempMatch = weatherDisplay.textContent.match(/(\d+)°[FC]/);
    if (tempMatch) {
        temperature = parseInt(tempMatch[1], 10);
    }
    
    // Get weather lookahead buffer from settings (in minutes)
    const bufferMinutes = parseInt(localStorage.getItem('wtd-weather-buffer') || '120', 10);
    
    // Get upcoming weather conditions
    const upcomingConditions = getUpcomingWeatherConditions(bufferMinutes);
    
    return {
        weather: weather,
        season: season,
        currentTime: now,
        temperature: temperature,
        upcomingConditions: upcomingConditions,
        bufferMinutes: bufferMinutes
    };
}

// Suggest random activity
async function suggestActivity() {
    const activities = JSON.parse(localStorage.getItem('wtd-activities') || '[]');
    
    if (activities.length === 0) {
        showNotification('Add some activities first!', 'info');
        return;
    }
    
    // Filter available activities
    const currentConditions = getCurrentConditions();
    const availableActivities = activities.filter(activity => 
        isActivityAvailable(activity, currentConditions)
    );
    
    if (availableActivities.length === 0) {
        showNotification('No activities are available right now based on current conditions', 'warning');
        return;
    }
    
    // Select random activity
    const randomIndex = Math.floor(Math.random() * availableActivities.length);
    const selectedActivity = availableActivities[randomIndex];
    
    // Show suggestion
    showActivitySuggestion(selectedActivity);
}

// Show activity suggestion modal
function showActivitySuggestion(activity) {
    // Array of fun headers to randomize
    const suggestionHeaders = [
        "Let's Do This!",
        "Today's Pick:",
        "How About This?",
        "Here's What I'm Thinking...",
        "Thoughts?",
        "Perfect for Right Now:"
    ];
    
    // Pick a random header
    const randomHeader = suggestionHeaders[Math.floor(Math.random() * suggestionHeaders.length)];
    console.log('Selected random header:', randomHeader);
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background-color: var(--bg-dark);
        border: 2px solid var(--accent);
        border-radius: 8px;
        padding: 30px;
        max-width: 400px;
        text-align: center;
        color: var(--fg-light);
    `;
    
    modal.innerHTML = `
        <h2 style="color: var(--accent); margin-bottom: 20px; font-size: 20px;">${randomHeader}</h2>
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 15px;">${activity.name}</div>
        <div style="font-size: 12px; color: var(--fg-muted); margin-bottom: 20px;">
            ${getActivityDetails(activity)}
        </div>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="acceptSuggestion" style="
                background-color: var(--accent);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s ease;
            ">Perfect!</button>
            <button id="newSuggestion" style="
                background-color: var(--button-bg);
                color: var(--fg-light);
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s ease;
            ">Suggest Another</button>
            <button id="closeSuggestion" style="
                background-color: #666;
                color: var(--fg-light);
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s ease;
            ">Close</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Event listeners for modal buttons
    const acceptBtn = document.getElementById('acceptSuggestion');
    const newBtn = document.getElementById('newSuggestion');
    const closeBtn = document.getElementById('closeSuggestion');
    
    // Add hover effects
    acceptBtn.addEventListener('mouseenter', () => {
        acceptBtn.style.backgroundColor = '#2e7d32'; // Darker green
    });
    acceptBtn.addEventListener('mouseleave', () => {
        acceptBtn.style.backgroundColor = 'var(--accent)';
    });
    
    newBtn.addEventListener('mouseenter', () => {
        newBtn.style.backgroundColor = 'var(--button-active-bg)';
    });
    newBtn.addEventListener('mouseleave', () => {
        newBtn.style.backgroundColor = 'var(--button-bg)';
    });
    
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.backgroundColor = '#d32f2f'; // Red
    });
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.backgroundColor = '#666';
    });
    
    acceptBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        recordActivityHistory(activity.name);
        showNotification(`Great choice! Enjoy your ${activity.name}!`, 'success');
    });
    
    newBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        suggestActivity(); // This will pick a new random header too!
    });
    
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
    
    // Close on escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// Enhanced settings modal with location detection
function showSettingsModal() {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'settings-modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    // Get current settings
    const currentLocation = localStorage.getItem('wtd-location') || '';
    const currentTimeFormat = localStorage.getItem('wtd-time-format') || '24hr';
    const currentTempUnit = localStorage.getItem('wtd-temp-unit') || 'F';
    const currentTheme = localStorage.getItem('wtd-theme') || 'auto';
    const currentAutoUpdateEnabled = localStorage.getItem('wtd-auto-update-enabled') === 'true';
    const currentWeatherBuffer = parseInt(localStorage.getItem('wtd-weather-buffer') || '120', 10);
    
    // Get current time for examples
    const now = new Date();
    const hour12 = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    const hour24 = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background-color: var(--bg-dark);
        border: 2px solid var(--accent);
        border-radius: 8px;
        padding: 30px;
        max-width: 500px;
        color: var(--fg-light);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        position: relative;
    `;
    
    modal.innerHTML = `
        <h2 style="color: var(--accent); margin-bottom: 20px; font-size: 18px; text-align: center;">Settings</h2>
        
        <!-- Location Setting -->
        <div style="margin-bottom: 20px; position: relative;">
            <label style="display: block; margin-bottom: 8px; font-size: 12px; font-weight: bold;">Location:</label>
            <div style="display: flex; gap: 8px; margin-bottom: 5px; position: relative;">
                <input type="text" id="settingsLocation" placeholder="Type a city (optional)..." style="
                    flex: 1;
                    background-color: var(--input-bg);
                    color: var(--fg-light);
                    border: 1px solid var(--button-bg);
                    padding: 8px 12px;
                    font-size: 12px;
                    border-radius: 3px;
                    outline: none;
                    position: relative;
                    z-index: 1;
                " value="${currentLocation}" autocomplete="off">
            </div>
            <div style="font-size: 10px; color: var(--fg-muted); font-style: italic;">
                Leave this blank to auto-detect your location at startup. If entering manually, use City,State,Country.
            </div>
        </div>

        <!-- Time Format Setting -->
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-size: 12px; font-weight: bold;">Time Format:</label>
            <div style="display: flex; gap: 15px;">
                <label style="display: flex; align-items: center; cursor: pointer; font-size: 12px;">
                    <input type="radio" name="timeFormat" value="12hr" ${currentTimeFormat === '12hr' ? 'checked' : ''} style="margin-right: 8px;">
                    12-hour (${hour12})
                </label>
                <label style="display: flex; align-items: center; cursor: pointer; font-size: 12px;">
                    <input type="radio" name="timeFormat" value="24hr" ${currentTimeFormat === '24hr' ? 'checked' : ''} style="margin-right: 8px;">
                    24-hour (${hour24})
                </label>
            </div>
        </div>

        <!-- Temperature Unit Setting -->
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-size: 12px; font-weight: bold;">Temperature Unit:</label>
            <div style="display: flex; gap: 15px;">
                <label style="display: flex; align-items: center; cursor: pointer; font-size: 12px;">
                    <input type="radio" name="tempUnit" value="F" ${currentTempUnit === 'F' ? 'checked' : ''} style="margin-right: 8px;">
                    Fahrenheit (°F)
                </label>
                <label style="display: flex; align-items: center; cursor: pointer; font-size: 12px;">
                    <input type="radio" name="tempUnit" value="C" ${currentTempUnit === 'C' ? 'checked' : ''} style="margin-right: 8px;">
                    Celsius (°C)
                </label>
            </div>
        </div>

        <!-- Theme Setting -->
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-size: 12px; font-weight: bold;">Theme:</label>
            <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                <label style="display: flex; align-items: center; cursor: pointer; font-size: 12px;">
                    <input type="radio" name="theme" value="light" ${currentTheme === 'light' ? 'checked' : ''} style="margin-right: 8px;">
                    ☀️ Light
                </label>
                <label style="display: flex; align-items: center; cursor: pointer; font-size: 12px;">
                    <input type="radio" name="theme" value="dark" ${currentTheme === 'dark' ? 'checked' : ''} style="margin-right: 8px;">
                    🌙 Dark
                </label>
                <label style="display: flex; align-items: center; cursor: pointer; font-size: 12px;">
                    <input type="radio" name="theme" value="auto" ${currentTheme === 'auto' ? 'checked' : ''} style="margin-right: 8px;">
                    🔄 Auto (System)
                </label>
            </div>
        </div>

        <!-- Auto Update Setting -->
        <div style="margin-bottom: 20px;">
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 12px;">
                <input id="settingsAutoUpdate" type="checkbox" ${currentAutoUpdateEnabled ? 'checked' : ''} style="width: 16px; height: 16px;">
                Enable auto updates on startup
            </label>
            <div style="font-size: 10px; color: var(--fg-muted); margin-top: 8px; line-height: 1.4;">
                The app will check for updates when it launches and notify you if a newer version is available.
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px;">
                <button id="checkUpdatesBtn" style="background-color: var(--button-bg); color: var(--fg-light); border: 1px solid var(--button-active-bg); padding: 8px 14px; border-radius: 5px; cursor: pointer; font-size: 12px;">Check for updates</button>
            </div>
        </div>

        <!-- Weather Lookahead Buffer Setting -->
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-size: 12px; font-weight: bold;">
                Weather Lookahead Buffer: <span id="bufferValueDisplay">${currentWeatherBuffer}</span> minutes
            </label>
            <input type="range" id="weatherBufferSlider" min="60" max="360" step="30" value="${currentWeatherBuffer}" style="
                width: 100%;
                cursor: pointer;
            ">
            <div style="font-size: 10px; color: var(--fg-muted); margin-top: 8px; line-height: 1.4;">
                The app checks if bad weather is predicted within this timeframe and avoids suggesting activities that can't be done during that weather.
            </div>
        </div>

        <!-- Buttons -->
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 25px;">
            <button id="saveSettingsBtn" style="
                background-color: var(--accent);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s ease;
            ">Save Settings</button>
            <button id="cancelSettingsBtn" style="
                background-color: var(--button-bg);
                color: var(--fg-light);
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s ease;
            ">Cancel</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // IMPORTANT: Setup event listeners AFTER the modal is added to DOM
    setTimeout(() => {
        console.log('Setting up settings modal event listeners...');
        
        // Get all the elements we need
        const saveBtn = document.getElementById('saveSettingsBtn');
        const cancelBtn = document.getElementById('cancelSettingsBtn');
        const checkUpdatesBtn = document.getElementById('checkUpdatesBtn');
        const locationInput = document.getElementById('settingsLocation');
        const overlay = document.getElementById('settings-modal-overlay');
        
        console.log('Found elements:', {
            saveBtn: !!saveBtn,
            cancelBtn: !!cancelBtn, 
            locationInput: !!locationInput,
            overlay: !!overlay
        });
        
        // Setup location input autocomplete DIRECTLY HERE
        if (locationInput) {
            console.log('Setting up autocomplete for location input DIRECTLY');
            
            // Input event for autocomplete
            locationInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                console.log('Location input changed:', query);
                
                // Clear existing timeout
                if (locationAutocomplete.searchTimeout) {
                    clearTimeout(locationAutocomplete.searchTimeout);
                }
                
                // Debounce the search to avoid too many API calls
                locationAutocomplete.searchTimeout = setTimeout(() => {
                    console.log('Searching for locations:', query);
                    locationAutocomplete.searchLocations(query);
                }, 300); // 300ms delay
            });

            // Keyboard navigation for autocomplete (Arrow keys, Enter, Escape)
            locationInput.addEventListener('keydown', (e) => {
                const handled = locationAutocomplete.handleKeyDown(e);
                if (handled) {
                    e.stopPropagation();
                }
            });
            
            console.log('Location input autocomplete setup complete');
        } else {
            console.error('Location input not found in timeout!');
        }
        
        // Setup other event listeners
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                saveSettings();
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                closeSettingsModal();
            });
        }
        
        if (checkUpdatesBtn) {
            checkUpdatesBtn.addEventListener('click', async () => {
                checkUpdatesBtn.textContent = '🔄 Checking...';
                checkUpdatesBtn.disabled = true;
                try {
                    await requestUpdateCheck({ showStatus: true });
                } finally {
                    checkUpdatesBtn.textContent = 'Check for updates';
                    checkUpdatesBtn.disabled = false;
                }
            });
        }
        
        // Weather buffer slider
        const bufferSlider = document.getElementById('weatherBufferSlider');
        const bufferDisplay = document.getElementById('bufferValueDisplay');
        if (bufferSlider && bufferDisplay) {
            bufferSlider.addEventListener('input', (e) => {
                bufferDisplay.textContent = e.target.value;
            });
        }
        
        // Close on overlay click
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target.id === 'settings-modal-overlay') {
                    closeSettingsModal();
                }
            });
        }
        
        // Close on escape key - with autocomplete awareness
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                console.log('Escape key pressed, autocomplete visible:', locationAutocomplete.isVisible);
                // First try to close autocomplete dropdown
                if (locationAutocomplete.isVisible) {
                    locationAutocomplete.hideSuggestions();
                } else {
                    // If no dropdown, close modal
                    console.log('Closing settings modal via Escape key');
                    closeSettingsModal();
                    document.removeEventListener('keydown', handleEscape);
                }
            }
        };
        document.addEventListener('keydown', handleEscape);
        console.log('Escape key handler added');
        
        // Enter key to save (when not in autocomplete)
        const handleEnter = (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !locationAutocomplete.isVisible) {
                e.preventDefault();
                console.log('Enter key pressed, saving settings');
                saveSettings();
            }
        };
        document.addEventListener('keydown', handleEnter);
        console.log('Enter key handler added');
        
        // Focus on the location input and verify it exists
        if (locationInput) {
            locationInput.focus();
            console.log('Location input focused and ready');
        }
        
        console.log('All event listeners set up directly in timeout');
        
        // Debug: Check if elements exist
        console.log('Settings modal opened, location input exists:', !!document.getElementById('settingsLocation'));
        console.log('Location autocomplete object:', locationAutocomplete);
    }, 100); // Increased timeout to 100ms
}

// Setup event listeners for settings modal
function setupSettingsModalEventListeners() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    const cancelBtn = document.getElementById('cancelSettingsBtn');
    const detectBtn = document.getElementById('detectLocationBtn');

    if (!saveBtn || !cancelBtn) {
        return;
    }
    
    // Add hover effects for modal buttons
    saveBtn.addEventListener('mouseenter', () => {
        saveBtn.style.backgroundColor = '#2e7d32'; // Darker green
    });
    saveBtn.addEventListener('mouseleave', () => {
        saveBtn.style.backgroundColor = 'var(--accent)';
    });
    
    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.backgroundColor = '#d32f2f'; // Red
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.backgroundColor = 'var(--button-bg)';
    });
    
    if (detectBtn) {
        detectBtn.addEventListener('mouseenter', () => {
            detectBtn.style.backgroundColor = '#2e7d32'; // Darker green
        });
        detectBtn.addEventListener('mouseleave', () => {
            detectBtn.style.backgroundColor = 'var(--accent)';
        });

        // Detect location button
        detectBtn.addEventListener('click', async () => {
            const originalText = detectBtn.textContent;
            const locationInput = document.getElementById('settingsLocation');

            try {
                detectBtn.textContent = '🔄 Detecting...';
                detectBtn.disabled = true;

                // Clear any cached location to force fresh detection
                localStorage.removeItem('wtd-cached-location');
                localStorage.removeItem('wtd-cache-timestamp');

                const detectedLocation = await attemptAutoLocationDetection();

                if (detectedLocation) {
                    locationInput.value = detectedLocation;
                    showNotification('Location detected successfully!', 'success');
                } else {
                    showNotification('Could not detect location automatically', 'warning');
                }
            } catch (error) {
                console.error('Manual location detection failed:', error);
                showNotification('Location detection failed', 'error');
            } finally {
                detectBtn.textContent = originalText;
                detectBtn.disabled = false;
            }
        });
    }
    
    // Save button
    saveBtn.addEventListener('click', () => {
        saveSettings();
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', () => {
        closeSettingsModal();
    });
    
    // Close on overlay click
    document.getElementById('settings-modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'settings-modal-overlay') {
            closeSettingsModal();
        }
    });
    
    // Close on escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeSettingsModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Add enter key listener for save in settings modal
    const handleSettingsEnterKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveSettings();
        }
    };
    
    // Add enter key listener to the modal
    document.getElementById('settings-modal-overlay').addEventListener('keydown', handleSettingsEnterKey);
}

// Save settings
async function saveSettings() {
    const location = document.getElementById('settingsLocation').value.trim();
    const timeFormat = document.querySelector('input[name="timeFormat"]:checked').value;
    const tempUnit = document.querySelector('input[name="tempUnit"]:checked').value;
    const theme = document.querySelector('input[name="theme"]:checked').value;
    const autoUpdateEnabled = document.getElementById('settingsAutoUpdate')?.checked === true;
    const previousAutoUpdateEnabled = localStorage.getItem('wtd-auto-update-enabled') === 'true';
    const weatherBuffer = parseInt(document.getElementById('weatherBufferSlider')?.value || '120', 10);
    
    // Get current temperature unit before saving
    const currentTempUnit = localStorage.getItem('wtd-temp-unit') || 'F';
    
    // Save to localStorage
    if (location) {
        localStorage.setItem('wtd-location', location);
    } else {
        localStorage.removeItem('wtd-location'); // Remove to trigger auto-detect
    }
    
    localStorage.setItem('wtd-time-format', timeFormat);
    localStorage.setItem('wtd-temp-unit', tempUnit);
    localStorage.setItem('wtd-auto-update-enabled', autoUpdateEnabled ? 'true' : 'false');
    localStorage.setItem('wtd-weather-buffer', weatherBuffer.toString());
    
    // Convert temperature sliders if unit changed
    if (currentTempUnit !== tempUnit) {
        convertTemperatureUnit(currentTempUnit, tempUnit);
    } else {
        // Update unit display even if no conversion needed
        updateTemperatureUnitDisplay();
    }
    
    console.log('Settings saved:', { location: location || 'auto-detect', timeFormat, tempUnit, theme, autoUpdateEnabled, weatherBuffer });
    
    // Apply theme immediately
    setTheme(theme);
    
    // Close modal
    closeSettingsModal();
    
    // Refresh time options if format changed
    populateTimeOptions();
    
    // Refresh weather with new settings before optional update checks
    await updateWeather();

    // Run an immediate check only when auto-update gets newly enabled.
    if (autoUpdateEnabled && !previousAutoUpdateEnabled) {
        await requestUpdateCheck({ showStatus: true });
    }
    
    // Show success notification
    showNotification('Settings saved successfully!', 'success');
}

// Show edit modal
function showEditModal(activity) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'edit-modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background-color: var(--bg-dark);
        border: 2px solid var(--accent);
        border-radius: 8px;
        padding: 30px;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        color: var(--fg-light);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `;
    
    modal.innerHTML = `
        <h2 style="color: var(--accent); margin-bottom: 20px; font-size: 18px; text-align: center;">Edit Activity</h2>
        
        <!-- Activity name input -->
        <div style="margin-bottom: 15px;">
            <input type="text" id="editActivityName" placeholder="Enter activity name..." style="
                width: 100%;
                background-color: var(--input-bg);
                color: var(--fg-light);
                border: 1px solid var(--button-bg);
                padding: 8px 12px;
                font-size: 12px;
                border-radius: 3px;
                outline: none;
            " value="${activity.name}">
        </div>

        <!-- Weather dependent section -->
        <div style="margin-bottom: 20px;">
            <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 8px; font-size: 12px;">
                <input type="checkbox" id="editWeatherDependent" ${activity.weatherDependent ? 'checked' : ''} style="margin-right: 10px;">
                Weather Dependent
            </label>
            
            <div id="editWeatherOptions" style="margin-left: 26px; ${activity.weatherDependent ? '' : 'display: none;'}">
                <p style="color: var(--fg-muted); font-size: 10px; font-style: italic; margin-bottom: 10px;">Select weather conditions that this activity <span style="color: #ff6b6b; font-weight: bold; font-size: 11px;">cannot</span> be done in</p>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    ${['rain', 'storm', 'wind', 'snow'].map(condition => `
                        <label style="display: flex; align-items: center; cursor: pointer; font-size: 12px;">
                            <input type="checkbox" value="${condition}" ${activity.weatherRestrictions && activity.weatherRestrictions.includes(condition) ? 'checked' : ''} style="margin-right: 10px;">
                            ${condition.charAt(0).toUpperCase() + condition.slice(1)}
                        </label>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- Seasonal section -->
        <div style="margin-bottom: 20px;">
            <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 8px; font-size: 12px;">
                <input type="checkbox" id="editSeasonal" ${activity.seasonal ? 'checked' : ''} style="margin-right: 10px;">
                Seasonal
            </label>
            
            <div id="editSeasonalOptions" style="margin-left: 26px; ${activity.seasonal ? '' : 'display: none;'}">
                <p style="color: var(--fg-muted); font-size: 10px; font-style: italic; margin-bottom: 10px;">Select available seasons</p>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    ${['spring', 'summer', 'fall', 'winter'].map(season => `
                        <label style="display: flex; align-items: center; cursor: pointer; font-size: 12px;">
                            <input type="checkbox" value="${season}" ${activity.seasons && activity.seasons.includes(season) ? 'checked' : ''} style="margin-right: 10px;">
                            ${season.charAt(0).toUpperCase() + season.slice(1)}
                        </label>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- Time/Day dependent section -->
        <div style="margin-bottom: 20px;">
            <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 8px; font-size: 12px;">
                <input type="checkbox" id="editTimeDependent" ${activity.timeDependent ? 'checked' : ''} style="margin-right: 10px;">
                Time/Day Dependent
            </label>
            
            <div id="editTimeOptions" style="margin-left: 26px; ${activity.timeDependent ? '' : 'display: none;'}">
                <p style="color: var(--fg-muted); font-size: 10px; font-style: italic; margin-bottom: 10px;">Set time and day constraints</p>
                
                <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 15px; font-size: 12px;">
                    <input type="checkbox" id="editDaylightOnly" ${activity.daylightOnly ? 'checked' : ''} style="margin-right: 10px;">
                    <span id="editDaylightOnlyLabel">Daylight Only (Sunrise to Sunset)</span>
                </label>
                
                <div id="editTimeControls" style="margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; margin-bottom: 10px; gap: 10px;">
                        <label style="min-width: 70px; font-size: 10px;">Start Time:</label>
                        <select id="editStartTime" style="background-color: var(--input-bg); color: var(--fg-light); border: 1px solid var(--button-bg); padding: 4px 8px; font-size: 10px; border-radius: 3px; width: 80px;" ${activity.daylightOnly ? 'disabled' : ''}>
                            ${Array.from({length: 24}, (_, i) => {
                                const hour = i.toString().padStart(2, '0') + ':00';
                                return `<option value="${hour}" ${activity.startTime === hour ? 'selected' : ''}>${hour}</option>`;
                            }).join('')}
                        </select>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <label style="min-width: 70px; font-size: 10px;">End Time:</label>
                        <select id="editEndTime" style="background-color: var(--input-bg); color: var(--fg-light); border: 1px solid var(--button-bg); padding: 4px 8px; font-size: 10px; border-radius: 3px; width: 80px;" ${activity.daylightOnly ? 'disabled' : ''}>
                            ${Array.from({length: 24}, (_, i) => {
                                const hour = i.toString().padStart(2, '0') + ':00';
                                return `<option value="${hour}" ${activity.endTime === hour ? 'selected' : ''}>${hour}</option>`;
                            }).join('')}
                        </select>
                    </div>
                </div>

                <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 8px; font-size: 12px;">
                    <input type="checkbox" id="editDayOfWeek" ${activity.dayOfWeekDependent ? 'checked' : ''} style="margin-right: 10px;">
                    Specific Days Only
                </label>
                
                <div id="editDayOfWeekOptions" style="margin-left: 26px; ${activity.dayOfWeekDependent ? '' : 'display: none;'}">
                    <p style="color: var(--fg-muted); font-size: 10px; font-style: italic; margin-bottom: 10px;">Select available days</p>
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        ${['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => `
                            <label style="display: flex; align-items: center; cursor: pointer; font-size: 12px;">
                                <input type="checkbox" value="${day}" ${activity.daysOfWeek && activity.daysOfWeek.includes(day) ? 'checked' : ''} style="margin-right: 10px;">
                                ${day.charAt(0).toUpperCase() + day.slice(1)}
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>

        <!-- Buttons -->
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
            <button id="saveEditBtn" style="
                background-color: var(--accent);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s ease;
            ">Save Changes</button>
            <button id="cancelEditBtn" style="
                background-color: var(--button-bg);
                color: var(--fg-light);
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s ease;
            ">Cancel</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Setup event listeners for the modal
    setupEditModalEventListeners(activity);
    
    // Update daylight label with current times
    updateEditDaylightLabel();
    
    // Focus on the name input
    const nameInput = document.getElementById('editActivityName');
    nameInput.focus();
    
    // Add enter key listener for save
    const handleEditEnterKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveEditedActivity(activity);
        }
    };
    
    // Add enter key listener to all inputs in the modal
    modal.addEventListener('keydown', handleEditEnterKey);
}

// Setup event listeners for edit modal
function setupEditModalEventListeners(originalActivity) {
    const weatherCheckbox = document.getElementById('editWeatherDependent');
    const weatherOptions = document.getElementById('editWeatherOptions');
    const seasonalCheckbox = document.getElementById('editSeasonal');
    const seasonalOptions = document.getElementById('editSeasonalOptions');
    const timeCheckbox = document.getElementById('editTimeDependent');
    const timeOptions = document.getElementById('editTimeOptions');
    const daylightCheckbox = document.getElementById('editDaylightOnly');
    const timeControls = document.getElementById('editTimeControls');
    const dayOfWeekCheckbox = document.getElementById('editDayOfWeek');
    const dayOfWeekOptions = document.getElementById('editDayOfWeekOptions');
    const startTimeSelect = document.getElementById('editStartTime');
    const endTimeSelect = document.getElementById('editEndTime');
    
    // Toggle functions for modal
    weatherCheckbox.addEventListener('change', () => {
        weatherOptions.style.display = weatherCheckbox.checked ? 'block' : 'none';
        if (!weatherCheckbox.checked) {
            weatherOptions.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        }
    });
    
    seasonalCheckbox.addEventListener('change', () => {
        seasonalOptions.style.display = seasonalCheckbox.checked ? 'block' : 'none';
        if (!seasonalCheckbox.checked) {
            seasonalOptions.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        }
    });
    
    timeCheckbox.addEventListener('change', () => {
        timeOptions.style.display = timeCheckbox.checked ? 'block' : 'none';
        if (!timeCheckbox.checked) {
            daylightCheckbox.checked = false;
            dayOfWeekCheckbox.checked = false;
            dayOfWeekOptions.style.display = 'none';
            dayOfWeekOptions.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        }
    });
    
    daylightCheckbox.addEventListener('change', () => {
        const isDisabled = daylightCheckbox.checked;
        startTimeSelect.disabled = isDisabled;
        endTimeSelect.disabled = isDisabled;
    });
    
    dayOfWeekCheckbox.addEventListener('change', () => {
        dayOfWeekOptions.style.display = dayOfWeekCheckbox.checked ? 'block' : 'none';
        if (!dayOfWeekCheckbox.checked) {
            dayOfWeekOptions.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        }
    });
    
    // Save button
    document.getElementById('saveEditBtn').addEventListener('click', () => {
        saveEditedActivity(originalActivity);
    });
    
    // Add hover effects for modal buttons
    const saveBtn = document.getElementById('saveEditBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    
    saveBtn.addEventListener('mouseenter', () => {
        saveBtn.style.backgroundColor = '#2e7d32'; // Darker green
    });
    saveBtn.addEventListener('mouseleave', () => {
        saveBtn.style.backgroundColor = 'var(--accent)';
    });
    
    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.backgroundColor = '#d32f2f'; // Red
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.backgroundColor = 'var(--button-bg)';
    });
    
    // Cancel button
    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        closeEditModal();
    });
    
    // Close on overlay click
    document.getElementById('edit-modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'edit-modal-overlay') {
            closeEditModal();
        }
    });
    
    // Close on escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeEditModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    // Store reference on overlay so closeEditModal can clean it up
    const overlay = document.getElementById('edit-modal-overlay');
    if (overlay) {
        overlay._handleEscapeKey = handleEscape;
    }
    document.addEventListener('keydown', handleEscape);
}

// Save edited activity
function saveEditedActivity(originalActivity) {
    const activityName = document.getElementById('editActivityName').value.trim();
    
    if (!activityName) {
        showNotification('Please enter an activity name', 'error');
        return;
    }
    
    // Collect updated data
    const updatedActivity = {
        ...originalActivity,
        name: activityName,
        weatherDependent: document.getElementById('editWeatherDependent').checked,
        weatherRestrictions: [],
        seasonal: document.getElementById('editSeasonal').checked,
        seasons: [],
        timeDependent: document.getElementById('editTimeDependent').checked,
        daylightOnly: document.getElementById('editDaylightOnly').checked,
        startTime: document.getElementById('editStartTime').value,
        endTime: document.getElementById('editEndTime').value,
        dayOfWeekDependent: document.getElementById('editDayOfWeek').checked,
        daysOfWeek: []
    };
    
    // Collect weather restrictions
    if (updatedActivity.weatherDependent) {
        const weatherCheckboxes = document.getElementById('editWeatherOptions').querySelectorAll('input[type="checkbox"]:checked');
        updatedActivity.weatherRestrictions = Array.from(weatherCheckboxes).map(cb => cb.value);
    }
    
    // Collect seasonal restrictions
    if (updatedActivity.seasonal) {
        const seasonalCheckboxes = document.getElementById('editSeasonalOptions').querySelectorAll('input[type="checkbox"]:checked');
        updatedActivity.seasons = Array.from(seasonalCheckboxes).map(cb => cb.value);
        
        if (updatedActivity.seasons.length === 0) {
            showNotification('Please select at least one season', 'error');
            return;
        }
    }
    
    // Collect day of week restrictions
    if (updatedActivity.dayOfWeekDependent) {
        const dayCheckboxes = document.getElementById('editDayOfWeekOptions').querySelectorAll('input[type="checkbox"]:checked');
        updatedActivity.daysOfWeek = Array.from(dayCheckboxes).map(cb => cb.value);
        
        if (updatedActivity.daysOfWeek.length === 0) {
            showNotification('Please select at least one day of the week', 'error');
            return;
        }
    }
    
    // Validate time range
    if (updatedActivity.timeDependent && !updatedActivity.daylightOnly) {
        const startHour = parseInt(updatedActivity.startTime.split(':')[0]);
        const endHour = parseInt(updatedActivity.endTime.split(':')[0]);
        
        if (startHour >= endHour) {
            showNotification('End time must be after start time', 'error');
            return;
        }
    }
    
    try {
        // Update activity in storage
        let activities = JSON.parse(localStorage.getItem('wtd-activities') || '[]');
        const index = activities.findIndex(a => a.id === originalActivity.id);
        
        if (index !== -1) {
            // Check for duplicate names (excluding current activity)
            const existingActivity = activities.find(a => a.id !== originalActivity.id && a.name.toLowerCase() === activityName.toLowerCase());
            if (existingActivity) {
                showNotification('Activity with this name already exists', 'error');
                return;
            }
            
            activities[index] = updatedActivity;
            localStorage.setItem('wtd-activities', JSON.stringify(activities));
            
            // Close modal and refresh
            closeEditModal();
            loadActivities();
            showNotification('Activity updated successfully!', 'success');
        }
    } catch (error) {
        console.error('Error updating activity:', error);
        showNotification('Error updating activity', 'error');
    }
}

// Show delete confirmation modal (custom, not native confirm)
function showDeleteConfirmationModal(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.id = 'delete-confirm-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background-color: var(--bg-dark);
        border: 2px solid #ff6b6b;
        border-radius: 8px;
        padding: 28px;
        max-width: 400px;
        width: 100%;
        color: var(--fg-light);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        text-align: center;
    `;
    
    modal.innerHTML = `
        <h2 style="color: #ff6b6b; margin-bottom: 16px; font-size: 18px;">Delete Activity</h2>
        <p style="color: var(--fg-muted); margin-bottom: 24px; font-size: 12px; line-height: 1.5;">${message}</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="deleteConfirmBtn" style="
                background-color: #ff6b6b;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s ease;
            ">Delete</button>
            <button id="deleteCancelBtn" style="
                background-color: var(--button-bg);
                color: var(--fg-light);
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s ease;
            ">Cancel</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const confirmBtn = document.getElementById('deleteConfirmBtn');
    const cancelBtn = document.getElementById('deleteCancelBtn');
    
    const closeModal = () => {
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    };
    
    // Focus the cancel button for accessibility
    cancelBtn.focus();
    
    // Add hover effects to Delete button
    confirmBtn.addEventListener('mouseenter', () => {
        confirmBtn.style.backgroundColor = '#d32f2f';
    });
    confirmBtn.addEventListener('mouseleave', () => {
        confirmBtn.style.backgroundColor = '#ff6b6b';
    });
    
    // Add hover effects to Cancel button
    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.backgroundColor = 'var(--button-active-bg)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.backgroundColor = 'var(--button-bg)';
    });
    
    confirmBtn.addEventListener('click', () => {
        closeModal();
        onConfirm();
    });
    
    cancelBtn.addEventListener('click', () => {
        closeModal();
        // Return focus to the input field
        activityNameInput.focus();
    });
    
    // Allow Enter to confirm and Escape to cancel
    const handleKeydown = (e) => {
        if (e.key === 'Enter') {
            closeModal();
            onConfirm();
        } else if (e.key === 'Escape') {
            closeModal();
            activityNameInput.focus();
        }
    };
    
    document.addEventListener('keydown', handleKeydown, { once: true });
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
            // Return focus to the input field
            activityNameInput.focus();
        }
    });
}

// Close edit modal
function closeEditModal() {
    const overlay = document.getElementById('edit-modal-overlay');
    if (overlay) {
        // Clean up the escape key listener if it exists
        if (overlay._handleEscapeKey) {
            document.removeEventListener('keydown', overlay._handleEscapeKey);
        }
        overlay.remove();
    }
}

// Close settings modal
function closeSettingsModal() {
    // Hide the autofill dropdown if it's visible
    locationAutocomplete.hideSuggestions();
    
    const overlay = document.getElementById('settings-modal-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// Update edit modal daylight label
function updateEditDaylightLabel() {
    const daylightLabel = document.getElementById('editDaylightOnlyLabel');
    if (daylightLabel && window.sunriseTime && window.sunsetTime) {
        const sunriseStr = window.sunriseTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const effectiveSunsetTime = new Date(window.sunsetTime.getTime() - (60 * 60 * 1000));
        const effectiveSunsetStr = effectiveSunsetTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        daylightLabel.textContent = `Daylight Only (${sunriseStr} - ${effectiveSunsetStr})`;
    } else if (daylightLabel) {
        // Fallback text when times not available
        daylightLabel.textContent = 'Daylight Only (Sunrise to Sunset)';
    }
}

// Initialize theme system
function initializeTheme() {
    const savedTheme = localStorage.getItem('wtd-theme') || 'auto';
    setTheme(savedTheme);
}

// Set theme and update UI
function setTheme(theme) {
    console.log('Setting theme to:', theme);
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    
    // Save theme preference
    localStorage.setItem('wtd-theme', theme);
}

// Get current system theme preference
function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

// Listen for system theme changes when in auto mode
function setupSystemThemeListener() {
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', () => {
            const currentTheme = localStorage.getItem('wtd-theme');
            if (currentTheme === 'auto') {
                // Force re-evaluation of auto theme
                setTheme('auto');
            }
        });
    }
}

// Update the "Tell Me What To Do" button state
function updateTellMeWhatToDoButton(enabled) {
    if (enabled) {
        tellMeWhatToDoButton.disabled = false;
        tellMeWhatToDoButton.style.opacity = '1';
        tellMeWhatToDoButton.style.cursor = 'pointer';
        tellMeWhatToDoButton.title = 'Get a random activity suggestion';
    } else {
        tellMeWhatToDoButton.disabled = true;
        tellMeWhatToDoButton.style.opacity = '0.5';
        tellMeWhatToDoButton.style.cursor = 'not-allowed';
        tellMeWhatToDoButton.title = 'Location not found! Click weather display to set location';
        
        // Create instant tooltip for disabled state
        let tooltipTimeout;
        
        tellMeWhatToDoButton.addEventListener('mouseenter', () => {
            if (tellMeWhatToDoButton.disabled) {
                clearTimeout(tooltipTimeout);
                showTooltip({ clientX: tellMeWhatToDoButton.getBoundingClientRect().left + 50, clientY: tellMeWhatToDoButton.getBoundingClientRect().top - 10 }, 'Location not found! Click weather display to set location');
            }
        });
        
        tellMeWhatToDoButton.addEventListener('mouseleave', () => {
            hideTooltip();
        });
    }
}

// Get weather emoji based on condition and time of day
function getWeatherEmoji(condition, isNightTime = false) {
    const currentHour = new Date().getHours();
    const actualIsNight = currentHour < 6 || currentHour > 20; // 8PM to 6AM is night
    
    const emojiMap = {
        'clear': actualIsNight ? '🌙' : '☀️',  // Moon for night, sun for day
        'clouds': actualIsNight ? '☁️' : '⛅',  // Keep clouds but could differentiate
        'rain': '🌧️',
        'drizzle': '🌦️',
        'thunderstorm': '⛈️',
        'snow': '❄️',
        'mist': '🌫️',
        'fog': '🌫️',
        'haze': '🌫️',
        'dust': '🌪️',
        'sand': '🌪️',
        'ash': '🌋',
        'squall': '💨',
        'tornado': '🌪️'
    };
    
    return emojiMap[condition.toLowerCase()] || (actualIsNight ? '🌙' : '☀️');
}

// Delete activity
function deleteActivity(activityId) {
    showDeleteConfirmationModal('Are you sure you want to delete this activity?', () => {
        let activities = JSON.parse(localStorage.getItem('wtd-activities') || '[]');
        activities = activities.filter(activity => activity.id !== activityId);
        localStorage.setItem('wtd-activities', JSON.stringify(activities));
        
        loadActivities();
        showNotification('Activity deleted', 'success');
        
        // Ensure input field is ready for interaction
        activityNameInput.focus();
        activityNameInput.blur();
    });
}

// Reset form to initial state
function resetForm() {
    activityNameInput.value = '';
    weatherDependentCheckbox.checked = false;
    temperatureDependentCheckbox.checked = false;
    seasonalCheckbox.checked = false;
    timeDependentCheckbox.checked = false;
    daylightOnlyCheckbox.checked = false;
    
    if (dayOfWeekCheckbox) {
        dayOfWeekCheckbox.checked = false;
    }
    
    // Hide all sub-options
    toggleWeatherOptions();
    toggleTemperatureControls();
    toggleSeasonalOptions();
    toggleTimeOptions();
    toggleDayOfWeekOptions();
    
    // Reset time selects
    startTimeSelect.value = '09:00';
    endTimeSelect.value = '17:00';
    
    // Reset temperature sliders
    if (temperatureMinSlider && temperatureMaxSlider) {
        temperatureMinSlider.value = -20;
        temperatureMaxSlider.value = 120;
        updateTemperatureDisplay();
    }
    
    // Uncheck all sub-options
    const allCheckboxes = document.querySelectorAll('.sub-options input[type="checkbox"]');
    allCheckboxes.forEach(cb => cb.checked = false);
    
    // Reset button
    addActivityButton.textContent = 'Add Activity';
    delete addActivityButton.dataset.editingId;
    
    validateForm();
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        if (existingNotification._dismissTimer) {
            clearTimeout(existingNotification._dismissTimer);
        }
        if (existingNotification._cleanupTimer) {
            clearTimeout(existingNotification._cleanupTimer);
        }
        existingNotification.remove();
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    const colors = {
        success: '#4CAF50',
        error: '#ff6b6b',
        warning: '#ff9800',
        info: '#2196F3'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 50px;
        right: 20px;
        background-color: ${colors[type] || colors.info};
        color: white;
        padding: 12px 20px;
        border-radius: 5px;
        font-size: 12px;
        font-weight: bold;
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        max-width: min(420px, calc(100vw - 40px));
        white-space: normal;
        word-break: break-word;
        line-height: 1.35;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);

    const displayDurationMs = 3000;
    notification._remainingMs = displayDurationMs;
    notification._dismissTimer = null;
    notification._cleanupTimer = null;
    notification._timerStartedAt = Date.now();

    const hideNotification = () => {
        notification.style.transform = 'translateX(100%)';
        notification._cleanupTimer = setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    };

    const scheduleDismiss = () => {
        if (notification._dismissTimer) {
            clearTimeout(notification._dismissTimer);
        }
        notification._timerStartedAt = Date.now();
        notification._dismissTimer = setTimeout(hideNotification, notification._remainingMs);
    };
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);

    // Pause auto-dismiss while hovered.
    notification.addEventListener('mouseenter', () => {
        if (notification._dismissTimer) {
            clearTimeout(notification._dismissTimer);
            notification._dismissTimer = null;
        }
        const elapsedMs = Date.now() - notification._timerStartedAt;
        notification._remainingMs = Math.max(300, notification._remainingMs - elapsedMs);
    });

    notification.addEventListener('mouseleave', () => {
        scheduleDismiss();
    });

    scheduleDismiss();
}

// ============ HISTORY FUNCTIONS ============

// Track the last undoable state (can be a single deletion or a full clear)
let lastUndoState = null;

// Record activity acceptance to history
function recordActivityHistory(activityName) {
    try {
        let history = JSON.parse(localStorage.getItem('wtd-activity-history') || '[]');
        
        const entry = {
            activityName: activityName,
            timestamp: Date.now()
        };
        
        history.push(entry);
        localStorage.setItem('wtd-activity-history', JSON.stringify(history));
        
        console.log('Activity recorded to history:', activityName, 'at', new Date(entry.timestamp).toLocaleString());
    } catch (error) {
        console.error('Error recording activity history:', error);
    }
}

// Get all history entries
function getActivityHistory() {
    try {
        const history = JSON.parse(localStorage.getItem('wtd-activity-history') || '[]');
        // Return sorted by timestamp, newest first
        return history.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error('Error retrieving activity history:', error);
        return [];
    }
}

// Format timestamp for display
function formatHistoryTimestamp(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const timeFormat = localStorage.getItem('wtd-time-format') || '24hr';
    
    // Format time part
    let timeStr;
    if (timeFormat === '12hr') {
        timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else {
        timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    
    // Check if today or yesterday
    if (date.toDateString() === today.toDateString()) {
        return `Today at ${timeStr}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday at ${timeStr}`;
    } else {
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${dateStr} at ${timeStr}`;
    }
}

// Display history in the panel
function displayHistory() {
    const historyList = document.getElementById('historyList');
    const history = getActivityHistory();
    
    historyList.innerHTML = '';
    
    if (history.length === 0) {
        historyList.innerHTML = '<div class="history-empty-message">No history yet. Accept some activities to get started!</div>';
        return;
    }
    
    history.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'history-entry';
        entryDiv.dataset.timestamp = entry.timestamp;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'history-entry-content';
        
        const nameSpan = document.createElement('div');
        nameSpan.className = 'history-entry-name';
        nameSpan.textContent = entry.activityName;
        
        const timeSpan = document.createElement('div');
        timeSpan.className = 'history-entry-time';
        timeSpan.textContent = formatHistoryTimestamp(entry.timestamp);
        
        contentDiv.appendChild(nameSpan);
        contentDiv.appendChild(timeSpan);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'history-entry-delete';
        deleteBtn.textContent = '✕';
        deleteBtn.title = 'Delete this entry';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteHistoryEntry(entry.timestamp);
        });
        
        entryDiv.appendChild(contentDiv);
        entryDiv.appendChild(deleteBtn);
        
        historyList.appendChild(entryDiv);
    });
}

// Delete a specific history entry
function deleteHistoryEntry(timestamp) {
    try {
        let history = JSON.parse(localStorage.getItem('wtd-activity-history') || '[]');
        const deletedEntry = history.find(entry => entry.timestamp === timestamp);
        
        if (deletedEntry) {
            lastUndoState = {
                type: 'delete',
                data: deletedEntry
            };
            enableUndoButton();
        }
        
        history = history.filter(entry => entry.timestamp !== timestamp);
        localStorage.setItem('wtd-activity-history', JSON.stringify(history));
        
        displayHistory();
        showNotification('Entry deleted', 'success');
    } catch (error) {
        console.error('Error deleting history entry:', error);
        showNotification('Error deleting entry', 'error');
    }
}

// Enable the undo button
function enableUndoButton() {
    const undoButton = document.getElementById('historyUndoButton');
    if (undoButton) {
        undoButton.disabled = false;
    }
}

// Undo the last undoable action (deletion or clear all)
function undoLastDeletion() {
    if (!lastUndoState) {
        showNotification('Nothing to undo', 'info');
        return;
    }
    
    try {
        let history = JSON.parse(localStorage.getItem('wtd-activity-history') || '[]');
        
        if (lastUndoState.type === 'delete') {
            // Restore a single deleted entry
            history.push(lastUndoState.data);
            showNotification('Entry restored', 'success');
        } else if (lastUndoState.type === 'clearAll') {
            // Restore all cleared entries
            history = lastUndoState.data;
            showNotification('History restored', 'success');
        }
        
        localStorage.setItem('wtd-activity-history', JSON.stringify(history));
        displayHistory();
        lastUndoState = null;
        
        const undoButton = document.getElementById('historyUndoButton');
        if (undoButton) {
            undoButton.disabled = true;
        }
    } catch (error) {
        console.error('Error undoing action:', error);
        showNotification('Error restoring', 'error');
    }
}

// Clear all history with confirmation
function clearAllHistory() {
    // Create confirmation modal
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1001;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background-color: var(--bg-dark);
        border: 2px solid var(--accent);
        border-radius: 8px;
        padding: 30px;
        max-width: 350px;
        text-align: center;
        color: var(--fg-light);
    `;
    
    modal.innerHTML = `
        <h3 style="color: var(--accent); margin-bottom: 15px; font-size: 18px;">Clear All History?</h3>
        <p style="color: var(--fg-muted); margin-bottom: 20px; font-size: 12px;">All history entries will be cleared. You can undo this until the app is closed.</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="confirmClearAll" style="
                background-color: #A52A2A;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s ease;
            ">Yes, Clear All</button>
            <button id="cancelClearAll" style="
                background-color: var(--button-bg);
                color: var(--fg-light);
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s ease;
            ">Cancel</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const confirmBtn = document.getElementById('confirmClearAll');
    const cancelBtn = document.getElementById('cancelClearAll');
    
    confirmBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        try {
            const currentHistory = JSON.parse(localStorage.getItem('wtd-activity-history') || '[]');
            lastUndoState = {
                type: 'clearAll',
                data: currentHistory
            };
            enableUndoButton();
            
            localStorage.setItem('wtd-activity-history', '[]');
            displayHistory();
            showNotification('All history cleared', 'success');
        } catch (error) {
            console.error('Error clearing history:', error);
            showNotification('Error clearing history', 'error');
        }
    });
    
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    
    confirmBtn.addEventListener('mouseenter', () => {
        confirmBtn.style.backgroundColor = '#8B0000';
    });
    confirmBtn.addEventListener('mouseleave', () => {
        confirmBtn.style.backgroundColor = '#A52A2A';
    });
    
    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.backgroundColor = 'var(--button-active-bg)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.backgroundColor = 'var(--button-bg)';
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
}