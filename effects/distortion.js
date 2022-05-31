import invariant from 'invariant';
import { el } from '@elemaudio/core';


export function distortion(props, input) {
  invariant(typeof props === 'object' && typeof props.inputGain === 'number', 'inputGain must be specified as a number');
  invariant(typeof props === 'object' && typeof props.outputGain === 'number', 'outputGain must be specified as a number');

  let db2gain = (db) => Math.pow(10, db / 20);

  let inputGain = db2gain(Math.max(-32, Math.min(32, props.inputGain)));
  let outputGain = db2gain(Math.max(-32, Math.min(32, props.outputGain)));
  let env = el.env(el.tau2pole(0.01), el.tau2pole(0.01), input);

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
