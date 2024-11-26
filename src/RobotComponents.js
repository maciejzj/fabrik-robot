import { useState, useMemo, useRef, useEffect } from "react";
import { Stage, Line, Group, Circle, Layer } from "react-konva";

import { RobotModel, Vec2D, LowPassFilter2D } from "./robotModel";
import { clip, scaleDecraesing } from "./utils";

export function RobotSegment({ baseVec2D: base, headVec2D: head, baseRadius = 10, headRadius = 10 }) {
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

export function RobotArm({ joints, radiuses }) {
  let segments = [];
  for (let i = 0; i < joints.length - 1; i++) {
    segments.push(
      <RobotSegment
        key={`segment-${i}`}
        baseVec2D={joints[i]}
        headVec2D={joints[i + 1]}
        baseRadius={radiuses[i]}
        headRadius={radiuses[i + 1]}
      />,
    );
  }

  return <Group>{segments}</Group>;
}

function calcSegmentLengths(numSegments, minLength, maxLength, attached) {
  if (attached) {
    return Array.from({ length: numSegments }, (_, i) => scaleDecraesing(i, numSegments, minLength, maxLength));
  }
  return Array(numSegments).fill(maxLength);
}

function calcJointRadiuses(numSegments, minRadius, maxRadius, attached) {
  if (attached) {
    return Array.from({ length: numSegments + 1 }, (_, i) => scaleDecraesing(i, numSegments + 1, minRadius, maxRadius));
  }
  return Array(numSegments + 1).fill(15);
}

export function RobotStage({ width, height, numSegments, segmentLength, attached, smoothingLevel = 0 }) {
  const [minJointRadius, maxJointRadius] = [10, 25];
  const minSegmentLength = 50;

  // Decreasing segment sizes closer to the head if attached, constant size if detached
  const segmentLengths = useMemo(
    () => calcSegmentLengths(numSegments, minSegmentLength, segmentLength, attached),
    [numSegments, minSegmentLength, segmentLength, attached],
  );
  const radiuses = useMemo(
    () => calcJointRadiuses(numSegments, minJointRadius, maxJointRadius, attached),
    [numSegments, minJointRadius, maxJointRadius, attached],
  );
  const targetVec2D = useRef(new Vec2D(width / 2, 0));
  const robotModel = useRef(new RobotModel(new Vec2D(width / 2, height), segmentLengths, attached));
  const targetLowPassFilter = useRef(new LowPassFilter2D(1 - smoothingLevel));
  const [, setJoints] = useState(robotModel.current.joints);

  // Rebuild the model if the props change
  useEffect(() => {
    const segmentLengths = calcSegmentLengths(numSegments, minSegmentLength, segmentLength, attached);
    robotModel.current.makeSegments(segmentLengths);
    robotModel.current.attached = attached;
  }, [numSegments, segmentLength, attached]);

  useEffect(() => {
    robotModel.current.base = new Vec2D(width / 2, height);
    targetVec2D.current = new Vec2D(width / 2, 0);
  }, [width, height]);

  useEffect(() => {
    targetLowPassFilter.current.filterX.alpha = 1 - smoothingLevel;
    targetLowPassFilter.current.filterY.alpha = 1 - smoothingLevel;
  }, [smoothingLevel]);

  // Update the target based on the mouse/touch position
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

    window.addEventListener("mousemove", handleMouseMove);
    document.getElementById("robot-stage").addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.getElementById("robot-stage").removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  // Main animation drawing
  useEffect(() => {
    let animationFrameId;

    const update = () => {
      const targetFiltered = targetLowPassFilter.current.update(targetVec2D.current);
      robotModel.current.follow(targetFiltered);
      setJoints(robotModel.current.joints);
      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [robotModel]);

  return (
    <Stage id="robot-stage" width={width} height={height} className="dotted select-none overflow-hidden">
      <Layer>
        <RobotArm joints={robotModel.current.joints} radiuses={radiuses} />
      </Layer>
    </Stage>
  );
}
