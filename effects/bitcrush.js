import { el } from '@elemaudio/core';


export function bitcrush(props, input) {
  let bitDepth = props.bitDepth;
  let b = Math.round(Math.max(1, Math.min(16, bitDepth)));

  let quant = 0.5 * Math.pow(2, b);
  let dequant = 1.0 / quant;

  return el.mul(dequant, el.floor(el.mul(quant, input)));
}
