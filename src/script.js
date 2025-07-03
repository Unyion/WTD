// DOM elements
const weatherDependentCheckbox = document.getElementById('weatherDependent');
const weatherOptions = document.getElementById('weatherOptions');
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

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized at:', new Date().toLocaleTimeString());
    setupEventListeners();
    populateTimeOptions();
    loadActivities();
    
    // Force weather update immediately and log it
    console.log('Forcing weather update...');
    updateWeather();
    
    validateForm(); // Initial validation
});

// Setup all event listeners
function setupEventListeners() {
    // Main checkbox toggles
    weatherDependentCheckbox.addEventListener('change', toggleWeatherOptions);
    seasonalCheckbox.addEventListener('change', toggleSeasonalOptions);
    timeDependentCheckbox.addEventListener('change', toggleTimeOptions);
    daylightOnlyCheckbox.addEventListener('change', toggleDaylightOnly);
    if (dayOfWeekCheckbox) dayOfWeekCheckbox.addEventListener('change', toggleDayOfWeekOptions);
    
    // Button clicks
    addActivityButton.addEventListener('click', addActivity);
    tellMeWhatToDoButton.addEventListener('click', suggestActivity);
    
    // Add click listener to weather display for manual refresh or settings
    weatherDisplay.addEventListener('click', () => {
        const weatherText = weatherDisplay.textContent;
        if (weatherText.includes('Location not found') || weatherText.includes('Unable to get location')) {
            console.log('Location not found - opening settings');
            showSettingsModal();
        } else {
            console.log('Manual weather refresh requested');
            weatherDisplay.textContent = '🔄 Refreshing...';
            updateWeather();
        }
    });
    weatherDisplay.style.cursor = 'pointer';
    weatherDisplay.title = 'Click to refresh weather';
    
    // Settings button click
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            console.log('Settings button clicked');
            showSettingsModal();
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
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0') + ':00';
        hours.push(hour);
    }
    
    hours.forEach(hour => {
        const startOption = new Option(hour, hour);
        const endOption = new Option(hour, hour);
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
        const weatherCheckboxes = weatherOptions.querySelectorAll('input[type="checkbox"]:checked');
        activity.weatherRestrictions = Array.from(weatherCheckboxes).map(cb => cb.value);
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
    
    // Filter and sort activities - available first, then unavailable
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
    
    // Combine arrays - available first, then unavailable
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
                <button class="delete-btn" style="background: none; border: none; color: #ff6b6b; cursor: pointer; font-size: 12px; padding: 2px 5px; transition: all 0.2s ease; position: relative;" title="Delete">
                    <span class="delete-icon">🗑</span>
                    <span class="delete-icon-hover" style="position: absolute; top: 0; left: 0; opacity: 0; filter: hue-rotate(0deg) brightness(1.5) saturate(2);">🗑</span>
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
        deleteIconHover.style.filter = 'hue-rotate(0deg) brightness(2) saturate(3) contrast(1.5)';
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

// Get activity details for display
function getActivityDetails(activity) {
    const details = [];
    
    if (activity.weatherDependent && activity.weatherRestrictions.length > 0) {
        details.push(`Weather: No ${activity.weatherRestrictions.join(', ')}`);
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
    // Weather check
    if (activity.weatherDependent && activity.weatherRestrictions.length > 0) {
        if (activity.weatherRestrictions.some(restriction => 
            conditions.weather.toLowerCase().includes(restriction.toLowerCase()))) {
            return false;
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
            // Check if current time is between sunrise and sunset
            // For now, using simplified 6am-8pm as daylight hours
            const currentHour = conditions.currentTime.getHours();
            if (currentHour < 6 || currentHour > 20) {
                return false;
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
    
    // Weather check
    if (activity.weatherDependent && activity.weatherRestrictions.length > 0) {
        if (activity.weatherRestrictions.some(restriction => 
            conditions.weather.toLowerCase().includes(restriction.toLowerCase()))) {
            reasons.push(`Current weather: ${conditions.weather}`);
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
            const currentHour = conditions.currentTime.getHours();
            if (currentHour < 6 || currentHour > 20) {
                reasons.push('Outside daylight hours');
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

// Get current conditions (updated to use actual weather data)
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
    
    return {
        weather: weather,
        season: season,
        currentTime: now
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
        <h2 style="color: var(--accent); margin-bottom: 20px; font-size: 20px;">Suggested Activity</h2>
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
            ">Perfect!</button>
            <button id="newSuggestion" style="
                background-color: var(--button-bg);
                color: var(--fg-light);
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
            ">Suggest Another</button>
            <button id="closeSuggestion" style="
                background-color: #666;
                color: var(--fg-light);
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
            ">Close</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Event listeners for modal buttons
    document.getElementById('acceptSuggestion').addEventListener('click', () => {
        document.body.removeChild(overlay);
        showNotification(`Great choice! Enjoy your ${activity.name}!`, 'success');
    });
    
    document.getElementById('newSuggestion').addEventListener('click', () => {
        document.body.removeChild(overlay);
        suggestActivity();
    });
    
    document.getElementById('closeSuggestion').addEventListener('click', () => {
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
                <p style="color: var(--fg-muted); font-size: 10px; font-style: italic; margin-bottom: 10px;">Select weather conditions that prevent this activity</p>
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
                    Daylight Only (Sunrise to Sunset)
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
    
    // Focus on the name input
    document.getElementById('editActivityName').focus();
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

// Show settings modal
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
            <input type="text" id="settingsLocation" placeholder="e.g. Denver,CO,US or leave blank for auto-detect" style="
                width: 100%;
                background-color: var(--input-bg);
                color: var(--fg-light);
                border: 1px solid var(--button-bg);
                padding: 8px 12px;
                font-size: 12px;
                border-radius: 3px;
                outline: none;
                margin-bottom: 5px;
            " value="${currentLocation}">
            <div style="font-size: 10px; color: var(--fg-muted); font-style: italic;">
                Leave blank to auto-detect your location. Use format: City,State,Country
            </div>
        </div>

        <!-- Time Format Setting -->
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-size: 12px; font-weight: bold;">Time Format:</label>
            <div style="display: flex; gap: 15px;">
                <label style="display: flex; align-items: center; cursor: pointer; font-size: 12px;">
                    <input type="radio" name="timeFormat" value="12hr" ${currentTimeFormat === '12hr' ? 'checked' : ''} style="margin-right: 8px;">
                    12-hour (3:00 PM)
                </label>
                <label style="display: flex; align-items: center; cursor: pointer; font-size: 12px;">
                    <input type="radio" name="timeFormat" value="24hr" ${currentTimeFormat === '24hr' ? 'checked' : ''} style="margin-right: 8px;">
                    24-hour (15:00)
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
    
    // Setup event listeners for the settings modal
    setupSettingsModalEventListeners();
    
    // Focus on the location input
    document.getElementById('settingsLocation').focus();
}

// Setup event listeners for settings modal
function setupSettingsModalEventListeners() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    const cancelBtn = document.getElementById('cancelSettingsBtn');
    
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
}

// Save settings
function saveSettings() {
    const location = document.getElementById('settingsLocation').value.trim();
    const timeFormat = document.querySelector('input[name="timeFormat"]:checked').value;
    const tempUnit = document.querySelector('input[name="tempUnit"]:checked').value;
    
    // Save to localStorage
    if (location) {
        localStorage.setItem('wtd-location', location);
    } else {
        localStorage.removeItem('wtd-location'); // Remove to trigger auto-detect
    }
    
    localStorage.setItem('wtd-time-format', timeFormat);
    localStorage.setItem('wtd-temp-unit', tempUnit);
    
    console.log('Settings saved:', { location: location || 'auto-detect', timeFormat, tempUnit });
    
    // Close modal
    closeSettingsModal();
    
    // Refresh weather with new settings
    updateWeather();
    
    // Show success notification
    showNotification('Settings saved successfully!', 'success');
}

// Close settings modal
function closeSettingsModal() {
    const overlay = document.getElementById('settings-modal-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// Get user's location or use saved location
async function getUserLocation() {
    // First check if we have a saved location preference
    const savedLocation = localStorage.getItem('wtd-location');
    if (savedLocation && savedLocation !== 'auto') {
        console.log('Using saved location:', savedLocation);
        return savedLocation;
    }
    
    // Try to get user's current location
    return new Promise((resolve) => {
        if (navigator.geolocation) {
            console.log('Attempting to get user location...');
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    console.log('Got user coordinates:', lat, lon);
                    resolve(`lat=${lat}&lon=${lon}`);
                },
                (error) => {
                    console.log('Geolocation failed:', error.message);
                    // Return null instead of fallback location
                    resolve(null);
                },
                {
                    timeout: 10000,
                    enableHighAccuracy: false,
                    maximumAge: 300000 // 5 minutes
                }
            );
        } else {
            console.log('Geolocation not supported');
            resolve(null);
        }
    });
}

// Update weather display (updated version)
async function updateWeather() {
    console.log('updateWeather() called at:', new Date().toLocaleTimeString());
    
    try {
        const API_KEY = '1b3f996b321116580a695dbe6ae7f026';
        
        // Get user's location (auto-detect or saved preference)
        const location = await getUserLocation();
        
        if (!location) {
            // No location available - show error message
            weatherDisplay.textContent = '📍 Location not found - Click to set';
            weatherDisplay.style.cursor = 'pointer';
            weatherDisplay.style.color = '#ff9800'; // Orange warning color
            
            // Disable "Tell Me What To Do" button
            updateTellMeWhatToDoButton(false);
            
            // Don't try to load activities without location
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
        
        console.log('About to fetch weather from URL:', url);
        
        // Add explicit timeout and error handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(url, { 
            signal: controller.signal,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'WTD-App/1.0'
            }
        });
        
        clearTimeout(timeoutId);
        
        console.log('Fetch completed successfully');
        console.log('Weather API response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (response.ok) {
            console.log('Response is OK, parsing JSON...');
            const weatherData = await response.json();
            console.log('Raw weather data received:', JSON.stringify(weatherData, null, 2));
            
            const condition = weatherData.weather[0].main.toLowerCase();
            const description = weatherData.weather[0].description;
            const temp = Math.round(weatherData.main.temp);
            const emoji = getWeatherEmoji(condition);
            
            // Get temperature unit preference
            const tempUnit = localStorage.getItem('wtd-temp-unit') || 'F';
            const tempSuffix = tempUnit === 'F' ? '°F' : '°C';
            
            console.log('Parsed weather info:');
            console.log('- Condition:', condition);
            console.log('- Description:', description);
            console.log('- Temperature:', temp);
            console.log('- Emoji:', emoji);
            console.log('- Location:', weatherData.name);
            
            // Capitalize first letter of description
            const capitalizedDescription = description.charAt(0).toUpperCase() + description.slice(1);
            
            const weatherText = `${emoji} ${capitalizedDescription}, ${temp}${tempSuffix}`;
            weatherDisplay.textContent = weatherText;
            weatherDisplay.style.color = 'var(--fg-muted)'; // Reset color
            weatherDisplay.style.cursor = 'pointer'; // Keep clickable for manual refresh
            
            // Enable "Tell Me What To Do" button
            updateTellMeWhatToDoButton(true);
            
            // Store the actual location name returned by API
            if (weatherData.name) {
                localStorage.setItem('wtd-current-location', weatherData.name);
                console.log('Stored current location as:', weatherData.name);
            }
            
            console.log('Weather display updated to:', weatherText);
            console.log('Current time when updated:', new Date().toLocaleString());
            
            // Update activities list based on new weather
            loadActivities();
        } else {
            console.log('Response not OK, reading error...');
            const errorText = await response.text();
            console.error('Weather API error response:', errorText);
            throw new Error(`Weather API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
    } catch (error) {
        console.error('Error in updateWeather():', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Show specific error messages
        if (error.name === 'AbortError') {
            weatherDisplay.textContent = '⏱️ Weather request timed out';
        } else if (error.message.includes('Failed to fetch')) {
            weatherDisplay.textContent = '🌐 Cannot connect to weather service';
        } else if (error.message.includes('API')) {
            weatherDisplay.textContent = '❌ Weather API error';
        } else {
            weatherDisplay.textContent = '☀️ Weather unavailable';  
        }
        
        weatherDisplay.style.color = '#ff6b6b'; // Red error color
        
        // Disable "Tell Me What To Do" button on error
        updateTellMeWhatToDoButton(false);
        
        // Still try to load activities with default conditions
        loadActivities();
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
    if (confirm('Are you sure you want to delete this activity?')) {
        let activities = JSON.parse(localStorage.getItem('wtd-activities') || '[]');
        activities = activities.filter(activity => activity.id !== activityId);
        localStorage.setItem('wtd-activities', JSON.stringify(activities));
        
        loadActivities();
        showNotification('Activity deleted', 'success');
    }
}

// Reset form to initial state
function resetForm() {
    activityNameInput.value = '';
    weatherDependentCheckbox.checked = false;
    seasonalCheckbox.checked = false;
    timeDependentCheckbox.checked = false;
    daylightOnlyCheckbox.checked = false;
    
    if (dayOfWeekCheckbox) {
        dayOfWeekCheckbox.checked = false;
    }
    
    // Hide all sub-options
    toggleWeatherOptions();
    toggleSeasonalOptions();
    toggleTimeOptions();
    toggleDayOfWeekOptions();
    
    // Reset time selects
    startTimeSelect.value = '09:00';
    endTimeSelect.value = '17:00';
    
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
        top: 20px;
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
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Utility function to get season from date
function getSeasonFromDate(date) {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
}

// Update weather every 2 minutes for testing (change back to 5 minutes later)
setInterval(() => {
    console.log('Auto weather update triggered at:', new Date().toLocaleTimeString());
    updateWeather();
}, 2 * 60 * 1000);