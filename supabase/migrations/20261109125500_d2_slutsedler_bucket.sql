-- D2 task 6: bucket 'slutsedler' skal kunne tage scannede slutsedler som billeder.
-- Var: kun application/pdf, 5 MB. Idempotent.
UPDATE storage.buckets
   SET allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'],
       file_size_limit = 10485760,
       public = false
 WHERE id = 'slutsedler';
