import invariant from 'invariant';
import { el } from '@elemaudio/core';


export function distortion(props, input) {
  invariant(typeof props === 'object' && typeof props.inputGain === 'number', 'inputGain must be specified as a number');
  invariant(typeof props === 'object' && typeof props.outputGain === 'number', 'outputGain must be specified as a number');

  let db2gain = (db) => Math.pow(10, db / 20);

  let inputGain = db2gain(Math.max(-32, Math.min(32, props.inputGain)));
  let outputGain = db2gain(Math.max(-12, Math.min(12, props.outputGain)));
  let env = el.env(el.tau2pole(0.01), el.tau2pole(0.01), input);

  // A quick trick for "close enough" gain compensation here
  if (props.inputGain > 0) {
    outputGain *= db2gain(-0.5 * Math.max(-32, Math.min(32, props.inputGain)));
  }

  const hasKey = props.hasOwnProperty('key') &&
    typeof props.key === 'string' &&
    props.key.length > 0;

  if (hasKey) {
    inputGain = el.sm(el.const({key: `${props.key}:ig`, value: inputGain}));
    outputGain = el.sm(el.const({key: `${props.key}:og`, value: outputGain}));
  }

  return el.dcblock(
    el.mul(
      outputGain,
      el.tanh(
        el.add(
          env,
          el.mul(input, inputGain),
        ),
      ),
    ),
  );
}
