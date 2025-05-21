class BufferZone extends HTMLElement {
  connectedCallback() {
    this.style.display = 'flex';
    this.style.borderBottom = '2px solid gray';
    this.style.minHeight = '300px'; // Увеличено с 150px
    this.style.zIndex = '20';
    this.classList.add('zone');

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '300'); // Увеличено с 150
    this.svg.setAttribute('viewBox', '0 0 100 100'); // Увеличен viewBox по высоте
    this.svg.setAttribute('pointer-events', 'all');
    this.appendChild(this.svg);

    setTimeout(() => {
      console.log('BufferZone groups count:', this.svg.querySelectorAll('g').length);
      this.svg.querySelectorAll('g').forEach(g => console.log('BufferZone group children:', g.children.length));
    }, 1000);
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
    polygon.setAttribute('fill', 'red');
    polygon.setAttribute('stroke', 'yellow');
    polygon.setAttribute('stroke-width', '2');
    polygon.setAttribute('pointer-events', 'all');
    
    group.setAttribute('pointer-events', 'all');
    group.style.cursor = 'grab';
    group.addEventListener('mousedown', e => {
      console.log('BufferZone group mousedown, points:', points);
      this.startDragging(e, group, points);
      e.stopPropagation();
    });
    group.appendChild(rect);
    group.appendChild(polygon);
    this.svg.appendChild(group);
  }

  startDragging(event, group, points) {
    console.log('BufferZone start dragging:', points);
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
      console.log('BufferZone dragging');
      const dx = (e.clientX - startX) * (viewBox.width / rect.width);
      const dy = (e.clientY - startY) * (viewBox.height / rect.height);
      translateX = dx;
      translateY = dy;
      group.setAttribute('transform', `translate(${dx}, ${dy})`);
    };

    const onMouseUp = e => {
      console.log('BufferZone stop dragging');
      group.style.cursor = 'grab';
      group.style.zIndex = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      const workZone = document.querySelector('work-zone');
      if (!workZone) {
        console.log('WorkZone not found');
        group.removeAttribute('transform');
        return;
      }
      const workRect = workZone.getBoundingClientRect();
      if (
        e.clientX >= workRect.left &&
        e.clientX <= workRect.right &&
        e.clientY >= workRect.top &&
        e.clientY <= workRect.bottom
      ) {
        console.log('BufferZone dropped in WorkZone:', points);
        workZone.addPolygon(points);
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

