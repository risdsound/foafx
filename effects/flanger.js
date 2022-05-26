import { el, createNode } from '@elemaudio/core';


function FlangerComposite({props, context, children}) {
  let sr = context.sampleRate;
  let input = children[0];
  let rate = props.rate;
  let feedback = props.feedback;
  let depth = Math.max(1, Math.min(20, props.depth));

  return el.delay(
    {size: sr * depth / 1000},
    el.ms2samps(el.add(depth / 2, el.mul(depth / 2, el.triangle(rate)))),
    feedback,
    input,
  );
}


export function flanger(props, input) {
  let rate = props.rate;
  let depth = props.depth;
  let feedback = props.feedback;

  let wet = createNode(FlangerComposite, props, [input]);

  return el.mul(Math.sqrt(2) / 2, el.add(input, wet));
}
