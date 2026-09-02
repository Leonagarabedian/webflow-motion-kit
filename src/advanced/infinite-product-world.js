import { gsap } from "gsap";
import "./advanced.css";
import { boolean, number, reducedMotion, restoreStyle, target } from "./shared/config.js";
import { createAdvancedPackage } from "./shared/runtime.js";

function mount(element) {
  const world = target(element, "world");
  const group = target(element, "world-group");
  if (!world || !group || reducedMotion()) return;
  const initialWorldStyle = world.getAttribute("style");
  const initialGroupStyle = group.getAttribute("style");
  const clones = [];
  const groups = [group];
  const state = { dragging: false, pointerX: 0, pointerY: 0, velocityX: 0, velocityY: 0, x: 0, y: 0 };
  const friction = number(element, "advanced-friction", 0.9);
  const wheelStrength = number(element, "advanced-wheel-strength", 0.38);
  const dragStrength = number(element, "advanced-drag-strength", 1);
  let groupWidth = 1;
  let groupHeight = 1;

  for (let row = -1; row <= 1; row += 1) {
    for (let column = -1; column <= 1; column += 1) {
      if (row === 0 && column === 0) continue;
      const clone = group.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.setAttribute("data-advanced-world-clone", "");
      clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      clone.querySelectorAll("a,button,input,[tabindex]").forEach((node) => {
        node.setAttribute("tabindex", "-1");
      });
      world.appendChild(clone);
      clone.dataset.worldColumn = String(column);
      clone.dataset.worldRow = String(row);
      groups.push(clone);
      clones.push(clone);
    }
  }

  const wrap = (value, size) => {
    const half = size / 2;
    return gsap.utils.wrap(-half, half, value);
  };
  const positionGroups = () => {
    const rect = group.getBoundingClientRect();
    groupWidth = Math.max(rect.width, element.clientWidth, 1);
    groupHeight = Math.max(rect.height, element.clientHeight, 1);
    gsap.set(group, { x: 0, y: 0 });
    clones.forEach((clone) => {
      gsap.set(clone, {
        x: Number(clone.dataset.worldColumn) * groupWidth,
        y: Number(clone.dataset.worldRow) * groupHeight
      });
    });
  };
  const render = () => {
    if (!state.dragging) {
      state.x += state.velocityX;
      state.y += state.velocityY;
      state.velocityX *= friction;
      state.velocityY *= friction;
    }
    state.x = wrap(state.x, groupWidth);
    state.y = wrap(state.y, groupHeight);
    gsap.set(world, { x: state.x, y: state.y });
  };
  const onWheel = (event) => {
    if (boolean(element, "advanced-capture-wheel", true)) event.preventDefault();
    state.velocityX += -event.deltaX * wheelStrength;
    state.velocityY += -event.deltaY * wheelStrength;
  };
  const onPointerDown = (event) => {
    state.dragging = true;
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    state.velocityX = 0;
    state.velocityY = 0;
    element.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event) => {
    if (!state.dragging) return;
    const deltaX = (event.clientX - state.pointerX) * dragStrength;
    const deltaY = (event.clientY - state.pointerY) * dragStrength;
    state.x += deltaX;
    state.y += deltaY;
    state.velocityX = deltaX;
    state.velocityY = deltaY;
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
  };
  const onPointerUp = (event) => {
    state.dragging = false;
    element.releasePointerCapture?.(event.pointerId);
  };
  const resizeObserver = new ResizeObserver(positionGroups);

  positionGroups();
  resizeObserver.observe(group);
  element.addEventListener("wheel", onWheel, { passive: false });
  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", onPointerUp);
  element.addEventListener("pointercancel", onPointerUp);
  gsap.ticker.add(render);

  return () => {
    gsap.ticker.remove(render);
    resizeObserver.disconnect();
    element.removeEventListener("wheel", onWheel);
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("pointermove", onPointerMove);
    element.removeEventListener("pointerup", onPointerUp);
    element.removeEventListener("pointercancel", onPointerUp);
    clones.forEach((clone) => clone.remove());
    groups.forEach((item) => gsap.killTweensOf(item));
    restoreStyle(world, initialWorldStyle);
    restoreStyle(group, initialGroupStyle);
  };
}

createAdvancedPackage({
  mount,
  name: "infinite-product-world",
  selector: '[data-advanced="infinite-product-world"]'
});
