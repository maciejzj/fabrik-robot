import "./App.css";

import { Stage, Layer, Line, Group, Circle } from "react-konva";
import { useEffect, useRef, useState } from "react";

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
    this.segments = segmentLengths.map((length) => Segment.fromPolar(baseVec2D, length, 0));
  }

  static with_n_segments(baseVec2D, n, length, attached = true) {
    return new RobotModel(baseVec2D, Array(n).fill(length), (attached = attached));
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

function RobotSegment({ baseVec2D: base, headVec2D: head, baseRadius = 10, headRadius = 10 }) {
  return (
    <Group>
      <Line
        points={[
          base.x + baseRadius * Math.cos(Math.atan2(head.y - base.y, head.x - base.x) - Math.PI / 2),
          base.y + baseRadius * Math.sin(Math.atan2(head.y - base.y, head.x - base.x) - Math.PI / 2),

          head.x + headRadius * Math.cos(Math.atan2(head.y - base.y, head.x - base.x) - Math.PI / 2),
          head.y + headRadius * Math.sin(Math.atan2(head.y - base.y, head.x - base.x) - Math.PI / 2),

          head.x + headRadius * Math.cos(Math.atan2(head.y - base.y, head.x - base.x) + Math.PI / 2),
          head.y + headRadius * Math.sin(Math.atan2(head.y - base.y, head.x - base.x) + Math.PI / 2),

          base.x + baseRadius * Math.cos(Math.atan2(head.y - base.y, head.x - base.x) + Math.PI / 2),
          base.y + baseRadius * Math.sin(Math.atan2(head.y - base.y, head.x - base.x) + Math.PI / 2),
        ]}
        closed={true}
        fill={"black"}
      />
      <Circle x={base.x} y={base.y} radius={baseRadius} stroke={"white"} fill={"black"} />
      <Circle x={head.x} y={head.y} radius={headRadius} stroke={"white"} fill={"black"} />
    </Group>
  );
}

function RobotArm({ joints, radiuses }) {
  let segments = [];
  for (let i = 0; i < joints.length - 1; i++) {
    segments.push(
      <RobotSegment
        baseVec2D={joints[i]}
        headVec2D={joints[i + 1]}
        baseRadius={radiuses[i]}
        headRadius={radiuses[i + 1]}
      />,
    );
  }

  return <Group>{segments}</Group>;
}

function scaleDecresingSize(i, total, min, max) {
  return ((total - i) / total) * (max - min) + min;
}

function RobotStage({ width, height, numSegments, segmentLength, attached, smoothingLevel = 0, refreshTimeoutMs = 5 }) {
  const [minJointRadius, maxJointRadius] = [10, 25];
  const minSegmentLength = 50;

  // Decreasing segment sizes closer to the head if attached, constant size if detached
  let segmentLengths;
  let radiuses;
  if (attached) {
    segmentLengths = Array.from({ length: numSegments }, (_, i) =>
      scaleDecresingSize(i, numSegments, minSegmentLength, segmentLength),
    );
    radiuses = Array.from({ length: numSegments + 1 }, (_, i) =>
      scaleDecresingSize(i, numSegments + 1, minJointRadius, maxJointRadius),
    );
  } else {
    segmentLengths = Array(numSegments).fill(segmentLength);
    radiuses = Array(numSegments + 1).fill(15);
  }

  const targetVec2D = useRef(new Vec2D(width / 2, 0));
  const robotModel = useRef(new RobotModel(new Vec2D(width / 2, height), segmentLengths, attached));
  const targetLowPassFilter = useRef(new LowPassFilter2D(1 - smoothingLevel));
  const [joints, setJoints] = useState(robotModel.current.joints);

  // Rebuild the model if the props change
  useEffect(() => {
    robotModel.current = new RobotModel(new Vec2D(width / 2, height), segmentLengths, attached);
  }, [width, numSegments, segmentLength, attached]);

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
    <Stage id="robot-stage" width={width} height={height} className="dotted overflow-hidden">
      <Layer>
        <RobotArm joints={robotModel.current.joints} radiuses={radiuses} />
      </Layer>
    </Stage>
  );
}

function Counter({ label, count, setCount, min, max, interval = 1 }) {
  const increment = () => {
    setCount(count + interval);
  };
  const decrement = () => {
    setCount(count - interval);
  };

  return (
    <div className="flex justify-between gap-3 p-6 rounded-[2.5rem] bg-white h-32">
      <div className="flex flex-col justify-between">
        <div className="text-xl">{label}</div>
        <div className="text-5xl font-mono">{count}</div>
      </div>
      <div className="flex flex-col justify-between items-center text-3xl text-white select-none">
        <button className="flex-grow rounded-t-full w-full px-1.5 py-0.5 enabled:bg-black disabled:bg-stone-300" onClick={increment} disabled={count >= max}>+</button>
        <button className="flex-grow rounded-b-full w-full px-1.5 py-0.5 enabled:bg-black disabled:bg-stone-300" onClick={decrement} disabled={count <= min}>-</button>
      </div>
    </div>
  );
}

