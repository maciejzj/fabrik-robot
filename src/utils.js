export function pairwise(arr) {
  return arr.slice(0, -1).map((_, i) => [arr[i], arr[i + 1]]);
}

export function clip(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

export function scaleDecraesing(i, total, min, max) {
  return ((total - i) / total) * (max - min) + min;
}
