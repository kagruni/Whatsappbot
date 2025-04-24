# WhatsApp AI Chatbot

## Overview

This project implements an advanced WhatsApp chatbot using Node.js, Express, and OpenAI's GPT model. The bot is designed to handle incoming messages from WhatsApp, process them using AI, and manage customer interactions.

## Key Features

1. WhatsApp Business API Integration
2. OpenAI GPT Model for Intelligent Responses
3. Lead Management System
4. Automated Conversation Initiation
5. Conversation History Tracking
6. Message Status Handling

## Core Components

- Express Server: Handles webhook endpoints for WhatsApp
- OpenAI Integration: Generates intelligent responses
- Lead Management: Tracks and manages customer leads
- WhatsApp Client: Sends and receives messages
- CSV Parser: Loads lead information
- Cron Jobs: Schedules automated tasks

## Setup and Configuration

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in a `.env` file (see `config.js` for required variables)
4. Configure WhatsApp Business API
5. Configure OpenAI API key

## Running the Application
