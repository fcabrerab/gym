// El carácter de la mascota (D-133): tres rasgos, de 0 a 1, que salen de su semilla (la misma semilla, el mismo
// carácter, siempre): curiosidad, pereza y juego. No deciden nada solos: cambian cuántas papeletas tiene cada cosa en el
// sorteo de qué hacer (pesosDe(), que usa el cerebro) y cuánto tarda en entrarle sueño (suenoDe()).
//
// Un rasgo nuevo: sacarlo en rasgosDe() al final (así los de antes no cambian), contarlo en describir() y usarlo en
// pesosDe() o en suenoDe(). Que se adapte a ti (la fase 3) será mover estos números poco a poco con lo que pase (cómo
// la tratas, tu ritmo), guardados en su ficha (memoria.js).

function azarDe(semilla) {
  // mulberry32, como en el prototipo: el mismo azar con la misma semilla
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// De 0,12 a 0,88, más a menudo cerca del medio (la media de dos sorteos), redondeado a centésimas.
export function rasgosDe(semilla) {
  const r = azarDe(semilla);
  const uno = () => Math.round((0.12 + 0.76 * ((r() + r()) / 2)) * 100) / 100;
  return { curiosidad: uno(), pereza: uno(), juego: uno() };
}

// Por cuánto multiplica cada cosa de PESOS (cerebro.js): la curiosa pasea y se asoma más; la juguetona salta y te
// mira más (y presume más de su trofeo); la perezosa se queda quieta, se sienta y se duerme más (y se queja un poco más
// de las agujetas).
export function pesosDe({ curiosidad = 0.5, pereza = 0.5, juego = 0.5 } = {}) {
  return {
    quieto: 0.7 + 0.6 * pereza,
    pasear: 0.55 + 0.9 * curiosidad,
    saltar: 0.4 + 1.2 * juego,
    sentarse: 0.6 + 0.8 * pereza,
    asomarse: 0.5 + curiosidad,
    desperezarse: 0.6 + 0.8 * pereza,
    rascarse: 0.8 + 0.4 * curiosidad,
    mirarte: 0.5 + juego,
    dormir: 0.6 + 0.8 * pereza,
    agujetas: 0.8 + 0.4 * pereza,
    presumir: 0.6 + 0.8 * juego,
  };
}

// Segundos sin que le pase nada hasta tener sueño del todo: a la perezosa, antes.
export function suenoDe({ pereza = 0.5 } = {}, base = 120) {
  return Math.round(base * (1.45 - 0.9 * pereza));
}

// Cómo es, en una frase, para su página de Ajustes: «Curiosa y juguetona; se duerme pronto.»
export function describir({ curiosidad = 0.5, pereza = 0.5, juego = 0.5 } = {}) {
  const como = [];
  if (curiosidad >= 0.6) como.push("curiosa");
  else if (curiosidad <= 0.4) como.push("tranquila");
  if (juego >= 0.6) como.push("juguetona");
  else if (juego <= 0.4) como.push("algo tímida");
  let frase = como.length ? como.join(" y ") : "de carácter equilibrado";
  frase = frase[0].toUpperCase() + frase.slice(1);
  const sueno = pereza >= 0.6 ? "se duerme pronto" : pereza <= 0.4 ? "le cuesta dormirse" : "";
  return `${frase}${sueno ? `; ${sueno}` : ""}.`;
}
