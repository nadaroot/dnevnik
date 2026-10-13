'use client';

import React, { useEffect, useRef } from 'react';

interface StarNode {
  dx: number;
  dy: number;
  isMajor?: boolean;
  baseAlpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

interface ConstellationInstance {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  scale: number;
  stars: StarNode[];
  links: [number, number][];
}

interface BackgroundStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  speedAlpha: number;
}

// Библиотека узнаваемых паттернов созвездий (геометрия звезд и связок)
const BASE_CONSTELLATION_SHAPES: {
  stars: { dx: number; dy: number; isMajor?: boolean }[];
  links: [number, number][];
}[] = [
  // 1. Ковш Малой Медведицы
  {
    stars: [
      { dx: -40, dy: 15 },
      { dx: -18, dy: -5 },
      { dx: 15, dy: 0 },
      { dx: -5, dy: 30 },
      { dx: 45, dy: -12 },
      { dx: 75, dy: -20 },
      { dx: 110, dy: -25, isMajor: true },
    ],
    links: [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [2, 4], [4, 5], [5, 6],
    ],
  },
  // 2. Ковш Большой Медведицы
  {
    stars: [
      { dx: -65, dy: 22 },
      { dx: -30, dy: 25 },
      { dx: -18, dy: -18 },
      { dx: -55, dy: -20 },
      { dx: 20, dy: -35 },
      { dx: 55, dy: -42 },
      { dx: 95, dy: -32, isMajor: true },
    ],
    links: [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [2, 4], [4, 5], [5, 6],
    ],
  },
  // 3. Кассиопея
  {
    stars: [
      { dx: -55, dy: -20 },
      { dx: -28, dy: 18, isMajor: true },
      { dx: 0, dy: -8 },
      { dx: 28, dy: 22 },
      { dx: 55, dy: -15, isMajor: true },
    ],
    links: [
      [0, 1], [1, 2], [2, 3], [3, 4],
    ],
  },
  // 4. Орион
  {
    stars: [
      { dx: -35, dy: -45, isMajor: true },
      { dx: 35, dy: -40 },
      { dx: -16, dy: 0 },
      { dx: 0, dy: 0 },
      { dx: 16, dy: 0 },
      { dx: -30, dy: 45 },
      { dx: 35, dy: 40, isMajor: true },
    ],
    links: [
      [0, 1], [2, 3], [3, 4],
      [0, 2], [1, 4], [2, 5], [4, 6],
    ],
  },
  // 5. Лебедь (Северный Крест)
  {
    stars: [
      { dx: 0, dy: -45, isMajor: true },
      { dx: 0, dy: -5 },
      { dx: 0, dy: 40 },
      { dx: -45, dy: -10 },
      { dx: 45, dy: -10 },
    ],
    links: [
      [0, 1], [1, 2], [3, 1], [1, 4],
    ],
  },
  // 6. Лира
  {
    stars: [
      { dx: -5, dy: -40, isMajor: true },
      { dx: -22, dy: -10 },
      { dx: 15, dy: -12 },
      { dx: 20, dy: 22 },
      { dx: -18, dy: 25 },
    ],
    links: [
      [0, 1], [0, 2], [1, 2], [2, 3], [3, 4], [4, 1],
    ],
  },
  // 7. Пегас
  {
    stars: [
      { dx: -40, dy: -35, isMajor: true },
      { dx: 38, dy: -32 },
      { dx: 35, dy: 35 },
      { dx: -38, dy: 32 },
      { dx: -70, dy: 50 },
    ],
    links: [
      [0, 1], [1, 2], [2, 3], [3, 0], [3, 4],
    ],
  },
  // 8. Северная Корона
  {
    stars: [
      { dx: -45, dy: -5 },
      { dx: -28, dy: 15 },
      { dx: 0, dy: 22, isMajor: true },
      { dx: 28, dy: 15 },
      { dx: 45, dy: -5 },
    ],
    links: [
      [0, 1], [1, 2], [2, 3], [3, 4],
    ],
  },
  // 9. Близнецы
  {
    stars: [
      { dx: -30, dy: -45, isMajor: true },
      { dx: 15, dy: -45, isMajor: true },
      { dx: -25, dy: -10 },
      { dx: 20, dy: -10 },
      { dx: -20, dy: 35 },
      { dx: 25, dy: 35 },
    ],
    links: [
      [0, 2], [2, 4], [1, 3], [3, 5], [0, 1],
    ],
  },
  // 10. Телец
  {
    stars: [
      { dx: 45, dy: -35, isMajor: true },
      { dx: 10, dy: -10 },
      { dx: -25, dy: 15 },
      { dx: -45, dy: -10 },
      { dx: -15, dy: 35 },
    ],
    links: [
      [0, 1], [1, 2], [2, 3], [2, 4],
    ],
  },
  // 11. Орел
  {
    stars: [
      { dx: 0, dy: 0, isMajor: true },
      { dx: -15, dy: -20 },
      { dx: 15, dy: 20 },
      { dx: -50, dy: -5 },
      { dx: 45, dy: 5 },
    ],
    links: [
      [1, 0], [0, 2], [3, 0], [0, 4],
    ],
  },
  // 12. Дельфин
  {
    stars: [
      { dx: 0, dy: -25 },
      { dx: 20, dy: -10 },
      { dx: 0, dy: 10 },
      { dx: -20, dy: -5 },
      { dx: -15, dy: 35, isMajor: true },
    ],
    links: [
      [0, 1], [1, 2], [2, 3], [3, 0], [2, 4],
    ],
  },
];

