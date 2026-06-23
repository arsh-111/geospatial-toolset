import * as vscode from 'vscode';
import * as fs from 'fs';
import { exec } from 'child_process'; // 1. Fixed the import here
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    let panel: vscode.WebviewPanel | undefined = undefined;

    let disposable = vscode.commands.registerCommand('geospatial-toolset.previewGeospatial', (uri: vscode.Uri) => {
        let filePath: string | undefined = uri?.fsPath || vscode.window.activeTextEditor?.document.uri.fsPath;
        if (!filePath) return;

        panel = vscode.window.createWebviewPanel(
            'mlGeospatialStudio',
            `LULC ML Studio`,
            vscode.ViewColumn.Two,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        panel.webview.html = generateMapUIHtml();

        panel.webview.onDidReceiveMessage(message => {
            if (message.command === 'executeLulcModel') {
                vscode.window.showInformationMessage(`Spawning Background Engine: running ${message.model}...`);
                
                const scriptPath = path.join(context.extensionPath, 'src', 'lulc_worker.py');
                const cmd = `python "${scriptPath}" --image "${filePath}" --training "${filePath}" --model "${message.model}" --trees ${message.trees} --depth ${message.depth}`;

                // 2. Fixed function call and added explicit strict TypeScript parameter types
                exec(cmd, (error: Error | null, stdout: string, stderr: string) => {
                    if (error || stderr) {
                        vscode.window.showErrorMessage(`Engine Script Execution Error: ${stderr || error?.message}`);
                        return;
                    }
                    try {
                        const response = JSON.parse(stdout.trim());
                        if (response.status === 'success') {
                            panel?.webview.postMessage({ command: 'renderLulcOutput', data: response.data });
                            vscode.window.showInformationMessage('LULC Matrix Generation Complete! Rendered on canvas.');
                        } else {
                            vscode.window.showErrorMessage(`ML Process Exception: ${response.message}`);
                        }
                    } catch (e: any) {
                        vscode.window.showErrorMessage(`Failed to parse ML worker response matrix: ${e.message}`);
                    }
                });
            }
        });
    });

    context.subscriptions.push(disposable);
}

function generateMapUIHtml(): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
                html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background-color: #1a1a1a; }
                .ml-panel { position: absolute; top: 20px; right: 20px; z-index: 1000; background: rgba(30,30,30,0.95); padding: 15px; border-radius: 8px; border: 1px solid #555; color: white; font-family: sans-serif; width: 240px; }
                .ml-panel label { font-size: 11px; display: block; margin-top: 8px; color: #aaa; }
                .ml-panel select, .ml-panel input { background:#444; color:white; width:100%; padding:4px; border:1px solid #666; border-radius:4px; box-sizing: border-box; }
                .ml-panel button { background:#007acc; color:white; border:none; width:100%; padding:8px; cursor:pointer; border-radius:4px; font-weight:bold; margin-top:12px; }
                .ml-panel button:hover { background:#0062a3; }
            </style>
        </head>
        <body>
            <div id="map"></div>
            
            <div class="ml-panel">
                <h3 style="margin: 0 0 10px 0; font-size:14px; color: #007acc;">LULC Engine Workbench</h3>
                
                <label>Target Machine Learning Model:</label>
                <select id="mlModel" onchange="toggleHyperparams()">
                    <option value="random_forest">Random Forest Classifier</option>
                    <option value="svm">Support Vector Machine (SVM)</option>
                    <option value="gradient_boosting">Gradient Boosting (XGBoost)</option>
                </select>

                <div id="rfParams">
                    <label>N Estimators (Trees Count):</label>
                    <input type="number" id="rfTrees" value="100" min="10" max="500">

                    <label>Maximum Tree Depth:</label>
                    <input type="number" id="rfDepth" value="12" min="1" max="50">
                </div>

                <button onclick="runClassification()">Run Core Model Pipe</button>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                const map = L.map('map').setView([16.86, 74.56], 12);
                
                const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                const satLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}');
                
                L.control.layers({ "Street Base Map": streetLayer, "Satellite HighRes": satLayer }).addTo(map);

                let lulcLayer = null;

                function toggleHyperparams() {
                    const model = document.getElementById('mlModel').value;
                    document.getElementById('rfParams').style.display = (model === 'random_forest') ? 'block' : 'none';
                }

                function runClassification() {
                    vscode.postMessage({
                        command: 'executeLulcModel',
                        model: document.getElementById('mlModel').value,
                        trees: document.getElementById('rfTrees').value,
                        depth: document.getElementById('rfDepth').value
                    });
                }

                window.addEventListener('message', event => {
                    const msg = event.data;
                    if (msg.command === 'renderLulcOutput') {
                        if (lulcLayer) map.removeLayer(lulcLayer);
                        
                        lulcLayer = L.geoJSON(msg.data, {
                            pointToLayer: function (feature, latlng) {
                                let classColor = '#fff';
                                const c = feature.properties.LULC_Class;
                                if (c === 1) classColor = '#0000ff';
                                if (c === 2) classColor = '#00ff00';
                                if (c === 3) classColor = '#ff0000';
                                
                                return L.circleMarker(latlng, { radius: 4, fillColor: classColor, color: classColor, fillOpacity: 0.8 });
                            }
                        }).addTo(map);
                    }
                });
            </script>
        </body>
        </html>
    `;
}

export function deactivate() {}