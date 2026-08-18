# Large Attachment Upload and Malware-Scanning Research

## Direct browser uploads

Backblaze B2 supports an S3-compatible, server-generated presigned URL flow. The application server creates a short-lived URL, while the member browser performs the upload directly to B2 without receiving storage credentials. This avoids Base64 request inflation and Render request-body timeouts. Browser uploads require a bucket CORS rule allowing the deployed application origin to use `PUT`, `GET`, and `HEAD` with the required content-type header.

Backblaze describes presigned direct uploads to B2 and explains that CORS must allow the intended browser origin.[1] Amazon’s S3 documentation confirms that a presigned `PUT` URL gives the recipient upload capability without exposing the creator’s underlying credentials, and that the sent content type must match the signature.[2]

Backblaze permits standard individual files up to 5 GiB; files beyond that require a multipart large-file workflow. This release will therefore use one shared practical **1 GiB per attachment** limit for every format—image, video, document, archive, or quarantined executable—rather than a different limit by file type. The five-attachment limit per post remains in place.[5] [6]

## Malware screening boundary

VirusTotal private scanning requires a server-side API key and accepts normal uploads up to 32 MB; its large-file flow uses a one-time upload URL and accepts up to 650 MB. VirusTotal notes that files over 200 MB can be difficult for engines to inspect reliably.[3] [4] The public API is unsuitable for a commercial or community product, so the site must use a private-scanning plan or another server-side scanning service before claiming a completed antivirus integration.

The application now stores executable and script-like attachments under a dedicated `quarantine/` storage prefix and records `scanStatus = pending`. The post feed displays a locked **«قيد الفحص»** card rather than an image, video player, or download link; the protected attachment route also refuses every non-`clean` object. This means `.exe`, `.msi`, `.bat`, shell scripts, installers, and similar high-risk files can be uploaded under the same 1 GiB attachment limit but cannot be opened by members while awaiting a verdict.

The remaining activation step is intentionally separate: configure a server-only private-scanning credential such as `VIRUSTOTAL_API_KEY` in Render and connect a scanner worker that can retrieve quarantined objects privately, submit only files within the provider's supported size limit, then update each record to `clean` or `blocked`. Files larger than 650 MB must remain quarantined or use a scanner that explicitly supports their size; they must never be marked clean merely because they are too large to scan. Do not expose the scanner key to browser code, and do not send community files to a public-scanning endpoint without an explicit privacy review.

## References

[1]: https://www.backblaze.com/blog/cors-correction-developer-insight-on-the-backblaze-b2-command-line/ "Backblaze B2 CORS and presigned direct uploads"
[2]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html "AWS: Uploading objects with presigned URLs"
[3]: https://docs.virustotal.com/reference/upload-file-private-scanning "VirusTotal: Private file upload and scanning"
[4]: https://docs.virustotal.com/reference/files-upload-url "VirusTotal: Large-file upload URL"
[5]: https://www.backblaze.com/docs/cloud-storage-files "Backblaze B2 individual file limits"
[6]: https://www.backblaze.com/docs/cloud-storage-large-files "Backblaze B2 large file flow"
