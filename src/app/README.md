# WhatsApp Bot Dashboard

A modern frontend dashboard for managing and monitoring a WhatsApp AI chatbot with Trello integration.

## Features

- **Dashboard Overview**: View key metrics and performance indicators
- **Conversation Management**: Monitor and manage WhatsApp conversations
- **Lead Management**: Track and manage leads with Trello integration
- **Settings Configuration**: Configure WhatsApp, OpenAI, and Trello integrations
- **API Documentation**: Reference for developers

## Tech Stack

- **Next.js 14**: React framework with server-side rendering
- **Tailwind CSS**: Utility-first CSS framework
- **Tremor**: React components for dashboards and data visualization
- **React Icons**: Icon library
- **Sonner**: Toast notifications

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/whatsappbot-frontend.git
cd whatsappbot-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the dashboard.

## Connecting to the Backend

This dashboard is designed to work with the WhatsApp chatbot backend. Update the API configuration in the `.env.local` file:

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Building for Production

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm run start
```

## Customization

- Update the design theme in `tailwind.config.js`
- Modify API endpoints in the service files
- Customize components as needed for your specific use case

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 