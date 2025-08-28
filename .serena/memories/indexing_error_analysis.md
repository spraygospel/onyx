# Indexing Error Analysis Log

## Error Summary
- **Primary Issue**: NoCredentialsError in botocore when saving checkpoint 
- **Location**: `backend/onyx/file_store/file_store.py:332` in `save_file()` method
- **Context**: Document processing → checkpoint saving → S3 put_object operation

## Error Chain Analysis
1. `docfetching_task` → processing file upload
2. `run_docfetching_entrypoint` → document extraction 
3. `connector_document_extraction` → processing documents
4. `save_checkpoint` → trying to save progress
5. `file_store.save_file` → S3 operation fails
6. `s3_client.put_object` → NoCredentialsError

## Key Observation
Error occurs during **checkpointing**, not initial file processing. This suggests:
- MinIO connection may work for some operations but fails for others
- Credentials might be loaded differently in different code paths
- Issue might be in how S3FileStore initializes vs how it's used in background tasks

## Next Steps for Investigation
1. Create test scripts to isolate S3 connection issues
2. Test different S3 operations (list, get, put) separately  
3. Check how credentials are passed to background Celery tasks
4. Examine if environment variables are properly loaded in background processes