const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Main Download Endpoint
app.get('/download', (req, res) => {
    const videoUrl = req.query.url;
    const format = req.query.format || 'mp4';
    const quality = req.query.quality || 'best';

    if (!videoUrl) return res.status(400).send('No URL provided');

    console.log(`[API] Processing: ${videoUrl} (Q: ${quality}, F: ${format})`);

    // Use a unique ID for this download to avoid server conflicts
    const downloadId = `dl_${Date.now()}`;
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    // Template for the final merged file on the server
    const outputPath = path.join(tempDir, `${downloadId}.%(ext)s`);

    // yt-dlp arguments for High-Quality (Video + Audio)
    let ytdlpArgs = [
        '--no-playlist',
        '--newline',
        '--no-part',
        '--restrict-filenames',
        '-o', outputPath
    ];

    if (format === 'mp3') {
        ytdlpArgs.push('-f', 'bestaudio/best', '--extract-audio', '--audio-format', 'mp3');
    } else {
        let resTarget = '';
        if (quality === '1080p') resTarget = '[height<=1080]';
        else if (quality === '720p') resTarget = '[height<=720]';
        else if (quality === '480p') resTarget = '[height<=480]';
        else if (quality === '360p') resTarget = '[height<=360]';
        
        // Force Video + Audio merging
        ytdlpArgs.push('-f', `bestvideo${resTarget}+bestaudio/best${resTarget}`);
        ytdlpArgs.push('--merge-output-format', format);
    }

    ytdlpArgs.push(videoUrl);

    // Spawn yt-dlp
    const ytdlp = spawn('yt-dlp', ytdlpArgs);

    ytdlp.stdout.on('data', (data) => console.log(`[Engine]: ${data}`));
    ytdlp.stderr.on('data', (data) => console.error(`[Engine Error]: ${data}`));

    ytdlp.on('close', (code) => {
        if (code === 0) {
            // Find the finished file (extension might have changed during merge)
            const files = fs.readdirSync(tempDir);
            const finishedFile = files.find(f => f.startsWith(downloadId));

            if (finishedFile) {
                const finalPath = path.join(tempDir, finishedFile);
                console.log(`[API] Sending high-quality file: ${finishedFile}`);

                // Send the file to the user
                res.download(finalPath, `video_${Date.now()}.${format}`, (err) => {
                    // Cleanup: Delete the server file after the user downloads it
                    try { fs.unlinkSync(finalPath); } catch (e) {}
                });
            } else {
                res.status(500).send('Merge error: File not found.');
            }
        } else {
            console.error(`[Error]: Engine collapsed with code ${code}`);
            res.status(500).send('yt-dlp engine error during high-quality merge.');
        }
    });

    req.on('close', () => {
        // If user cancels the download, try to kill the server process to save RAM
        ytdlp.kill();
    });
});

app.get('/status', (req, res) => res.json({ status: 'online', engine: 'yt-dlp' }));

app.listen(PORT, () => {
    console.log(`==========================================`);
    console.log(`   YT-DL Assist Private Cloud API       `);
    console.log(`   Running on port: ${PORT}             `);
    console.log(`==========================================`);
});
