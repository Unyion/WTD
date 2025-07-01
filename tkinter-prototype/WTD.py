import tkinter as tk
import tkinter.font as tkfont
from tkinter import ttk

# === Color Palette ===
BG_DARK = "#212121"
FG_LIGHT = "#EEEEEE"
FG_MUTED = "#B0B0B0"
ACCENT = "#4CAF50"
BUTTON_BG = "#424242"
BUTTON_ACTIVE_BG = "#616161"
SEPARATOR = "#888888"
WTD_BUTTON_BG = "darkgreen"
WTD_BUTTON_ACTIVE_BG = "#018400"

root = tk.Tk()
root.title("WTD")

# Button styling --------------
style = ttk.Style()
style.theme_use("default")

# Default dark button
style.configure("Dark.TButton",
    background=BUTTON_BG,
    foreground=FG_LIGHT,
    font=("Arial", 12),
    borderwidth=0,
    focusthickness=3,
    focuscolor="none",
    padding=10
)

style.map("Dark.TButton",
    background=[("active", BUTTON_ACTIVE_BG)],
    foreground=[("disabled", "#666666")]
)

#WTD Button styling --------------
style.configure("WTD.TButton",
    background=WTD_BUTTON_BG,
    foreground="white",
    font=("Arial", 12),
    borderwidth=0,
    focusthickness=3,
    focuscolor="none",
    padding=10
)

style.map("WTD.TButton",
    background=[("active", WTD_BUTTON_ACTIVE_BG)],
    foreground=[("disabled", "#666666")]
)

# Combobox styling for dark theme
style.configure("Dark.TCombobox",
    fieldbackground="#333333",
    background=BUTTON_BG,
    foreground=FG_LIGHT,
    borderwidth=1,
    relief="flat",
    font=("Arial", 10)
)

style.map("Dark.TCombobox",
    fieldbackground=[("readonly", "#333333")],
    selectbackground=[("readonly", "#333333")]
)
# ---------------------

# Set global default font
default_font = tkfont.nametofont("TkDefaultFont")
default_font.configure(family="Arial", size=12)

# Set window background
root.configure(bg=BG_DARK)

# Desired window size
window_width = 575
window_height = 600 

### ===== Set window to the middle of the screen ======
screen_width = root.winfo_screenwidth()
screen_height = root.winfo_screenheight()
center_x = int((screen_width - window_width) / 2)
center_y = int((screen_height - window_height) / 2)
root.geometry(f"{window_width}x{window_height}+{center_x}+{center_y}")
# ======================================================

# ------ Top bar frame to hold weather ------
top_bar = tk.Frame(root, bg=BG_DARK)
top_bar.pack(fill='x', pady=0, padx=10)

spacer = tk.Label(top_bar, text="", bg=BG_DARK)
spacer.pack(side='left', expand=True)

current_weather = "☀️ Sunny, 85º"
weather_label = tk.Label(
    top_bar,
    text=current_weather,
    bg=BG_DARK,
    fg=FG_MUTED,
    font=("Arial", 12)
)
weather_label.pack(side='right')
# ---------------------------------------------

# Title in UI
label = tk.Label(
    root,
    text="What To Do?",
    bg=BG_DARK,
    fg=FG_LIGHT,
    font=("Academy Engraved LET", 24)
)
label.pack(pady=25)

# Tell me what to do button
button = ttk.Button(
    root,
    text="Tell Me What To Do",
    style="WTD.TButton",
    command=lambda: print("What to Do Button Triggered")
)
button.pack(pady=(0, 20))  # 0 pixels above, 20 pixels below

# spacer
separator = tk.Frame(root, height=2, bd=0, relief='sunken', bg=SEPARATOR)
separator.pack(fill='x', padx=10, pady=10)

# ===== Two-column layout =====
bottom_frame = tk.Frame(root, bg=BG_DARK)
bottom_frame.pack(fill='both', expand=True, padx=10, pady=10)

# Left column - "My Activities" (40% width)
left_column = tk.Frame(bottom_frame, bg=BG_DARK, width=220)
left_column.pack(side='left', fill='y', padx=(0, 10))
left_column.pack_propagate(False)  # Maintain fixed width

left_title = tk.Label(left_column, text="Saved Activities", bg=BG_DARK, fg=FG_LIGHT, font=("Baskerville", 16, "bold"))
left_title.pack(anchor='center', fill='x')

# === Right Column === (60% width - more space for controls)
right_column = tk.Frame(bottom_frame, bg=BG_DARK)
right_column.pack(side='left', fill='both', expand=True, padx=(10, 0))

