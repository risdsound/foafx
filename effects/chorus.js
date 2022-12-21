import invariant from 'invariant';
import { el, createNode } from '@elemaudio/core';


function ChorusComposite({props, context, children}) {
  let sr = context.sampleRate;
  let input = children[0];
  let rate = Math.max(0.001, Math.min(10, props.rate));
  let depth = Math.max(10, Math.min(30, props.depth));

  const hasKey = props.hasOwnProperty('key') &&
    typeof props.key === 'string' &&
    props.key.length > 0;

  if (hasKey) {
    rate = el.sm(el.const({key: `${props.key}:rate`, value: rate}));
    depth = el.sm(el.const({key: `${props.key}:depth`, value: depth}));
  }

  return el.delay(
    {size: sr * 100 / 1000},
    el.ms2samps(el.add(20, el.mul(depth, 0.5), el.mul(0.5, depth, el.triangle(rate)))),
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
