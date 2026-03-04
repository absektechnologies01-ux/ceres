> ## Documentation Index
> Fetch the complete documentation index at: https://documentation.datalab.to/llms.txt
> Use this file to discover all available pages before exploring further.

# API Overview

> REST API reference for document conversion, form filling, and file management.

Datalab provides REST APIs for document conversion, structured extraction, form filling, and file management. All APIs use the same authentication and follow similar patterns.

<Note>
  For the simplest integration, use the [Python SDK](/docs/welcome/sdk). The SDK handles authentication, polling, and provides typed responses.
</Note>

## Authentication

All requests require an API key in the `X-API-Key` header:

```bash  theme={null}
curl -X POST https://www.datalab.to/api/v1/convert \
  -H "X-API-Key: YOUR_API_KEY" \
  -F "file=@document.pdf"
```

Get your API key from the [API Keys dashboard](https://www.datalab.to/app/keys).

## Request Pattern

All processing endpoints follow this pattern:

1. **Submit** a document for processing (returns immediately with a `request_id`)
2. **Poll** the status endpoint until processing completes
3. **Retrieve** results from the completed response

### Submit Request

```bash  theme={null}
POST /api/v1/{endpoint}
```

Response:

```json  theme={null}
{
  "success": true,
  "request_id": "abc123",
  "request_check_url": "https://www.datalab.to/api/v1/{endpoint}/abc123"
}
```

### Poll for Results

```bash  theme={null}
GET /api/v1/{endpoint}/{request_id}
```

Response while processing:

```json  theme={null}
{
  "status": "processing"
}
```

Response when complete:

```json  theme={null}
{
  "status": "complete",
  "success": true,
  ...results...
}
```

<Warning>
  Results are deleted from Datalab servers one hour after processing completes. Retrieve your results promptly.
</Warning>

## Document Conversion

Convert documents to Markdown, HTML, JSON, or chunks.

**Endpoint:** `POST /api/v1/convert`

### Request

```python  theme={null}
import requests

url = "https://www.datalab.to/api/v1/convert"
headers = {"X-API-Key": "YOUR_API_KEY"}

with open("document.pdf", "rb") as f:
    response = requests.post(
        url,
        files={"file": ("document.pdf", f, "application/pdf")},
        data={
            "output_format": "markdown",
            "mode": "balanced",
        },
        headers=headers
    )

data = response.json()
check_url = data["request_check_url"]
```

### Parameters

| Parameter                  | Type   | Default    | Description                                                                                                                    |
| -------------------------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `file`                     | file   | -          | Document file (multipart upload)                                                                                               |
| `file_url`                 | string | -          | URL to document (alternative to file upload)                                                                                   |
| `output_format`            | string | `markdown` | Output format: `markdown`, `html`, `json`, `chunks`                                                                            |
| `mode`                     | string | `balanced` | Processing mode: `fast`, `balanced`, `accurate`                                                                                |
| `max_pages`                | int    | -          | Maximum pages to process                                                                                                       |
| `page_range`               | string | -          | Specific pages (e.g., `"0-5,10"`, 0-indexed)                                                                                   |
| `paginate`                 | bool   | `false`    | Add page delimiters to output                                                                                                  |
| `skip_cache`               | bool   | `false`    | Skip cached results                                                                                                            |
| `disable_image_extraction` | bool   | `false`    | Don't extract images                                                                                                           |
| `disable_image_captions`   | bool   | `false`    | Don't generate image captions                                                                                                  |
| `save_checkpoint`          | bool   | `false`    | Save checkpoint for reuse                                                                                                      |
| `extras`                   | string | -          | Comma-separated: `track_changes`, `chart_understanding`, `extract_links`, `table_row_bboxes`, `infographic`, `new_block_types` |
| `add_block_ids`            | bool   | `false`    | Add block IDs to HTML for citations                                                                                            |
| `additional_config`        | string | -          | JSON with extra config options                                                                                                 |
| `webhook_url`              | string | -          | Override webhook URL for this request                                                                                          |

### Processing Modes

| Mode       | Description                                |
| ---------- | ------------------------------------------ |
| `fast`     | Lowest latency, good for simple documents  |
| `balanced` | Balance of speed and accuracy (default)    |
| `accurate` | Highest accuracy, best for complex layouts |

### Response

Poll `request_check_url` until `status` is `complete`:

```python  theme={null}
import time

while True:
    response = requests.get(check_url, headers=headers)
    result = response.json()

    if result["status"] == "complete":
        break
    time.sleep(2)

print(result["markdown"])
```

Response fields:

| Field                 | Type   | Description                              |
| --------------------- | ------ | ---------------------------------------- |
| `status`              | string | `processing`, `complete`, or `failed`    |
| `success`             | bool   | Whether conversion succeeded             |
| `markdown`            | string | Markdown output (if format is markdown)  |
| `html`                | string | HTML output (if format is html)          |
| `json`                | object | JSON output (if format is json)          |
| `chunks`              | object | Chunked output (if format is chunks)     |
| `images`              | object | Extracted images as `{filename: base64}` |
| `metadata`            | object | Document metadata                        |
| `page_count`          | int    | Number of pages processed                |
| `parse_quality_score` | float  | Quality score (0-5)                      |
| `cost_breakdown`      | object | Cost in cents                            |
| `error`               | string | Error message if failed                  |

<Note>
  For structured data extraction, see the [Extract endpoint](#structured-extraction). For document segmentation, see the [Segment endpoint](#document-segmentation).
</Note>

## Structured Extraction

Extract structured data from documents using a JSON schema.

**Endpoint:** `POST /api/v1/extract`

### Request

```python  theme={null}
import requests
import json

headers = {"X-API-Key": "YOUR_API_KEY"}

schema = {
    "invoice_number": {"type": "string", "description": "Invoice ID"},
    "total": {"type": "number", "description": "Total amount"},
    "line_items": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "description": {"type": "string"},
                "amount": {"type": "number"}
            }
        }
    }
}

response = requests.post(
    "https://www.datalab.to/api/v1/extract",
    files={"file": ("invoice.pdf", open("invoice.pdf", "rb"), "application/pdf")},
    data={
        "page_schema": json.dumps(schema),
        "mode": "balanced"
    },
    headers=headers
)

data = response.json()
check_url = data["request_check_url"]
```

### Parameters

| Parameter       | Type   | Default      | Description                                     |
| --------------- | ------ | ------------ | ----------------------------------------------- |
| `file`          | file   | -            | Document file (multipart upload)                |
| `file_url`      | string | -            | URL to document (alternative to file upload)    |
| `page_schema`   | string | **required** | JSON schema defining the data to extract        |
| `checkpoint_id` | string | -            | Reuse a previously saved checkpoint             |
| `mode`          | string | `balanced`   | Processing mode: `fast`, `balanced`, `accurate` |
| `output_format` | string | `markdown`   | Output format: `markdown`, `html`, `json`       |
| `max_pages`     | int    | -            | Maximum pages to process                        |
| `page_range`    | string | -            | Specific pages (e.g., `"0-5,10"`, 0-indexed)    |

The extracted data is returned in `extraction_schema_json` in the poll response.

See [Structured Extraction](/docs/recipes/structured-extraction/api-overview) for detailed examples.

## Document Segmentation

Segment documents into structured sections using a JSON schema.

**Endpoint:** `POST /api/v1/segment`

### Parameters

| Parameter             | Type   | Default      | Description                                     |
| --------------------- | ------ | ------------ | ----------------------------------------------- |
| `file`                | file   | -            | Document file (multipart upload)                |
| `file_url`            | string | -            | URL to document (alternative to file upload)    |
| `segmentation_schema` | string | **required** | JSON schema defining the segments to extract    |
| `checkpoint_id`       | string | -            | Reuse a previously saved checkpoint             |
| `mode`                | string | `balanced`   | Processing mode: `fast`, `balanced`, `accurate` |

See [Document Segmentation](/docs/recipes/structured-extraction/auto-segmentation) for detailed examples.

## Track Changes

Extract tracked changes (insertions and deletions) from DOCX files.

**Endpoint:** `POST /api/v1/track-changes`

```python  theme={null}
response = requests.post(
    "https://www.datalab.to/api/v1/track-changes",
    files={"file": ("document.docx", open("document.docx", "rb"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    headers=headers
)
```

See [Track Changes](/docs/recipes/extract-redlines-and-comments/track-changes-from-word-documents) for detailed examples.

## Custom Pipeline

<Note>This feature is currently in beta. The API may change.</Note>

Execute custom AI-powered pipelines generated from natural language descriptions.

**Endpoint:** `POST /api/v1/custom-pipeline`

See [Document Conversion](/docs/recipes/conversion/conversion-api-overview) for more details on processing modes and options.

## Form Filling

Fill forms in PDFs and images.

**Endpoint:** `POST /api/v1/fill`

### Request

```python  theme={null}
import json

field_data = {
    "full_name": {"value": "John Doe", "description": "Full legal name"},
    "date": {"value": "2024-01-15", "description": "Today's date"},
    "signature": {"value": "John Doe", "description": "Signature field"}
}

response = requests.post(
    "https://www.datalab.to/api/v1/fill",
    files={"file": ("form.pdf", open("form.pdf", "rb"), "application/pdf")},
    data={
        "field_data": json.dumps(field_data),
        "confidence_threshold": "0.5"
    },
    headers=headers
)
```

### Parameters

| Parameter              | Type   | Default | Description                           |
| ---------------------- | ------ | ------- | ------------------------------------- |
| `file`                 | file   | -       | Form file (PDF or image)              |
| `file_url`             | string | -       | URL to form                           |
| `field_data`           | string | -       | JSON mapping field names to values    |
| `context`              | string | -       | Additional context for field matching |
| `confidence_threshold` | float  | `0.5`   | Minimum confidence for matching (0-1) |
| `page_range`           | string | -       | Specific pages to process             |
| `skip_cache`           | bool   | `false` | Skip cached results                   |

### Field Data Format

```json  theme={null}
{
  "field_key": {
    "value": "The value to fill",
    "description": "Description to help match the field"
  }
}
```

### Response

| Field              | Type   | Description                     |
| ------------------ | ------ | ------------------------------- |
| `status`           | string | Processing status               |
| `success`          | bool   | Whether filling succeeded       |
| `output_format`    | string | `pdf` or `png`                  |
| `output_base64`    | string | Base64-encoded filled form      |
| `fields_filled`    | array  | Successfully filled field names |
| `fields_not_found` | array  | Unmatched field names           |
| `page_count`       | int    | Pages processed                 |
| `cost_breakdown`   | object | Cost details                    |

See [Form Filling](/docs/recipes/form-filling/form-filling-api-overview) for more examples.

## File Management

Upload and manage files for use in workflows.

### Upload File

**Step 1:** Request an upload URL

```bash  theme={null}
POST /api/v1/files/upload
Content-Type: application/json

{
  "filename": "document.pdf",
  "content_type": "application/pdf"
}
```

Response:

```json  theme={null}
{
  "file_id": 123,
  "upload_url": "https://...",
  "reference": "datalab://file-abc123"
}
```

**Step 2:** Upload directly to the presigned URL

```bash  theme={null}
PUT {upload_url}
Content-Type: application/pdf

<file contents>
```

**Step 3:** Confirm upload

```bash  theme={null}
GET /api/v1/files/{file_id}/confirm
```

### List Files

```bash  theme={null}
GET /api/v1/files?limit=50&offset=0
```

### Get File Metadata

```bash  theme={null}
GET /api/v1/files/{file_id}
```

### Get Download URL

```bash  theme={null}
GET /api/v1/files/{file_id}/download?expires_in=3600
```

### Delete File

```bash  theme={null}
DELETE /api/v1/files/{file_id}
```

See [File Management](/docs/recipes/file-management/file-upload-api) for detailed examples.

## Thumbnails

Generate page thumbnails from a previously processed document:

```bash  theme={null}
GET /api/v1/thumbnails/{lookup_key}?thumb_width=300&page_range=0-2
```

| Parameter     | Type   | Default   | Description                               |
| ------------- | ------ | --------- | ----------------------------------------- |
| `lookup_key`  | string | Required  | The request ID from a previous conversion |
| `thumb_width` | int    | 300       | Thumbnail width in pixels                 |
| `page_range`  | string | All pages | Pages to generate (e.g., `"0,2-4"`)       |

Response:

```json  theme={null}
{
  "success": true,
  "thumbnails": ["base64_encoded_jpg_1", "base64_encoded_jpg_2"]
}
```

Thumbnails are returned as base64-encoded JPG images.

## Create Document

Generate DOCX files from markdown with track changes support:

```bash  theme={null}
POST /api/v1/create-document
Content-Type: application/json

{
  "markdown": "# Title\n\nThis is <ins data-revision-author=\"Editor\">newly added</ins> text.",
  "output_format": "docx"
}
```

See [Create Document](/docs/recipes/create-document/create-document-api-overview) for detailed examples.

## Webhooks

Configure webhooks to receive notifications when processing completes instead of polling.

Set a default webhook URL in your [account settings](https://www.datalab.to/settings), or override per-request with the `webhook_url` parameter.

See [Webhooks](/platform/webhooks) for configuration details.

## Rate Limits

Default rate limits apply per API key. If you exceed limits, you'll receive a `429` response.

See [Rate Limits](/docs/common/limits) for details and how to request higher limits.

## Next Steps

<CardGroup cols={2}>
  <Card title="SDK Reference" icon="code" href="/docs/welcome/sdk">
    Use the Python SDK for a simpler integration with typed responses.
  </Card>

  <Card title="Webhooks" icon="bell" href="/platform/webhooks">
    Receive notifications when processing completes instead of polling.
  </Card>

  <Card title="API Limits" icon="gauge" href="/docs/common/limits">
    Understand file size limits, page limits, and rate limiting.
  </Card>

  <Card title="Document Conversion" icon="file-lines" href="/docs/recipes/conversion/conversion-api-overview">
    Detailed guide to converting documents to Markdown, HTML, or JSON.
  </Card>
</CardGroup>
