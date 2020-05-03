import * as L from 'leaflet';
import { CanvasLayer } from './CanvasLayer';

const mapTilerUrl = 'https://api.maptiler.com/maps/topo/{z}/{x}/{y}.png?key=6hEH9bUrAyDHR6nLDUf6';
const smUrl = 'https://tiles.soaringmeteo.org/{z}/{x}/{y}.png';
const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const initializeMap = (element: HTMLElement): [CanvasLayer, L.Map] => {
  const map = L.map(element, {
    layers: [
      L.tileLayer(mapTilerUrl, {
        tileSize: 512,
        zoomOffset: -1,
        minZoom: 1,
        crossOrigin: true
      })
    ],
    zoomControl: false,
    center: [45.5, 9.5],
    zoom: 7
  });
  
  L.control.zoom({ position: 'topright' }).addTo(map);

  const canvas = new CanvasLayer;
  canvas.addTo(map);

  return [canvas as CanvasLayer, map]
}