// Генератор дополнительных случайных созвездий (органические связки звезд)
function generateRandomConstellation(seedIndex: number): {
  stars: { dx: number; dy: number; isMajor?: boolean }[];
  links: [number, number][];
} {
  const starCount = 4 + (seedIndex % 4);
  const stars: { dx: number; dy: number; isMajor?: boolean }[] = [];
  const links: [number, number][] = [];

  const spread = 45 + (seedIndex % 25);

  for (let i = 0; i < starCount; i++) {
    const angle = (i / starCount) * Math.PI * 1.8 + Math.sin(seedIndex + i) * 0.5;
    const dist = spread * (0.4 + Math.abs(Math.cos(seedIndex * 1.5 + i)) * 0.6);
    const dx = Math.cos(angle) * dist + Math.sin(i * 3) * 10;
    const dy = Math.sin(angle) * dist + Math.cos(i * 2) * 10;

    stars.push({
      dx,
      dy,
      isMajor: i === 0 || i === starCount - 1,
    });

    if (i > 0) {
      links.push([i - 1, i]);
    }
  }

  if (starCount >= 5 && seedIndex % 2 === 0) {
    links.push([0, 2]);
  } else if (starCount >= 6) {
    links.push([1, starCount - 1]);
  }

  return { stars, links };
}

