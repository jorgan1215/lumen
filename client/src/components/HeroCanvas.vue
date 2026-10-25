<template>
  <canvas ref="canvasEl" class="absolute inset-0 h-full w-full" aria-hidden="true" />
</template>

<script setup lang="ts">
// 背景光影画布：漂浮的散景光斑 + 鼠标轻微视差
import { onMounted, onUnmounted, ref } from 'vue';

interface Orb {
  x: number; y: number; r: number;
  vx: number; vy: number;
  hue: number; alpha: number; pulse: number;
}

const canvasEl = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let orbs: Orb[] = [];
let raf = 0;
let mx = 0, my = 0, tx = 0, ty = 0;

function resize() {
  const c = canvasEl.value;
  if (!c) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = c.clientWidth * dpr;
  c.height = c.clientHeight * dpr;
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function spawn() {
  const c = canvasEl.value!;
  orbs = Array.from({ length: 42 }, () => ({
    x: Math.random() * c.clientWidth,
    y: Math.random() * c.clientHeight,
    r: 20 + Math.random() * 110,
    vx: (Math.random() - 0.5) * 0.15,
    vy: (Math.random() - 0.5) * 0.12,
    hue: 32 + Math.random() * 24, // 金-琥珀色域
    alpha: 0.02 + Math.random() * 0.07,
    pulse: Math.random() * Math.PI * 2,
  }));
}

function frame() {
  const c = canvasEl.value;
  if (!c || !ctx) return;
  const w = c.clientWidth, h = c.clientHeight;
  ctx.clearRect(0, 0, w, h);

  tx += (mx - tx) * 0.03;
  ty += (my - ty) * 0.03;

  for (const o of orbs) {
    o.x += o.vx; o.y += o.vy; o.pulse += 0.008;
    if (o.x < -o.r) o.x = w + o.r; if (o.x > w + o.r) o.x = -o.r;
    if (o.y < -o.r) o.y = h + o.r; if (o.y > h + o.r) o.y = -o.r;

    const px = o.x + tx * o.r * 0.25;
    const py = o.y + ty * o.r * 0.25;
    const a = o.alpha * (0.75 + 0.25 * Math.sin(o.pulse));

    const g = ctx.createRadialGradient(px, py, 0, px, py, o.r);
    g.addColorStop(0, `hsla(${o.hue}, 55%, 62%, ${a})`);
    g.addColorStop(1, `hsla(${o.hue}, 55%, 62%, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, o.r, 0, Math.PI * 2);
    ctx.fill();
  }
  raf = requestAnimationFrame(frame);
}

const onMouse = (e: MouseEvent) => {
  mx = (e.clientX / window.innerWidth - 0.5) * 2;
  my = (e.clientY / window.innerHeight - 0.5) * 2;
};

onMounted(() => {
  ctx = canvasEl.value?.getContext('2d') ?? null;
  resize(); spawn(); frame();
  window.addEventListener('resize', () => { resize(); spawn(); });
  window.addEventListener('mousemove', onMouse, { passive: true });
});
onUnmounted(() => {
  cancelAnimationFrame(raf);
  window.removeEventListener('mousemove', onMouse);
});
</script>
