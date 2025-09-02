// API endpoint for handling file uploads
// This would typically be implemented as a backend API route

import fs from 'fs';
import path from 'path';

interface UploadRequest {
  file: File;
  fileName: string;
  folder: 'courses' | 'icons';
}

interface UploadResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}

export const handleFileUpload = async (request: UploadRequest): Promise<UploadResponse> => {
  try {
    const { file, fileName, folder } = request;
    
    // Determine the upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'assets', 'images', folder);
    
    // Ensure the directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Full file path
    const filePath = path.join(uploadDir, fileName);
    
    // Convert File to Buffer (in a real API, you'd handle this differently)
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Write file to disk
    fs.writeFileSync(filePath, buffer);
    
    // Return the public URL path
    const publicPath = `/assets/images/${folder}/${fileName}`;
    
    return {
      success: true,
      filePath: publicPath
    };
  } catch (error) {
    console.error('File upload error:', error);
    return {
      success: false,
      error: 'Failed to upload file'
    };
  }
};

// Express.js route handler (example)
export const uploadHandler = async (req: any, res: any) => {
  try {
    const { file, fileName, folder } = req.body;
    
    if (!file || !fileName || !folder) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    const result = await handleFileUpload({ file, fileName, folder });
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Upload handler error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};