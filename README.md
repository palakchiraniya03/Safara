# Safara – AI-Powered Safe Route Recommendation Platform

## Overview

Safara is a route recommendation platform that helps users choose safer travel routes by combining crime analysis, machine learning, and geospatial visualization.

## Features

* Safe route recommendation
* Route comparison and risk scoring
* Crime hotspot detection using DBSCAN
* Interactive map visualization with Leaflet
* Hospital and police station discovery along routes
* Time-based crime filtering

## Machine Learning Pipeline

Crime Dataset
→ Data Cleaning with Pandas
→ DBSCAN Clustering (Scikit-Learn)
→ Hotspot Detection
→ Flask REST API
→ React + Leaflet Visualization

## Tech Stack

Frontend:

* React
* Leaflet
* Vite

Backend:

* Flask
* Pandas
* Scikit-Learn

Machine Learning:

* DBSCAN Clustering

## Future Improvements

* Time-aware hotspot prediction
* Crime category clustering
* Dynamic risk prediction models
* Indian city crime datasets integration