export const ConstellationBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const handleResize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', handleResize);

    // Сборка пула созвездий (12 классических + 12 процедурных = 24 различных фигуры)
    const allPresets: {
      stars: { dx: number; dy: number; isMajor?: boolean }[];
      links: [number, number][];
    }[] = [...BASE_CONSTELLATION_SHAPES];

    for (let i = 0; i < 12; i++) {
      allPresets.push(generateRandomConstellation(i + 1));
    }

    const isMobile = width < 768;
    const TOTAL_CONSTELLATIONS = isMobile ? 12 : 20;

    const cols = isMobile ? 3 : 5;
    const rows = Math.ceil(TOTAL_CONSTELLATIONS / cols);
    const cellW = width / cols;
    const cellH = height / rows;

    const constellations: ConstellationInstance[] = [];

    for (let i = 0; i < TOTAL_CONSTELLATIONS; i++) {
      const preset = allPresets[i % allPresets.length];
      const col = i % cols;
      const row = Math.floor(i / cols);

      const baseX = col * cellW + cellW * 0.5 + (Math.random() - 0.5) * cellW * 0.6;
      const baseY = row * cellH + cellH * 0.5 + (Math.random() - 0.5) * cellH * 0.6;

      const speed = Math.random() * 0.15 + 0.08;
      const moveAngle = Math.random() * Math.PI * 2;
      const vx = Math.cos(moveAngle) * speed;
      const vy = Math.sin(moveAngle) * speed;

      const angle = Math.random() * Math.PI * 2;
      const vAngle = (Math.random() - 0.5) * 0.00035;

      const scale = isMobile ? Math.random() * 0.25 + 0.65 : Math.random() * 0.35 + 0.8;

      const stars: StarNode[] = preset.stars.map((s) => ({
        dx: s.dx,
        dy: s.dy,
        isMajor: s.isMajor,
        baseAlpha: Math.random() * 0.25 + 0.65,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.02 + 0.015,
      }));

      constellations.push({
        x: baseX,
        y: baseY,
        vx,
        vy,
        angle,
        vAngle,
        scale,
        stars,
        links: preset.links,
      });
    }

    // Фоновые одиночные звезды (увеличено для отличной видимости на телефонах)
    const BG_STARS_COUNT = isMobile ? 85 : 140;
    const bgStars: BackgroundStar[] = [];
    for (let i = 0; i < BG_STARS_COUNT; i++) {
      bgStars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08,
        radius: Math.random() * 1.2 + 0.45,
        alpha: Math.random() * 0.5 + 0.25,
        speedAlpha: (Math.random() * 0.008 + 0.003) * (Math.random() > 0.5 ? 1 : -1),
      });
    }

    let time = 0;

    const render = () => {
      time += 0.015;

      // Глубокий черный OLED
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // 1. Одиночные фоновые звезды
      for (let i = 0; i < bgStars.length; i++) {
        const star = bgStars[i];
        star.x += star.vx;
        star.y += star.vy;

        if (star.x < 0) star.x = width;
        else if (star.x > width) star.x = 0;

        if (star.y < 0) star.y = height;
        else if (star.y > height) star.y = 0;

        star.alpha += star.speedAlpha;
        if (star.alpha > 0.7 || star.alpha < 0.15) {
          star.speedAlpha = -star.speedAlpha;
        }

        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, Math.min(0.75, star.alpha))})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Плавающие созвездия (без подписей!)
      for (let cIdx = 0; cIdx < constellations.length; cIdx++) {
        const c = constellations[cIdx];

        c.x += c.vx;
        c.y += c.vy;
        c.angle += c.vAngle;

        const margin = 160;
        if (c.x < -margin) c.x = width + margin;
        else if (c.x > width + margin) c.x = -margin;

        if (c.y < -margin) c.y = height + margin;
        else if (c.y > height + margin) c.y = -margin;

        const cos = Math.cos(c.angle);
        const sin = Math.sin(c.angle);

        const starPoints = c.stars.map((s) => {
          const sx = s.dx * c.scale;
          const sy = s.dy * c.scale;
          const rotX = sx * cos - sy * sin;
          const rotY = sx * sin + sy * cos;
          return {
            x: c.x + rotX,
            y: c.y + rotY,
            isMajor: s.isMajor,
            baseAlpha: s.baseAlpha,
            twinkle: Math.sin(time * s.twinkleSpeed * 60 + s.twinklePhase) * 0.18,
          };
        });

        // Связки (тонкие линии)
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = 'rgba(235, 235, 245, 0.28)';

        for (let lIdx = 0; lIdx < c.links.length; lIdx++) {
          const [fromIdx, toIdx] = c.links[lIdx];
          const p1 = starPoints[fromIdx];
          const p2 = starPoints[toIdx];

          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Звезды
        for (let sIdx = 0; sIdx < starPoints.length; sIdx++) {
          const p = starPoints[sIdx];
          const alpha = Math.max(0.4, Math.min(1.0, p.baseAlpha + p.twinkle));
          const radius = p.isMajor ? 2.5 : 1.7;

          if (p.isMajor) {
            const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8.5);
            glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.65})`);
            glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8.5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Подписи созвездий полностью убраны
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
      }}
    />
  );
};
