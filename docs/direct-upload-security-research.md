# Large Attachment Upload and Malware-Scanning Research

## Direct browser uploads

Backblaze B2 supports an S3-compatible, server-generated presigned URL flow. The application server creates a short-lived URL, while the member browser performs the upload directly to B2 without receiving storage credentials. This avoids Base64 request inflation and Render request-body timeouts. Browser uploads require a bucket CORS rule allowing the deployed application origin to use `PUT`, `GET`, and `HEAD` with the required content-type header.

Backblaze describes presigned direct uploads to B2 and explains that CORS must allow the intended browser origin.[1] Amazon’s S3 documentation confirms that a presigned `PUT` URL gives the recipient upload capability without exposing the creator’s underlying credentials, and that the sent content type must match the signature.[2]

Backblaze permits standard individual files up to 5 GiB; files beyond that require a multipart large-file workflow. This release will therefore use one shared practical **1 GiB per attachment** limit for every format—image, video, document, archive, or quarantined executable—rather than a different limit by file type. The five-attachment limit per post remains in place.[5] [6]

## Malware screening boundary

VirusTotal private scanning requires a server-side API key and accepts normal uploads up to 32 MB; its large-file flow uses a one-time upload URL and accepts up to 650 MB. VirusTotal notes that files over 200 MB can be difficult for engines to inspect reliably.[3] [4] The public API is unsuitable for a commercial or community product, so the site must use a private-scanning plan or another server-side scanning service before claiming a completed antivirus integration.

## References

[1]: https://www.backblaze.com/blog/cors-correction-developer-insight-on-the-backblaze-b2-command-line/ "Backblaze B2 CORS and presigned direct uploads"
[2]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html "AWS: Uploading objects with presigned URLs"
[3]: https://docs.virustotal.com/reference/upload-file-private-scanning "VirusTotal: Private file upload and scanning"
[4]: https://docs.virustotal.com/reference/files-upload-url "VirusTotal: Large-file upload URL"
[5]: https://www.backblaze.com/docs/cloud-storage-files "Backblaze B2 individual file limits"
[6]: https://www.backblaze.com/docs/cloud-storage-large-files "Backblaze B2 large file flow"
