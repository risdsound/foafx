import invariant from 'invariant';
import { el } from '@elemaudio/core';


export function gain(props, input) {
  invariant(typeof props === 'object' && typeof props.gainDecibels === 'number', 'gainDecibels must be specified as a number');

  let db2gain = (db) => Math.pow(10, db / 20);
  let gain = db2gain(Math.max(-32, Math.min(32, props.gainDecibels)));

  return el.mul(input, gain);
}
