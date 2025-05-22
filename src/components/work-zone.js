class WorkZone extends HTMLElement {
  constructor() {
    super();
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.dragging = false;
  }

  connectedCallback() {
    this.style.display = 'flex';
    this.style.flex = '1';
    this.classList.add('zone');

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.setAttribute('preserveAspectRatio', 'none');
    this.svg.setAttribute('pointer-events', 'all');
    this.appendChild(this.svg);

    this.polygonLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svg.appendChild(this.polygonLayer);

    this.axisLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.axisLayer.setAttribute('pointer-events', 'none');
    this.svg.appendChild(this.axisLayer);

    this.svg.addEventListener('wheel', this.onWheel.bind(this));
    this.svg.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.svg.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.svg.addEventListener('mouseup', () => (this.dragging = false));
    this.svg.addEventListener('mouseleave', () => (this.dragging = false));

    console.log('WorkZone connected, SVG dimensions:', this.svg.getBoundingClientRect());

    window.addEventListener('load', () => {
      this.updateViewBox();
      this.drawAxes();
    });
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
    
    const padding = Math.max(maxX - minX, maxY - minY) * 0.01; // Уменьшено до 1%
    
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', minX - padding);
    rect.setAttribute('y', minY - padding);
    rect.setAttribute('width', maxX - minX + 2 * padding);
    rect.setAttribute('height', maxY - minY + 2 * padding);
    rect.setAttribute('fill', 'transparent');
    rect.setAttribute('pointer-events', 'all');
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', points);
    polygon.setAttribute('fill', 'rgb(148, 0, 37)');
    polygon.setAttribute('stroke', 'none');
    
    group.setAttribute('pointer-events', 'all');
    group.style.cursor = 'grab';
    group.addEventListener('mousedown', e => {
      console.log('WorkZone group mousedown, points:', points);
      this.startDragging(e, group, points);
      e.preventDefault();
    });
    group.appendChild(rect);
    group.appendChild(polygon);
    this.polygonLayer.appendChild(group);
  }

  startDragging(event, group, points) {
    console.log('WorkZone start dragging:', points);
    event.preventDefault();
    group.style.cursor = 'grabbing';
    group.style.zIndex = '30';

    const svg = this.svg;
    const rect = svg.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    let translateX = 0;
    let translateY = 0;

    const coords = points.split(' ').map(p => p.split(',').map(Number));
    const cx = coords.reduce((sum, p) => sum + p[0], 0) / coords.length;
    const cy = coords.reduce((sum, p) => sum + p[1], 0) / coords.length;

    const onMouseMove = e => {
      console.log('WorkZone dragging, clientX:', e.clientX, 'clientY:', e.clientY);
      const dx = (e.clientX - startX) * (100 / rect.width) / this.scale;
      const dy = (e.clientY - startY) * (100 / rect.height) / this.scale;
      translateX = dx;
      translateY = dy;
      group.setAttribute('transform', `translate(${dx}, ${dy})`);
    };

    const onMouseUp = e => {
      console.log('WorkZone stop dragging, drop at:', e.clientX, e.clientY);
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
        console.log('WorkZone dropping in BufferZone:', points);
        const bufferSvg = bufferZone.svg;
        const bufferSvgRect = bufferSvg.getBoundingClientRect();
        const bufferViewBox = bufferSvg.viewBox.baseVal;

        const dropX = (e.clientX - bufferSvgRect.left) * (bufferViewBox.width / bufferSvgRect.width);
        const dropY = (e.clientY - bufferSvgRect.top) * (bufferViewBox.height / bufferSvgRect.height);

        console.log('Drop coordinates in buffer zone:', dropX, dropY);

        const newPoints = coords
          .map(([x, y]) => {
            return `${dropX + (x - cx)},${dropY + (y - cy)}`;
          })
          .join(' ');

        console.log('Adding to BufferZone with points:', newPoints);
        bufferZone.addPolygon(newPoints);
        group.remove();
      } else {
        console.log('Dropped in WorkZone, updating position');
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
    const container = this.getBoundingClientRect();
    const aspectRatio = container.height > 0 ? container.width / container.height : 1;
    const viewHeight = 100 / this.scale;
    const viewWidth = viewHeight * aspectRatio;
    this.svg.setAttribute(
      'viewBox',
      `${this.offsetX} ${this.offsetY} ${viewWidth} ${viewHeight}`
    );
    console.log('WorkZone updateViewBox:', {
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      viewWidth,
      viewHeight,
      aspectRatio,
      containerWidth: container.width,
      containerHeight: container.height,
    });
  }

  onWheel(e) {
    e.preventDefault();
    const zoom = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = this.svg.getBoundingClientRect();
    const container = this.getBoundingClientRect();
    const aspectRatio = container.height > 0 ? container.width / container.height : 1;
    const viewHeight = 100 / this.scale;
    const viewWidth = viewHeight * aspectRatio;
    const mouseX = (e.clientX - rect.left) * (viewWidth / rect.width) + this.offsetX;
    const mouseY = (e.clientY - rect.top) * (viewHeight / rect.height) + this.offsetY;
    
    this.scale *= zoom;
    this.offsetX = mouseX - (e.clientX - rect.left) * (viewWidth / this.scale / rect.width);
    this.offsetY = mouseY - (e.clientY - rect.top) * (viewHeight / this.scale / rect.height);
    this.updateViewBox();
    this.drawAxes();
  }

  onMouseDown(e) {
    if (e.target.tagName === 'polygon' || e.target.tagName === 'g' || e.target.tagName === 'rect') return;
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  onMouseMove(e) {
    if (!this.dragging) return;
    const rect = this.svg.getBoundingClientRect();
    const container = this.getBoundingClientRect();
    const aspectRatio = container.height > 0 ? container.width / container.height : 1;
    const viewHeight = 100 / this.scale;
    const viewWidth = viewHeight * aspectRatio;
    const dx = (e.clientX - this.lastX) * (viewWidth / rect.width);
    const dy = (e.clientY - this.lastY) * (viewHeight / rect.height);
    this.offsetX -= dx;
    this.offsetY -= dy;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.updateViewBox();
    this.drawAxes();
  }

  getPolygons() {
    return Array.from(this.polygonLayer.querySelectorAll('g > polygon')).map(p => p.getAttribute('points'));
  }

  drawAxes() {
    if (!this.axisLayer) {
      console.error('WorkZone drawAxes: axisLayer is undefined');
      return;
    }
    this.axisLayer.innerHTML = '';

    const container = this.getBoundingClientRect();
    const aspectRatio = container.height > 0 ? container.width / container.height : 1;
    const step = 10 / this.scale;
    const viewHeight = 100 / this.scale;
    const viewWidth = viewHeight * aspectRatio;
    const minX = this.offsetX;
    const maxX = this.offsetX + viewWidth;
    const minY = this.offsetY;
    const maxY = this.offsetY + viewHeight;

    for (let x = Math.floor(minX / step) * step; x <= maxX + step / 2; x += step) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x);
      line.setAttribute('y1', minY);
      line.setAttribute('x2', x);
      line.setAttribute('y2', maxY);
      line.setAttribute('stroke', 'lightgray');
      line.setAttribute('stroke-width', 0.2 / this.scale);
      this.axisLayer.appendChild(line);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x + 0.2 / this.scale);
      text.setAttribute('y', minY + 2 / this.scale);
      text.setAttribute('font-size', 1 / this.scale);
      text.setAttribute('fill', 'black');
      text.textContent = x.toFixed(1);
      this.axisLayer.appendChild(text);
    }

    for (let y = Math.floor(minY / step) * step; y <= maxY + step / 2; y += step) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', minX);
      line.setAttribute('y1', y);
      line.setAttribute('x2', maxX);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', 'lightgray');
      line.setAttribute('stroke-width', 0.2 / this.scale);
      this.axisLayer.appendChild(line);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', minX + 0.2 / this.scale);
      text.setAttribute('y', y + 1 / this.scale);
      text.setAttribute('font-size', 1 / this.scale);
      text.setAttribute('fill', 'black');
      text.textContent = y.toFixed(1);
      this.axisLayer.appendChild(text);
    }

    console.log('WorkZone drawAxes: Grid drawn from x=', minX, 'to', maxX, 'y=', minY, 'to', maxY, 'viewWidth=', viewWidth, 'viewHeight=', viewHeight, 'svgWidth=', container.width, 'svgHeight=', container.height);
  }
}

if (!customElements.get('work-zone')) {
  customElements.define('work-zone', WorkZone);
}

