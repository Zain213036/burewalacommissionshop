import { MANN_KG } from './format';

export function grossFromWeight(totalKg, rate, rateUnit) {
  const kg = Number(totalKg) || 0;
  const r = Number(rate) || 0;
  if (rateUnit === 'kg') return Math.round(kg * r);
  if (rateUnit === '100kg') return Math.round((kg / 100) * r);
  return Math.round((kg / MANN_KG) * r); // per mann (default)
}

export function chargeAmount(method, value, ctx) {
  // ctx: { gross, bags, mannQty }
  const v = Number(value) || 0;
  if (method === 'pct') return Math.round((ctx.gross * v) / 100);
  if (method === 'perBag') return Math.round((Number(ctx.bags) || 0) * v);
  if (method === 'perMann') return Math.round((ctx.mannQty || 0) * v);
  return Math.round(v); // flat
}

export function kaatAmount(kaat, rate, rateUnit) {
  // kaat: { kg, amount } — either weight-based (reduces weight before calc) or flat Rs
  if (!kaat) return { kaatKg: 0, kaatRs: 0 };
  const kaatKg = Number(kaat.kg) || 0;
  const kaatRs = Number(kaat.amount) || 0;
  return { kaatKg, kaatRs };
}

export function commissionAmount(method, value, gross, mannQty) {
  const v = Number(value) || 0;
  if (!method || method === 'none') return 0;
  if (method === 'pct') return Math.round((gross * v) / 100);
  if (method === 'perMann') return Math.round((Number(mannQty) || 0) * v);
  return Math.round(v); // flat / lump-sum
}
