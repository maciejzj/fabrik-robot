import "./App.css";

import { useEffect, useState } from "react";

import { RobotStage } from "./RobotComponents";
import { Toggle, Slider, Counter } from "./UIComponents";

function App() {
  let [numSegments, setNumSegments] = useState(5);
  let [segmentLen, setSegmentLen] = useState(120);
  let [attached, setAttached] = useState(true);
  let [smoothingLvl, setSmoothingLvl] = useState(0.5);
  let [width, setWidth] = useState(960);
  let [height, setHeight] = useState(600);

  useEffect(() => {
    const adjustStageWidth = () => {
      let stageContainer = document.getElementById("robot-stage-container");
      setWidth(stageContainer.getBoundingClientRect().width);
      setHeight(stageContainer.getBoundingClientRect().height);
    };

    adjustStageWidth();

    window.addEventListener("resize", adjustStageWidth);
    return () => {
      window.removeEventListener("resize", adjustStageWidth);
    };
  }, []);

  return (
    <main className="flex h-screen min-w-[320px] flex-col">
      <header className="border-b-2 border-black px-6">
        <div className="mx-auto max-w-[960px] border-x-2 border-black p-5">
          <h1 className="font-mono text-3xl tracking-widest">FABRIK Robot</h1>
        </div>
      </header>

      <section className="border-b-2 border-black px-6">
        <div className="mx-auto max-w-[960px] border-x-2 border-black bg-stone-200 p-5">
          <h2 className="mb-3 font-mono text-2xl tracking-wider">Controls</h2>
          <div className="grid grid-cols-1 grid-rows-6 gap-0 sm:grid-cols-2 sm:grid-rows-4 md:grid-cols-4 md:grid-rows-2">
            <div className="col-span-1 row-span-2 md:col-span-1 md:row-span-2">
              <Counter label="Segments" count={numSegments} setCount={setNumSegments} min={1} max={6} />
            </div>
            <div className="col-span-1 row-span-2 md:col-span-1 md:row-span-2">
              <Counter label="Length" count={segmentLen} setCount={setSegmentLen} min={50} max={150} interval={10} />
            </div>
            <div className="flex sm:col-span-2 md:col-span-2 md:row-span-1">
              <div className="flex-grow sm:w-36 sm:flex-grow-0">
                <Toggle toggled={attached} setToggle={setAttached} enableText="Attach" disableText="Detach" />
              </div>
              <div className="hidden flex-grow rounded-full bg-gray-100 sm:block"></div>
            </div>
            <div className="sm:col-span-2 md:row-span-1">
              <Slider label="Glide" value={smoothingLvl} setValue={setSmoothingLvl} min={0} max={0.9} step={0.1} />
            </div>
          </div>
        </div>
      </section>

      <section className="min-h-[600px] flex-grow border-b-2 border-black px-6">
        <div id="robot-stage-container" className="mx-auto h-full max-w-[960px] border-x-2 border-black">
          <RobotStage
            width={width}
            height={height}
            numSegments={numSegments}
            segmentLength={segmentLen}
            smoothingLevel={smoothingLvl}
            attached={attached}
          />
        </div>
      </section>

      <section className="border-b-2 border-black px-6">
        <div className="mx-auto max-w-[960px] border-x-2 border-black bg-yellow-50 p-5 sm:text-lg">
          <h2 className="mb-5 font-mono text-2xl tracking-wider">About</h2>
          This website demonstrates the FABRIK (Forward And Backward Reaching Inverse Kinematics) [1] algorithm for
          robotic motions.
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="max-w-96 border-l-2 border-black px-3">
              <a
                className="hover:underline"
                target="_blank"
                rel="noopener noreferrer"
                href="https://doi.org/10.1016/j.gmod.2011.05.003"
              >
                [1] A. Aristidou, J. Lasenby, FABRIK: A fast, iterative solver for the Inverse Kinematics problem,
                Graphical Models
              </a>
            </div>
            <div className="max-w-32 border-l-2 border-black px-3">
              <a
                className="hover:underline"
                target="_blank"
                rel="noopener noreferrer"
                href="https://github.com/maciejzj/fabrik-robot"
              >
                Source code on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-b-2 border-black px-6">
        <div
          className="mx-auto flex max-w-[960px] flex-col justify-between gap-1 border-x-2 border-b-2 border-black bg-black p-5 text-lg
            text-white sm:flex-row sm:text-xl"
        >
          Maciej Ziaja
          <div>
            <a href="mailto:maciejzjg@gmail.com">maciejzjg@gmail.com</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default App;
