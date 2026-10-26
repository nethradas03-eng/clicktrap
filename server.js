/**
 * ClickTrap - Local Web Scanner Server
 * Lightweight, zero-dependency Node.js server that allows scanning any website directly from the web dashboard.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const Rules = require('./rules.js');
const DetectorEngine = require('./detector.js');
const { parseHtmlToMockDoc } = require('./test/dom-mock.js');

const PORT = process.env.PORT || 3000;
const detector = new DetectorEngine(Rules);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // CORS Headers so local extension or dashboard can communicate
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 1. API Endpoint: Scan URL
  if (pathname === '/api/scan' && (req.method === 'POST' || req.method === 'GET')) {
    let targetUrl = '';
    
    if (req.method === 'GET') {
      targetUrl = parsedUrl.query.url;
      await processScan(targetUrl, '', res);
    } else {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body || '{}');
          await processScan(data.url, data.html, res);
        } catch (e) {
          sendJson(res, 400, { error: 'Invalid JSON request payload' });
        }
      });
    }
    return;
  }

  // 2. Redirect root to dashboard
  let filePath = pathname === '/' ? '/dashboard/index.html' : pathname;
  filePath = path.join(__dirname, filePath);

  // Security check to avoid directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Access denied');
    return;
  }

  // Serve static files
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('File not found: ' + pathname);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

async function processScan(targetUrl, rawHtml, res) {
  let htmlToScan = rawHtml;

  if (!htmlToScan && targetUrl) {
    try {
      let formattedUrl = targetUrl.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
      }

      console.log(`[ClickTrap Server] Fetching: ${formattedUrl}`);
      const fetchResponse = await fetch(formattedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ClickTrap/1.0 DarkPatternDetector'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000)
      });

      if (!fetchResponse.ok) {
        sendJson(res, 400, { error: `Failed to fetch website (HTTP ${fetchResponse.status})` });
        return;
      }

      htmlToScan = await fetchResponse.text();
      targetUrl = formattedUrl;
    } catch (err) {
      console.error('[ClickTrap Server] Fetch error:', err.message);
      sendJson(res, 400, { error: 'Could not connect to URL: ' + err.message });
      return;
    }
  }

  if (!htmlToScan) {
    sendJson(res, 400, { error: 'No URL or HTML provided to scan' });
    return;
  }

  try {
    const doc = parseHtmlToMockDoc(htmlToScan);
    const report = detector.scanDocument(doc, targetUrl || 'pasted-html');

    // Clean report for JSON transport
    const cleanReport = {
      domain: report.domain,
      url: report.url,
      timestamp: report.timestamp,
      score: report.score,
      rawScore: report.rawScore,
      level: report.level,
      findingsCount: report.findingsCount,
      summary: report.summary,
      categoryDistribution: report.categoryDistribution,
      findings: report.findings.map(f => ({
        id: f.id,
        ruleId: f.ruleId,
        ruleName: f.ruleName,
        category: f.category,
        categoryName: f.categoryName,
        severity: f.severity,
        weight: f.weight,
        evidence: f.evidence,
        explanation: f.explanation,
        recommendedAction: f.recommendedAction
      }))
    };

    sendJson(res, 200, { success: true, report: cleanReport });
  } catch (err) {
    console.error('[ClickTrap Server] Detection error:', err);
    sendJson(res, 500, { error: 'Analysis failed: ' + err.message });
  }
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  CLICKTRAP WEB SCANNER SERVER RUNNING`);
  console.log(`  Access Dashboard: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});

module.exports = server;
