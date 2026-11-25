// WorkDesk: оформление веб-клиента в цвета сайта workdesk.kz и заголовок «WorkDesk WEB» вместо «Web Client V2 (Preview)».
// Запускается из build-release.sh после git apply патча; меняет исходники RustDesk во временной папке сборки.
// Каждая точечная замена обязана найтись: если RustDesk поменял код (новый RUSTDESK_REF), сборка падает и замену нужно обновить.
//
//   node scripts/brand-workdesk.mjs <папка rustdesk>
//
// Палитра сайта (console/public/site.css): фирменный #4B2BE0, светлый фон #F6F4FE, светлая плашка #EEEAFD,
// рамки #E6E3F2; тёмная тема — фон #0F0D1A, поверхность #1A1729, плашка #242038, рамки #2D2945.
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2];
if (!root || !fs.existsSync(path.join(root, 'flutter', 'lib'))) {
  console.error('usage: node scripts/brand-workdesk.mjs <rustdesk checkout>');
  process.exit(1);
}
const lib = path.join(root, 'flutter', 'lib');

function exact(rel, pairs) {
  const file = path.join(lib, rel);
  let s = fs.readFileSync(file, 'utf8');
  for (const [from, to, times = 1] of pairs) {
    const n = s.split(from).length - 1;
    if (n !== times) throw new Error(`${rel}: «${from}» найдено ${n} раз, ожидалось ${times}`);
    s = s.split(from).join(to);
  }
  fs.writeFileSync(file, s);
}

// 1. Заголовок окна и вкладки браузера
exact('main.dart', [["'${bind.mainGetAppNameSync()} Web Client V2 (Preview)'", "'${bind.mainGetAppNameSync()} WEB'"]]);

// 2. Тема: цвета сайта
exact('common.dart', [
  ['static const Color grayBg = Color(0xFFEFEFF2);', 'static const Color grayBg = Color(0xFFEEEAFD);'],
  ['static const Color border = Color(0xFFCCCCCC);', 'static const Color border = Color(0xFFE6E3F2);'],
  ['static const Color idColor = Color(0xFF00B6F0);', 'static const Color idColor = Color(0xFF6A4CF0);'],
  ['static const Color hoverBorder = Color(0xFF999999);', 'static const Color hoverBorder = Color(0xFFB8AEF2);'],
  // светлая тема
  ['hoverColor: Color.fromARGB(255, 224, 224, 224),', 'hoverColor: Color(0xFFEEEAFD),'],
  ['    scaffoldBackgroundColor: Colors.white,', '    scaffoldBackgroundColor: Color(0xFFF6F4FE),'],
  // светлые рамки и подсветка (ColorThemeExtension.light)
  ['    border: Color(0xFFCCCCCC),', '    border: Color(0xFFE6E3F2),'],
  ['    border2: Color(0xFFBBBBBB),', '    border2: Color(0xFFD6D0EE),'],
  ['    highlight: Color(0xFFE5E5E5),', '    highlight: Color(0xFFEEEAFD),'],
  // тёмная тема
  ['hoverColor: Color.fromARGB(255, 45, 46, 53),', 'hoverColor: Color(0xFF242038),'],
  ['Color(0xFF18191E)', 'Color(0xFF0F0D1A)', 2],
  ['Color(0xFF24252B)', 'Color(0xFF1A1729)', 5],
  ['MaterialStatePropertyAll(Color(0xFF121212))', 'MaterialStatePropertyAll(Color(0xFF1A1729))'],
  ['    border: Color(0xFF555555),', '    border: Color(0xFF2D2945),'],
  ['    highlight: Color(0xFF3F3F3F),', '    highlight: Color(0xFF242038),'],
]);

// 3. Синий RustDesk везде в интерфейсе — фирменный фиолетовый
const BLUE = [
  ['0xFF0071FF', '0xFF4B2BE0'], ['0x770071FF', '0x774B2BE0'], ['0xAA0071FF', '0xAA4B2BE0'],
  ['0xFF2C8CFF', '0xFF4B2BE0'], ['0xFF0B6EFF', '0xFF4B2BE0'],
];
let files = 0;
let hits = 0;
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!e.name.endsWith('.dart')) continue;
    let s = fs.readFileSync(p, 'utf8');
    let changed = false;
    for (const [from, to] of BLUE) {
      const n = s.split(from).length - 1;
      if (n) { s = s.split(from).join(to); hits += n; changed = true; }
    }
    if (changed) { fs.writeFileSync(p, s); files++; }
  }
})(lib);
if (!hits) throw new Error('синий цвет RustDesk не найден ни в одном файле');
console.log(`brand-workdesk: заголовок WEB, тема сайта; синий заменен ${hits} раз в ${files} файлах`);