function Slider({ label, value, setValue, min, max, step }) {
  const handleChange = (event) => {
    setValue(event.target.value);
  };

  return (
    <div className="flex gap-6 justify-between items-center h-16 px-8 bg-black rounded-[2.5rem] text-lg font-mono tracking-wider text-white">
      {label}
      <input
        className="min-w-6 h-1 flex-grow bg-white rounded-lg appearance-none cursor-pointer"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
      />
      {value}
    </div>
  );
}

function Toogle({ toogled, setToogle, enableText, disableText }) {
  const toogle = () => {
    setToogle(!toogled);
  };
  return (
    <button className="w-full h-16 px-6 text-center rounded-[2.5rem] text-xl tracking-wider bg-gray-100" onClick={toogle}>
      {toogled ? disableText : enableText}
    </button>
  );
}

// UI components and app

function App() {
  let [numSegments, setNumSegments] = useState(5);
  let [segmentLength, setSegmentLength] = useState(120);
  let [attached, setAttached] = useState(true);
  let [smoothingLevel, setSmoothingLevel] = useState(0.5);
  let [width, setWidth] = useState(960);

  useEffect(() => {
    let handle = window.addEventListener("resize", () => {
      let stageContainer = document.getElementById("robot-stage-container");
      setWidth(stageContainer.getBoundingClientRect().width);
    });
    return () => { window.removeEventListener("resize", handle); };
  }, []);

  return (
    <main>
      <header className="border-b-2 border-black px-5">
        <div className="max-w-[960px] mx-auto p-5 border-x-2 border-black">
          <h1 className="text-3xl tracking-widest font-mono">FABRIK Robot</h1>
        </div>
      </header>

      <section className="border-b-2 border-black px-5">
        <div className="max-w-[960px] mx-auto p-5 border-x-2 border-black bg-stone-200">
          <h2 className="mb-3 text-2xl tracking-wider font-mono">Controls</h2>
          <div className="grid gap-0 grid-rows-6 grid-cols-1 sm:grid-rows-4 sm:grid-cols-2 md:grid-rows-2 md:grid-cols-4">
            <div className="row-span-2 col-span-1 md:row-span-2 md:col-span-1">
              <Counter label="Segments" count={numSegments} setCount={setNumSegments} min={1} max={6} />
            </div>
            <div className="row-span-2 col-span-1 md:row-span-2 md:col-span-1">
              <Counter label="Length" count={segmentLength} setCount={setSegmentLength} min={50} max={150} interval={10} />
            </div>
            <div className="sm:col-span-2 md:row-span-1 md:col-span-2 flex">
              <div className="flex-grow sm:flex-grow-0 sm:w-36">
                <Toogle toogled={attached} setToogle={setAttached} enableText="Attach" disableText="Detach" />
              </div>
              <div className="hidden sm:block flex-grow bg-gray-100 rounded-full"></div>
            </div>
            <div className="sm:col-span-2 md:row-span-1">
              <Slider label="Glide" value={smoothingLevel} setValue={setSmoothingLevel} min={0} max={0.9} step={0.1} />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black px-5">
        <div id="robot-stage-container" className="max-w-[960px] mx-auto border-x-2 border-black">
          <RobotStage
            width={width}
            height={600}
            numSegments={numSegments}
            segmentLength={segmentLength}
            smoothingLevel={smoothingLevel}
            attached={attached}
          />
        </div>
      </section>

      <section className="border-b-2 border-black px-5">
        <div className="max-w-[960px] mx-auto p-5 border-x-2 border-black bg-yellow-50 sm:text-lg">
          <h2 className="text-2xl mb-5 tracking-wider font-mono">About</h2>
          This website demonstrates the FABRIK (Forward And Backward Reaching Inverse Kinematics) [1] algorithm for robotic motions.
          <div className="grid md:grid-cols-2 gap-5 mt-5">
            <div className="max-w-96 px-3 border-l-2 border-black">
              <a className="hover:underline" href="">
                [1] A. Aristidou, J. Lasenby, FABRIK: A fast, iterative solver for the Inverse Kinematics problem, Graphical Models
              </a>
            </div>
            <div className="max-w-32 px-3 border-l-2 border-black">
              <a className="hover:underline" href="">Source code on GitHub</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-b-2 border-black px-5">
        <div className="max-w-[960px] mx-auto p-5 border-x-2 border-b-2 border-black text-xl text-white bg-black">
          Maciej Ziaja
        </div>
      </footer>
    </main >
  );
}

export default App;
