import sys
import json
import argparse
import numpy as np
import geopandas as gpd
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.ensemble import GradientBoostingClassifier

def run_classification(image_path, training_path, model_type, n_estimators, max_depth):
    try:
        # 1. Read the input vector dataset
        gdf = gpd.read_file(training_path)
        if 'class' not in gdf.columns:
            raise ValueError("Training dataset must contain a 'class' integer attribute column (e.g., 1, 2, 3).")

        # 2. Extract geometries and classifications
        gdf = gdf[gdf['class'] > 0]
        if len(gdf) == 0:
            raise ValueError("No valid training samples with 'class' > 0 found.")

        # 3. Hybrid Testing Mechanism:
        # Check if we are running a mock test using a pure vector file layout
        if image_path.lower().endswith(('.geojson', '.json', '.wkt', '.kml')):
            np.random.seed(42)
            X_train = []
            
            # Locked down to exactly 4 features [Blue, Green, Red, NIR] to mimic a true sensor payload
            for c in gdf['class']:
                if c == 1:   # Mock Water: Low NIR, high Blue
                    X_train.append([300, 400, 200, 50])
                elif c == 2: # Mock Vegetation: High NIR, low Red
                    X_train.append([200, 300, 150, 2500])
                else:        # Mock Urban: Uniformly high across all visible bands
                    X_train.append([1200, 1300, 1400, 1500])
                    
            X_train = np.array(X_train)
            y_train = gdf['class'].values

            # Generate a clean, balanced grid matrix around the dataset's bounding box area
            bounds = gdf.total_bounds # [minx, miny, maxx, maxy]
            x_coords = np.linspace(bounds[0] - 0.02, bounds[2] + 0.02, 40)
            y_coords = np.linspace(bounds[1] - 0.02, bounds[3] + 0.02, 40)
            
            grid_features = []
            X_grid = []
            for x in x_coords:
                for y in y_coords:
                    grid_features.append([x, y])
                    # Crucial Fix: Locked to exactly 4 structural elements matching X_train
                    X_grid.append(np.random.uniform(100, 2000, 4).tolist())
                    
            X_grid = np.array(X_grid)

        else:
            # Production pipeline logic utilizing true satellite rasters (GeoTIFF)
            import rasterio
            with rasterio.open(image_path) as src:
                img_data = src.read()
                meta = src.meta
                transform = src.transform
            
            raise NotImplementedError("Raster compilation mode active. For fast visual testing, supply a .geojson canvas file.")

        # 4. Initialize and Train the chosen Machine Learning Classifier
        if model_type == 'random_forest':
            clf = RandomForestClassifier(n_estimators=int(n_estimators), max_depth=int(max_depth), random_state=42)
        elif model_type == 'svm':
            clf = SVC(kernel='rbf', C=1.0, random_state=42)
        elif model_type == 'gradient_boosting':
            clf = GradientBoostingClassifier(n_estimators=int(n_estimators), max_depth=int(max_depth), random_state=42)
        else:
            clf = RandomForestClassifier(n_estimators=100, random_state=42)

        # Train the model mapping inputs to class labels
        clf.fit(X_train, y_train)
        
        # 5. Predict classes across the matching evaluation grid matrix dimensions
        predictions = clf.predict(X_grid)

        # 6. Format dense point grid array results straight into standard GeoJSON features output payload
        features = []
        for idx, coord in enumerate(grid_features):
            features.append({
                "type": "Feature",
                "properties": { "LULC_Class": int(predictions[idx]) },
                "geometry": { "type": "Point", "coordinates": [coord[0], coord[1]] }
            })

        output_geojson = {
            "type": "FeatureCollection",
            "features": features
        }

        print(json.dumps({"status": "success", "data": output_geojson}))

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--image')
    parser.add_argument('--training')
    parser.add_argument('--model')
    parser.add_argument('--trees', default=100)
    parser.add_argument('--depth', default=10)
    args = parser.parse_args()

    run_classification(args.image, args.training, args.model, args.trees, args.depth)