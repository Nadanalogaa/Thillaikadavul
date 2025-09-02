// File upload utility functions for course images and icons

interface UploadResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export const uploadCourseImage = async (file: File, courseId: string): Promise<UploadResult> => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const fileName = `course-${courseId}-${timestamp}.${fileExtension}`;
    
    // Simulate upload with file reader for local development
    const reader = new FileReader();
    
    return new Promise((resolve) => {
      reader.onload = async () => {
        try {
          // Convert to base64 for immediate display (works everywhere)
          const base64Data = reader.result as string;
          
          // Simulate upload delay
          await new Promise(delay => setTimeout(delay, 1000));
          
          resolve({
            success: true,
            filePath: base64Data // Return base64 data URL for immediate display
          });
        } catch (error) {
          console.error('Error processing image:', error);
          resolve({
            success: false,
            error: 'Failed to process image'
          });
        }
      };
      
      reader.onerror = () => {
        resolve({
          success: false,
          error: 'Failed to read file'
        });
      };
      
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error('Error uploading course image:', error);
    return {
      success: false,
      error: 'Failed to upload image'
    };
  }
};

export const uploadCourseIcon = async (file: File, courseId: string): Promise<UploadResult> => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const fileName = `icon-${courseId}-${timestamp}.${fileExtension}`;
    
    // Simulate upload with file reader for local development
    const reader = new FileReader();
    
    return new Promise((resolve) => {
      reader.onload = async () => {
        try {
          // Convert to base64 for immediate display (works everywhere)
          const base64Data = reader.result as string;
          
          // Simulate upload delay
          await new Promise(delay => setTimeout(delay, 500));
          
          resolve({
            success: true,
            filePath: base64Data // Return base64 data URL for immediate display
          });
        } catch (error) {
          console.error('Error processing icon:', error);
          resolve({
            success: false,
            error: 'Failed to process icon'
          });
        }
      };
      
      reader.onerror = () => {
        resolve({
          success: false,
          error: 'Failed to read file'
        });
      };
      
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error('Error uploading course icon:', error);
    return {
      success: false,
      error: 'Failed to upload icon'
    };
  }
};

export const validateImageFile = (file: File, maxSize: number = 5 * 1024 * 1024): { valid: boolean; error?: string } => {
  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size must be less than ${maxSize / (1024 * 1024)}MB`
    };
  }
  
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)'
    };
  }
  
  return { valid: true };
};

export const validateIconFile = (file: File, maxSize: number = 1 * 1024 * 1024): { valid: boolean; error?: string } => {
  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size must be less than ${maxSize / (1024 * 1024)}MB`
    };
  }
  
  // Check file type
  const allowedTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please select a valid icon file (SVG, PNG, JPEG, or GIF)'
    };
  }
  
  return { valid: true };
};