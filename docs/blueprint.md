# **App Name**: Dev Control

## Core Features:

- Config file parser: The application parses the Next.js configuration file (next.config.js or next.config.mjs).
- Configuration Validation: The application determines if the file can be properly parsed using javascript
- Parameter Toggler: The app uses boolean logic to identify and disable 'auto run dev server'.
- Visual Feedback: The app indicates whether or not 'auto run dev server' has been disabled using clear icons and messaging
- Issue Identification & Resolution: The app will use the server logs to diagnose and resolve issues that cause the NextJS server to crash. It uses the logs to create a tool that provides a summary of the problem and a list of possible solutions.
- Port Finder: The app will use the lsof command to check the existing port, before starting the local host to ensure that the app will start.

## Style Guidelines:

- Primary color: Deep indigo (#3F51B5), representing intelligence and focus, aligning with the application's purpose of configuring developer tools.
- Background color: Very light gray (#F5F5F5), providing a neutral backdrop that enhances readability and reduces visual strain during extended configuration sessions.
- Accent color: Cyan (#00BCD4), used for interactive elements and status indicators, contrasting sharply with the indigo to draw attention to important controls and confirmations.
- Font choice: 'Inter', a sans-serif font providing a modern and readable interface, suitable for both instructions and settings labels. Its neutral design ensures that the app remains approachable.
- Simple, monochromatic icons to represent settings and their status (enabled/disabled).
- Clean, logical grouping of settings with clear labels.
- Subtle transitions to indicate the status change of each setting.