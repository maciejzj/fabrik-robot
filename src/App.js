import './App.css';

import { Stage, Layer, Line, Group } from 'react-konva';
import { useEffect, useRef, useState } from 'react';


// Utils


function pairwise(arr) {
  return arr.slice(0, -1).map((_, i) => [arr[i], arr[i + 1]]);
}


// Robot model


class Vec2D {
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


class Segment {
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

  head_towards(targetVec2D) {
    let length = this.length;
    let angle = Math.atan2(targetVec2D.y - this.base.y, targetVec2D.x - this.base.x);
    this.head = new Vec2D(this.base.x + length * Math.cos(angle), this.base.y + length * Math.sin(angle));
    return this;
  }

  follow(targetVec2D) {
    this.head_towards(targetVec2D);
    this.rebase(targetVec2D);
    this.move(this.base.sub(this.head));
    return this;
  }
}


class Robot {
  constructor(baseVec2D, segmentLengths, attached = true) {
    this.base = baseVec2D;
    this.attached = attached;
    this.segments = segmentLengths.map(length => Segment.fromPolar(baseVec2D, length, 0));
  }

  static with_n_segments(baseVec2D, n, length, attached = true) {
    return new Robot(baseVec2D, Array(n).fill(length), attached = attached);
  }

  get joints() {
    let bases = this.segments.map(segment => segment.base);
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


// Drawing components


function RobotSegment({ baseVec2D, headVec2D }) {
  return (
    <Line points={[baseVec2D.x, baseVec2D.y, headVec2D.x, headVec2D.y]} stroke={"black"} />
  )
}


function RobotArm({ joints }) {
  return (
    <Group>
      {pairwise(joints).map(([base, head]) => <RobotSegment baseVec2D={base} headVec2D={head} />)}
    </Group>
  )
}


function RobotStage({ width, height, refreshTimeoutMs = 5 }) {
  let [targetVec2D, setTarget] = useState(new Vec2D(100, 100));
  let robot = useRef(Robot.with_n_segments(new Vec2D(width / 2, height), 5, 50, true));

  const updateRobot = (x, y) => {
    setTarget(new Vec2D(x, y));
    robot.current.follow(targetVec2D);
  }

  const handleMouseMove = (event) => {
    setTimeout(() => {
      const stage = event.target.getStage();
      const { x, y } = stage.getPointerPosition();
      updateRobot(x, y);
    }, refreshTimeoutMs)
  };

  return (
    <Stage width={width} height={height} onMouseMove={handleMouseMove}>
      <Layer>
        <RobotArm joints={robot.current.joints} />
      </Layer>
    </Stage>
  );
}


// UI components and app


function App() {
  return (
    <main>
      <h1>FARBIK robot</h1>
      <RobotStage width={1000} height={1000} />
    </main>
  );
}

export default App;
