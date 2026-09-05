import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

const source = resolve('content');
const output = resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp4': 'video/mp4' };

const htmlEscape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const htmlDecode = text => text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
  if (entity.startsWith('#x')) return String.fromCodePoint(parseInt(entity.slice(2), 16));
  if (entity.startsWith('#')) return String.fromCodePoint(Number(entity.slice(1)));
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' }[entity] ?? match;
});

const seo = {
  title: 'PrimeCash | Pagamentos para Clínicas e Profissionais de Saúde',
  description: 'Organize cobranças e recebimentos da sua clínica com Pix, cartão e link de pagamento. PrimeCash para saúde, bem-estar e performance.',
  keywords: 'pagamentos para clínicas, pagamento para profissionais de saúde, cobrança de pacientes, recebimentos para clínicas, link de pagamento para clínicas, pagamento para clínica odontológica, gestão de recebimentos, cobrar pacientes pelo WhatsApp, parcelamento de tratamentos, pagamentos para clínica de estética, sistema de cobrança para clínicas',
};

const faq = [
  ['Como funciona o link de pagamento para clínicas?', 'A clínica pode gerar uma cobrança e enviar o link ao paciente por um canal como WhatsApp. O paciente acessa o link e conclui o pagamento utilizando as formas disponíveis para aquela operação.'],
  ['Posso cobrar um paciente pelo WhatsApp?', 'Sim. Com o link de pagamento, a cobrança pode ser enviada pelo WhatsApp, permitindo que o paciente conclua o processo à distância quando essa modalidade estiver disponível para sua operação.'],
  ['Quais formas de pagamento a PrimeCash oferece?', 'A PrimeCash trabalha com formas de pagamento como Pix, cartão e link de pagamento, conforme as funcionalidades habilitadas para cada operação.'],
  ['A PrimeCash serve para clínicas odontológicas?', 'A PrimeCash pode atender clínicas odontológicas que recebem por consultas, tratamentos e procedimentos e buscam uma forma mais organizada de realizar cobranças e acompanhar recebimentos.'],
  ['A PrimeCash serve para clínicas de estética?', 'Sim. Clínicas e profissionais de estética podem utilizar a solução para cobranças relacionadas a avaliações, procedimentos, protocolos e outros serviços compatíveis com a operação.'],
  ['Minha clínica é pequena. Faz sentido utilizar a PrimeCash?', 'O tamanho da clínica não é o único critério. O mais importante é entender como você realiza cobranças e recebimentos hoje e se existe espaço para tornar esse processo mais organizado. Nosso time pode avaliar isso com você em uma demonstração.'],
  ['Preciso abandonar minha maquininha para usar a PrimeCash?', 'Não necessariamente. Na demonstração, nosso time pode entender sua operação atual e apresentar onde as funcionalidades da PrimeCash podem complementar seu processo de recebimento.'],
  ['O paciente precisa voltar à clínica somente para pagar?', 'Em cobranças que podem ser realizadas remotamente, um link de pagamento permite que o paciente conclua o processo à distância, sem precisar retornar apenas para efetuar o pagamento.'],
  ['Como funcionam as taxas da PrimeCash?', 'As condições comerciais dependem das características e formas de pagamento da operação. Fale com nosso time para conhecer as condições aplicáveis à sua clínica.'],
  ['Como solicitar uma demonstração da PrimeCash?', 'Clique em “Quero ver como funciona” e converse com nosso time pelo WhatsApp. Vamos entender sua operação e apresentar as funcionalidades disponíveis.'],
];

function applySeo(text, filename) {
  if (resolve(filename) !== resolve('content/index.html')) return text;
  const attr = value => htmlEscape(value).replaceAll('"', '&quot;');
  text = text.replace(/<title>[\s\S]*?<\/title>/i, `<title>${htmlEscape(seo.title)}</title>`);
  const setMeta = (key, value, property = false) => {
    const attribute = property ? 'property' : 'name';
    const pattern = new RegExp(`<meta\\s+${attribute}="${key}"\\s+content="[^"]*">`, 'i');
    const tag = `<meta ${attribute}="${key}" content="${attr(value)}">`;
    text = pattern.test(text) ? text.replace(pattern, tag) : text.replace('</head>', `\n    ${tag}\n</head>`);
  };
  setMeta('description', seo.description);
  setMeta('keywords', seo.keywords);
  setMeta('og:title', seo.title, true);
  setMeta('og:description', seo.description, true);
  setMeta('og:site_name', 'PrimeCash', true);
  setMeta('twitter:title', seo.title);
  setMeta('twitter:description', seo.description);
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(([name, text]) => ({
      '@type': 'Question',
      name,
      acceptedAnswer: { '@type': 'Answer', text },
    })),
  }).replaceAll('<', '\\u003c');
  const title = JSON.stringify(seo.title).replaceAll('<', '\\u003c');
  const titleGuard = `<script id="primecash-seo-title">(()=>{const title=${title};const apply=()=>{if(document.title!==title)document.title=title};apply();new MutationObserver(apply).observe(document.documentElement,{subtree:true,childList:true,characterData:true});window.addEventListener('load',apply);[0,100,500,1500,3000].forEach(delay=>setTimeout(apply,delay))})()</script>`;
  text = text.replace('</head>', `\n    <script id="primecash-faq-schema" type="application/ld+json">${schema}</script>\n</head>`);
  text = text.replace('</body>', `\n    ${titleGuard}\n</body>`);
  return text;
}

