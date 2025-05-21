export function generateRandomPolygon(existingCenters = []) {
  const vertexCount = Math.floor(Math.random() * 4) + 3;
  const minDistance = 15; // Уменьшено с 30 до 15 для большей гибкости
  const viewBoxWidth = 100;
  const viewBoxHeight = 100;
  const margin = 10; // Уменьшен отступ от краев
  const maxAttempts = 50; // Ограничение количества попыток
  let centerX, centerY;
  let attempts = 0;

  // Генерируем случайный центр с проверкой на пересечение
  do {
    centerX = margin + Math.random() * (viewBoxWidth - 2 * margin);
    centerY = margin + Math.random() * (viewBoxHeight - 2 * margin);
    attempts++;
    if (attempts >= maxAttempts) {
      console.warn('Max attempts reached, using last generated center');
      break;
    }
  } while (
    existingCenters.some(([x, y]) => {
      const distance = Math.sqrt((centerX - x) ** 2 + (centerY - y) ** 2);
      return distance < minDistance;
    })
  );

  let points = [];
  for (let i = 0; i < vertexCount; i++) {
    const angle = (i / vertexCount) * 2 * Math.PI;
    const radius = 5 + Math.random() * 5; // Еще меньший радиус для компактности
    const x = Math.floor(centerX + radius * Math.cos(angle));
    const y = Math.floor(centerY + radius * Math.sin(angle));
    points.push(`${x},${y}`);
  }
  const pointsStr = points.join(' ');
  console.log('Generated polygon points:', pointsStr, 'center:', [centerX, centerY], 'attempts:', attempts);
  return { points: pointsStr, center: [centerX, centerY] };
}

