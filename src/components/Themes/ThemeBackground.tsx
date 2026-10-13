'use client';

import React, { useEffect, useRef } from 'react';
import { ThemeId } from '@/lib/eschools/types';
import { getTheme } from '@/lib/eschools/themes';

interface ThemeBackgroundProps {
  themeId?: ThemeId;
  disableBackground?: boolean;
  softBlur?: boolean;
}

export const ThemeBackground: React.FC<ThemeBackgroundProps> = ({
  themeId = 'space',
  disableBackground = false,
  softBlur = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theme = getTheme(themeId);

  useEffect(() => {
    // Если фон отключен или выбран режим "none", холст не запускается
    if (disableBackground || themeId === 'none') {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const isMobile = width < 768;

    // === 1. КОСМОС / СОЗВЕЗДИЯ (SPACE) ===
    const starsCount = isMobile ? 70 : 120;
    const spaceStars: { x: number; y: number; vx: number; vy: number; r: number; alpha: number; speed: number }[] = [];
    for (let i = 0; i < starsCount; i++) {
      spaceStars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08,
        r: Math.random() * 1.0 + 0.3,
        alpha: Math.random() * 0.4 + 0.15,
        speed: (Math.random() * 0.008 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
      });
    }

    const constellationNodes: { x: number; y: number; vx: number; vy: number }[] = [];
    const nodesCount = isMobile ? 20 : 36;
    for (let i = 0; i < nodesCount; i++) {
      constellationNodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      });
    }

    // === 2. КУПАЛЬЕ (Светлячки и мерцающая папараць-кветка) ===
    const fireflies: { x: number; y: number; vx: number; vy: number; r: number; alpha: number; pulse: number }[] = [];
    const firefliesCount = isMobile ? 35 : 65;
    for (let i = 0; i < firefliesCount; i++) {
      fireflies.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(Math.random() * 0.4 + 0.1),
        r: Math.random() * 2.2 + 1.2,
        alpha: Math.random() * 0.6 + 0.2,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    // === 3. ДЕНЬ МАТЕРИ (Нежные лепестки роз) ===
    const rosePetals: { x: number; y: number; vy: number; vx: number; size: number; rot: number; vRot: number }[] = [];
    const petalsCount = isMobile ? 20 : 40;
    for (let i = 0; i < petalsCount; i++) {
      rosePetals.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vy: Math.random() * 0.5 + 0.2,
        vx: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 5 + 6,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.015,
      });
    }

    // === 4. ДЕНЬ ПОБЕДЫ (Праздничные салюты) ===
    const saluteSparks: { x: number; y: number; vx: number; vy: number; r: number; color: string; alpha: number }[] = [];
    const createSalute = (cx: number, cy: number) => {
      const colors = ['#f59e0b', '#ef4444', '#fbbf24', '#f87171'];
      for (let i = 0; i < 28; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2.5 + 0.5;
        saluteSparks.push({
          cx: cx,
          cy: cy,
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: Math.random() * 1.8 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 0.9,
        } as any);
      }
    };

    // === 5. ХЭЛЛОУИН (Тыквы и угольки) ===
    const pumpkins: { x: number; y: number; vx: number; vy: number; size: number; rot: number; vRot: number }[] = [];
    const pumpkinCount = isMobile ? 4 : 7;
    for (let i = 0; i < pumpkinCount; i++) {
      pumpkins.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.15,
        size: Math.random() * 12 + 16,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.002,
      });
    }

    const embers: { x: number; y: number; vy: number; vx: number; r: number; alpha: number }[] = [];
    const emberCount = isMobile ? 30 : 60;
    for (let i = 0; i < emberCount; i++) {
      embers.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vy: -(Math.random() * 0.5 + 0.15),
        vx: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.8 + 0.8,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    // === 6. НОВЫЙ ГОД / ЗИМА (Снежинки) ===
    const snowflakes: { x: number; y: number; vy: number; vx: number; r: number; sway: number; swaySpeed: number; alpha: number }[] = [];
    const snowCount = isMobile ? 50 : 100;
    for (let i = 0; i < snowCount; i++) {
      snowflakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vy: Math.random() * 0.6 + 0.3,
        vx: Math.random() * 0.2 - 0.1,
        r: Math.random() * 2.0 + 0.6,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: Math.random() * 0.015 + 0.008,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    // === 7. САКУРА ===
    const petals: { x: number; y: number; vy: number; vx: number; size: number; angle: number; vAngle: number; flip: number; vFlip: number }[] = [];
    const petalCount = isMobile ? 20 : 40;
    for (let i = 0; i < petalCount; i++) {
      petals.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vy: Math.random() * 0.6 + 0.25,
        vx: Math.random() * 0.4 + 0.15,
        size: Math.random() * 5 + 6,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.015,
        flip: Math.random() * Math.PI,
        vFlip: Math.random() * 0.02 + 0.01,
      });
    }

    // === 8. КИБЕР ИЗУМРУД / БЕЛАРУСЬ ===
    const cyberNodes: { x: number; y: number; vx: number; vy: number; pulse: number }[] = [];
    const cyberCount = isMobile ? 25 : 45;
    for (let i = 0; i < cyberCount; i++) {
      cyberNodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;
    let nextSaluteTime = 0;

    const render = () => {
      time += 0.015;

      // Очистка холста глубоким OLED-черным
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // --- ТЕМА 1: КОСМОС (По умолчанию) ---
      if (themeId === 'space') {
        for (let i = 0; i < spaceStars.length; i++) {
          const s = spaceStars[i];
          s.x += s.vx;
          s.y += s.vy;
          if (s.x < 0) s.x = width; else if (s.x > width) s.x = 0;
          if (s.y < 0) s.y = height; else if (s.y > height) s.y = 0;

          s.alpha += s.speed;
          if (s.alpha > 0.65 || s.alpha < 0.15) s.speed = -s.speed;

          ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, Math.min(0.65, s.alpha))})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.lineWidth = 0.5;
        for (let i = 0; i < constellationNodes.length; i++) {
          const n = constellationNodes[i];
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0) n.x = width; else if (n.x > width) n.x = 0;
          if (n.y < 0) n.y = height; else if (n.y > height) n.y = 0;

          for (let j = i + 1; j < constellationNodes.length; j++) {
            const n2 = constellationNodes[j];
            const dx = n.x - n2.x;
            const dy = n.y - n2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
              const alpha = (1 - dist / 100) * 0.16;
              ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(n.x, n.y);
              ctx.lineTo(n2.x, n2.y);
              ctx.stroke();
            }
          }

          ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.beginPath();
          ctx.arc(n.x, n.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- ТЕМА 2: КУПАЛЬЕ (КУПАЛЬСКАЯ НОЧЬ) ---
      else if (themeId === 'kupalle') {
        for (let i = 0; i < fireflies.length; i++) {
          const f = fireflies[i];
          f.x += f.vx + Math.sin(time + i) * 0.4;
          f.y += f.vy;
          f.pulse += 0.03;

          if (f.y < -10) {
            f.y = height + 10;
            f.x = Math.random() * width;
          }
          if (f.x < 0) f.x = width; else if (f.x > width) f.x = 0;

          const glowAlpha = (Math.sin(f.pulse) * 0.3 + 0.5) * f.alpha;

          // Мягкое свечение светлячка
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 2.5);
          g.addColorStop(0, `rgba(52, 211, 153, ${glowAlpha})`);
          g.addColorStop(1, 'rgba(52, 211, 153, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r * 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(209, 250, 229, ${glowAlpha * 1.2})`;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- ТЕМА 3: ДЕНЬ МАТЕРИ (ЛЕПЕСТКИ РОЗ) ---
      else if (themeId === 'mothers_day') {
        for (let i = 0; i < rosePetals.length; i++) {
          const p = rosePetals[i];
          p.y += p.vy;
          p.x += p.vx + Math.cos(time + i) * 0.3;
          p.rot += p.vRot;

          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          }

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);

          ctx.fillStyle = 'rgba(244, 114, 182, 0.35)';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      }

      // --- ТЕМА 4: ДЕНЬ ПОБЕДЫ (САЛЮТ) ---
      else if (themeId === 'victory_day') {
        if (time > nextSaluteTime) {
          createSalute(
            Math.random() * width * 0.8 + width * 0.1,
            Math.random() * height * 0.5 + height * 0.1
          );
          nextSaluteTime = time + Math.random() * 1.5 + 1.2;
        }

        for (let i = saluteSparks.length - 1; i >= 0; i--) {
          const s = saluteSparks[i] as any;
          s.x += s.vx;
          s.y += s.vy;
          s.vy += 0.03; // гравитация
          s.alpha -= 0.015;

          if (s.alpha <= 0) {
            saluteSparks.splice(i, 1);
            continue;
          }

          ctx.fillStyle = s.color;
          ctx.globalAlpha = Math.max(0, s.alpha);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      }

      // --- ТЕМА 5: ХЭЛЛОУИН ---
      else if (themeId === 'halloween') {
        for (let i = 0; i < embers.length; i++) {
          const e = embers[i];
          e.y += e.vy;
          e.x += e.vx + Math.sin(time + i) * 0.25;
          if (e.y < -10) {
            e.y = height + 10;
            e.x = Math.random() * width;
          }
          ctx.fillStyle = `rgba(249, 115, 22, ${e.alpha * 0.5})`;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
          ctx.fill();
        }

        for (let i = 0; i < pumpkins.length; i++) {
          const p = pumpkins[i];
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vRot;
          if (p.x < -40) p.x = width + 40; else if (p.x > width + 40) p.x = -40;
          if (p.y < -40) p.y = height + 40; else if (p.y > height + 40) p.y = -40;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);

          ctx.fillStyle = 'rgba(234, 88, 12, 0.28)';
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.78, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = 'rgba(254, 215, 170, 0.75)';
          ctx.beginPath();
          ctx.moveTo(-p.size * 0.35, -p.size * 0.15);
          ctx.lineTo(-p.size * 0.15, -p.size * 0.15);
          ctx.lineTo(-p.size * 0.25, -p.size * 0.35);
          ctx.closePath();
          ctx.moveTo(p.size * 0.15, -p.size * 0.15);
          ctx.lineTo(p.size * 0.35, -p.size * 0.15);
          ctx.lineTo(p.size * 0.25, -p.size * 0.35);
          ctx.closePath();
          ctx.moveTo(-p.size * 0.4, p.size * 0.15);
          ctx.quadraticCurveTo(0, p.size * 0.45, p.size * 0.4, p.size * 0.15);
          ctx.quadraticCurveTo(0, p.size * 0.28, -p.size * 0.4, p.size * 0.15);
          ctx.fill();

          ctx.restore();
        }
      }

      // --- ТЕМА 6: НОВЫЙ ГОД / ЗИМА ---
      else if (themeId === 'winter') {
        for (let i = 0; i < snowflakes.length; i++) {
          const s = snowflakes[i];
          s.y += s.vy;
          s.sway += s.swaySpeed;
          s.x += s.vx + Math.sin(s.sway) * 0.5;

          if (s.y > height + 10) {
            s.y = -10;
            s.x = Math.random() * width;
          }
          if (s.x < -10) s.x = width + 10;
          else if (s.x > width + 10) s.x = -10;

          ctx.fillStyle = `rgba(224, 242, 254, ${s.alpha * 0.7})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- ТЕМА 7: САКУРА ---
      else if (themeId === 'sakura') {
        for (let i = 0; i < petals.length; i++) {
          const p = petals[i];
          p.y += p.vy;
          p.x += p.vx + Math.cos(time + i) * 0.3;
          p.angle += p.vAngle;
          p.flip += p.vFlip;

          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          }

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          const scaleY = Math.sin(p.flip);
          ctx.scale(1, Math.max(0.15, Math.abs(scaleY)));

          ctx.fillStyle = 'rgba(244, 114, 182, 0.32)';
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.bezierCurveTo(p.size * 0.8, -p.size * 0.5, p.size * 0.8, p.size * 0.5, 0, p.size);
          ctx.bezierCurveTo(-p.size * 0.8, p.size * 0.5, -p.size * 0.8, -p.size * 0.5, 0, -p.size);
          ctx.fill();

          ctx.restore();
        }
      }

      // --- ТЕМА 8: КИБЕР ИЗУМРУД / БЕЛАРУСЬ ---
      else {
        const isBelarusTheme = themeId === 'belarus';
        ctx.strokeStyle = isBelarusTheme
          ? 'rgba(34, 197, 94, 0.12)'
          : 'rgba(16, 185, 129, 0.14)';
        ctx.lineWidth = 0.6;

        for (let i = 0; i < cyberNodes.length; i++) {
          const n = cyberNodes[i];
          n.x += n.vx;
          n.y += n.vy;
          n.pulse += 0.03;

          if (n.x < 0) n.x = width; else if (n.x > width) n.x = 0;
          if (n.y < 0) n.y = height; else if (n.y > height) n.y = 0;

          for (let j = i + 1; j < cyberNodes.length; j++) {
            const n2 = cyberNodes[j];
            const dx = n.x - n2.x;
            const dy = n.y - n2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 90) {
              const alpha = (1 - dist / 90) * 0.2;
              ctx.strokeStyle = isBelarusTheme
                ? `rgba(34, 197, 94, ${alpha})`
                : `rgba(16, 185, 129, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(n.x, n.y);
              ctx.lineTo(n2.x, n2.y);
              ctx.stroke();
            }
          }

          const pulseAlpha = Math.sin(n.pulse) * 0.2 + 0.45;
          ctx.fillStyle = isBelarusTheme
            ? `rgba(74, 222, 128, ${pulseAlpha})`
            : `rgba(52, 211, 153, ${pulseAlpha})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [themeId, disableBackground]);

  // Если фон отключен, возвращаем чистый OLED черный экран
  if (disableBackground || themeId === 'none') {
    return (
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-black"
        style={{ backgroundColor: '#000000' }}
      />
    );
  }

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${
        softBlur ? 'opacity-85' : 'opacity-100'
      }`}
      style={{ backgroundColor: '#000000' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ background: '#000000' }}
      />
      {theme.ambientLight !== 'transparent' && (
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{ background: theme.ambientLight }}
        />
      )}
    </div>
  );
};
