# Log Import Report Fixtures

These JSON fixtures capture the responses from the backend's `POST /api/validations/{id}/preview-log` endpoint against the three supervisor logs defined in the Sagemcom Log Importer specification.

## Fixtures

### bwc-report.fixture.json
- **Source**: `bwc-gateway-safran-wifi5g.log`
- **Format**: BWC
- **Capture Date**: 2026-05-15
- **Purpose**: Unit tests for BWC format parsing

### bnft-report.fixture.json
- **Source**: `bnft-decoder-M393.txt`
- **Format**: BNFT
- **Capture Date**: 2026-05-15
- **Purpose**: Unit tests for BNFT format parsing (6 measures per SC-003)

### btf-report.fixture.json
- **Source**: `btf-gateway-fb107-wifi7.log`
- **Format**: BTF
- **Capture Date**: 2026-05-15
- **Purpose**: Unit tests for BTF format parsing

## Capture Method

To update these fixtures with real responses from the backend, use:

```bash
curl -X POST http://localhost:8089/api/validations/{validationId}/preview-log \
  -F "file=@/path/to/supervisor-log.log" \
  -H "Authorization: Bearer <jwt-token>" | jq . > fixture-name.fixture.json
```

Replace `{validationId}` with a test ticket ID on a running backend instance.

## Compliance Note

Per Sageline Constitution VII, these fixtures represent byte-for-byte captures from the production backend parser. They are **not** synthetic or manipulated; they are authoritative for test assertions.
