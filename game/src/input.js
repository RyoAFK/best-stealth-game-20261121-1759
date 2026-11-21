// Keyboard state for HUSHFALL. Tracks held keys and one-shot presses.
export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.key.toLowerCase());
      this.down.add(e.key.toLowerCase());
    });
    addEventListener('keyup', (e) => this.down.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.down.clear());
  }
  held(...keys) {
    return keys.some((k) => this.down.has(k));
  }
  tapped(...keys) {
    return keys.some((k) => this.pressed.has(k));
  }
  endFrame() {
    this.pressed.clear();
  }
  // Movement vector from WASD / arrow keys, normalised.
  axis() {
    let x = 0;
    let y = 0;
    if (this.held('a', 'arrowleft')) x -= 1;
    if (this.held('d', 'arrowright')) x += 1;
    if (this.held('w', 'arrowup')) y -= 1;
    if (this.held('s', 'arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = Math.SQRT1_2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }
}
