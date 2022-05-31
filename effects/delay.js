import invariant from 'invariant';
import { el } from '@elemaudio/core';


export function delay(props, input) {
  invariant(typeof props === 'object' && typeof props.feedback === 'number', 'feedback must be specified as a number');
  invariant(typeof props === 'object' && typeof props.delayTime === 'number', 'delayTime must be specified as a number');

  let feedback = Math.max(0, Math.min(props.feedback, 0.999));
  let delayTimeMs = Math.max(0, Math.min(10000, props.delayTime));
  let delayTimeSamples = 44.1 * delayTimeMs;

  return el.delay({size: delayTimeSamples}, delayTimeSamples, feedback, input);
}
