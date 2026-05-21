# 🛡️ Safara — AI-Powered Safe Route Recommendation

A web application that recommends the safest route between two locations by analyzing crime incident data using a geospatial danger scoring algorithm.

## Features
- Real road-following route generation using OpenRouteService API
- Danger score calculation using Haversine formula proximity analysis
- Day/Evening/Night crime filter with dynamic route rescoring
- Crime incident heatmap visualization
- SOS emergency alert system

## Tech Stack
React, Leaflet.js, OpenRouteService API, Nominatim Geocoding API, Vite

## Algorithm
For each point along a route, checks all crime incidents within 300m radius. Aggregates severity scores and calculates weighted average danger index using the Haversine distance formula.

## Screenshots
(Add screenshots here)

## Live Demo
(Add Vercel link here)
