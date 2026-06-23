# Geospatial Toolset Pro

**Geospatial Toolset Pro** turns your VS Code environment into a high-performance interactive geospatial development studio and Machine Learning workbench. Designed specifically for researchers and GIS developers, it bridges the gap between text-based geographic data formats, live mapping layers, and powerful background scikit-learn ML pipelines.

![Extension Logo](logo.png)

---

## 🚀 Core Features

### 1. Interactive Multi-Format Canvas & Map Rendering
* Instantly preview spatial file structures (**GeoJSON**, **WKT**, and **KML**) directly within an integrated webview map.
* Toggle fluidly between **OpenStreetMap Standard View** and **Google High-Resolution Satellite Hybrid Imagery** layers to analyze your study regions.

### 2. Live Text-to-Map Synchronization
* Keep your text editor and preview canvas open side-by-side. 
* As you edit and save coordinate values or geometry properties in your JSON/WKT files, the map shifts and re-renders spatial alterations dynamically in real-time.

### 3. Native Spatial Drawing & Reverse Injection
* Create new geospatial data geometries directly on the basemap canvas using built-in interactive vector tools (Polygons, Rectangles, Points).
* Generate on-the-fly syntax snippets (such as **Google Earth Engine API code blocks**) containing your custom drawn coordinates and inject them directly back into your open editor cursor line.

### 4. Local LULC Machine Learning Workbench
* Train and deploy standard classification algorithms (**Random Forest**, **Support Vector Machines (SVM)**, and **Gradient Boosting / XGBoost Variants**) straight from your workspace.
* Runs lightweight, background Python data processing engines to sample spectral features and predict classification boundaries.
* Renders highly dense, interactive thematic point grids (Water, Vegetation, Built-up) over the base map canvas for immediate validation.

---

## 🛠️ System Requirements & Setup

To use the local Machine Learning LULC engine, ensure you have a Python 3 environment active on your machine alongside the core data science libraries. 

Run the following command in your terminal to install the underlying engine dependencies:

```bash
pip install scikit-learn rasterio geopandas numpy