import './App.css';

import { Stage, Layer, Line, Group, Circle } from 'react-konva';
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


function RobotSegment({ baseVec2D, headVec2D, baseRadius = 10, headRadius = 10 }) {
  return (
    <Group>
      <Line points={[
        baseVec2D.x + baseRadius * Math.cos(Math.atan2(headVec2D.y - baseVec2D.y, headVec2D.x - baseVec2D.x) - Math.PI / 2),
        baseVec2D.y + baseRadius * Math.sin(Math.atan2(headVec2D.y - baseVec2D.y, headVec2D.x - baseVec2D.x) - Math.PI / 2),

        headVec2D.x + headRadius * Math.cos(Math.atan2(headVec2D.y - baseVec2D.y, headVec2D.x - baseVec2D.x) - Math.PI / 2),
        headVec2D.y + headRadius * Math.sin(Math.atan2(headVec2D.y - baseVec2D.y, headVec2D.x - baseVec2D.x) - Math.PI / 2),

        headVec2D.x + headRadius * Math.cos(Math.atan2(headVec2D.y - baseVec2D.y, headVec2D.x - baseVec2D.x) + Math.PI / 2),
        headVec2D.y + headRadius * Math.sin(Math.atan2(headVec2D.y - baseVec2D.y, headVec2D.x - baseVec2D.x) + Math.PI / 2),

        baseVec2D.x + baseRadius * Math.cos(Math.atan2(headVec2D.y - baseVec2D.y, headVec2D.x - baseVec2D.x) + Math.PI / 2),
        baseVec2D.y + baseRadius * Math.sin(Math.atan2(headVec2D.y - baseVec2D.y, headVec2D.x - baseVec2D.x) + Math.PI / 2),
      ]}
        closed={true} fill={"grey"}
      />
      <Circle x={baseVec2D.x} y={baseVec2D.y} radius={baseRadius} stroke={"white"} fill={"grey"} />
      <Circle x={headVec2D.x} y={headVec2D.y} radius={headRadius} stroke={"white"} fill={"grey"} />
    </Group >
  )
}


function RobotArm({ joints }) {
  return (
    <Group>
      {pairwise(joints).map(([base, head]) => <RobotSegment baseVec2D={base} headVec2D={head} />)}
    </Group>
  )
}


function RobotStage({ width, height, numSegments, segmentLength, attached, refreshTimeoutMs = 5 }) {
  let [targetVec2D, setTarget] = useState(new Vec2D(100, 100));
  let robot = useRef(Robot.with_n_segments(new Vec2D(width / 2, height), numSegments, segmentLength, attached));

  useEffect(() => {
    robot.current = Robot.with_n_segments(new Vec2D(width / 2, height), numSegments, segmentLength, attached);
  }, [numSegments, segmentLength, attached]);

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

function Counter({ label, count, setCount, min, max, interval = 1 }) {
  const increment = () => { setCount(count + interval); };
  const decrement = () => { setCount(count - interval); };

  return (
    <div className="grid grid-rows-2 grid-cols-[auto,50px,auto] border rounded-xl divide-x">
      <div className="row-span-2 flex items-center justify-center px-3">{label}</div>
      <div className="row-span-2 flex items-center justify-center px-3">{count}</div>
      <button className="border-b px-3" onClick={increment} disabled={count >= max}>+</button>
      <button className="px-3" onClick={decrement} disabled={count <= min}>-</button>
    </div>
  );
}

function Toogle({ toogled, setToogle, enableText, disableText }) {
  const toogle = () => { setToogle(!toogled) };
  return <button className="border rounded-xl px-3" onClick={toogle}>{toogled ? disableText : enableText}</button>;
}


// UI components and app


function App() {
  let [numSegments, setNumSegments] = useState(5);
  let [segmentLength, setSegmentLength] = useState(50);
  let [attached, setAttached] = useState(true);

  return (
    <main className="mx-auto w-1/2">

      <h1 className="mt-36 mb-18 text-6xl text-center">FARBIK robot</h1>

      <div>
        <section className="my-16 grid grid-cols-3 gap-4 justify-items-center">
          <Counter label="Segments" count={numSegments} setCount={setNumSegments} min={1} max={10} />
          <Counter label="Length" count={segmentLength} setCount={setSegmentLength} min={10} max={100} interval={10} />
          <Toogle toogled={attached} setToogle={setAttached} enableText="Attach" disableText="Detach" />
        </section>
      </div>

      <section className="flex justify-center border rounded-3xl dotted">
        <RobotStage width={800} height={800} numSegments={numSegments} segmentLength={segmentLength} attached={attached} />
      </section>
    </main>
  );
}

export default App;
