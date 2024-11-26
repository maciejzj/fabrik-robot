import { pairwise } from "./utils";

export class Vec2D {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(other) {
    if (other instanceof Vec2D) {
      return new Vec2D(this.x + other.x, this.y + other.y);
    }
    return new Vec2D(other + this.x, other + this.y);
  }

  sub(other) {
    if (other instanceof Vec2D) {
      return new Vec2D(this.x - other.x, this.y - other.y);
    }
    return new Vec2D(other - this.x, other - this.y);
  }

  mul(other) {
    return new Vec2D(other * this.x, other * this.y);
  }

  magnitude() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }
}

export class Segment {
  constructor(baseVec2D, headVec2D) {
    this.base = baseVec2D;
    this.head = headVec2D;
  }

  static fromPolar(baseVec2D, length, angle) {
    let x = baseVec2D.x + length * Math.cos(angle);
    let y = baseVec2D.y + length * Math.sin(angle);
    return new Segment(baseVec2D, new Vec2D(x, y));
  }

  get heading() {
    return Math.atan2(this.head.y - this.base.y, this.head.x - this.base.x);
  }

  get length() {
    return Math.sqrt((this.head.x - this.base.x) ** 2 + (this.head.y - this.base.y) ** 2);
  }

  rebase(newbaseVec2D) {
    this.head = this.head.sub(this.base).add(newbaseVec2D);
    this.base = newbaseVec2D;
  }

  move(vec2D) {
    this.base = this.base.add(vec2D);
    this.head = this.head.add(vec2D);
    return this;
  }

  headTowards(targetVec2D) {
    let length = this.length;
    let angle = Math.atan2(targetVec2D.y - this.base.y, targetVec2D.x - this.base.x);
    this.head.x = this.base.x + length * Math.cos(angle);
    this.head.y = this.base.y + length * Math.sin(angle);
    return this;
  }

  follow(targetVec2D) {
    this.headTowards(targetVec2D);
    this.rebase(targetVec2D);
    this.move(this.base.sub(this.head));
    return this;
  }
}

export class RobotModel {
  constructor(baseVec2D, segmentLengths, attached = true) {
    this.base = baseVec2D;
    this.attached = attached;
    this.segments = segmentLengths.map((length) => Segment.fromPolar(baseVec2D, length, 0));
  }

  get joints() {
    let bases = this.segments.map((segment) => segment.base);
    let lastHead = this.segments[this.segments.length - 1].head;
    return [...bases, lastHead];
  }

  follow(targetVec2D) {
    // Follow target
    this.segments[this.segments.length - 1].follow(targetVec2D);
    for (let [prev, next] of pairwise([...this.segments].reverse())) {
      next.follow(prev.base);
    }

    // Attach to base
    if (this.attached) {
      this.segments[0].rebase(this.base);
      for (let [prev, next] of pairwise(this.segments)) {
        next.rebase(prev.head);
      }
    }
  }
}

export class LowPassFilter {
  constructor(alpha) {
    this.alpha = alpha;
    this.state = 0;
  }

  update(input) {
    this.state = this.state + this.alpha * (input - this.state);
    return this.state;
  }
}

export class LowPassFilter2D {
  constructor(alpha) {
    this.filterX = new LowPassFilter(alpha);
    this.filterY = new LowPassFilter(alpha);
  }

  update(inputVec2D) {
    let x = this.filterX.update(inputVec2D.x);
    let y = this.filterY.update(inputVec2D.y);
    return new Vec2D(x, y);
  }
}
