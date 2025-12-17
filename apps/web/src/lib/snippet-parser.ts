// Snippet Parser for Awin HTML
// Extracts click URL, image URL, and dimensions from affiliate HTML snippets

export interface ParsedSnippet {
  click_url?: string;
  image_url?: string;
  width?: number;
  height?: number;
}

export interface ParseResult {
  index: number;
  raw: string;
  parsed: ParsedSnippet | null;
  error?: string;
}

/**
 * Parse a single Awin HTML snippet to extract URLs and dimensions
 * Example input: <a href="https://www.awin1.com/cread.php?..."><img src="..." width="300" height="250"></a>
 */
export function parseAwinSnippet(html: string): ParsedSnippet | null {
  if (!html?.trim()) {
    return null;
  }

  const result: ParsedSnippet = {};

  // Extract href from <a> tag
  const hrefMatch = html.match(/href=["']([^"']+)["']/i);
  if (hrefMatch?.[1]) {
    result.click_url = hrefMatch[1];
  }

  // Extract src from <img> tag
  const srcMatch = html.match(/src=["']([^"']+)["']/i);
  if (srcMatch?.[1]) {
    result.image_url = srcMatch[1];
  }

  // Extract width from <img> tag
  const widthMatch = html.match(/width=["']?(\d+)["']?/i);
  if (widthMatch?.[1]) {
    result.width = parseInt(widthMatch[1], 10);
  }

  // Extract height from <img> tag
  const heightMatch = html.match(/height=["']?(\d+)["']?/i);
  if (heightMatch?.[1]) {
    result.height = parseInt(heightMatch[1], 10);
  }

  // Return null if we couldn't extract the essential click_url
  if (!result.click_url) {
    return null;
  }

  return result;
}

/**
 * Parse multiple HTML snippets from text
 * Handles multi-line Awin snippets by splitting on </a> tags
 * Returns results with index, raw content, parsed data, and any errors
 */
export function parseSnippets(text: string): ParseResult[] {
  if (!text?.trim()) {
    return [];
  }

  // Remove HTML comments (like Awin's START/END ADVERTISER comments)
  const cleaned = text.replace(/<!--[\s\S]*?-->/g, '');

  // Split by </a> to get individual snippets, then add </a> back
  const blocks = cleaned
    .split('</a>')
    .map((block) => block.trim())
    .filter((block) => block.includes('<a'))  // Must have opening <a> tag
    .map((block) => block + '</a>');  // Add closing tag back

  return blocks.map((raw, index) => {
    const parsed = parseAwinSnippet(raw);

    if (!parsed) {
      return {
        index,
        raw,
        parsed: null,
        error: 'Could not parse snippet - missing click URL',
      };
    }

    if (!parsed.image_url) {
      return {
        index,
        raw,
        parsed,
        error: 'Warning: No image URL found',
      };
    }

    return {
      index,
      raw,
      parsed,
    };
  });
}

/**
 * Generate a creative name from parsed dimensions
 */
export function generateCreativeName(parsed: ParsedSnippet): string {
  if (parsed.width && parsed.height) {
    return `${parsed.width}x${parsed.height} Banner`;
  }
  return 'Imported Banner';
}
