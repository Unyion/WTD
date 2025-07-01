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
const addActivityButton = document.getElementById('addActivity');
const activityNameInput = document.getElementById('activityName');
const tellMeWhatToDoButton = document.getElementById('tellMeWhatToDo');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    populateTimeOptions();
    loadActivities();
    updateWeather();
});

// Setup all event listeners
function setupEventListeners() {
    // Main checkbox toggles
    weatherDependentCheckbox.addEventListener('change', toggleWeatherOptions);
    seasonalCheckbox.addEventListener('change', toggleSeasonalOptions);
    timeDependentCheckbox.addEventListener('change', toggleTimeOptions);
    daylightOnlyCheckbox.addEventListener('change', toggleDaylightOnly);
    
    // Button clicks
    addActivityButton.addEventListener('click', addActivity);
    tellMeWhatToDoButton.addEventListener('click', suggestActivity);
    
    // Input validation
    activityNameInput.addEventListener('input', validateForm);
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
        toggleDaylightOnly();
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
}

// Add new activity
async function addActivity() {
    const activityName = activityNameInput.value.trim();
    
    if (!activityName) {
        alert('Please enter an activity name');
        return;
    }
    
    // Collect form data
    const activity = {
        name: activityName,
        weatherDependent: weatherDependentCheckbox.checked,
        weatherRestrictions: [],
        seasonal: seasonalCheckbox.checked,
        seasons: [],
        timeDependent: timeDependentCheckbox.checked,
        daylightOnly: daylightOnlyCheckbox.checked,
        startTime: startTimeSelect.value,
        endTime: endTimeSelect.value,
        createdAt: new Date().toISOString()
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
    }
    
    try {
        // Save activity (will implement backend later)
        console.log('Adding activity:', activity);
        
        // For now, store in localStorage
        saveActivityToStorage(activity);
        
        // Reset form
        resetForm();
        
        // Refresh activities list
        loadActivities();
        
        // Show success message
        showNotification('Activity added successfully!', 'success');
        
    } catch (error) {
        console.error('Error adding activity:', error);
        showNotification('Error adding activity', 'error');
    }
}

// Save activity to localStorage (temporary storage)
function saveActivityToStorage(activity) {
    let activities = JSON.parse(localStorage.getItem('wtd-activities') || '[]');
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
    
    activities.forEach((activity, index) => {
        const activityElement = createActivityElement(activity, index);
        activitiesList.appendChild(activityElement);
    });
}

// Create activity element for the list
function createActivityElement(activity, index) {
    const div = document.createElement('div');
    div.className = 'activity-item';
    div.style.cssText = `
        background-color: var(--button-bg);
        padding: 10px;
        margin-bottom: 8px;
        border-radius: 3px;
        cursor: pointer;
        transition: background-color 0.2s ease;
        border-left: 3px solid var(--accent);
    `;
    
    div.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">${activity.name}</div>
        <div style="font-size: 10px; color: var(--fg-muted);">
            ${getActivityDetails(activity)}
        </div>
    `;
    
    div.addEventListener('mouseenter', () => {
        div.style.backgroundColor = 'var(--button-active-bg)';
    });
    
    div.addEventListener('mouseleave', () => {
        div.style.backgroundColor = 'var(--button-bg)';
    });
    
    div.addEventListener('click', () => {
        // TODO: Implement activity editing
        console.log('Edit activity:', activity);
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

// Reset form to initial state
function resetForm() {
    activityNameInput.value = '';
    weatherDependentCheckbox.checked = false;
    seasonalCheckbox.checked = false;
    timeDependentCheckbox.checked = false;
    daylightOnlyCheckbox.checked = false;
    
    // Hide all sub-options
    toggleWeatherOptions();
    toggleSeasonalOptions();
    toggleTimeOptions();
    
    // Reset time selects
    startTimeSelect.value = '09:00';
    endTime