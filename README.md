<p align="center">
  <img src="favicon.svg" width="72" height="72" alt="Serial Monitor Logo">
  <br><br>
  <strong style="font-size:1.8em;">Serial Monitor</strong>
</p>

<p align="center">
  A professional, 100% client-side web serial monitor for embedded systems development.<br>
  Connect to serial ports directly from your browser — no backend, no install, no dependencies.
</p>

<p align="center">
  <a href="https://github.com/bharanidharanrangaraj/serial-monitor/releases"><img src="https://img.shields.io/badge/version-v1.3.0-007acc?style=flat" alt="Version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat" alt="License"></a>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black" alt="JavaScript">
  <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API"><img src="https://img.shields.io/badge/Web_Serial_API-4285F4?style=flat&logo=googlechrome&logoColor=white" alt="Web Serial API"></a>
</p>

<p align="center">
  <strong><a href="https://serialmonitor.bharanidharanrangaraj.in">Live Demo →</a></strong>
</p>

---

![Serial Monitor Interface](assets/Screenshot%20from%202026-02-23%2023-09-40.png)

---

## Features

| | Feature | Description |
| --- | --- | --- |
| 🖥️ | **Multi-Tab Connections** | Multiple serial ports open simultaneously, each with isolated history, stats, and settings |
| ⚡ | **Real-Time Terminal** | Virtual-scrolling terminal with auto-scroll, timestamps, and regex search |
| 📈 | **Live Data Plotter** | Visualize numeric CSV data streams with auto-scaling charts |
| 🔌 | **Protocol Decoders** | Built-in Modbus RTU and SLIP decoders via a plugin system |
| 💾 | **Data Export** | Export logs as TXT, CSV, or JSON with optional filtering |
| 📤 | **Flexible Send Modes** | Transmit in ASCII, HEX, or Binary with configurable auto-repeat |
| 📊 | **Live Statistics** | Per-tab RX/TX throughput, byte counts, line counts, errors, and uptime |
| ⚙️ | **Full Serial Config** | Baud rate (including custom), data bits, parity, stop bits, and flow control |
| 🌗 | **Light & Dark Theme** | System-aware theme toggle with preference saved across sessions |
| ⌨️ | **Keyboard Shortcuts** | `Ctrl+T` new tab · `Ctrl+W` close · `Ctrl+F` search · `Ctrl+Shift+C` clear |
| 📴 | **Offline Ready** | Zero external dependencies — works fully without an internet connection |

---

## Prerequisites

- **Browser:** Google Chrome 89+, Microsoft Edge 89+, or Opera 75+
  > Firefox and Safari do not support the Web Serial API.
- **Device:** Any USB-to-UART adapter, Arduino, ESP32, Raspberry Pi Pico, or similar.

---

## Getting Started

This is a fully static application — no Node.js, Python, or build step needed.

### Option 1 — Live Demo

Open **[serialmonitor.bharanidharanrangaraj.in](https://serialmonitor.bharanidharanrangaraj.in)** in Chrome or Edge, plug in your device, and connect.

### Option 2 — Run Locally

The Web Serial API requires `http://` or `https://` — it does not work over `file://`.

**Python:**

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

**Node.js:**

```bash
npx serve .
# then open http://localhost:3000
```

### Option 3 — Clone & Serve

```bash
git clone https://github.com/bharanidharanrangaraj/serial-monitor.git
cd serial-monitor
python3 -m http.server 8000
```

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Vanilla HTML / CSS / JavaScript — zero frameworks |
| Serial Comms | Web Serial API (`navigator.serial`) |
| Fonts | System fonts — Segoe UI / Cascadia Code (no external CDN) |
| Deployment | GitHub Pages (static) |

---

## Browser Support

| Browser | Supported |
| --- | --- |
| Google Chrome 89+ | ✅ |
| Microsoft Edge 89+ | ✅ |
| Opera 75+ | ✅ |
| Firefox | ❌ Web Serial API not supported |
| Safari | ❌ Web Serial API not supported |

---

## Author

### Bharani Dharan Rangaraj

[![Website](https://img.shields.io/badge/Website-bharanidharanrangaraj.in-007acc?style=flat)](https://bharanidharanrangaraj.in)
[![GitHub](https://img.shields.io/badge/GitHub-bharanidharanrangaraj-181717?style=flat&logo=github)](https://github.com/bharanidharanrangaraj)
[![Email](https://img.shields.io/badge/Email-bharanidharanrangaraj%40gmail.com-EA4335?style=flat&logo=gmail&logoColor=white)](mailto:bharanidharanrangaraj@gmail.com)

---

## License

This project is licensed under the **[MIT License](LICENSE)**.

Copyright © 2026 Bharani Dharan Rangaraj
