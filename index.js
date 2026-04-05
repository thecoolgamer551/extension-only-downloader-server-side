const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Main Download Endpoint
app.get('/download', (req, res) => {
    const videoUrl = req.query.url;
    const format = req.query.format || 'mp4';
    const quality = req.query.quality || 'best';

    if (!videoUrl) return res.status(400).send('No URL provided');

    console.log(`[API] Downloading: ${videoUrl} (Format: ${format})`);

    // Set headers for file streaming
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="video_${Date.now()}.${format}"`);

    // Construct yt-dlp arguments for piping to stdout
    let ytdlpArgs = [
        '-o', '-',              // Output to stdout
        '--newline',
        '--no-playlist',
        '--no-part',
        '--restrict-filenames'
    ];

    if (format === 'mp3') {
        ytdlpArgs.push('-f', 'bestaudio/best', '--extract-audio', '--audio-format', 'mp3');
    } else {
        let resTarget = '';
        if (quality === '1080p') resTarget = '[height<=1080]';
        else if (quality === '720p') resTarget = '[height<=720]';
        else if (quality === '480p') resTarget = '[height<=480]';
        else if (quality === '360p') resTarget = '[height<=360]';
        
        ytdlpArgs.push('-f', `bestvideo${resTarget}+bestaudio/best${resTarget}`);
        ytdlpArgs.push('--merge-output-format', format);
    }

    ytdlpArgs.push(videoUrl);

    // Spawn yt-dlp process
    const ytdlp = spawn('yt-dlp', ytdlpArgs);

    // Pipe stdout directly back to our user via HTTP
    ytdlp.stdout.pipe(res);

    // Error handling
    ytdlp.stderr.on('data', (data) => console.log(`[Engine]: ${data}`));
    
    ytdlp.on('close', (code) => {
        if (code !== 0) console.error(`[Error]: Engine exited with code ${code}`);
        res.end();
    });

    // Handle client disconnect during long downloads
    req.on('close', () => {
        console.log(`[API] Client disconnected. Terminating download...`);
        ytdlp.kill();
    });
});

app.get('/status', (req, res) => res.json({ status: 'online', engine: 'yt-dlp' }));

app.listen(PORT, () => {
    console.log(`==========================================`);
    echo `   YT-DL Assist Private Cloud API       `;
    console.log(`   Running on port: ${PORT}             `);
    console.log(`==========================================`);
});
