# Grocery Price Tracker

A self-hosted web app for tracking grocery prices across stores.

## Quick Start

git clone this repo
cp .env.example .env
nano .env  (edit passwords)
docker compose up -d

Access at http://localhost:3001
Default admin: admin@tracker.local / Admin123!

## Features

- Track purchases with store, item, packaging, size, quantity
- Per-package and by-weight pricing
- Price history charts with store comparison
- Monthly spending reports
- Dark mode
- Multi-user with admin panel

## Backup

Copy the entire directory to back up everything including database.

## Requirements

Docker and Docker Compose
