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
    this.svg.setAttribute('viewBox', '0 0 100 100');
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
    this.svg.addEventListener('mouseup', () => this.dragging = false);
    this.svg.addEventListener('mouseleave', () => this.dragging = false);

    console.log('WorkZone connected, SVG dimensions:', this.svg.getBoundingClientRect());

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
        
        const dropX = (e.clientX - bufferSvgRect.left) * (100 / bufferSvgRect.width);
        const dropY = (e.clientY - bufferSvgRect.top) * (100 / bufferSvgRect.height);
        
        const newPoints = points
          .split(' ')
          .map(p => {
            const [x, y] = p.split(',').map(Number);
            const newX = (x + translateX - this.offsetX) / this.scale;
            const newY = (y + translateY - this.offsetY) / this.scale;
            return `${newX + dropX},${newY + dropY}`;
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
    this.svg.setAttribute(
      'viewBox',
      `${this.offsetX} ${this.offsetY} ${100 / this.scale} ${100 / this.scale}`
    );
    this.drawAxes();
  }

  onWheel(e) {
    e.preventDefault();
    const zoom = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = this.svg.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (100 / this.scale / rect.width) + this.offsetX;
    const mouseY = (e.clientY - rect.top) * (100 / this.scale / rect.height) + this.offsetY;
    
    this.scale *= zoom;
    this.offsetX = mouseX - (e.clientX - rect.left) * (100 / this.scale / rect.width);
    this.offsetY = mouseY - (e.clientY - rect.top) * (100 / this.scale / rect.height);
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
    const rect = this.svg.getBoundingClientRect();
    const dx = (e.clientX - this.lastX) * (100 / this.scale / rect.width);
    const dy = (e.clientY - this.lastY) * (100 / this.scale / rect.height);
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

    const step = 10 / this.scale;
    const viewWidth = 100 / this.scale;
    const viewHeight = 100 / this.scale;
    const minX = this.offsetX;
    const maxX = this.offsetX + viewWidth;
    const minY = this.offsetY;
    const maxY = this.offsetY + viewHeight;

    const svgRect = this.svg.getBoundingClientRect();

    for (let x = minX; x <= maxX + step / 2; x += step) {
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

    for (let y = minY; y <= maxY + step / 2; y += step) {
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

    console.log('WorkZone drawAxes: Grid drawn from x=', minX, 'to', maxX, 'y=', minY, 'to', maxY, 'viewWidth=', viewWidth, 'viewHeight=', viewHeight, 'svgWidth=', svgRect.width, 'svgHeight=', svgRect.height);
  }
}

if (!customElements.get('work-zone')) {
  customElements.define('work-zone', WorkZone);
}

