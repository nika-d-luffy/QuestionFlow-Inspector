# QuestionFlow-Inspector
A Chromium-based browser extension designed to analyze and visualize assessment-related API responses on the NetAcad (Cisco Networking Academy) platform for educational and research purposes.

## Overview

Assessment Insight is a browser extension that monitors assessment-related API traffic on the NetAcad platform, extracts question-related information, and presents the data through a lightweight floating interface.

The project was developed for educational research, API analysis, browser extension development, and understanding how web-based assessment systems deliver and process content. It is intended to help students, developers, and researchers learn about web technologies, network communication, and browser automation techniques.

---

## Features

### Question Extraction

* Captures assessment-related question payloads from API responses
* Supports multiple question formats
* Extracts question text and associated metadata

### Response Analysis

* Parses assessment response structures
* Identifies answer mappings contained within returned payloads
* Displays extracted information in an organized and readable format

### Floating Overlay

* Modern and draggable user interface
* Real-time updates when new assessment data is detected
* Minimal impact on page layout and browsing experience

### Multi-Frame Support

* Works across nested iframes
* Traverses Shadow DOM structures
* Captures data from embedded assessment environments

### Keyboard Shortcuts

* Quick interaction using keyboard commands
* Streamlined workflow for assessment data analysis

### Lightweight Architecture

* Manifest V3 compatible
* Minimal resource consumption
* Runs entirely within the browser

---

## Technical Highlights

* Fetch API interception
* XMLHttpRequest (XHR) interception
* Shadow DOM traversal
* Cross-frame communication
* Dynamic overlay rendering
* Real-time response processing

---

## Installation

### Developer Mode

1. Download or clone the repository.
2. Open Google Chrome, Microsoft Edge, or another Chromium-based browser.
3. Navigate to:

```
chrome://extensions/
```

4. Enable **Developer Mode**.
5. Click **Load Unpacked**.
6. Select the extension folder.
7. The extension will be installed and ready to use.

---

## Usage

1. Open the NetAcad assessment page.
2. Navigate through questions normally.
3. The extension automatically monitors relevant API responses.
4. When supported assessment data is detected, the overlay will appear.
5. Review the extracted information directly from the floating panel.
6. Use available keyboard shortcuts where applicable.

---

## Architecture

### background.js

* Message relay service
* Communication handling between extension components

### content.js

* API interception
* Question extraction
* Data parsing
* Overlay rendering
* Keyboard shortcut handling

### manifest.json

* Extension configuration
* Permissions management
* Content script registration

---

## Permissions

The extension requires the following permissions:

* scripting
* webRequest
* storage
* host access permissions

These permissions are necessary to monitor assessment-related network traffic, process response data, and display analysis results within the browser.

---

## Browser Compatibility

* Google Chrome
* Microsoft Edge
* Brave Browser
* Other Chromium-based browsers supporting Manifest V3

---

## Version

Current Version: 1.0

---

## Disclaimer

**Educational Purpose Only**

This project was created solely for educational, research, learning, debugging, and API analysis purposes, specifically to study browser extension development, web application behavior, and assessment delivery mechanisms on the NetAcad platform.

The authors and contributors of this project do **not** encourage, support, or endorse any form of academic dishonesty, cheating, unauthorized access, or violation of platform policies.

Users are solely responsible for how they use this software and must comply with all applicable laws, institutional policies, and the Terms of Service of any platform on which the extension is used.

By using this project, you acknowledge that:

* The extension is provided for educational and research purposes only.
* You are responsible for ensuring your use complies with NetAcad policies and any applicable regulations.
* The authors and contributors are **not responsible for any misuse, abuse, policy violations, academic misconduct, account restrictions, or other consequences resulting from the use of this software**.

Use this project responsibly and ethically.
