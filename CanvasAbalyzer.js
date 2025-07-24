(function() {
  console.log('🗺️ Game Map Analyzer Activated - Ctrl+Shift+Click для анализа региона');

  // Конфигурация
  const config = {
    sampleSize: 5,          // Размер квадрата для анализа (в пикселях)
    walkableColor: '#000000', // Цвет проходимых зон (можно массив цветов)
    debugMode: true         // Показывать дополнительную информацию
  };

  // Глобальные переменные
  let selectedCanvas = null;
  let canvasOverlay = null;

  // Активация по Ctrl+Shift+Click
  document.addEventListener('click', function(e) {
    if (e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      analyzeGameMap(e);
    }
  }, true);

  async function analyzeGameMap(event) {
    const canvas = findParentCanvas(event.target);
    if (!canvas) {
      console.warn('Canvas не найден!');
      return;
    }

    selectedCanvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Не удалось получить контекст canvas');
      return;
    }

    // Координаты клика относительно canvas
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Анализ региона
    const region = getRegionData(ctx, x, y, config.sampleSize);
    const positionInfo = getPositionInfo(canvas, x, y);

    // Отображение результатов
    displayAnalysisResults({
      canvas: getCanvasInfo(canvas),
      position: positionInfo,
      region: region,
      walkable: isWalkable(region, config.walkableColor)
    });

    // Визуализация (опционально)
    if (config.debugMode) {
      visualizeRegion(canvas, x, y, config.sampleSize, region.walkable);
    }
  }

  // Основные функции анализа
  function findParentCanvas(el) {
    while (el && el.tagName !== 'CANVAS') {
      el = el.parentElement;
    }
    return el;
  }

  function getCanvasInfo(canvas) {
    return {
      width: canvas.width,
      height: canvas.height,
      cssWidth: canvas.style.width || 'auto',
      cssHeight: canvas.style.height || 'auto',
      id: canvas.id || null,
      classes: canvas.className || null
    };
  }

  function getPositionInfo(canvas, x, y) {
    return {
      pixelX: Math.floor(x),
      pixelY: Math.floor(y),
      normalizedX: (x / canvas.width).toFixed(4),
      normalizedY: (y / canvas.height).toFixed(4),
      gridX: Math.floor(x / config.sampleSize),
      gridY: Math.floor(y / config.sampleSize)
    };
  }

  function getRegionData(ctx, centerX, centerY, size) {
    const halfSize = Math.floor(size / 2);
    const startX = Math.max(0, centerX - halfSize);
    const startY = Math.max(0, centerY - halfSize);
    const endX = Math.min(ctx.canvas.width, centerX + halfSize);
    const endY = Math.min(ctx.canvas.height, centerY + halfSize);

    const imageData = ctx.getImageData(startX, startY, endX - startX, endY - startY);
    const pixels = [];
    let colors = new Set();

    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const a = imageData.data[i + 3];
      const hex = rgbToHex(r, g, b);
      
      colors.add(hex);
      pixels.push({ r, g, b, a, hex });
    }

    return {
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      width: endX - startX,
      height: endY - startY,
      center: { x: centerX, y: centerY },
      pixels: pixels,
      colors: Array.from(colors)
    };
  }

  function isWalkable(region, walkableColor) {
    // Поддержка массива цветов или строки
    const walkableColors = Array.isArray(walkableColor) 
      ? walkableColor 
      : [walkableColor];
    
    return region.pixels.some(pixel => 
      walkableColors.includes(pixel.hex.toLowerCase())
    );
  }

  // Вспомогательные функции
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  function displayAnalysisResults(data) {
    console.group('🎮 Game Map Analysis');
    console.log('🖼️ Canvas:', data.canvas);
    console.log('📍 Position:', data.position);
    console.log('🔍 Region:', {
      size: `${data.region.width}x${data.region.height}`,
      colors: data.region.colors,
      walkable: data.walkable
    });
    
    if (config.debugMode) {
      console.log('📊 Detailed Region Data:', data.region);
    }
    
    console.groupEnd();
  }

  // Визуализация (опционально)
  function visualizeRegion(canvas, x, y, size, isWalkable) {
    if (!canvasOverlay) {
      canvasOverlay = document.createElement('div');
      canvasOverlay.style.position = 'absolute';
      canvasOverlay.style.pointerEvents = 'none';
      canvasOverlay.style.border = '2px solid red';
      canvasOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
      canvasOverlay.style.zIndex = '9999';
      document.body.appendChild(canvasOverlay);
    }

    const rect = canvas.getBoundingClientRect();
    const halfSize = size / 2;
    
    canvasOverlay.style.left = `${rect.left + x - halfSize}px`;
    canvasOverlay.style.top = `${rect.top + y - halfSize}px`;
    canvasOverlay.style.width = `${size}px`;
    canvasOverlay.style.height = `${size}px`;
    canvasOverlay.style.borderColor = isWalkable ? '#00ff00' : '#ff0000';
    canvasOverlay.style.backgroundColor = isWalkable 
      ? 'rgba(0, 255, 0, 0.1)' 
      : 'rgba(255, 0, 0, 0.1)';

    setTimeout(() => {
      if (canvasOverlay) {
        canvasOverlay.style.display = 'none';
      }
    }, 2000);
  }

  console.log('Используйте Ctrl+Shift+Click на карте для анализа региона');
})();
