# Serial Monitor

A professional, 100% client-side web-based serial monitor for embedded systems development. Connect to serial ports directly from your browser using the **Web Serial API**. Visualize data in real-time, decode protocols, and manage complex debugging workflows, no backend server required.

![Version](https://img.shields.io/badge/version-v1.2.2-orange?style=flat)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=flat&logo=javascript&logoColor=%23F7DF1E)
![Web Serial API](https://img.shields.io/badge/Web_Serial_API-Browser-4285F4?style=flat&logo=googlechrome&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)

<p align="center">
  <img src="assets/Screenshot from 2026-02-23 23-09-40.png" alt="Serial Monitor Interface" width="100%">
</p>

## Features

- **Multi-Tab Connections** - Open multiple serial ports simultaneously, each in its own independent tab with isolated history, stats, and settings.
- **Real-Time Terminal** - High-performance terminal with auto-scroll, timestamps, and regex-powered search.
- **Live Data Plotter** - Visualize incoming numeric data streams with auto-scaling charts; collapsible panel.
- **Protocol Decoders** - Built-in **Modbus RTU** and **SLIP** decoders via a frontend plugin system.
- **Data Export** - Export logs as **TXT**, **CSV**, or **JSON** with optional filtering.
- **Flexible Send Modes** - Transmit in **ASCII**, **HEX**, or **Binary** with configurable auto-repeat (pause/resume supported).
- **Live Statistics** - Per-tab tracking of RX/TX throughput, byte counts, line counts, errors, and uptime.
- **Full Serial Configuration** - Set baud rate (including custom), data bits, parity, stop bits, and flow control per tab.
- **Light & Dark Theme** - Toggle between light and dark mode; preference is saved across sessions.
- **Keyboard Shortcuts** - Productive power-user workflow without lifting your hands off the keyboard.

## Prerequisites

- **A supported browser**: Google Chrome, Microsoft Edge, or Opera  
  *(Firefox and Safari do not support the Web Serial API)*
- **A serial device**: USB-to-UART adapter, Arduino, ESP32, Raspberry Pi Pico, etc.

## Getting Started

This is a fully static, client-side application - no Node.js, Python, or backend needed.

### Option 1: Live Demo

**[Serial Monitor](https://espflasher.bharanidharanrangaraj.in)**

1. Plug your serial device into your computer.
2. Open the **link above** in a supported browser.
3. Click **"+ New"** to authorize the browser to access your USB/serial port.
4. Select the authorized port, configure baud rate and serial settings, then click **Connect**.

### Option 2: Run Locally

Browsers require `http://` or `https://` to use the Web Serial API (not `file://`). Serve the folder with any simple HTTP server:

**Using Python:**
```bash
python3 -m http.server 8000
# Open http://localhost:8000 in Chrome/Edge
```

**Using Node.js:**
```bash
npx serve .
# Open http://localhost:3000 in Chrome/Edge
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML / CSS / JavaScript (zero frameworks) |
| Serial Comms | [Web Serial API (`navigator.serial`)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API) |
| Fonts | [Inter](https://rsms.me/inter/) & [JetBrains Mono](https://www.jetbrains.com/lp/mono/) |

## Browser Support

| Browser | Supported |
|---|---|
| Google Chrome 89+ | ✅ |
| Microsoft Edge 89+ | ✅ |
| Opera 75+ | ✅ |
| Firefox | ❌ (Web Serial not supported) |
| Safari | ❌ (Web Serial not supported) |

## License

This project is licensed under the **MIT License**.
