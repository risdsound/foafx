import { el } from '@elemaudio/core';


export function distortion(props, input) {
  let db2gain = (db) => Math.pow(10, db / 20);

  let inputGain = db2gain(props.inputGain);
  let outputGain = db2gain(props.outputGain);
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
