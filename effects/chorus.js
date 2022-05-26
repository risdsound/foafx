import { el, createNode } from '@elemaudio/core';


function ChorusComposite({props, context, children}) {
  let sr = context.sampleRate;
  let input = children[0];
  let rate = props.rate;
  let depth = Math.max(10, Math.min(40, props.depth));

  return el.delay(
    {size: sr * (20 + depth / 2) / 1000},
    el.ms2samps(el.add(20, depth / 2, el.mul(depth / 2, el.triangle(rate)))),
    0,
    input,
  );
}

export function chorus(props, input) {
  let wet = createNode(ChorusComposite, props, [input]);
  return el.mul(Math.sqrt(2) / 2, el.add(input, wet));
}
