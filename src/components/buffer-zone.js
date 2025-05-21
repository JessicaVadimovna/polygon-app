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
      console.log('BufferZone group mousedown, points:', points);
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
    const startX = event.clientX;
    const startY = event.clientY;
    let translateX = 0;
    let translateY = 0;

    // Вычисляем центроид полигона
    const coords = points.split(' ').map(p => p.split(',').map(Number));
    const cx = coords.reduce((sum, p) => sum + p[0], 0) / coords.length;
    const cy = coords.reduce((sum, p) => sum + p[1], 0) / coords.length;

    const onMouseMove = e => {
      const dx = (e.clientX - startX) * (svg.viewBox.baseVal.width / rect.width);
      const dy = (e.clientY - startY) * (svg.viewBox.baseVal.height / rect.height);
      translateX = dx;
      translateY = dy;
      group.setAttribute('transform', `translate(${dx}, ${dy})`);
    };

    const onMouseUp = e => {
      group.style.cursor = 'grab';
      group.style.zIndex = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      const bufferRect = this.getBoundingClientRect();
      if (
        e.clientX >= bufferRect.left &&
        e.clientX <= bufferRect.right &&
        e.clientY >= bufferRect.top &&
        e.clientY <= bufferRect.bottom
      ) {
        // Полигон отпущен внутри буферной зоны
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
            e.clientX >= workRect.left &&
            e.clientX <= workRect.right &&
            e.clientY >= workRect.top &&
            e.clientY <= workRect.bottom
          ) {
            // Полигон отпущен в рабочей зоне
            const workSvg = workZone.svg;
            const workSvgRect = workSvg.getBoundingClientRect();
            const workViewBox = workSvg.viewBox.baseVal;
            
            const dropX = (e.clientX - workSvgRect.left) * (workViewBox.width / workSvgRect.width) + workZone.offsetX;
            const dropY = (e.clientY - workSvgRect.top) * (workViewBox.height / workSvgRect.height) + workZone.offsetY;
            
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
            // Полигон отпущен вне обеих зон
            group.removeAttribute('transform');
          }
        } else {
          console.log('WorkZone not found');
          group.removeAttribute('transform');
        }
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
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

