export function generateRandomPolygon() {
  const vertexCount = Math.floor(Math.random() * 4) + 3;
  let points = [];
  const centerX = 50; // Центр viewBox
  const centerY = 25;
  const minRadius = 10; // Минимальный радиус
  for (let i = 0; i < vertexCount; i++) {
    const angle = (i / vertexCount) * 2 * Math.PI;
    const radius = minRadius + Math.random() * 20; // Радиус 10-30
    const x = Math.floor(centerX + radius * Math.cos(angle));
    const y = Math.floor(centerY + radius * Math.sin(angle));
    points.push(`${x},${y}`);
  }
  const pointsStr = points.join(' ');
  console.log('Generated polygon points:', pointsStr);
  return pointsStr;
}

