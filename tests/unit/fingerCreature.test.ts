// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  createFingerCreature,
  getFingerRotation,
  FINGER_NAT_W,
  FINGER_NAT_H,
} from '../../src/creatures/FingerCreature';

describe('FingerCreature', () => {
  describe('createFingerCreature', () => {
    it('creates a creature with correct properties', () => {
      const scale = 2;
      const finger = createFingerCreature(100, 200, scale);

      expect(finger.x).toBe(100);
      expect(finger.y).toBe(200);
      expect(finger.hx).toBe(100);
      expect(finger.hy).toBe(200);
      expect(finger.vx).toBe(0);
      expect(finger.vy).toBe(0);
      expect(finger.scale).toBe(scale);
    });

    it('has correct dimensions based on scale', () => {
      const scale = 1.5;
      const finger = createFingerCreature(0, 0, scale);

      expect(finger.w).toBe(FINGER_NAT_W * scale);
      expect(finger.h).toBe(FINGER_NAT_H * scale);
    });

    it('has correct dimensions at scale 1', () => {
      const finger = createFingerCreature(0, 0, 1);

      expect(finger.w).toBe(FINGER_NAT_W);
      expect(finger.h).toBe(FINGER_NAT_H);
    });

    it('element contains an img tag with correct src', () => {
      const finger = createFingerCreature(0, 0, 1);

      const img = finger.el.querySelector('img');
      expect(img).not.toBeNull();
      expect(img!.src).toContain('/creatures/finger.png');
    });

    it('img is not draggable', () => {
      const finger = createFingerCreature(0, 0, 1);

      const img = finger.el.querySelector('img');
      expect(img!.draggable).toBe(false);
    });

    it('creates element with correct styles', () => {
      const scale = 2;
      const finger = createFingerCreature(0, 0, scale);

      expect(finger.el.className).toBe('wrap');
      expect(finger.el.style.position).toBe('');
      expect(finger.el.style.pointerEvents).toBe('');
      expect(finger.el.style.willChange).toBe('');
      expect(finger.el.style.width).toBe(`${FINGER_NAT_W * scale}px`);
      expect(finger.el.style.height).toBe(`${FINGER_NAT_H * scale}px`);
    });
  });

  describe('getFingerRotation', () => {
    it('calculates correct angle (atan2 + 180)', () => {
      const finger = createFingerCreature(0, 0, 1);

      const rotation = getFingerRotation(finger, 100, 0);

      expect(rotation).toBe(180);
    });

    it('faces away from avatar when avatar is to the right', () => {
      const finger = createFingerCreature(0, 0, 1);

      const rotation = getFingerRotation(finger, 100, 0);

      expect(rotation).toBe(180);
    });

    it('faces away from avatar when avatar is above', () => {
      const finger = createFingerCreature(100, 100, 1);

      const rotation = getFingerRotation(finger, 100, 0);

      expect(rotation).toBe(90);
    });

    it('faces away from avatar when avatar is below', () => {
      const finger = createFingerCreature(100, 100, 1);

      const rotation = getFingerRotation(finger, 100, 200);

      expect(rotation).toBe(270);
    });

    it('faces away from avatar when avatar is to the left', () => {
      const finger = createFingerCreature(100, 100, 1);

      const rotation = getFingerRotation(finger, 0, 100);

      expect(rotation).toBe(360);
    });
  });
});
