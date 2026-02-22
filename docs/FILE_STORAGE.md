# File Storage & Results Management

MyCluster now supports persistent file storage for job results, enabling you to store, view, and download outputs from distributed jobs.

## Overview

When a job completes, result files are automatically stored on the server in a structured directory:

```
workspace/results/
├── {jobId1}/
│   ├── output.txt
│   ├── result.png
│   └── data.json
├── {jobId2}/
│   └── ...
└── ...
```

## Server Configuration

File storage is **enabled by default** when running the server. Configure it via CLI:

```bash
# Start server with default file storage (7 day retention, 1GB limit)
mycluster-server --port 3000

# Customize file storage settings
mycluster-server \
  --port 3000 \
  --file-storage true \
  --results-dir /var/mycluster/results \
  --file-max-age 14 \
  --file-max-size 2000
```

### CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `--file-storage` | `true` | Enable/disable file storage |
| `--results-dir` | `{dataDir}/results` | Directory for result files |
| `--file-max-age` | `7` | Maximum age in days before cleanup |
| `--file-max-size` | `1000` | Maximum total size in MB |

## API Reference

### Upload Files

Upload files for a job (multipart form data):

```bash
POST /api/agent/jobs/:jobId/files
Content-Type: multipart/form-data

Files: files[] (multiple files allowed)
```

Response:
```json
{
  "success": true,
  "files": [
    {
      "filename": "output.png",
      "type": "image",
      "size": 1024000,
      "url": "/api/results/job123/output.png"
    }
  ]
}
```

### List Files

Get all files for a job:

```bash
GET /api/results/:jobId
```

Response:
```json
{
  "success": true,
  "files": [
    {
      "filename": "output.txt",
      "path": "/var/mycluster/results/job123/output.txt",
      "type": "text",
      "size": 1024,
      "createdAt": "2026-02-22T10:30:00.000Z",
      "jobId": "job123"
    }
  ]
}
```

### Download File (Inline)

View file in browser:

```bash
GET /api/results/:jobId/:filename
```

### Download File (Attachment)

Force download:

```bash
GET /api/results/:jobId/:filename/download
```

### Delete Job Files

Delete all files for a job:

```bash
DELETE /api/results/:jobId
```

### Storage Stats

Get storage usage:

```bash
GET /api/results/stats
```

Response:
```json
{
  "success": true,
  "totalBytes": 10485760,
  "totalMB": 10.0,
  "fileCount": 42
}
```

## File Types

Supported file types with automatic detection:

| Type | Extensions |
|------|------------|
| `text` | .txt, .md, .json, .csv, .log |
| `image` | .png, .jpg, .jpeg, .gif, .webp, .bmp, .svg |
| `video` | .mp4, .avi, .mov, .webm |
| `audio` | .mp3, .wav, .ogg, .flac |
| `binary` | .pdf, .zip, .tar, .gz, others |

## GUI Results Viewer

Access the **Results** tab in the desktop GUI to:

- Browse completed jobs with result files
- Preview text, images, and JSON files
- Download result files
- Delete old results
- Monitor storage usage

## Automatic Cleanup

File storage includes automatic cleanup to prevent disk space exhaustion:

- **Scheduled cleanup**: Runs every 24 hours
- **Age-based**: Deletes files older than `maxAgeDays` (default: 7)
- **Size-based**: Warns when exceeding `maxSizeMB` (default: 1000)

Cleanup logs:
```
🧹 Cleaned up old job: job123 (1024.50 KB)
🕐 Running scheduled file cleanup...
⚠️ Storage exceeds limit (1250.75 MB > 1000 MB)
```

## Agent Integration

The agent automatically uploads files from the job output directory:

```python
# runner.py example
import os
import json

output_dir = os.environ.get('OUTPUT_DIR', './output')

# Generate output files
with open(f'{output_dir}/result.txt', 'w') as f:
    f.write('Job completed successfully!')

# Return file list in JSON result
result = {
    'stdout': '',
    'stderr': '',
    'exitCode': 0,
    'files': [
        {
            'path': f'{output_dir}/result.txt',
            'type': 'text',
            'size': 1024
        }
    ],
    'duration_ms': 1500
}

print(json.dumps(result))
```

## Example: Image Generation Job

Submit a job that generates images:

```python
# generate_image.py
from PIL import Image
import numpy as np

# Create a simple gradient image
img = np.zeros((512, 512, 3), dtype=np.uint8)
for i in range(512):
    img[i, :] = [i, 255-i, 128]

Image.fromarray(img).save('output/gradient.png')
print(json.dumps({
    'exitCode': 0,
    'files': [{'path': 'output/gradient.png', 'type': 'image'}]
}))
```

View the result in the GUI Results Viewer or download via API.

## Best Practices

1. **Set appropriate retention**: Adjust `--file-max-age` based on your needs
2. **Monitor storage**: Use `/api/results/stats` to track usage
3. **Clean up manually**: Delete job results after downloading if needed
4. **Use meaningful filenames**: Helps identify results in the GUI
5. **Compress large outputs**: Zip multiple files before upload

## Troubleshooting

**Files not being stored:**
- Ensure file storage is enabled (`--file-storage true`)
- Check `--results-dir` path is writable
- Verify server has disk space

**Upload fails:**
- Check file size (limit: 100MB per file, 50 files per request)
- Verify network connectivity
- Check server logs for errors

**Cleanup not running:**
- Cleanup runs 5 seconds after server start, then every 24 hours
- Check server console for cleanup logs
- Verify `--file-max-age` is not set too high
