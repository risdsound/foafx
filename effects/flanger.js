import invariant from 'invariant';
import { el, createNode } from '@elemaudio/core';


function FlangerComposite({props, context, children}) {
  let sr = context.sampleRate;
  let input = children[0];

  let rate = Math.max(0.001, Math.min(4, props.rate));
  let feedback = Math.max(-0.999, Math.min(0.999, props.feedback));
  let depth = Math.max(0.001, Math.min(7, props.depth));

  const hasKey = props.hasOwnProperty('key') &&
    typeof props.key === 'string' &&
    props.key.length > 0;

  if (hasKey) {
    rate = el.sm(el.const({key: `${props.key}:rate`, value: rate}));
    feedback = el.sm(el.const({key: `${props.key}:feedback`, value: feedback}));
    depth = el.sm(el.const({key: `${props.key}:depth`, value: depth}));
  }

  return el.delay(
    {size: sr * 21 / 1000},
    el.ms2samps(el.add(el.mul(depth, 0.5), el.mul(0.5, depth, el.triangle(rate)))),
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
