class WorkZone extends HTMLElement {
  constructor() {
    super();
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.dragging = false;
    this.pinching = false; // Флаг для масштабирования пальцами
    this.lastTouchDistance = 0; // Расстояние между пальцами
  }

  connectedCallback() {
    this.style.display = 'flex';
    this.style.flex = '1';
    this.classList.add('zone');

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.setAttribute('pointer-events', 'all');
    this.appendChild(this.svg);

    this.polygonLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svg.appendChild(this.polygonLayer);

    this.axisLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.axisLayer.setAttribute('pointer-events', 'none');
    this.svg.appendChild(this.axisLayer);

    // События мыши
    this.svg.addEventListener('wheel', this.onWheel.bind(this));
    this.svg.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.svg.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.svg.addEventListener('mouseup', () => (this.dragging = false));
    this.svg.addEventListener('mouseleave', () => (this.dragging = false));

    // События касания
    this.svg.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.svg.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.svg.addEventListener('touchend', this.onTouchEnd.bind(this));

    window.addEventListener('load', () => {
      this.centerViewBoxOnContent();
      this.updateViewBox();
      this.drawAxes();
    });
  }

  addPolygon(points) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const coords = points.split(' ').map(p => p.split(',').map(Number));
    const xs = coords.map(c => c[0]);
    const ys = coords.map(c => c[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const padding = Math.max(maxX - minX, maxY - minY) * 0.01;

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
      this.startDragging(e, group, points);
      e.preventDefault();
    });
    group.addEventListener('touchstart', e => {
      this.startDragging(e, group, points);
      e.preventDefault();
    });
    group.appendChild(rect);
    group.appendChild(polygon);
    this.polygonLayer.appendChild(group);
  }

  startDragging(event, group, points) {
    event.preventDefault();
    group.style.cursor = 'grabbing';
    group.style.zIndex = '30';

    const svg = this.svg;
    const rect = svg.getBoundingClientRect();
    const viewBox = this.svg.viewBox.baseVal;
    const isTouch = event.type === 'touchstart' || event.type === 'touchmove';
    const startX = isTouch ? event.touches[0].clientX : event.clientX;
    const startY = isTouch ? event.touches[0].clientY : event.clientY;
    let translateX = 0;
    let translateY = 0;

    const coords = points.split(' ').map(p => p.split(',').map(Number));
    const cx = coords.reduce((sum, p) => sum + p[0], 0) / coords.length;
    const cy = coords.reduce((sum, p) => sum + p[1], 0) / coords.length;

    const updatePosition = (e) => {
      const clientX = isTouch ? e.touches[0].clientX : e.clientX;
      const clientY = isTouch ? e.touches[0].clientY : e.clientY;
      const dxPixels = clientX - startX;
      const dyPixels = clientY - startY;
      translateX = (dxPixels * viewBox.width) / rect.width / this.scale;
      translateY = (dyPixels * viewBox.height) / rect.height / this.scale;
      group.setAttribute('transform', `translate(${translateX}, ${translateY})`);
    };

    let rafId = null;
    const onMove = (e) => {
      e.preventDefault();
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => updatePosition(e));
    };

    const onEnd = (e) => {
      group.style.cursor = 'grab';
      group.style.zIndex = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      if (rafId) cancelAnimationFrame(rafId);

      const clientX = isTouch && e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const clientY = isTouch && e.changedTouches ? e.changedTouches[0].clientY : e.clientY;

      const bufferZone = document.querySelector('buffer-zone');
      if (bufferZone) {
        const bufferRect = bufferZone.getBoundingClientRect();
        if (
          clientX >= bufferRect.left &&
          clientX <= bufferRect.right &&
          clientY >= bufferRect.top &&
          clientY <= bufferRect.bottom
        ) {
          const bufferSvg = bufferZone.svg;
          const bufferSvgRect = bufferSvg.getBoundingClientRect();
          const bufferViewBox = bufferSvg.viewBox.baseVal;

          const dropX = (clientX - bufferSvgRect.left) * (bufferViewBox.width / bufferSvgRect.width);
          const dropY = (clientY - bufferSvgRect.top) * (bufferViewBox.height / bufferSvgRect.height);

          const newPoints = coords
            .map(([x, y]) => `${dropX + (x - cx)},${dropY + (y - cy)}`)
            .join(' ');
          bufferZone.addPolygon(newPoints);
          group.remove();
          return;
        }
      }

      const newPoints = points
        .split(' ')
        .map(p => {
          const [x, y] = p.split(',').map(Number);
          return `${x + translateX},${y + translateY}`;
        })
        .join(' ');
      group.remove();
      this.addPolygon(newPoints);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  }

  getPolygons() {
    return Array.from(this.polygonLayer.querySelectorAll('polygon')).map(p => p.getAttribute('points'));
  }

  getBoundingBox() {
    const polygons = this.getPolygons();
    if (polygons.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    polygons.forEach(points => {
      const coords = points.split(' ').map(p => p.split(',').map(Number));
      coords.forEach(([x, y]) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });
    });
    return { minX, minY, maxX, maxY };
  }

  centerViewBoxOnContent() {
    const bb = this.getBoundingBox();
    if (bb) {
      const container = this.getBoundingClientRect();
      const aspectRatio = container.height > 0 ? container.width / container.height : 1;
      const viewHeight = 100 / this.scale;
      const viewWidth = viewHeight * aspectRatio;
      const figureCenterX = (bb.minX + bb.maxX) / 2;
      const figureCenterY = (bb.minY + bb.maxY) / 2;
      this.offsetX = figureCenterX - viewWidth / 2;
      this.offsetY = figureCenterY - viewHeight / 2;
    }
  }

  updateViewBox() {
    const container = this.getBoundingClientRect();
    const aspectRatio = container.height > 0 ? container.width / container.height : 1;
    const viewHeight = 100 / this.scale;
    const viewWidth = viewHeight * aspectRatio;
    this.svg.setAttribute('viewBox', `${this.offsetX} ${this.offsetY} ${viewWidth} ${viewHeight}`);
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
    const newViewHeight = 100 / this.scale;
    const newViewWidth = newViewHeight * aspectRatio;
    this.offsetX = mouseX - (e.clientX - rect.left) * (newViewWidth / rect.width);
    this.offsetY = mouseY - (e.clientY - rect.top) * (newViewHeight / rect.height);
    this.updateViewBox();

    const bb = this.getBoundingBox();
    if (bb) {
      const viewMinX = this.offsetX;
      const viewMaxX = this.offsetX + newViewWidth;
      const viewMinY = this.offsetY;
      const viewMaxY = this.offsetY + newViewHeight;
      const figureMinX = bb.minX;
      const figureMaxX = bb.maxX;
      const figureMinY = bb.minY;
      const figureMaxY = bb.maxY;

      if (figureMaxX < viewMinX || figureMinX > viewMaxX || figureMaxY < viewMinY || figureMinY > viewMaxY) {
        const figureCenterX = (figureMinX + figureMaxX) / 2;
        const figureCenterY = (figureMinY + figureMaxY) / 2;
        this.offsetX = figureCenterX - newViewWidth / 2;
        this.offsetY = figureCenterY - newViewHeight / 2;
        this.updateViewBox();
      }
    }
    this.drawAxes();
  }

  onTouchStart(e) {
    e.preventDefault();
    if (e.target.tagName === 'polygon' || e.target.tagName === 'g' || e.target.tagName === 'rect') return;

    if (e.touches.length === 1) {
      // Перетаскивание одним пальцем
      this.dragging = true;
      this.lastX = e.touches[0].clientX;
      this.lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      // Масштабирование двумя пальцами
      this.dragging = false;
      this.pinching = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
    }
  }

  onTouchMove(e) {
    e.preventDefault();
    if (this.dragging && e.touches.length === 1) {
      // Перетаскивание одним пальцем
      const rect = this.svg.getBoundingClientRect();
      const container = this.getBoundingClientRect();
      const aspectRatio = container.height > 0 ? container.width / container.height : 1;
      const viewHeight = 100 / this.scale;
      const viewWidth = viewHeight * aspectRatio;
      const clientX = e.touches[0].clientX;
      const clientY = e.touches[0].clientY;
      const dx = (clientX - this.lastX) * (viewWidth / rect.width);
      const dy = (clientY - this.lastY) * (viewHeight / rect.height);
      this.offsetX -= dx;
      this.offsetY -= dy;
      this.lastX = clientX;
      this.lastY = clientY;
      this.updateViewBox();
      this.drawAxes();
    } else if (this.pinching && e.touches.length === 2) {
      // Масштабирование двумя пальцами
      this.handlePinchZoom(e);
    }
  }

  onTouchEnd(e) {
    e.preventDefault();
    if (e.touches.length < 2) {
      this.pinching = false;
      this.lastTouchDistance = 0;
    }
    if (e.touches.length === 0) {
      this.dragging = false;
    }
  }

  handlePinchZoom(e) {
    const rect = this.svg.getBoundingClientRect();
    const container = this.getBoundingClientRect();
    const aspectRatio = container.height > 0 ? container.width / container.height : 1;
    const viewHeight = 100 / this.scale;
    const viewWidth = viewHeight * aspectRatio;

    // Вычисляем текущее расстояние между пальцами
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const currentDistance = Math.sqrt(dx * dx + dy * dy);

    // Вычисляем центр между пальцами
    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    const svgMidX = (midX - rect.left) * (viewWidth / rect.width) + this.offsetX;
    const svgMidY = (midY - rect.top) * (viewHeight / rect.height) + this.offsetY;

    // Вычисляем изменение масштаба
    const zoom = currentDistance / this.lastTouchDistance;
    this.scale *= zoom;

    // Обновляем viewBox
    const newViewHeight = 100 / this.scale;
    const newViewWidth = newViewHeight * aspectRatio;
    this.offsetX = svgMidX - (midX - rect.left) * (newViewWidth / rect.width);
    this.offsetY = svgMidY - (midY - rect.top) * (newViewHeight / rect.height);
    this.updateViewBox();

    // Проверяем, чтобы фигуры оставались в видимой области
    const bb = this.getBoundingBox();
    if (bb) {
      const viewMinX = this.offsetX;
      const viewMaxX = this.offsetX + newViewWidth;
      const viewMinY = this.offsetY;
      const viewMaxY = this.offsetY + newViewHeight;
      const figureMinX = bb.minX;
      const figureMaxX = bb.maxX;
      const figureMinY = bb.minY;
      const figureMaxY = bb.maxY;

      if (figureMaxX < viewMinX || figureMinX > viewMaxX || figureMaxY < viewMinY || figureMinY > viewMaxY) {
        const figureCenterX = (figureMinX + figureMaxX) / 2;
        const figureCenterY = (figureMinY + figureMaxY) / 2;
        this.offsetX = figureCenterX - newViewWidth / 2;
        this.offsetY = figureCenterY - newViewHeight / 2;
        this.updateViewBox();
      }
    }

    this.drawAxes();
    this.lastTouchDistance = currentDistance;
  }

  onMouseDown(e) {
    if (e.target.tagName === 'polygon' || e.target.tagName === 'g' || e.target.tagName === 'rect') return;
    this.dragging = true;
    const isTouch = e.type === 'touchstart';
    this.lastX = isTouch ? e.touches[0].clientX : e.clientX;
    this.lastY = isTouch ? e.touches[0].clientY : e.clientY;
  }

  onMouseMove(e) {
    if (!this.dragging) return;
    e.preventDefault();
    const rect = this.svg.getBoundingClientRect();
    const container = this.getBoundingClientRect();
    const aspectRatio = container.height > 0 ? container.width / container.height : 1;
    const viewHeight = 100 / this.scale;
    const viewWidth = viewHeight * aspectRatio;
    const isTouch = e.type === 'touchmove';
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    const dx = (clientX - this.lastX) * (viewWidth / rect.width);
    const dy = (clientY - this.lastY) * (viewHeight / rect.height);
    this.offsetX -= dx;
    this.offsetY -= dy;
    this.lastX = clientX;
    this.lastY = clientY;
    this.updateViewBox();
    this.drawAxes();
  }

  drawAxes() {
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
  }
}

if (!customElements.get('work-zone')) {
  customElements.define('work-zone', WorkZone);
}

