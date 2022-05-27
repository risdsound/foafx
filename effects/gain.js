import { el } from '@elemaudio/core';


export function gain(props, input) {
  let db2gain = (db) => Math.pow(10, db / 20);
  let gain = db2gain(props.gainDecibels);

  return el.mul(input, gain);
}
