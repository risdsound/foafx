import { el } from '@elemaudio/core';


export function delay(props, input) {
  let feedback = props.feedback;
  let delayTimeMs = props.delayTime;
  let delayTimeSamples = 44.1 * delayTimeMs;

  return el.delay({size: delayTimeSamples}, delayTimeSamples, feedback, input);
}
