
# HomeView - Home Assistant Entity Visualizer

HomeView is a web application built with Next.js that allows you to connect to your Home Assistant instance and visualize the history of your entities using dynamic charts and tables.

## Key Features

- **Dynamic Charts**: Visualize the history of selected Home Assistant entities over time.
- **Data Table**: View the raw historical data points in a tabular format.
- **Customizable Time Range**: Use date and time pickers to select the exact period for which you want to view data.
- **Entity Selection**: Easily select and deselect entities from a filterable list.
- **Responsive Design**: Works on various screen sizes.
- **Modern UI**: Built with ShadCN UI components and Tailwind CSS for a clean and modern look.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **UI Components**: ShadCN UI
- **Styling**: Tailwind CSS
- **Charting**: Recharts
- **Date Handling**: date-fns
- **Home Assistant Integration**: Direct API calls (proxied through Next.js API routes)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn
- A running Home Assistant instance

### Installation

1.  **Clone the repository (if applicable):**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Set up Environment Variables:**
    Create a `.env.local` file in the root of your project directory. This file will store your Home Assistant credentials securely. Add the following lines, replacing the placeholder values with your actual Home Assistant URL and a Long-Lived Access Token:

    ```plaintext
    HOME_ASSISTANT_URL="your_home_assistant_instance_url"
    HOME_ASSISTANT_TOKEN="your_home_assistant_long_lived_access_token"
    ```
    For example:
    ```plaintext
    HOME_ASSISTANT_URL="http://homeassistant.local:8123"
    HOME_ASSISTANT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhY..."
    ```
    You can generate a Long-Lived Access Token from your Home Assistant profile page (bottom of the page).

### Running the Application

Once the dependencies are installed and the environment variables are set, you can run the development server:

```bash
npm run dev
# or
# yarn dev
```

Open [http://localhost:9002](http://localhost:9002) (or the port specified in your `package.json` if different) with your browser to see the application.

## How to Use

1.  **Automatic Connection**: The application automatically attempts to connect to your Home Assistant instance using the credentials provided in your `.env.local` file.
2.  **Entity List**: On the left, you'll find a list of your Home Assistant entities (primarily sensors and other numerically chartable entities). You can use the search bar to filter this list.
3.  **Select Entities**: Check the boxes next to the entities you want to visualize. Two entities, "Pingvin Temperatura na zewnątrz" and "Esp32Termodht11 Salon temp," will be selected by default if they are found.
4.  **Set Time Range**: Above the chart, use the date and time pickers to select the start and end dates for the data you wish to view.
5.  **Refresh Data**: Click the "Refresh Data" button to fetch the latest history for the selected entities and time range. Data also refreshes automatically every minute.
6.  **View Chart and Table**: The chart will display the historical data for the selected entities. Below the chart, a table will show the corresponding data points.

## Troubleshooting

- **"Failed to load entities" / "No data available"**:
    - Ensure your `HOME_ASSISTANT_URL` and `HOME_ASSISTANT_TOKEN` in `.env.local` are correct and that your Home Assistant instance is accessible from where you're running the application.
    - Check the Next.js server console (where you ran `npm run dev`) for any error messages from the API routes.
    - Verify that the selected entities have historical data in Home Assistant for the chosen time range.

- **Lines not appearing on the chart**:
    - This could be due to various reasons, often related to data parsing or chart configuration. Check the browser's developer console for any errors.

## Future Enhancements (Potential)

- AI-powered insights or predictions based on historical data (using Genkit).
- More advanced charting options and customizations.
- User-configurable refresh intervals.
- Saving and loading chart configurations.

This README should give anyone a good starting point for your project!
