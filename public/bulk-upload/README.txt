BULK UPLOAD INSTRUCTIONS
========================

This folder is for bulk uploading GLB 3D models and panorama images to your Revit Digital Twin Platform.

FOLDER STRUCTURE:
- glb/         - Place GLB 3D model files here
- panoramas/   - Place panorama image files here (JPG, PNG, WEBP)

FILE NAMING REQUIREMENTS:
Files must start with a valid GUID in the format: 8-4-4-4-12-8 hexadecimal characters

Examples:
✓ fe6c1977-334a-4444-8686-196268549145-003d0562.glb
✓ fe6c1977-334a-4444-8686-196268549145-003d0562_360.jpg
✓ a1b2c3d4-e5f6-7890-abcd-ef1234567890-12345678.glb
✗ model.glb (no GUID)
✗ invalid-guid-format.glb
✗ a1b2c3d4-e5f6-7890-abcd-ef1234567890.glb (missing suffix)

HOW TO USE:
1. Drop your files into the appropriate folders (glb/ or panoramas/)
2. Go to the main application interface
3. Click on the "Bulk Upload" tab
4. Click "Scan & Process Files" button
5. Review the processing results

WHAT HAPPENS:
- Files are moved to the proper asset storage locations
- Database entries are created automatically
- GUIDs are extracted from filenames
- Duplicate GUIDs are skipped to prevent conflicts
- Processing results show success, errors, and skipped files

SUPPORTED FORMATS:
- GLB files: 3D models in glTF Binary format
- Panoramas: JPG, JPEG, PNG, WEBP image files

NOTE: Files with GUIDs that already exist in the database will be updated/overridden.