import invariant from 'invariant';
import { el, createNode } from '@elemaudio/core';


function FlangerComposite({props, context, children}) {
  let sr = context.sampleRate;
  let input = children[0];

  let rate = Math.max(0, Math.min(20000, props.rate));
  let feedback = Math.max(-0.999, Math.min(0.999, props.feedback));
  let depth = Math.max(1, Math.min(20, props.depth));

  return el.delay(
    {size: sr * depth / 1000},
    el.ms2samps(el.add(depth / 2, el.mul(depth / 2, el.triangle(rate)))),
    feedback,
    input,
  );
}


export function flanger(props, input) {
  invariant(typeof props === 'object' && typeof props.rate === 'number', 'rate must be specified as a number');
  invariant(typeof props === 'object' && typeof props.depth === 'number', 'depth must be specified as a number');
  invariant(typeof props === 'object' && typeof props.feedback === 'number', 'depth must be specified as a number');

  let wet = createNode(FlangerComposite, props, [input]);
  return el.mul(Math.sqrt(2) / 2, el.add(input, wet));
}