export async function applyCopy(body, filename, changes) {
  if (!changes.size || !['.html', '.mjs', '.js'].includes(extname(filename))) return body;
  let text = body.toString('utf8');
  if (extname(filename) === '.html') {
    // Retain the original rolling animation markup and styles, changing only its letters.
    text = text.replace(/(<p\b[^>]*class="rolling-text-inner-[^"]+"[^>]*>)([\s\S]*?)(<\/p>)/g, (match, open, children, close) => {
      const spans = [...children.matchAll(/<span([^>]*)>([^<]*)<\/span>/g)];
      if (!spans.length) return match;
      const label = spans.map(span => htmlDecode(span[2])).join('').replaceAll('\u00a0', ' ');
      const replacement = changes.get(label);
      if (replacement === undefined) return match;
      return open + [...replacement].map(char => '<span' + spans[0][1] + '>' + htmlEscape(char === ' ' ? '\u00a0' : char) + '</span>').join('') + close;
    });
    text = text.replace(/((?:href|content|data-framer-name|alt|aria-label)=")([^"]*)(")/g, (match, open, value, close) => {
      const replacement = changes.get(htmlDecode(value));
      return replacement === undefined ? match : open + htmlEscape(replacement).replaceAll('"', '&quot;') + close;
    });
    text = text.replaceAll('./#rewards', './#porque-nos-escolher');
    text = text.replace(/data-framer-name="[^"]*(?:dropshipping|infoprodutos|e-commerces|negócios digitais)[^"]*"/gi, 'data-framer-name="Sobre a PrimeCash"');
    text = text.replace(/>([^<>]+)</g, (match, value) => {
      const replacement = changes.get(htmlDecode(value));
      return replacement === undefined ? match : '>' + htmlEscape(replacement) + '<';
    });
  } else {
    // Parse string values without evaluating any captured page code.
    const ts = await import('typescript');
    const tree = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const edits = [];
    const visit = node => {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        let replacement = changes.get(node.text);
        if (replacement === undefined && filename.endsWith('shared-lib.B6vMpNKW.mjs') && node.text === 'PrimeCash') replacement = seo.title;
        if (replacement !== undefined) edits.push({ start: node.getStart(tree), end: node.end, replacement: JSON.stringify(replacement) });
        else if (/(?:dropshipping|infoprodutos|e-commerces|negócios digitais)/i.test(node.text)) edits.push({ start: node.getStart(tree), end: node.end, replacement: JSON.stringify('Sobre a PrimeCash') });
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
    for (const edit of edits.sort((a, b) => b.start - a.start)) text = text.slice(0, edit.start) + edit.replacement + text.slice(edit.end);
  }
  if (extname(filename) === '.html') text = applySeo(text, filename);
  return Buffer.from(text);
}

async function changes() {
  const copy = JSON.parse(await readFile('copy.json', 'utf8'));
  return new Map(copy.filter(entry => entry.original !== entry.texto).map(entry => [entry.original, entry.texto]));
}

async function copy(directory, destination, replacements) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const input = join(directory, entry.name), target = join(destination, entry.name);
    if (entry.isDirectory()) await copy(input, target, replacements);
    else await writeFile(target, await applyCopy(await readFile(input), input, replacements));
  }
}

if (process.argv.includes('build')) {
  await copy(source, output, await changes());
  console.log('PrimeCash: original document, styles, fonts, images and runtime copied to dist.');
} else if (!process.argv.includes('verify')) {
  createServer(async (request, response) => {
    try {
      let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      else if (!extname(pathname)) pathname += '/index.html';
      const file = resolve(source, '.' + pathname);
      if (!file.startsWith(source + sep)) { response.writeHead(403); response.end(); return; }
      const body = await applyCopy(await readFile(file), file, await changes());
      response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      response.end(body);
    } catch { response.writeHead(404); response.end('Not found'); }
  }).listen(5173, '127.0.0.1', () => console.log('  Local: http://127.0.0.1:5173/'));
}
