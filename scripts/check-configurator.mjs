import assert from 'node:assert/strict';
import {findConfiguration} from '../app/lib/configurator.ts';

const variants = [
  {
    id: 'ivory-linen-2',
    availableForSale: true,
    selectedOptions: [
      {name: 'Color', value: 'Ivory'},
      {name: 'Material', value: 'Linen'},
      {name: 'Size', value: '2-seat'},
    ],
  },
  {
    id: 'charcoal-linen-2',
    availableForSale: false,
    selectedOptions: [
      {name: 'Color', value: 'Charcoal'},
      {name: 'Material', value: 'Linen'},
      {name: 'Size', value: '2-seat'},
    ],
  },
  {
    id: 'ivory-linen-3',
    availableForSale: true,
    selectedOptions: [
      {name: 'Color', value: 'Ivory'},
      {name: 'Material', value: 'Linen'},
      {name: 'Size', value: '3-seat'},
    ],
  },
];
const current = {Color: 'Ivory', Material: 'Linen', Size: '2-seat'};
assert.equal(
  findConfiguration(variants, current, 'Size', '3-seat')?.id,
  'ivory-linen-3',
);
assert.equal(
  findConfiguration(variants, current, 'Color', 'Charcoal')?.availableForSale,
  false,
);
assert.equal(
  findConfiguration(variants, current, 'Material', 'Boucle'),
  undefined,
);
assert.deepEqual(current, {Color: 'Ivory', Material: 'Linen', Size: '2-seat'});
console.log(
  'Configurator: option preservation, sold-out variants, missing combinations passed.',
);
