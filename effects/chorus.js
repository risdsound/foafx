import invariant from 'invariant';
import { el, createNode } from '@elemaudio/core';


function ChorusComposite({props, context, children}) {
  let sr = context.sampleRate;
  let input = children[0];
  let rate = Math.max(0, Math.min(20000, props.rate));
  let depth = Math.max(10, Math.min(100, props.depth));

  return el.delay(
    {size: sr * (20 + depth / 2) / 1000},
    el.ms2samps(el.add(20, depth / 2, el.mul(depth / 2, el.triangle(rate)))),
    0,
    input,
  );
}

export function chorus(props, input) {
  invariant(typeof props === 'object' && typeof props.rate === 'number', 'rate must be specified as a number');
  invariant(typeof props === 'object' && typeof props.depth === 'number', 'depth must be specified as a number');

  let wet = createNode(ChorusComposite, props, [input]);
  return el.mul(Math.sqrt(2) / 2, el.add(input, wet));
}
