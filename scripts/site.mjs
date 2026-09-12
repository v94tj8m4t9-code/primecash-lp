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
  title: 'PrimeCash | Gestão Financeira e Pagamentos para Saúde',
  description: 'Pagamentos, gestão financeira, emissão de notas fiscais e cobranças recorrentes para profissionais e estabelecimentos de saúde, bem-estar e performance.',
  keywords: 'gestão financeira para clínicas, pagamentos para clínicas, pagamento para profissionais de saúde, cobrança de pacientes, emissão de notas fiscais para clínicas, cobrança recorrente, cobrar pacientes pelo WhatsApp, link de pagamento para clínicas, Bolepix, Pix para clínicas',
};

const faq = [
  ['Como funciona o link de pagamento para profissionais e clínicas de saúde?', 'O profissional ou a clínica gera uma cobrança e envia o link ao paciente. O pagamento pode ser concluído pelas formas disponíveis para aquela operação.'],
  ['É possível realizar cobranças pelo WhatsApp?', 'Sim. A cobrança pode ser enviada pelo WhatsApp por meio de um link de pagamento, reduzindo etapas e permitindo a conclusão à distância.'],
  ['Quais formas de pagamento a PrimeCash disponibiliza?', 'A PrimeCash disponibiliza pagamentos por Pix, boleto, cartão e Bolepix, conforme as funcionalidades habilitadas para cada operação.'],
  ['A PrimeCash atende clínicas odontológicas?', 'Sim. A PrimeCash atende clínicas odontológicas que desejam organizar cobranças e recebimentos de consultas, tratamentos e procedimentos.'],
  ['A PrimeCash atende clínicas de estética?', 'Sim. Clínicas e profissionais de estética podem utilizar a solução em cobranças relacionadas a avaliações, procedimentos, protocolos e outros serviços.'],
  ['A PrimeCash atende consultórios e operações de menor porte?', 'Sim. Nossa equipe avalia o processo atual de cobrança e recebimento para entender como a plataforma pode ajudar cada operação.'],
  ['É necessário substituir a maquininha atual para utilizar a PrimeCash?', 'Não. A PrimeCash pode complementar o processo atual de recebimento, de acordo com as necessidades apresentadas na demonstração.'],
  ['O paciente precisa se deslocar até a clínica exclusivamente para realizar o pagamento?', 'Não. Nas cobranças remotas, o paciente pode concluir o pagamento à distância por meio de um link.'],
  ['Como funcionam as taxas da PrimeCash?', 'As condições comerciais dependem das características e formas de pagamento da operação. Fale com nosso time para conhecer as condições aplicáveis à sua clínica.'],
  ['É possível emitir notas fiscais pela plataforma?', 'Sim. A plataforma permite emitir notas fiscais da empresa do profissional ou da clínica, conforme as funcionalidades habilitadas.'],
  ['Como funciona a cobrança recorrente para os clientes ou pacientes do profissional?', 'A plataforma permite configurar cobranças recorrentes e acompanhar os recebimentos em um único ambiente.'],
  ['Como funcionam as mensagens automáticas de cobrança pelo WhatsApp?', 'O profissional ou a clínica configura mensagens automáticas e recorrentes de cobrança para reduzir o acompanhamento manual.'],
  ['Como solicitar uma demonstração da plataforma?', 'Clique em “Falar com especialista” e converse com nossa equipe pelo WhatsApp.'],
];

const objectiveHeaderCss = `<style id="primecash-objective-header">
nav [data-framer-name="Taxas"],
nav [data-framer-name="Por que nós"],
nav [data-framer-name="Denúncias"],
nav div:has(> p > a[href$="#porque-nos-escolher"]),
nav div:has(> p > a[href$="/denúncias"]),
nav a[href$="#porque-nos-escolher"],
nav a[href$="/denúncias"],
nav [data-framer-name^="Frame 11"] { display: none !important; }

/* Remove os pequenos rótulos editoriais com barras, preservando a hierarquia
   visual dos títulos principais. */
[data-framer-component-type="RichTextContainer"][data-framer-name^="//"]:not([data-framer-name^="//0"]) {
  display: none !important;
}

/* Mantém os títulos longos dentro da grade e com respiro lateral consistente. */
section#benefícios .framer-1webh70,
section#benefícios .framer-a2qgkb,
section#duvidas-frequentes .framer-nf0qb2,
section#duvidas-frequentes .framer-1p1jkfc {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
}
section#benefícios .framer-a2qgkb h2,
section#duvidas-frequentes .framer-1p1jkfc h2 {
  width: 100% !important;
  max-width: 100% !important;
  text-align: center !important;
  white-space: normal !important;
  overflow-wrap: anywhere;
  font-size: clamp(34px, 3.25vw, 46px) !important;
  line-height: 1.08 !important;
}

/* Faz o texto de apoio da jornada ocupar duas linhas em telas amplas. */
.framer-1kgpchj .framer-1iscmbg {
  width: min(880px, 100%) !important;
  max-width: 880px !important;
  flex: 0 0 auto !important;
}
.framer-1kgpchj .framer-1iscmbg p {
  width: 100% !important;
  white-space: normal !important;
  line-height: 1.45 !important;
}

/* Evita que os textos dos cartões comerciais avancem para fora do card. */
.framer-1xfqg3x,
.framer-1xfqg3x .framer-1k2c19q,
.framer-1xfqg3x .framer-v2y9j3,
.framer-1xfqg3x .framer-11gw34l,
.framer-1xfqg3x [data-framer-component-type="RichTextContainer"] {
  min-width: 0 !important;
  max-width: 100% !important;
}
.framer-1xfqg3x p,
.framer-1xfqg3x h5 {
  white-space: normal !important;
  overflow-wrap: anywhere;
  text-align: left !important;
}

@media (max-width: 809.98px) {
  section#benefícios .framer-a2qgkb h2 {
    font-size: clamp(27px, 7.4vw, 32px) !important;
  }
  section#duvidas-frequentes .framer-1p1jkfc h2 {
    font-size: 18px !important;
    line-height: 1.2 !important;
    text-wrap: balance;
  }
  section#duvidas-frequentes .framer-nf0qb2 {
    width: calc(100% + 40px) !important;
    max-width: none !important;
    margin-left: -20px !important;
  }
  .framer-1kgpchj .framer-1iscmbg {
    width: 100% !important;
  }
}
</style>`;

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
  text = text.replace('</head>', `\n    ${objectiveHeaderCss}\n</head>`);
  text = text.replaceAll('href="./politicas-de-compliance"', 'href="./politica-de-privacidade/"');
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
    if (filename.endsWith('script_main.AudskF4-.mjs')) {
      text = text.replace('href:{webPageId:`zLAl9rMzp`},motionChild:!0,nodeId:`Rsup7r367`', 'href:`/politica-de-privacidade/`,motionChild:!0,nodeId:`Rsup7r367`');
    }
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
