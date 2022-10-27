import invariant from 'invariant';
import { el } from '@elemaudio/core';


export function bitcrush(props, input) {
  invariant(typeof props === 'object' && typeof props.bitDepth === 'number', 'bitDepth must be specified as a number');

  const hasKey = props.hasOwnProperty('key') &&
    typeof props.key === 'string' &&
    props.key.length > 0;

  let bitDepth = props.bitDepth;
  let b = Math.round(Math.max(2, Math.min(16, bitDepth)));

  let quant = 0.5 * Math.pow(2, b);
  let dequant = 1.0 / quant;

  if (hasKey) {
    quant = el.sm(el.const({key: `${props.key}:quant`, value: quant}));
    dequant = el.sm(el.const({key: `${props.key}:dequant`, value: dequant}));
  }

  return el.mul(dequant, el.floor(el.mul(quant, input)));
}
