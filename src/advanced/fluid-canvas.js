import { gsap, ScrollTrigger } from "gsap/all";
import * as THREE from "three";
import "./advanced.css";
import { clamp, number, reducedMotion, string, target } from "./shared/config.js";
import { createAdvancedPackage } from "./shared/runtime.js";

gsap.registerPlugin(ScrollTrigger);

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform float uHasTexture;
  uniform float uIntensity;
  uniform float uTime;
  uniform float uVelocity;
  uniform sampler2D uTexture;
  uniform vec2 uPointer;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  void main() {
    vec2 uv = vUv;
    float distanceToPointer = distance(uv, uPointer);
    float ripple = sin(distanceToPointer * 32.0 - uTime * 4.0) * exp(-distanceToPointer * 7.0);
    float wave = sin((uv.y + uTime * 0.08) * 20.0) * 0.35;
    float distortion = (ripple + wave * uVelocity) * uIntensity;
    vec2 distortedUv = uv + vec2(distortion, distortion * 0.55);
    vec3 generated = mix(uColorA, uColorB, smoothstep(0.0, 1.0, distortedUv.y + ripple * 0.2));
    vec4 media = texture2D(uTexture, clamp(distortedUv, 0.001, 0.999));
    gl_FragColor = uHasTexture > 0.5 ? media : vec4(generated, 1.0);
  }
`;

function mount(element) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("data-advanced-canvas", "");
  canvas.setAttribute("aria-hidden", "true");
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: false,
    canvas,
    powerPreference: "high-performance"
  });
  element.prepend(canvas);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry(2, 2);
  const uniforms = {
    uColorA: { value: new THREE.Color(string(element, "advanced-color-a", "#5940ff")) },
    uColorB: { value: new THREE.Color(string(element, "advanced-color-b", "#bdff00")) },
    uHasTexture: { value: 0 },
    uIntensity: { value: number(element, "advanced-intensity", 0.035) },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uTexture: { value: new THREE.Texture() },
    uTime: { value: 0 },
    uVelocity: { value: 0 }
  };
  const material = new THREE.ShaderMaterial({ fragmentShader, uniforms, vertexShader });
  scene.add(new THREE.Mesh(geometry, material));

  let texture;
  const source = target(element, "source");
  const textureUrl = string(element, "advanced-src", source?.currentSrc || source?.src || "");
  if (textureUrl) {
    new THREE.TextureLoader().load(
      textureUrl,
      (loaded) => {
        texture = loaded;
        texture.colorSpace = THREE.SRGBColorSpace;
        uniforms.uTexture.value = texture;
        uniforms.uHasTexture.value = 1;
      },
      undefined,
      () => {
        uniforms.uHasTexture.value = 0;
      }
    );
  }

  let visible = true;
  let raf = 0;
  let velocityTarget = 0;
  let lastTime = performance.now();
  const resize = () => {
    const { width, height } = element.getBoundingClientRect();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, number(element, "advanced-dpr", 2)));
    renderer.setSize(Math.max(1, width), Math.max(1, height), false);
  };
  const render = (time = performance.now()) => {
    raf = 0;
    uniforms.uTime.value += Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    uniforms.uVelocity.value += (velocityTarget - uniforms.uVelocity.value) * 0.08;
    velocityTarget *= 0.94;
    renderer.render(scene, camera);
    if (visible && !reducedMotion()) raf = requestAnimationFrame(render);
  };
  const ensureRender = () => {
    if (!raf) raf = requestAnimationFrame(render);
  };
  const onPointerMove = (event) => {
    const rect = element.getBoundingClientRect();
    uniforms.uPointer.value.set(
      clamp((event.clientX - rect.left) / rect.width, 0, 1),
      clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1)
    );
    ensureRender();
  };
  const scrollTrigger = ScrollTrigger.create({
    end: "bottom top",
    onUpdate: (self) => {
      velocityTarget = clamp(self.getVelocity() / 2200, -1.5, 1.5);
      ensureRender();
    },
    start: "top bottom",
    trigger: element
  });
  const resizeObserver = new ResizeObserver(() => {
    resize();
    ensureRender();
  });
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) ensureRender();
    else if (raf) cancelAnimationFrame(raf);
    if (!visible) raf = 0;
  });

  element.addEventListener("pointermove", onPointerMove, { passive: true });
  resizeObserver.observe(element);
  intersectionObserver.observe(element);
  resize();
  renderer.render(scene, camera);
  ensureRender();

  return () => {
    element.removeEventListener("pointermove", onPointerMove);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    scrollTrigger.kill();
    if (raf) cancelAnimationFrame(raf);
    uniforms.uTexture.value.dispose?.();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    canvas.remove();
  };
}

createAdvancedPackage({
  category: "component",
  mount,
  name: "fluid-canvas",
  selector: '[data-advanced="fluid-canvas"]'
});
