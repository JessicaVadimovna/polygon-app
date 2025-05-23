class BufferZone extends HTMLElement {
  connectedCallback() {
    this.style.display = 'flex';
    this.style.flex = '1';
    this.style.borderBottom = '2px solid gray';
    this.classList.add('zone');

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.setAttribute('viewBox', '0 0 100 100');
    this.svg.setAttribute('pointer-events', 'all');
    this.appendChild(this.svg);

    console.log('BufferZone connected, SVG dimensions:', this.svg.getBoundingClientRect());
  }

  addPolygon(points) {
    console.log('BufferZone adding polygon:', points);
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
      console.log('BufferZone group mousedown, points:', points);
      this.startDragging(e, group, points);
      e.preventDefault();
    });
    group.addEventListener('touchstart', e => {
      console.log('BufferZone group touchstart, points:', points);
      this.startDragging(e, group, points);
      e.preventDefault();
    });
    group.appendChild(rect);
    group.appendChild(polygon);
    this.svg.appendChild(group);
  }

  startDragging(event, group, points) {
    event.preventDefault();
    group.style.cursor = 'grabbing';
    group.style.zIndex = '30';

    const svg = this.svg;
    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
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
      translateX = (dxPixels * viewBox.width) / rect.width;
      translateY = (dyPixels * viewBox.height) / rect.height;
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

      const bufferRect = this.getBoundingClientRect();
      if (
        clientX >= bufferRect.left &&
        clientX <= bufferRect.right &&
        clientY >= bufferRect.top &&
        clientY <= bufferRect.bottom
      ) {
        const newPoints = points
          .split(' ')
          .map(p => {
            const [x, y] = p.split(',').map(Number);
            return `${x + translateX},${y + translateY}`;
          })
          .join(' ');
        group.remove();
        this.addPolygon(newPoints);
      } else {
        const workZone = document.querySelector('work-zone');
        if (workZone) {
          const workRect = workZone.getBoundingClientRect();
          if (
            clientX >= workRect.left &&
            clientX <= workRect.right &&
            clientY >= workRect.top &&
            clientY <= workRect.bottom
          ) {
            const workSvg = workZone.svg;
            const workSvgRect = workSvg.getBoundingClientRect();
            const workViewBox = workSvg.viewBox.baseVal;
            
            const dropX = (clientX - workSvgRect.left) * (workViewBox.width / workSvgRect.width) + workViewBox.x;
            const dropY = (clientY - workSvgRect.top) * (workViewBox.height / workSvgRect.height) + workViewBox.y;
            
            const newPoints = points
              .split(' ')
              .map(p => {
                const [x, y] = p.split(',').map(Number);
                return `${dropX + (x - cx)},${dropY + (y - cy)}`;
              })
              .join(' ');
            
            workZone.addPolygon(newPoints);
            group.remove();
          } else {
            group.removeAttribute('transform');
          }
        } else {
          console.log('WorkZone not found');
          group.removeAttribute('transform');
        }
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  }

  clear() {
    this.svg.innerHTML = '';
  }

  getPolygons() {
    return Array.from(this.svg.querySelectorAll('g > polygon')).map(p => p.getAttribute('points'));
  }
}

if (!customElements.get('buffer-zone')) {
  customElements.define('buffer-zone', BufferZone);
}

