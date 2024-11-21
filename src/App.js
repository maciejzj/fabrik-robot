import './App.css';

import { Stage, Layer, Line, Group, Circle } from 'react-konva';
import { useEffect, useRef, useState } from 'react';


// Utils


function pairwise(arr) {
  return arr.slice(0, -1).map((_, i) => [arr[i], arr[i + 1]]);
}


function clip(value, min, max) {
  return Math.max(min, Math.min(value, max));
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
    this.head.x = this.base.x + length * Math.cos(angle);
    this.head.y = this.base.y + length * Math.sin(angle);
    return this;
  }

  follow(targetVec2D) {
    this.head_towards(targetVec2D);
    this.rebase(targetVec2D);
    this.move(this.base.sub(this.head));
    return this;
  }
}


class RobotModel {
  constructor(baseVec2D, segmentLengths, attached = true) {
    this.base = baseVec2D;
    this.attached = attached;
    this.segments = segmentLengths.map(length => Segment.fromPolar(baseVec2D, length, 0));
  }

  static with_n_segments(baseVec2D, n, length, attached = true) {
    return new RobotModel(baseVec2D, Array(n).fill(length), attached = attached);
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


class LowPassFilter {
  constructor(alpha) {
    this.alpha = alpha;
    this.state = 0;
  }

  update(input) {
    this.state = this.state + this.alpha * (input - this.state);
    return this.state;
  }
}

class LowPassFilter2D {
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


function RobotArm({ joints, radiuses }) {
  let segments = [];
  for (let i = 0; i < joints.length - 1; i++) {
    segments.push(<RobotSegment baseVec2D={joints[i]} headVec2D={joints[i + 1]} baseRadius={radiuses[i]} headRadius={radiuses[i + 1]} />);
  }

  return <Group>{segments}</Group>;
}


function scaleDecresingSize(i, total, min, max) {
  return (total - i) / total * (max - min) + min;
}


function RobotStage({ width, height, numSegments, segmentLength, attached, smoothingLevel = 0, refreshTimeoutMs = 5 }) {
  const [minJointRadius, maxJointRadius] = [10, 25];
  const minSegmentLength = 50;

  // Decreasing segment sizes closer to the head if attached, constant size if detached
  const segmentLengths = attached
    ? Array.from({ length: numSegments }, (_, i) => scaleDecresingSize(i, numSegments, minSegmentLength, segmentLength))
    : Array(numSegments).fill(segmentLength);
  const radiuses = attached
    ? Array.from({ length: numSegments + 1 }, (_, i) => scaleDecresingSize(i, numSegments + 1, minJointRadius, maxJointRadius))
    : Array(numSegments + 1).fill(15);

  const targetVec2D = useRef(new Vec2D(width / 2, 0));
  const robotModel = useRef(new RobotModel(new Vec2D(width / 2, height), segmentLengths, attached));
  const targetLowPassFilter = useRef(new LowPassFilter2D(1 - smoothingLevel));
  const [joints, setJoints] = useState(robotModel.current.joints);

  // Rebuild the model if the props change
  useEffect(() => {
    robotModel.current = new RobotModel(new Vec2D(width / 2, height), segmentLengths, attached);
  }, [numSegments, segmentLength, attached]);

  useEffect(() => {
    targetLowPassFilter.current.filterX.alpha = 1 - smoothingLevel;
    targetLowPassFilter.current.filterY.alpha = 1 - smoothingLevel;
  }, [smoothingLevel]);

  // Update the target based on the mouse position
  useEffect(() => {
    const handleMouseMove = (event) => {
      const rect = document.getElementById("robot-stage").getBoundingClientRect();
      targetVec2D.current.x = clip(event.clientX - rect.x, 0, rect.width);
      targetVec2D.current.y = clip(event.clientY - rect.y, 0, rect.height);
    };

    const handleTouchMove = (event) => {
      event.preventDefault();
      const rect = document.getElementById("robot-stage").getBoundingClientRect();
      targetVec2D.current.x = clip(event.touches[0].clientX - rect.x, 0, rect.width);
      targetVec2D.current.y = clip(event.touches[0].clientY - rect.y, 0, rect.height);
    };

    // Add listeners for both mouse and touch events
    window.addEventListener("mousemove", handleMouseMove);
    document.getElementById("robot-stage").addEventListener("touchmove", handleTouchMove, { passive: false });

    // Cleanup function
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.getElementById("robot-stage").removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  // Update the model based on current target and redraw the robot based on model joints positions
  useEffect(() => {
    const id = setInterval(() => {
      let targetFiltered = targetLowPassFilter.current.update(targetVec2D.current);
      robotModel.current.follow(targetFiltered);
      setJoints(robotModel.current.joints);
    }, refreshTimeoutMs);

    return () => {
      clearInterval(id);
    };
  }, []);

  return (
    <Stage id="robot-stage" width={width} height={height} className="border rounded-3xl dotted overflow-hidden">
      <Layer>
        <RobotArm joints={robotModel.current.joints} radiuses={radiuses} />
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


function Slider({ label, value, setValue, min, max, step }) {
  const handleChange = (event) => { setValue(event.target.value); };

  return (
    <div>
      {label}
      <input className="mx-3 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" type="range" min={min} max={max} step={step} value={value} onChange={handleChange} />
      {value}
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
  let [segmentLength, setSegmentLength] = useState(120);
  let [attached, setAttached] = useState(true);
  let [smoothingLevel, setSmoothingLevel] = useState(0.5);

  return (
    <main className="mx-auto w-[800px]">

      <h1 className="mt-12 mb-8 text-6xl font-bold tracking-widest text-center">FABRIK robot</h1>

      <section>
        <div className="mx-auto w-[300px]">
          <Slider label="Smoothing" value={smoothingLevel} setValue={setSmoothingLevel} min={0} max={0.9} step={0.1} />
        </div>
        <div className="my-8 grid grid-cols-3 gap-4 justify-items-center">
          <Counter label="Segments" count={numSegments} setCount={setNumSegments} min={1} max={6} />
          <Counter label="Length" count={segmentLength} setCount={setSegmentLength} min={50} max={150} interval={10} />
          <Toogle toogled={attached} setToogle={setAttached} enableText="Attach" disableText="Detach" />
        </div>
      </section>

      <section>
        <RobotStage width={800} height={700} numSegments={numSegments} segmentLength={segmentLength} smoothingLevel={smoothingLevel} attached={attached} />
      </section>

    </main>
  );
}

export default App;
