import invariant from 'invariant';
import { el } from '@elemaudio/core';


export function gain(props, input) {
  invariant(typeof props === 'object' && typeof props.gainDecibels === 'number', 'gainDecibels must be specified as a number');

  let db2gain = (db) => Math.pow(10, db / 20);
  let gain = db2gain(Math.max(-96, Math.min(12, props.gainDecibels)));

  const hasKey = props.hasOwnProperty('key') &&
    typeof props.key === 'string' &&
    props.key.length > 0;

  if (hasKey) {
    gain = el.sm(el.const({key: props.key, value: gain}));
  }

  return el.mul(input, gain);
}
