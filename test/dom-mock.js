/**
 * ClickTrap - Lightweight HTML to DOM Tree Mock
 * Minimal, zero-dependency HTML parser for running unit tests and benchmarks in Node.js
 */

class MockNode {
  constructor(tagName = 'div', attributes = {}, text = '') {
    this.tagName = tagName.toUpperCase();
    this.attributes = attributes;
    this.children = [];
    this.parentElement = null;
    this.id = attributes.id || '';
    this.className = attributes.class || '';
    this._text = text;
    this.checked = attributes.checked !== undefined;
  }

  getAttribute(name) {
    return this.attributes[name] !== undefined ? this.attributes[name] : null;
  }

  get textContent() {
    let t = this._text;
    for (const c of this.children) {
      t += ' ' + c.textContent;
    }
    return t.trim();
  }

  get innerText() {
    return this.textContent;
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  querySelectorAll(selector) {
    const results = [];
    const selectors = selector.split(',').map(s => s.trim().toLowerCase());

    const matchesRule = (node, sel) => {
      // Attribute selector: e.g. [class*="cookie"], [id*="timer"], [role="dialog"], input[type="checkbox"][checked]
      if (sel.includes('[')) {
        const attrMatch = sel.match(/\[([a-zA-Z0-9_\-]+)([\*\^\$]?=)?(?:["']?([^"']*)["']?)?\]/);
        if (attrMatch) {
          const [, attrName, op, val] = attrMatch;
          const nodeVal = (node.getAttribute(attrName) || (attrName === 'checked' && node.checked ? 'checked' : '')).toLowerCase();
          if (!op && node.attributes[attrName] !== undefined) return true;
          if (op === '*=' && nodeVal.includes(val.toLowerCase())) return true;
          if (op === '=' && nodeVal === (val ? val.toLowerCase() : '')) return true;
        }
      }

      // ID selector: e.g. #cookie-consent
      if (sel.startsWith('#')) {
        return node.id.toLowerCase() === sel.slice(1);
      }

      // Class selector: e.g. .btn-accept, .timer
      if (sel.startsWith('.')) {
        const targetClass = sel.slice(1);
        return node.className.toLowerCase().split(/\s+/).includes(targetClass);
      }

      // Tag selector: e.g. button, a, div
      const tagOnly = sel.split(/[\.\[#]/)[0];
      if (tagOnly && node.tagName.toLowerCase() === tagOnly) {
        return true;
      }

      return false;
    };

    const traverse = (node) => {
      for (const child of node.children) {
        for (const sel of selectors) {
          if (matchesRule(child, sel)) {
            if (!results.includes(child)) {
              results.push(child);
            }
            break;
          }
        }
        traverse(child);
      }
    };

    traverse(this);
    return results;
  }

  querySelector(selector) {
    const res = this.querySelectorAll(selector);
    return res.length > 0 ? res[0] : null;
  }
}

/**
 * Minimal HTML String to Mock DOM Parser
 */
function parseHtmlToMockDoc(htmlString) {
  const root = new MockNode('BODY');
  const tagRegex = /<\/?([a-zA-Z0-9\-]+)([^>]*)>|([^<]+)/g;
  const stack = [root];

  let match;
  while ((match = tagRegex.exec(htmlString)) !== null) {
    const [full, tagName, rawAttrs, text] = match;

    if (text) {
      const cleanText = text.replace(/\s+/g, ' ').trim();
      if (cleanText && stack.length > 0) {
        stack[stack.length - 1]._text += ' ' + cleanText;
      }
    } else if (tagName) {
      const isClosing = full.startsWith('</');
      const isSelfClosing = full.endsWith('/>') || ['img', 'input', 'hr', 'br'].includes(tagName.toLowerCase());

      if (isClosing) {
        if (stack.length > 1 && stack[stack.length - 1].tagName.toLowerCase() === tagName.toLowerCase()) {
          stack.pop();
        }
      } else {
        // Parse attributes
        const attrs = {};
        const attrRegex = /([a-zA-Z0-9_\-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^>\s]+)))?/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
          const key = attrMatch[1].toLowerCase();
          const val = attrMatch[2] !== undefined ? attrMatch[2] :
                      attrMatch[3] !== undefined ? attrMatch[3] :
                      attrMatch[4] !== undefined ? attrMatch[4] : '';
          attrs[key] = val;
        }

        const newNode = new MockNode(tagName, attrs);
        stack[stack.length - 1].appendChild(newNode);

        if (!isSelfClosing) {
          stack.push(newNode);
        }
      }
    }
  }

  return {
    body: root,
    ownerDocument: null,
    defaultView: null,
    querySelectorAll: (sel) => root.querySelectorAll(sel),
    querySelector: (sel) => root.querySelector(sel)
  };
}

module.exports = {
  MockNode,
  parseHtmlToMockDoc
};
