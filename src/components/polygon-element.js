class PolygonElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = '';

    const points = this.getAttribute('points');
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", points);
    polygon.setAttribute("fill", "darkred");

    this.setAttribute('draggable', true);
    this.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', points);
    });

    this.appendChild(polygon);
  }
}

if (!customElements.get('polygon-element')) {
  customElements.define('polygon-element', PolygonElement);
}
