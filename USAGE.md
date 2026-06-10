# QuestionFlow-Inspector User Manual

## Getting Started

After installing the extension, no additional configuration is required.

The extension automatically activates when supported assessment API requests are detected.

---

## Interface Overview

### Header

Displays the extension title and provides controls for:

* Moving the panel
* Closing the panel

### Question Section

Shows:

* Current question text
* Extracted assessment content

### Answer Section

Displays:

* Parsed answer information
* Identified response mappings

---

## Moving the Panel

1. Click and hold the header.
2. Drag to any screen position.
3. Release to place the panel.

---

## Closing the Panel

Click the Close button located in the top-right corner of the overlay.

The panel will automatically reappear when new assessment data is detected.

---

## Keyboard Shortcuts

### Alt + Shift + Q

Function:

* Performs automated answer selection when supported by the detected question type.

Requirements:

* Question data must already be captured.
* Supported question format must be available.

---

## Supported Question Types

### Multiple Choice Questions (MCQ)

Capabilities:

* Question extraction
* Answer analysis
* Overlay visualization
* Automated selection

### Matching Questions

Capabilities:

* Question extraction
* Mapping visualization

Limitations:

* Automated selection is not currently supported.

---

## Troubleshooting

### Overlay Not Appearing

Check:

1. Extension is enabled.
2. Assessment page has fully loaded.
3. Supported API endpoints are being used.
4. Browser permissions are granted.

---

### No Data Displayed

Possible causes:

* Unsupported assessment format
* API response structure changed
* Endpoint not monitored

---

### Auto Selection Not Working

Verify:

* Question data has been captured.
* Shortcut keys are pressed correctly.
* Question type supports automation.

---

## Performance Notes

The extension operates entirely within the browser and performs analysis only when monitored API requests are detected.

No external servers are used.
