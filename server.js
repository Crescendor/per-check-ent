const http = require('http');
const fs = require('fs');
const path = require('path');

// Railway passes the port as an environment variable
const PORT = process.env.PORT || 3000;

// Supported MIME types
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.json': 'application/json'
};

const DB_DIR = fs.existsSync('/data') ? '/data' : '.';
const DB_PATH = path.join(DB_DIR, 'db.json');
const DEFAULT_DATA = {
    users: [],
    teams: [],
    leaders: [],
    logs: []
};

// Initialize database file if it does not exist
if (!fs.existsSync(DB_PATH)) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DATA, null, 2), 'utf8');
        console.log(`Created default database at ${DB_PATH}`);
    } catch (err) {
        console.error(`Failed to create database file at ${DB_PATH}:`, err);
    }
}

const server = http.createServer((req, res) => {
    // Intercept API routes for database persistence
    if (req.url === '/api/data') {
        if (req.method === 'GET') {
            fs.readFile(DB_PATH, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Veritabanı okunamadı' }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(data);
                }
            });
            return;
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    fs.writeFile(DB_PATH, JSON.stringify(parsed, null, 2), 'utf8', (err) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                            res.end(JSON.stringify({ error: 'Veritabanı kaydedilemedi' }));
                        } else {
                            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                            res.end(JSON.stringify({ success: true }));
                        }
                    });
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Geçersiz JSON verisi' }));
                }
            });
            return;
        }
    }

    // Determine the file path
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    // Strip query strings or hashes
    filePath = filePath.split('?')[0].split('#')[0];

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // If a file is not found, fallback to index.html (useful for SPA routing)
                fs.readFile('./index.html', (err, indexContent) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                        res.end('index.html dosyası yüklenirken hata oluştu.');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(indexContent, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(`Sunucu hatası: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Bind to 0.0.0.0 to make it accessible to external traffic on Railway
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Sunucu http://0.0.0.0:${PORT} adresinde aktif.`);
});