# -- Content Wrapper --
right_content = tk.Frame(right_column, bg=BG_DARK)
right_content.pack(fill='both')

# -- Activity Details Frame --
activity_details_frame = tk.Frame(right_content, bg=BG_DARK)
activity_details_frame.pack(fill='both')

# Title
right_title = tk.Label(
    activity_details_frame,
    text="Add New Activity",
    bg=BG_DARK,
    fg=FG_LIGHT,
    font=("Baskerville", 16, "bold")
)
right_title.pack(anchor='center', pady=(0, 10))

# Entry Field
entry_border = tk.Frame(activity_details_frame, bg=BUTTON_BG, highlightthickness=0)
entry_border.pack(pady=(0, 10))

activity_name_entry = tk.Entry(
    entry_border,
    bg="#333333",
    fg=FG_LIGHT,
    insertbackground=FG_LIGHT,
    relief='flat',
    font=("Arial", 12),
    bd=0
)
activity_name_entry.pack(ipady=3, padx=1, pady=1)

# === Weather Section ===
weather_dependent_var = tk.BooleanVar()

weather_section_frame = tk.Frame(activity_details_frame, bg=BG_DARK)
weather_section_frame.pack(fill='x')

weather_checkbox = tk.Checkbutton(
    weather_section_frame,
    text="Weather Dependent",
    variable=weather_dependent_var,
    bg=BG_DARK,
    fg=FG_LIGHT,
    selectcolor=BG_DARK,
    activebackground=BG_DARK,
    activeforeground=FG_LIGHT,
    font=("Arial", 12),
    command=lambda: toggle_weather_options()
)
weather_checkbox.pack(anchor='center', pady=(0, 5), padx=(0, 20))

weather_instruction_label = tk.Label(
    weather_section_frame,
    text="Select any weather conditions that this activity cannot be done in",
    bg=BG_DARK,
    fg=FG_MUTED,
    font=("Arial", 10, "italic"),
    wraplength=160,
    justify="center"
)

weather_options_frame = tk.Frame(weather_section_frame, bg=BG_DARK)
weather_options_frame.pack_forget()

weather_conditions = ["Rain", "Storm", "High Wind", "Snow"]
weather_condition_vars = {}

for condition in weather_conditions:
    var = tk.BooleanVar()
    chk = tk.Checkbutton(
        weather_options_frame,
        text=condition,
        variable=var,
        bg=BG_DARK,
        fg=FG_LIGHT,
        activebackground=BG_DARK,
        activeforeground=FG_LIGHT,
        selectcolor=BG_DARK
    )
    chk.pack(anchor='w')
    weather_condition_vars[condition] = var

def toggle_weather_options():
    if weather_dependent_var.get():
        weather_instruction_label.pack(anchor='center', pady=(0, 5))
        weather_options_frame.pack(anchor='center', pady=(2, 0), padx=(0, 60))
    else:
        weather_instruction_label.pack_forget()
        weather_options_frame.pack_forget()

# === Seasonal Section ===
seasonal_var = tk.BooleanVar()

seasonal_section_frame = tk.Frame(activity_details_frame, bg=BG_DARK)
seasonal_section_frame.pack(fill='x')

seasonal_checkbox = tk.Checkbutton(
    seasonal_section_frame,
    text="Seasonal",
    variable=seasonal_var,
    bg=BG_DARK,
    fg=FG_LIGHT,
    selectcolor=BG_DARK,
    activebackground=BG_DARK,
    activeforeground=FG_LIGHT,
    font=("Arial", 12),
    command=lambda: toggle_season_options()
)
seasonal_checkbox.pack(anchor='center', pady=(10, 5), padx=(0, 78))

season_instruction_label = tk.Label(
    seasonal_section_frame,
    text="Select the seasons when this activity should be available",
    bg=BG_DARK,
    fg=FG_MUTED,
    font=("Arial", 10, "italic"),
    wraplength=160,
    justify="center"
)

season_options_frame = tk.Frame(seasonal_section_frame, bg=BG_DARK)
season_options_frame.pack_forget()

seasons = ["Spring", "Summer", "Fall", "Winter"]
season_vars = {}

for season in seasons:
    var = tk.BooleanVar()
    chk = tk.Checkbutton(
        season_options_frame,
        text=season,
        variable=var,
        bg=BG_DARK,
        fg=FG_LIGHT,
        activebackground=BG_DARK,
        activeforeground=FG_LIGHT,
        selectcolor=BG_DARK
    )
    chk.pack(anchor='w')
    season_vars[season] = var

