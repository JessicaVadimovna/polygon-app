class WorkZone extends HTMLElement {
  constructor() {
    super();
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.dragging = false;
  }

  connectedCallback() {
    this.style.height = '400px';
    this.style.overflow = 'hidden';
    this.style.zIndex = '10'; // Ниже buffer-zone
    this.classList.add('zone');

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.setAttribute('viewBox', '0 0 100 50');
    this.svg.setAttribute('pointer-events', 'all');
    this.svg.addEventListener('mousedown', e => {
      console.log('WorkZone SVG mousedown, target:', e.target.tagName);
      e.stopPropagation();
    });
    this.appendChild(this.svg);

    this.polygonLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svg.appendChild(this.polygonLayer);

    this.axisLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.axisLayer.setAttribute('pointer-events', 'none');
    this.svg.appendChild(this.axisLayer);

    this.svg.addEventListener('wheel', this.onWheel.bind(this));
    this.svg.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.svg.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.svg.addEventListener('mouseup', () => this.dragging = false);
    this.svg.addEventListener('mouseleave', () => this.dragging = false);

    setTimeout(() => {
      console.log('WorkZone groups count:', this.polygonLayer.querySelectorAll('g').length);
      this.polygonLayer.querySelectorAll('g').forEach(g => console.log('WorkZone group children:', g.children.length));
    }, 1000);

    this.drawAxes();
  }

  addPolygon(points) {
    console.log('WorkZone adding polygon:', points);
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    const coords = points.split(' ').map(p => p.split(',').map(Number));
    const xs = coords.map(c => c[0]);
    const ys = coords.map(c => c[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const padding = 5;
    
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', minX - padding);
    rect.setAttribute('y', minY - padding);
    rect.setAttribute('width', maxX - minX + 2 * padding);
    rect.setAttribute('height', maxY - minY + 2 * padding);
    rect.setAttribute('fill', 'transparent');
    rect.setAttribute('pointer-events', 'all');
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', points);
    polygon.setAttribute('fill', 'red');
    polygon.setAttribute('stroke', 'yellow');
    polygon.setAttribute('stroke-width', '2');
    polygon.setAttribute('pointer-events', 'all');
    
    group.setAttribute('pointer-events', 'all');
    group.style.cursor = 'grab';
    group.addEventListener('mousedown', e => {
      console.log('WorkZone group mousedown, points:', points);
      this.startDragging(e, group, points);
      e.stopPropagation();
    });
    group.appendChild(rect);
    group.appendChild(polygon);
    this.polygonLayer.appendChild(group);
  }

  startDragging(event, group, points) {
    console.log('WorkZone start dragging:', points);
    event.preventDefault();
    event.stopPropagation();
    group.style.cursor = 'grabbing';
    group.style.zIndex = '30';

    const svg = this.svg;
    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    const startX = event.clientX;
    const startY = event.clientY;
    let translateX = 0;
    let translateY = 0;

    const onMouseMove = e => {
      console.log('WorkZone dragging');
      const dx = (e.clientX - startX) * (viewBox.width / rect.width) / this.scale;
      const dy = (e.clientY - startY) * (viewBox.height / rect.height) / this.scale;
      translateX = dx;
      translateY = dy;
      group.setAttribute('transform', `translate(${dx}, ${dy})`);
    };

    const onMouseUp = e => {
      console.log('WorkZone stop dragging');
      group.style.cursor = 'grab';
      group.style.zIndex = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      const bufferZone = document.querySelector('buffer-zone');
      if (!bufferZone) {
        console.log('BufferZone not found');
        group.removeAttribute('transform');
        return;
      }
      const bufferRect = bufferZone.getBoundingClientRect();
      if (
        e.clientX >= bufferRect.left &&
        e.clientX <= bufferRect.right &&
        e.clientY >= bufferRect.top &&
        e.clientY <= bufferRect.bottom
      ) {
        console.log('WorkZone dropped in BufferZone:', points);
        bufferZone.addPolygon(points);
        group.remove();
      } else {
        const newPoints = points
          .split(' ')
          .map(p => {
            const [x, y] = p.split(',').map(Number);
            return `${x + translateX},${y + translateY}`;
          })
          .join(' ');
        group.remove();
        this.addPolygon(newPoints);
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  updateViewBox() {
    this.svg.setAttribute(
      'viewBox',
      `${this.offsetX} ${this.offsetY} ${100 / this.scale} ${50 / this.scale}`
    );
    this.drawAxes();
  }

  onWheel(e) {
    e.preventDefault();
    const zoom = e.deltaY < 0 ? 1.1 : 0.9;
    this.scale *= zoom;
    this.updateViewBox();
  }

  onMouseDown(e) {
    if (e.target.tagName === 'polygon' || e.target.tagName === 'g' || e.target.tagName === 'rect') return;
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  onMouseMove(e) {
    if (!this.dragging) return;
    const dx = (e.clientX - this.lastX) * (100 / this.scale / this.offsetWidth);
    const dy = (e.clientY - this.lastY) * (50 / this.scale / this.offsetHeight);
    this.offsetX -= dx;
    this.offsetY -= dy;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.updateViewBox();
  }

  getPolygons() {
    return Array.from(this.polygonLayer.querySelectorAll('g > polygon')).map(p => p.getAttribute('points'));
  }

  drawAxes() {
    this.axisLayer.innerHTML = '';

    const step = 10;
    const scaleX = 100 / this.scale;
    const scaleY = 50 / this.scale;

    for (let x = Math.floor(this.offsetX / step) * step; x < this.offsetX + scaleX; x += step) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x);
      line.setAttribute('y1', this.offsetY);
      line.setAttribute('x2', x);
      line.setAttribute('y2', this.offsetY + scaleY);
      line.setAttribute('stroke', 'lightgray');
      line.setAttribute('stroke-width', '0.2');
      this.axisLayer.appendChild(line);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x + 0.2);
      text.setAttribute('y', this.offsetY + 2);
      text.setAttribute('font-size', '1');
      text.setAttribute('fill', 'black');
      text.textContent = x;
      this.axisLayer.appendChild(text);
    }

    for (let y = Math.floor(this.offsetY / step) * step; y < this.offsetY + scaleY; y += step) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', this.offsetX);
      line.setAttribute('y1', y);
      line.setAttribute('x2', this.offsetX + scaleX);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', 'lightgray');
      line.setAttribute('stroke-width', '0.2');
      this.axisLayer.appendChild(line);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', this.offsetX + 0.2);
      text.setAttribute('y', y + 1);
      text.setAttribute('font-size', '1');
      text.setAttribute('fill', 'black');
      text.textContent = y;
      this.axisLayer.appendChild(text);
    }
  }
}

if (!customElements.get('work-zone')) {
  customElements.define('work-zone', WorkZone);
}

