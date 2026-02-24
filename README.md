# MedBot AI Hospital Intake & Management System 🏥🤖

Welcome to **MedBot**, a comprehensive AI-powered hospital intake and triage system designed to streamline patient registration and medical assessment.

## 🚀 Project Overview

MedBot consists of two main components:
1.  **Backend (Python)**: An intelligent medical intake system that conducts patient interviews, identifies red flags (urgency), and generates clinical reports.
2.  **Frontend (React + Vite)**: A modern web interface for managing and cleaning medical data (located in `json to clean`).

---

## 🛠 Features

- **Automated Demographics Collection**: Captures patient name, age, and sex for risk assessment.
- **Adaptive Medical Triage**: Uses LLM-based logic to conduct clinical interviews based on patient complaints.
- **Urgency Detection**: Automatically identifies "RED_FLAG" symptoms and alerts for emergency services.
- **JSON Report Generation**: Automatically generates structured medical records upon completion.
- **Modern UI**: A sleek, responsive frontend built with React, Vite, Framer Motion, and Tailwind-inspired styling.

---

## 📂 Directory Structure

```text
.
├── MedBot/                # Python Backend
│   ├── medbot.py          # Main entry point
│   ├── router.py          # AI Routing logic
│   └── ...
├── json to clean/         # React Frontend
│   ├── src/               # React components
│   ├── package.json       # Dependencies
│   └── ...
└── README.md              # Project Documentation
```

---

## ⚙️ Getting Started

### Backend Setup (MedBot)
1. Navigate to the `MedBot` directory:
   ```bash
   cd MedBot
   ```
2. Install dependencies (e.g., `openai`, `flask` if applicable):
   ```bash
   pip install -r requirements.txt
   ```
3. Run the bot:
   ```bash
   python medbot.py
   ```

### Frontend Setup (medical-cleaner)
1. Navigate to the `json to clean` directory:
   ```bash
   cd "json to clean"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License.

---
Created with ❤️ by [neveshdivya](https://github.com/neveshdivya)
