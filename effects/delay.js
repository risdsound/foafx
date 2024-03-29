import invariant from 'invariant';
import { el, createNode } from '@elemaudio/core';


function DelayComposite({props, context, children}) {
  let sr = context.sampleRate;
  let input = children[0];

  let feedback = Math.max(0, Math.min(props.feedback, 0.999));
  let delayTimeMs = Math.max(0.001, Math.min(5000, props.delayTime));

  const hasKey = props.hasOwnProperty('key') &&
    typeof props.key === 'string' &&
    props.key.length > 0;

  if (hasKey) {
    feedback = el.sm(el.const({key: `${props.key}:feedback`, value: feedback}));
    delayTimeMs = el.sm(el.const({key: `${props.key}:delayTime`, value: delayTimeMs}));
  }

  return el.delay({size: sr * 10 + 10}, el.ms2samps(delayTimeMs), feedback, input);
}

export function delay(props, input) {
  invariant(typeof props === 'object' && typeof props.feedback === 'number', 'feedback must be specified as a number');
  invariant(typeof props === 'object' && typeof props.delayTime === 'number', 'delayTime must be specified as a number');

  let wet = createNode(DelayComposite, props, [input]);
  return el.add(input, wet);
}