def toggle_season_options():
    if seasonal_var.get():
        season_instruction_label.pack(anchor='center', pady=(0, 5))
        season_options_frame.pack(anchor='center', pady=(2, 0), padx=(0, 60))
    else:
        season_instruction_label.pack_forget()
        season_options_frame.pack_forget()

# === Time Dependent Section ===
time_dependent_var = tk.BooleanVar()
sunrise_sunset_var = tk.BooleanVar()

time_section_frame = tk.Frame(activity_details_frame, bg=BG_DARK)
time_section_frame.pack(fill='x')

time_checkbox = tk.Checkbutton(
    time_section_frame,
    text="Time Dependent",
    variable=time_dependent_var,
    bg=BG_DARK,
    fg=FG_LIGHT,
    selectcolor=BG_DARK,
    activebackground=BG_DARK,
    activeforeground=FG_LIGHT,
    font=("Arial", 12),
    command=lambda: toggle_time_options()
)
time_checkbox.pack(anchor='center', pady=(10, 5), padx=(0, 40))

time_instruction_label = tk.Label(
    time_section_frame,
    text="Set time constraints for this activity",
    bg=BG_DARK,
    fg=FG_MUTED,
    font=("Arial", 10, "italic"),
    wraplength=180,
    justify="center"
)

time_options_frame = tk.Frame(time_section_frame, bg=BG_DARK)
time_options_frame.pack_forget()

# Sunrise/Sunset checkbox
sunrise_sunset_checkbox = tk.Checkbutton(
    time_options_frame,
    text="Daylight Only (Sunrise to Sunset)",
    variable=sunrise_sunset_var,
    bg=BG_DARK,
    fg=FG_LIGHT,
    activebackground=BG_DARK,
    activeforeground=FG_LIGHT,
    selectcolor=BG_DARK,
    font=("Arial", 12),
    command=lambda: toggle_custom_time_controls()
)
sunrise_sunset_checkbox.pack(anchor='center', pady=(5, 5), padx=(50, 0))

# Custom time frame
custom_time_frame = tk.Frame(time_options_frame, bg=BG_DARK)
custom_time_frame.pack(anchor='center', pady=(5, 0))

# Start time
start_time_label = tk.Label(
    custom_time_frame,
    text="Start Time:",
    bg=BG_DARK,
    fg=FG_LIGHT,
    font=("Arial", 10)
)
start_time_label.grid(row=0, column=0, sticky='w', padx=(70, 5))

# Generate hour options
hours = [f"{i:02d}:00" for i in range(24)]
start_time_combo = ttk.Combobox(
    custom_time_frame,
    values=hours,
    state="readonly",
    style="Dark.TCombobox",
    width=8,
    font=("Arial", 10)
)
start_time_combo.grid(row=0, column=1, padx=(0, 10))
start_time_combo.set("09:00")  # Default value

# End time
end_time_label = tk.Label(
    custom_time_frame,
    text="End Time:",
    bg=BG_DARK,
    fg=FG_LIGHT,
    font=("Arial", 10)
)
end_time_label.grid(row=1, column=0, sticky='w', padx=(70, 5), pady=(5, 0))

end_time_combo = ttk.Combobox(
    custom_time_frame,
    values=hours,
    state="readonly",
    style="Dark.TCombobox",
    width=8,
    font=("Arial", 10)
)
end_time_combo.grid(row=1, column=1, padx=(0, 10), pady=(5, 0))
end_time_combo.set("17:00")  # Default value

def toggle_time_options():
    if time_dependent_var.get():
        time_instruction_label.pack(anchor='center', pady=(0, 5))
        time_options_frame.pack(anchor='center', pady=(2, 0), padx=(0, 60))
    else:
        time_instruction_label.pack_forget()
        time_options_frame.pack_forget()

def toggle_custom_time_controls():
    if sunrise_sunset_var.get():
        # Disable custom time controls when sunrise/sunset is checked
        start_time_combo.configure(state="disabled")
        end_time_combo.configure(state="disabled")
        start_time_label.configure(fg=FG_MUTED)
        end_time_label.configure(fg=FG_MUTED)
    else:
        # Enable custom time controls
        start_time_combo.configure(state="readonly")
        end_time_combo.configure(state="readonly")
        start_time_label.configure(fg=FG_LIGHT)
        end_time_label.configure(fg=FG_LIGHT)

# === Submit Button ===
add_button = ttk.Button(
    right_content,
    text="Add Activity",
    style="Dark.TButton",
    command=lambda: print("Add Activity Clicked")
)
add_button.pack(anchor='center', pady=(15, 10))

root.mainloop()