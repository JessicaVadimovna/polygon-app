import './buffer-zone.js';
import './work-zone.js';
import { generateRandomPolygon } from './utils.js';
import { savePolygons, loadPolygons, clearPolygons } from './storage.js';

class PolygonApp extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="toolbar">
        <button id="createBtn">Создать</button>
        <button id="saveBtn">Сохранить</button>
        <button id="resetBtn">Сбросить</button>
      </div>
      <buffer-zone id="bufferZone"></buffer-zone>
      <work-zone id="workZone"></work-zone>`;

    console.log('PolygonApp connected, bufferZone:', !!this.querySelector('#bufferZone'));

    this.querySelector('#createBtn').addEventListener('click', () => {
      const buffer = this.querySelector('#bufferZone');
      if (!buffer) {
        console.log('BufferZone not found');
        return;
      }
      buffer.clear();
      const count = Math.floor(Math.random() * 16) + 5;
      console.log('Creating', count, 'polygons');
      for (let i = 0; i < count; i++) {
        const points = generateRandomPolygon();
        console.log('Adding polygon to buffer:', points);
        buffer.addPolygon(points);
      }
    });

    this.querySelector('#saveBtn').addEventListener('click', () => {
      const buffer = this.querySelector('#bufferZone').getPolygons();
      const work = this.querySelector('#workZone').getPolygons();
      console.log('Saving polygons:', { buffer, work });
      savePolygons({ buffer, work });
    });

    this.querySelector('#resetBtn').addEventListener('click', () => {
      console.log('Resetting polygons');
      clearPolygons();
      location.reload();
    });

    const saved = loadPolygons();
    if (saved) {
      console.log('Loading saved polygons:', saved);
      saved.buffer.forEach(p => this.querySelector('#bufferZone').addPolygon(p));
      saved.work.forEach(p => this.querySelector('#workZone').addPolygon(p));
    }
  }
}

if (!customElements.get('polygon-app')) {
  customElements.define('polygon-app', PolygonApp);
}

