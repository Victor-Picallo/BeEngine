/**
 * Parser RSS 2.0 ligero (sin dependencias externas).
 */

function decodeEntities(s) {
  return String(s ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripHtml(html) {
  return decodeEntities(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  return m ? decodeEntities(m[1]).trim() : '';
}

function extractAttr(block, tag, attr) {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}=["']([^"']+)["']`, 'i');
  const m = block.match(re);
  return m ? m[1].trim() : '';
}

function extractMediaThumbnail(block) {
  const m = block.match(/<media:thumbnail\b[^>]*\burl=["']([^"']+)["']/i);
  return m ? m[1].trim() : '';
}

/**
 * @param {string} xml
 * @returns {Array<{ title: string, link: string, description: string, pubDate: string, creator: string, imageUrl: string | null, categories: string[] }>}
 */
export function parseRssItems(xml) {
  const items = [];
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const categories = [];
    const catRe = /<category[^>]*>([\s\S]*?)<\/category>/gi;
    let cm;
    while ((cm = catRe.exec(block))) {
      const c = stripHtml(cm[1]);
      if (c) categories.push(c);
    }

    const enclosureUrl = extractAttr(block, 'enclosure', 'url');
    const imageUrl =
      (enclosureUrl && /\.(jpg|jpeg|png|webp|gif)/i.test(enclosureUrl) ? enclosureUrl : null) ||
      extractMediaThumbnail(block) ||
      null;

    items.push({
      title: stripHtml(extractTag(block, 'title')),
      link: extractTag(block, 'link'),
      description: stripHtml(extractTag(block, 'description')),
      pubDate: extractTag(block, 'pubDate'),
      creator: stripHtml(extractTag(block, 'dc:creator') || extractTag(block, 'author')),
      imageUrl,
      categories,
    });
  }
  return items;
}

export { stripHtml, decodeEntities };
