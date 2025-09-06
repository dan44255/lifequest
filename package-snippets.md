# Install deps
npm i leaflet react-leaflet
npm i -D @types/leaflet

# Import Leaflet CSS (once)
import 'leaflet/dist/leaflet.css';

# Use the components
import WeatherWidget from './components/WeatherWidget';
import MapView from './components/MapView';
