# How to Setup Live Endpoint

This application supports a **LIVE** mode that connects to Google's Gemini API to provide intelligent, context-aware answers about the simulation.

## Prerequisites

1.  **Google Cloud Project**: You need a Google Cloud project with the Gemini API enabled.
2.  **API Key**: You need a valid API Key from Google AI Studio.

## Step 1: Get your API Key

1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Click on **"Get API key"** in the sidebar.
3.  Click **"Create API key"**.
4.  Copy the key string.

## Step 2: Local Development Setup

To run the app locally with the API key:

1.  Create a file named `.env` in the root directory of the project.
2.  Add the following line:

```bash
API_KEY=your_api_key_here
```

3.  Restart your development server.

## Step 3: Using the App

1.  Open the application in your browser.
2.  Locate the **DEMO / LIVE** toggle in the top navigation bar.
3.  Switch to **LIVE**.
4.  Click the **AI Tutor** (Lightning Bolt) button in the bottom right.
5.  Ask a question like: *"Why is the latency high right now?"*
6.  The app captures the current simulation state (active models, node usage, network speed) and sends it to Gemini, which returns an explanation based on the actual data visible on your screen.

## Troubleshooting

*   **"Gemini API Key is missing"**: Ensure your `.env` file is named correctly and the variable is `API_KEY`.
*   **401 Errors**: Your API key may be invalid or expired.
*   **Quota Exceeded**: You may have hit the rate limit for the free tier of Gemini API. Switch back to **DEMO** mode.
