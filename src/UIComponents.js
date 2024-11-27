export function Counter({ label, count, setCount, min, max, interval = 1 }) {
  const increment = () => {
    setCount(count + interval);
  };
  const decrement = () => {
    setCount(count - interval);
  };

  return (
    <div className="flex h-32 min-w-40 select-none justify-between gap-3 rounded-[2.5rem] bg-white p-6">
      <div className="flex flex-col justify-between">
        <div className="text-xl">{label}</div>
        <div className="font-mono text-5xl">{count}</div>
      </div>
      <div className="flex flex-col items-center justify-between text-3xl text-white">
        <button
          className="w-full flex-grow rounded-t-full px-1.5 py-0.5 enabled:bg-black disabled:bg-stone-300"
          onClick={increment}
          disabled={count >= max}
        >
          +
        </button>
        <button
          className="w-full flex-grow rounded-b-full px-1.5 py-0.5 enabled:bg-black disabled:bg-stone-300"
          onClick={decrement}
          disabled={count <= min}
        >
          -
        </button>
      </div>
    </div>
  );
}

export function Slider({ label, value, setValue, min, max, step, displayDigits = 1 }) {
  const handleChange = (event) => {
    setValue(event.target.value);
  };

  return (
    <div
      className="flex h-16 min-w-60 select-none items-center justify-between gap-6 rounded-[2.5rem] bg-black px-6 font-mono text-lg
        tracking-wider text-white"
    >
      {label}
      <input
        className="h-1 min-w-6 flex-grow cursor-pointer appearance-none rounded-lg bg-white accent-white [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-white [&::-ms-thumb]:h-5 [&::-ms-thumb]:w-5 [&::-ms-thumb]:appearance-none
          [&::-ms-thumb]:rounded-full [&::-ms-thumb]:bg-white [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
      />
      {Number(value).toFixed(displayDigits)}
    </div>
  );
}

export function Toggle({ toggled, setToggle, enableText, disableText }) {
  const toggle = () => {
    setToggle(!toggled);
  };
  return (
    <button
      className="h-16 w-full select-none rounded-[2.5rem] bg-gray-100 px-6 text-center text-xl tracking-wider"
      onClick={toggle}
    >
      {toggled ? disableText : enableText}
    </button>
  );
}
