export function savePolygons(polygons) {
  localStorage.setItem('polygons', JSON.stringify(polygons));
}

export function loadPolygons() {
  const data = localStorage.getItem('polygons');
  return data ? JSON.parse(data) : null;
}

export function clearPolygons() {
  localStorage.removeItem('polygons');
}
