import invariant from 'invariant';
import { el } from '@elemaudio/core';


export function bitcrush(props, input) {
  invariant(typeof props === 'object' && typeof props.bitDepth === 'number', 'bitDepth must be specified as a number');

  const hasKey = props.hasOwnProperty('key') &&
    typeof props.key === 'string' &&
    props.key.length > 0;

  let bitDepth = props.bitDepth;
  let b = Math.round(Math.max(3, Math.min(16, bitDepth)));

  let quant = Math.pow(2, b - 1);
  let dequant = 1.0 / quant;
  let round = (x) => el.floor(el.add(0.5, x));

  if (hasKey) {
    // Careful not to smooth these constants to ensure that the gain relationship stays perfect,
    // otherwise we leave the door open for potential big spikes when dragging a slider.
    quant = el.const({key: `${props.key}:quant`, value: quant});
    dequant = el.const({key: `${props.key}:dequant`, value: dequant});
  }

  return el.mul(dequant, round(el.mul(quant, input)));
}
