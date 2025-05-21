export function generateRandomPolygon() {
  const vertexCount = Math.floor(Math.random() * 4) + 3;
  let points = [];
  for (let i = 0; i < vertexCount; i++) {
    const angle = (i / vertexCount) * 2 * Math.PI;
    const radius = 10 + Math.random() * 30;
    const x = Math.floor(50 + radius * Math.cos(angle));
    const y = Math.floor(50 + radius * Math.sin(angle));
    points.push(`${x},${y}`);
  }
  const pointsStr = points.join(' ');
  console.log('Generated polygon points:', pointsStr);
  return pointsStr;
}

