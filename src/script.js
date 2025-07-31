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
            weatherDisplay.title = 'Click to set your location manually';
            
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
            weatherDisplay.title = 'Click to refresh weather or change location';
            
            // Enable "Tell Me What To Do" button
            updateTellMeWhatToDoButton(true);
            
            // Store successful location for future use
            if (weatherData.name && !location.includes('lat=')) {
                localStorage.setItem('wtd-last-successful-location', location);
            }
            
            // Update daylight label with real times
            updateDaylightLabel();
            
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
        weatherDisplay.title = 'Click to retry or set location manually';
        
        // Disable "Tell Me What To Do" button on error
        updateTellMeWhatToDoButton(false);
        
        // Still try to load activities with default conditions
        loadActivities();
    }
}

// Enhanced app initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('App initialized at:', new Date().toLocaleTimeString());
    
    // Setup basic functionality first
    setupEventListeners();
    populateTimeOptions();
    
    // Initialize theme
    initializeTheme();
    setupSystemThemeListener();
    
    // Load existing activities
    loadActivities();
    validateForm();
    
    // Show initial loading state
    weatherDisplay.textContent = '🔄 Starting up...';
    
    // Initialize weather with auto-detection
    console.log('Initializing location detection...');
    
    // Add a small delay to let the UI render first
    setTimeout(async () => {
        await updateWeather();
        
        // Set up auto-refresh interval (5 minutes in production, 2 minutes for testing)
        setInterval(() => {
            console.log('Auto weather refresh at:', new Date().toLocaleTimeString());
            updateWeather();
        }, 5 * 60 * 1000); // 5 minutes
    }, 500);
});

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
    `;
    
    modal.innerHTML = `
        <h2 style="color: var(--accent); margin-bottom: 20px; font-size: 18px; text-align: center;">Settings</h2>
        
        <!-- Location Setting -->
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-size: 12px; font-weight: bold;">Location:</label>
            <div style="display: flex; gap: 8px; margin-bottom: 5px;">
                <input type="text" id="settingsLocation" placeholder="e.g. Denver,CO,US or leave blank for auto-detect" style="
                    flex: 1;
                    background-color: var(--input-bg);
                    color: var(--fg-light);
                    border: 1px solid var(--button-bg);
                    padding: 8px 12px;
                    font-size: 12px;
                    border-radius: 3px;
                    outline: none;
                " value="${currentLocation}">
                <button id="detectLocationBtn" style="
                    background-color: var(--accent);
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 10px;
                    white-space: nowrap;
                    transition: background-color 0.2s ease;
                " title="Auto-detect your location">📍 Detect</button>
            </div>
            <div style="font-size: 10px; color: var(--fg-muted); font-style: italic;">
                Leave blank to auto-detect on startup. Use format: City,State,Country
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
            <div style="display: flex; gap: 15px;">
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
    
    // Setup event listeners including the new detect button
    setupSettingsModalEventListeners();
    
    // Focus on the location input
    const locationInput = document.getElementById('settingsLocation');
    locationInput.focus();
}